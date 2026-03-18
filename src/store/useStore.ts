import { create } from 'zustand';

export interface Product {
  id: string;
  name: string;
  price: number;
  category: 'bebidas' | 'comidas' | 'cigarros' | 'doces';
  emoji: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface NFCTag {
  id: string;
  balance: number;
  active: boolean;
  createdAt: Date;
}

export interface Transaction {
  id: string;
  tagId: string;
  amount: number;
  type: 'load' | 'purchase';
  items?: CartItem[];
  timestamp: Date;
}

interface AppStore {
  // Cart
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

  // Tags
  tags: NFCTag[];
  loadTag: (tagId: string, amount: number) => void;
  deductFromTag: (tagId: string, amount: number) => boolean;

  // Transactions
  transactions: Transaction[];
  addTransaction: (tx: Omit<Transaction, 'id' | 'timestamp'>) => void;

  // Products
  products: Product[];
  addProduct: (product: Omit<Product, 'id'>) => void;
  removeProduct: (id: string) => void;
  updateProduct: (id: string, data: Partial<Product>) => void;
}

const defaultProducts: Product[] = [
  { id: '1', name: 'Cerveja', price: 12, category: 'bebidas', emoji: '🍺' },
  { id: '2', name: 'Água', price: 5, category: 'bebidas', emoji: '💧' },
  { id: '3', name: 'Refrigerante', price: 8, category: 'bebidas', emoji: '🥤' },
  { id: '4', name: 'Energético', price: 18, category: 'bebidas', emoji: '⚡' },
  { id: '5', name: 'Caipirinha', price: 20, category: 'bebidas', emoji: '🍹' },
  { id: '6', name: 'Shot Tequila', price: 15, category: 'bebidas', emoji: '🥃' },
  { id: '7', name: 'X-Burger', price: 22, category: 'comidas', emoji: '🍔' },
  { id: '8', name: 'Batata Frita', price: 15, category: 'comidas', emoji: '🍟' },
  { id: '9', name: 'Porção Calabresa', price: 25, category: 'comidas', emoji: '🥓' },
  { id: '10', name: 'Coxinha', price: 8, category: 'comidas', emoji: '🍗' },
  { id: '11', name: 'Cigarro', price: 12, category: 'cigarros', emoji: '🚬' },
  { id: '12', name: 'Chiclete', price: 3, category: 'doces', emoji: '🍬' },
  { id: '13', name: 'Bala', price: 2, category: 'doces', emoji: '🍭' },
  { id: '14', name: 'Chocolate', price: 7, category: 'doces', emoji: '🍫' },
];

const defaultTags: NFCTag[] = [
  { id: 'TAG-001', balance: 100, active: true, createdAt: new Date() },
  { id: 'TAG-002', balance: 50, active: true, createdAt: new Date() },
  { id: 'TAG-003', balance: 200, active: true, createdAt: new Date() },
];

export const useStore = create<AppStore>((set, get) => ({
  cart: [],
  addToCart: (product) =>
    set((state) => {
      const existing = state.cart.find((i) => i.product.id === product.id);
      if (existing) {
        return {
          cart: state.cart.map((i) =>
            i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i
          ),
        };
      }
      return { cart: [...state.cart, { product, quantity: 1 }] };
    }),
  removeFromCart: (productId) =>
    set((state) => ({ cart: state.cart.filter((i) => i.product.id !== productId) })),
  updateQuantity: (productId, qty) =>
    set((state) => {
      if (qty <= 0) return { cart: state.cart.filter((i) => i.product.id !== productId) };
      return {
        cart: state.cart.map((i) =>
          i.product.id === productId ? { ...i, quantity: qty } : i
        ),
      };
    }),
  clearCart: () => set({ cart: [] }),
  cartTotal: () => get().cart.reduce((sum, i) => sum + i.product.price * i.quantity, 0),

  activeTag: null,
  setActiveTag: (tag) => set({ activeTag: tag }),
  isDemoMode: true,
  toggleDemoMode: () => set((s) => ({ isDemoMode: !s.isDemoMode })),

  tags: defaultTags,
  loadTag: (tagId, amount) =>
    set((state) => {
      const exists = state.tags.find((t) => t.id === tagId);
      const newTags = exists
        ? state.tags.map((t) => (t.id === tagId ? { ...t, balance: t.balance + amount } : t))
        : [...state.tags, { id: tagId, balance: amount, active: true, createdAt: new Date() }];
      return { tags: newTags };
    }),
  deductFromTag: (tagId, amount) => {
    const tag = get().tags.find((t) => t.id === tagId);
    if (!tag || tag.balance < amount) return false;
    set((state) => ({
      tags: state.tags.map((t) =>
        t.id === tagId ? { ...t, balance: t.balance - amount } : t
      ),
      activeTag: state.activeTag?.id === tagId
        ? { ...state.activeTag, balance: state.activeTag.balance - amount }
        : state.activeTag,
    }));
    return true;
  },

  transactions: [],
  addTransaction: (tx) =>
    set((state) => ({
      transactions: [
        { ...tx, id: crypto.randomUUID(), timestamp: new Date() },
        ...state.transactions,
      ],
    })),

  products: defaultProducts,
  addProduct: (product) =>
    set((state) => ({
      products: [...state.products, { ...product, id: crypto.randomUUID() }],
    })),
  removeProduct: (id) =>
    set((state) => ({ products: state.products.filter((p) => p.id !== id) })),
  updateProduct: (id, data) =>
    set((state) => ({
      products: state.products.map((p) => (p.id === id ? { ...p, ...data } : p)),
    })),
}));
