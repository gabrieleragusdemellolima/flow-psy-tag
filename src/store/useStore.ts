import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';

export interface Product {
  id: string;
  name: string;
  price: number;
  cost_price: number;
  category: 'bebidas' | 'comidas' | 'cigarros' | 'doces' | 'ingressos' | 'estacionamento';
  emoji: string;
  stock: number;
  min_stock: number;
  active: boolean;
  created_by: string | null;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface NFCTag {
  id: string;
  tag_code: string;
  balance: number;
  active: boolean;
}

export interface Transaction {
  id: string;
  tag_id: string | null;
  operator_id: string;
  amount: number;
  type: 'load' | 'purchase' | 'courtesy';
  payment_method: string | null;
  created_at: string;
  courtesy_name?: string | null;
  courtesy_role?: string | null;
  operator_name?: string | null;
  operator_number?: string | null;
}

interface AppStore {
  cart: CartItem[];
  addToCart: (product: Product) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, qty: number) => void;
  clearCart: () => void;
  cartTotal: () => number;

  activeTag: NFCTag | null;
  setActiveTag: (tag: NFCTag | null) => void;
  isDemoMode: boolean;
  toggleDemoMode: () => void;

  products: Product[];
  tags: NFCTag[];
  transactions: Transaction[];

  fetchProducts: () => Promise<void>;
  fetchTags: () => Promise<void>;
  fetchTransactions: () => Promise<void>;

  loadTag: (tagCode: string, amount: number, paymentMethod: string, operatorId: string, operatorName?: string, operatorNumber?: string) => Promise<boolean>;
  loadTagCourtesy: (tagCode: string, amount: number, operatorId: string, courtesyName: string, courtesyRole: string, operatorName?: string, operatorNumber?: string) => Promise<boolean>;
  loadCustomer: (customerId: string, amount: number, paymentMethod: string, operatorId: string, operatorName?: string, operatorNumber?: string) => Promise<boolean>;
  loadCustomerCourtesy: (customerId: string, amount: number, operatorId: string, courtesyName: string, courtesyRole: string, operatorName?: string, operatorNumber?: string) => Promise<boolean>;
  processPayment: (operatorId: string, operatorName?: string, operatorNumber?: string) => Promise<boolean>;
  processPaymentCustomer: (customerId: string, operatorId: string, operatorName?: string, operatorNumber?: string) => Promise<boolean>;

  addProduct: (product: Omit<Product, 'id' | 'active'>, userId: string) => Promise<void>;
  updateProduct: (id: string, data: Partial<Product>) => Promise<void>;
  removeProduct: (id: string) => Promise<void>;
  updateStock: (id: string, newStock: number) => Promise<void>;
}

