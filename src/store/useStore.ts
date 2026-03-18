import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';

export interface Product {
  id: string;
  name: string;
  price: number;
  category: 'bebidas' | 'comidas' | 'cigarros' | 'doces';
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
  type: 'load' | 'purchase';
  payment_method: string | null;
  created_at: string;
}

interface AppStore {
  // Cart (local only)
  cart: CartItem[];
  addToCart: (product: Product) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, qty: number) => void;
  clearCart: () => void;
  cartTotal: () => number;

  // NFC
  activeTag: NFCTag | null;
  setActiveTag: (tag: NFCTag | null) => void;
  isDemoMode: boolean;
  toggleDemoMode: () => void;

  // Data from DB
  products: Product[];
  tags: NFCTag[];
  transactions: Transaction[];

  // DB operations
  fetchProducts: () => Promise<void>;
  fetchTags: () => Promise<void>;
  fetchTransactions: () => Promise<void>;
  
  loadTag: (tagCode: string, amount: number, paymentMethod: string, operatorId: string) => Promise<boolean>;
  processPayment: (operatorId: string) => Promise<boolean>;

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
    if (data) set({ products: data.map(p => ({ ...p, price: Number(p.price), stock: Number(p.stock), min_stock: Number(p.min_stock) })) as Product[] });
  },

  fetchTags: async () => {
    const { data } = await supabase.from('tags').select('*').eq('active', true);
    if (data) set({ tags: data.map(t => ({ ...t, balance: Number(t.balance) })) as NFCTag[] });
  },

  fetchTransactions: async () => {
    const { data } = await supabase.from('transactions').select('*').order('created_at', { ascending: false }).limit(200);
    if (data) set({ transactions: data.map(t => ({ ...t, amount: Number(t.amount) })) as Transaction[] });
  },

  loadTag: async (tagCode, amount, paymentMethod, operatorId) => {
    // Find or create tag
    let { data: tag } = await supabase.from('tags').select('*').eq('tag_code', tagCode).single();
    
    if (!tag) {
      const { data: newTag, error } = await supabase.from('tags').insert({ tag_code: tagCode, balance: 0, created_by: operatorId }).select().single();
      if (error || !newTag) return false;
      tag = newTag;
    }

    // Update balance
    const newBalance = Number(tag.balance) + amount;
    const { error: updateErr } = await supabase.from('tags').update({ balance: newBalance }).eq('id', tag.id);
    if (updateErr) return false;

    // Record transaction
    await supabase.from('transactions').insert({
      tag_id: tag.id,
      operator_id: operatorId,
      amount,
      type: 'load',
      payment_method: paymentMethod,
    });

    await get().fetchTags();
    await get().fetchTransactions();
    return true;
  },

  processPayment: async (operatorId) => {
    const { cart, activeTag, cartTotal } = get();
    if (!activeTag || cart.length === 0) return false;

    const total = cartTotal();
    if (total > activeTag.balance) return false;

    // Deduct balance
    const newBalance = activeTag.balance - total;
    const { error: updateErr } = await supabase.from('tags').update({ balance: newBalance }).eq('id', activeTag.id);
    if (updateErr) return false;

    // Create transaction
    const { data: tx, error: txErr } = await supabase.from('transactions').insert({
      tag_id: activeTag.id,
      operator_id: operatorId,
      amount: total,
      type: 'purchase',
    }).select().single();
    if (txErr || !tx) return false;

    // Create sale items + deduct stock
    for (const item of cart) {
      await supabase.from('sale_items').insert({
        transaction_id: tx.id,
        product_id: item.product.id,
        quantity: item.quantity,
        unit_price: item.product.price,
      });
      // Deduct stock
      const newStock = Math.max(0, item.product.stock - item.quantity);
      await supabase.from('products').update({ stock: newStock }).eq('id', item.product.id);
    }

    set({ activeTag: { ...activeTag, balance: newBalance }, cart: [] });
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
