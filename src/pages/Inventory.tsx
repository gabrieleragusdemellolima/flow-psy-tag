import { useState, useEffect } from 'react';
import { useStore, type Product } from '@/store/useStore';
import { useAuth } from '@/hooks/useAuth';
import { motion } from 'framer-motion';
import { Plus, Trash2, Edit2, Check, X, Package, AlertTriangle, Shield } from 'lucide-react';

const categoryOptions: Product['category'][] = ['bebidas', 'comidas', 'cigarros', 'doces', 'ingressos', 'estacionamento'];
const emojiMap: Record<string, string> = { bebidas: '🍺', comidas: '🍔', cigarros: '🚬', doces: '🍬', ingressos: '🎫', estacionamento: '🅿️' };

export default function Inventory() {
  const { products, addProduct, removeProduct, updateProduct, updateStock, fetchProducts } = useStore();
  const { user, isAdmin } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [stockEditId, setStockEditId] = useState<string | null>(null);
  const [stockValue, setStockValue] = useState('');
  const [form, setForm] = useState({ name: '', price: '', cost_price: '', category: 'bebidas' as Product['category'], emoji: '🍺', stock: '50', min_stock: '10' });

  useEffect(() => { if (user) fetchProducts(); }, [user]);

  const handleAdd = async () => {
    if (!form.name || !form.price || !user) return;
    await addProduct({
      name: form.name,
      price: parseFloat(form.price),
      cost_price: parseFloat(form.cost_price) || 0,
      category: form.category,
      emoji: form.emoji || emojiMap[form.category],
      stock: parseInt(form.stock) || 0,
      min_stock: parseInt(form.min_stock) || 5,
      created_by: user.id,
    }, user.id);
    setForm({ name: '', price: '', cost_price: '', category: 'bebidas', emoji: '🍺', stock: '50', min_stock: '10' });
    setShowForm(false);
  };

  const handleUpdate = async (id: string) => {
    if (!form.name || !form.price) return;
    await updateProduct(id, {
      name: form.name,
      price: parseFloat(form.price),
      cost_price: parseFloat(form.cost_price) || 0,
      category: form.category,
      emoji: form.emoji,
      min_stock: parseInt(form.min_stock) || 5,
    });
    setEditId(null);
  };

  const handleStockUpdate = async (id: string) => {
    const val = parseInt(stockValue);
    if (isNaN(val) || val < 0) return;
    await updateStock(id, val);
    setStockEditId(null);
  };

  const startEdit = (p: Product) => {
    setEditId(p.id);
    setForm({ name: p.name, price: String(p.price), cost_price: String(p.cost_price), category: p.category, emoji: p.emoji, stock: String(p.stock), min_stock: String(p.min_stock) });
  };

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Produtos & Estoque</h1>
          <p className="text-muted-foreground text-sm mt-1">{products.length} itens cadastrados</p>
        </div>
        {isAdmin && (
          <motion.button whileTap={{ scale: 0.96 }}
            onClick={() => { setShowForm(!showForm); setEditId(null); }}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium text-sm">
            <Plus size={16} /> Novo Produto
          </motion.button>
        )}
      </div>

      {!isAdmin && (
        <div className="card-surface-sm p-4 flex items-center gap-3 text-muted-foreground">
          <Shield size={18} />
          <p className="text-sm">Apenas administradores podem alterar produtos e estoque.</p>
        </div>
      )}

      {showForm && isAdmin && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
          className="card-surface p-5 space-y-4">
          <h3 className="font-display font-semibold">Novo Produto</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nome"
              className="bg-muted/50 px-3 py-2.5 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/50 text-foreground placeholder:text-muted-foreground" />
            <input value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="Preço venda" type="number"
              className="bg-muted/50 px-3 py-2.5 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/50 font-mono text-foreground placeholder:text-muted-foreground" />
            <input value={form.cost_price} onChange={(e) => setForm({ ...form, cost_price: e.target.value })} placeholder="Preço custo" type="number"
              className="bg-muted/50 px-3 py-2.5 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/50 font-mono text-foreground placeholder:text-muted-foreground" />
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as Product['category'], emoji: emojiMap[e.target.value] })}
              className="bg-muted/50 px-3 py-2.5 rounded-lg text-sm outline-none text-foreground">
              {categoryOptions.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <input value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} placeholder="Estoque" type="number"
              className="bg-muted/50 px-3 py-2.5 rounded-lg text-sm outline-none font-mono text-foreground placeholder:text-muted-foreground" />
            <input value={form.min_stock} onChange={(e) => setForm({ ...form, min_stock: e.target.value })} placeholder="Estoque mínimo" type="number"
              className="bg-muted/50 px-3 py-2.5 rounded-lg text-sm outline-none font-mono text-foreground placeholder:text-muted-foreground" />
            <input value={form.emoji} onChange={(e) => setForm({ ...form, emoji: e.target.value })} placeholder="Emoji"
              className="bg-muted/50 px-3 py-2.5 rounded-lg text-sm text-center outline-none text-foreground placeholder:text-muted-foreground" />
          </div>
          <div className="flex gap-2">
            <button onClick={handleAdd} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium">Adicionar</button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 bg-muted text-muted-foreground rounded-lg text-sm">Cancelar</button>
          </div>
        </motion.div>
      )}

      <div className="space-y-2">
        {products.map((product) => {
          const lowStock = product.stock <= product.min_stock;
          return (
            <motion.div key={product.id} layout className="card-surface-sm p-4 flex items-center gap-4">
              {editId === product.id && isAdmin ? (
                <>
                  <div className="flex-1 grid grid-cols-2 md:grid-cols-5 gap-2">
                    <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className="bg-muted/50 px-2 py-1.5 rounded text-sm outline-none text-foreground" placeholder="Nome" />
                    <input value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} type="number"
                      className="bg-muted/50 px-2 py-1.5 rounded text-sm font-mono outline-none text-foreground" placeholder="Venda" />
                    <input value={form.cost_price} onChange={(e) => setForm({ ...form, cost_price: e.target.value })} type="number"
                      className="bg-muted/50 px-2 py-1.5 rounded text-sm font-mono outline-none text-foreground" placeholder="Custo" />
                    <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as Product['category'] })}
                      className="bg-muted/50 px-2 py-1.5 rounded text-sm outline-none text-foreground">
                      {categoryOptions.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <input value={form.min_stock} onChange={(e) => setForm({ ...form, min_stock: e.target.value })} type="number" placeholder="Min"
                      className="bg-muted/50 px-2 py-1.5 rounded text-sm font-mono outline-none text-foreground" />
                  </div>
                  <button onClick={() => handleUpdate(product.id)} className="text-primary hover:bg-primary/10 p-2 rounded"><Check size={16} /></button>
                  <button onClick={() => setEditId(null)} className="text-muted-foreground hover:bg-muted/50 p-2 rounded"><X size={16} /></button>
                </>
              ) : (
                <>
                  <span className="text-2xl">{product.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{product.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">{product.category}</p>
                  </div>
                  <div className="text-right">
                    <span className="font-mono text-primary font-semibold">R$ {product.price.toFixed(2)}</span>
                    {isAdmin && product.cost_price > 0 && (
                      <p className="font-mono text-xs text-muted-foreground">Custo: R$ {product.cost_price.toFixed(2)}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {lowStock && <AlertTriangle size={14} className="text-accent" />}
                    {stockEditId === product.id && isAdmin ? (
                      <div className="flex items-center gap-1">
                        <input value={stockValue} onChange={(e) => setStockValue(e.target.value)} type="number"
                          className="w-16 bg-muted/50 px-2 py-1 rounded text-sm font-mono text-foreground outline-none" autoFocus />
                        <button onClick={() => handleStockUpdate(product.id)} className="text-primary p-1"><Check size={14} /></button>
                        <button onClick={() => setStockEditId(null)} className="text-muted-foreground p-1"><X size={14} /></button>
                      </div>
                    ) : (
                      <button
                        onClick={() => { if (isAdmin) { setStockEditId(product.id); setStockValue(String(product.stock)); } }}
                        className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-mono ${lowStock ? 'text-accent bg-accent/10' : 'text-muted-foreground bg-muted/30'} ${!isAdmin ? 'cursor-default' : ''}`}>
                        <Package size={12} /> {product.stock}
                      </button>
                    )}
                  </div>

                  {isAdmin && (
                    <>
                      <button onClick={() => startEdit(product)} className="text-muted-foreground hover:text-foreground p-2 rounded hover:bg-muted/50"><Edit2 size={14} /></button>
                      <button onClick={() => removeProduct(product.id)} className="text-muted-foreground hover:text-accent p-2 rounded hover:bg-accent/10"><Trash2 size={14} /></button>
                    </>
                  )}
                </>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