export const useStore = create<AppStore>((set, get) => ({
  cart: [],
  addToCart: (product) =>
    set((state) => {
      const existing = state.cart.find((i) => i.product.id === product.id);
      if (existing) {
        return { cart: state.cart.map((i) => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i) };
      }
      return { cart: [...state.cart, { product, quantity: 1 }] };
    }),
  removeFromCart: (productId) => set((s) => ({ cart: s.cart.filter((i) => i.product.id !== productId) })),
  updateQuantity: (productId, qty) =>
    set((s) => {
      if (qty <= 0) return { cart: s.cart.filter((i) => i.product.id !== productId) };
      return { cart: s.cart.map((i) => i.product.id === productId ? { ...i, quantity: qty } : i) };
    }),
  clearCart: () => set({ cart: [] }),
  cartTotal: () => get().cart.reduce((sum, i) => sum + i.product.price * i.quantity, 0),

  activeTag: null,
  setActiveTag: (tag) => set({ activeTag: tag }),
  isDemoMode: true,
  toggleDemoMode: () => set((s) => ({ isDemoMode: !s.isDemoMode })),

  products: [],
  tags: [],
  transactions: [],

  fetchProducts: async () => {
    const { data } = await supabase.from('products').select('*').eq('active', true).order('category');
    if (data) set({ products: data.map(p => ({ ...p, price: Number(p.price), cost_price: Number(p.cost_price), stock: Number(p.stock), min_stock: Number(p.min_stock) })) as Product[] });
  },

  fetchTags: async () => {
    const { data } = await supabase.from('tags').select('*').eq('active', true);
    if (data) set({ tags: data.map(t => ({ ...t, balance: Number(t.balance) })) as NFCTag[] });
  },

  fetchTransactions: async () => {
    const { data } = await supabase.from('transactions').select('*').order('created_at', { ascending: false }).limit(200);
    if (data) set({ transactions: data.map(t => ({ ...t, amount: Number(t.amount) })) as unknown as Transaction[] });
  },

  loadTag: async (tagCode, amount, paymentMethod, operatorId, operatorName, operatorNumber) => {
    let { data: tag } = await supabase.from('tags').select('*').eq('tag_code', tagCode).single();
    if (!tag) {
      const { data: newTag, error } = await supabase.from('tags').insert({ tag_code: tagCode, balance: 0, created_by: operatorId }).select().single();
      if (error || !newTag) return false;
      tag = newTag;
    }
    const newBalance = Number(tag.balance) + amount;
    const { error: updateErr } = await supabase.from('tags').update({ balance: newBalance }).eq('id', tag.id);
    if (updateErr) return false;

    await supabase.from('transactions').insert({
      tag_id: tag.id,
      operator_id: operatorId,
      amount,
      type: 'load',
      payment_method: paymentMethod,
      operator_name: operatorName ?? null,
      operator_number: operatorNumber ?? null,
    } as never);

    await get().fetchTags();
    await get().fetchTransactions();
    return true;
  },

  loadTagCourtesy: async (tagCode, amount, operatorId, courtesyName, courtesyRole, operatorName, operatorNumber) => {
    let { data: tag } = await supabase.from('tags').select('*').eq('tag_code', tagCode).single();
    if (!tag) {
      const { data: newTag, error } = await supabase.from('tags').insert({ tag_code: tagCode, balance: 0, created_by: operatorId }).select().single();
      if (error || !newTag) return false;
      tag = newTag;
    }
    const newBalance = Number(tag.balance) + amount;
    const { error: updateErr } = await supabase.from('tags').update({ balance: newBalance }).eq('id', tag.id);
    if (updateErr) return false;

    await supabase.from('transactions').insert({
      tag_id: tag.id,
      operator_id: operatorId,
      amount,
      type: 'courtesy',
      payment_method: 'cortesia',
      courtesy_name: courtesyName,
      courtesy_role: courtesyRole,
      operator_name: operatorName ?? null,
      operator_number: operatorNumber ?? null,
    } as never);

    await get().fetchTags();
    await get().fetchTransactions();
    return true;
  },

  loadCustomer: async (customerId, amount, paymentMethod, operatorId, operatorName, operatorNumber) => {
    const { data: customer } = await supabase.from('customers').select('*').eq('id', customerId).single();
    if (!customer) return false;
    const newBalance = Number(customer.balance) + amount;
    const { error } = await supabase.from('customers').update({ balance: newBalance }).eq('id', customerId);
    if (error) return false;
    if (customer.tag_id) {
      const { data: tag } = await supabase.from('tags').select('*').eq('id', customer.tag_id).single();
      if (tag) {
        await supabase.from('tags').update({ balance: Number(tag.balance) + amount }).eq('id', tag.id);
      }
    }
    await supabase.from('transactions').insert({
      tag_id: customer.tag_id,
      operator_id: operatorId,
      amount,
      type: 'load',
      payment_method: paymentMethod,
      operator_name: operatorName ?? null,
      operator_number: operatorNumber ?? null,
    } as never);
    await get().fetchTags();
    await get().fetchTransactions();
    return true;
  },

  loadCustomerCourtesy: async (customerId, amount, operatorId, courtesyName, courtesyRole, operatorName, operatorNumber) => {
    const { data: customer } = await supabase.from('customers').select('*').eq('id', customerId).single();
    if (!customer) return false;
    const newBalance = Number(customer.balance) + amount;
    const { error } = await supabase.from('customers').update({ balance: newBalance }).eq('id', customerId);
    if (error) return false;
    if (customer.tag_id) {
      const { data: tag } = await supabase.from('tags').select('*').eq('id', customer.tag_id).single();
      if (tag) {
        await supabase.from('tags').update({ balance: Number(tag.balance) + amount }).eq('id', tag.id);
      }
    }
    await supabase.from('transactions').insert({
      tag_id: customer.tag_id,
      operator_id: operatorId,
      amount,
      type: 'courtesy',
      payment_method: 'cortesia',
      courtesy_name: courtesyName,
      courtesy_role: courtesyRole,
      operator_name: operatorName ?? null,
      operator_number: operatorNumber ?? null,
    } as never);
    await get().fetchTags();
    await get().fetchTransactions();
    return true;
  },

  processPayment: async (operatorId, operatorName, operatorNumber) => {
    const { cart, activeTag, cartTotal } = get();
    if (!activeTag || cart.length === 0) return false;

    const total = cartTotal();
    if (total > activeTag.balance) return false;

    const newBalance = activeTag.balance - total;
    const { error: updateErr } = await supabase.from('tags').update({ balance: newBalance }).eq('id', activeTag.id);
    if (updateErr) return false;

    const { data: tx, error: txErr } = await supabase.from('transactions').insert({
      tag_id: activeTag.id,
      operator_id: operatorId,
      amount: total,
      type: 'purchase',
      operator_name: operatorName ?? null,
      operator_number: operatorNumber ?? null,
    } as never).select().single();
    if (txErr || !tx) return false;

    for (const item of cart) {
      await supabase.from('sale_items').insert({
        transaction_id: tx.id,
        product_id: item.product.id,
        quantity: item.quantity,
        unit_price: item.product.price,
      });
      const newStock = Math.max(0, item.product.stock - item.quantity);
      await supabase.from('products').update({ stock: newStock }).eq('id', item.product.id);
    }

    set({ activeTag: { ...activeTag, balance: newBalance }, cart: [] });
    await get().fetchProducts();
    await get().fetchTags();
    await get().fetchTransactions();
    return true;
  },

  processPaymentCustomer: async (customerId, operatorId, operatorName, operatorNumber) => {
    const { cart, cartTotal } = get();
    if (cart.length === 0) return false;

    const { data: customer } = await supabase.from('customers').select('*').eq('id', customerId).single();
    if (!customer) return false;

    const total = cartTotal();
    if (total > Number(customer.balance)) return false;

    const newBalance = Number(customer.balance) - total;
    const { error: updateErr } = await supabase.from('customers').update({ balance: newBalance }).eq('id', customerId);
    if (updateErr) return false;

    if (customer.tag_id) {
      const { data: tag } = await supabase.from('tags').select('*').eq('id', customer.tag_id).single();
      if (tag) {
        const tagNewBalance = Math.max(0, Number(tag.balance) - total);
        await supabase.from('tags').update({ balance: tagNewBalance }).eq('id', tag.id);
      }
    }

    const { data: tx, error: txErr } = await supabase.from('transactions').insert({
      tag_id: customer.tag_id,
      operator_id: operatorId,
      amount: total,
      type: 'purchase',
      operator_name: operatorName ?? null,
      operator_number: operatorNumber ?? null,
    } as never).select().single();
    if (txErr || !tx) return false;

    for (const item of cart) {
      await supabase.from('sale_items').insert({
        transaction_id: tx.id,
        product_id: item.product.id,
        quantity: item.quantity,
        unit_price: item.product.price,
      });
      const newStock = Math.max(0, item.product.stock - item.quantity);
      await supabase.from('products').update({ stock: newStock }).eq('id', item.product.id);
    }

    set({ cart: [] });
    await get().fetchProducts();
    await get().fetchTags();
    await get().fetchTransactions();
    return true;
  },

  addProduct: async (product, userId) => {
    await supabase.from('products').insert({ ...product, created_by: userId });
    await get().fetchProducts();
  },

  updateProduct: async (id, data) => {
    await supabase.from('products').update(data).eq('id', id);
    await get().fetchProducts();
  },

  removeProduct: async (id) => {
    await supabase.from('products').update({ active: false }).eq('id', id);
    await get().fetchProducts();
  },

  updateStock: async (id, newStock) => {
    await supabase.from('products').update({ stock: newStock }).eq('id', id);
    await get().fetchProducts();
  },
}));
