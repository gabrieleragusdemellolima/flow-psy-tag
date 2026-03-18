import { useState } from 'react';
import { useStore, type Product } from '@/store/useStore';
import { motion } from 'framer-motion';
import { Plus, Trash2, Edit2, Check, X } from 'lucide-react';

const categoryOptions: Product['category'][] = ['bebidas', 'comidas', 'cigarros', 'doces'];
const emojiMap = { bebidas: '🍺', comidas: '🍔', cigarros: '🚬', doces: '🍬' };

export default function Inventory() {
  const { products, addProduct, removeProduct, updateProduct } = useStore();
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', price: '', category: 'bebidas' as Product['category'], emoji: '🍺' });

  const handleAdd = () => {
    if (!form.name || !form.price) return;
    addProduct({ name: form.name, price: parseFloat(form.price), category: form.category, emoji: form.emoji || emojiMap[form.category] });
    setForm({ name: '', price: '', category: 'bebidas', emoji: '🍺' });
    setShowForm(false);
  };

  const handleUpdate = (id: string) => {
    if (!form.name || !form.price) return;
    updateProduct(id, { name: form.name, price: parseFloat(form.price), category: form.category, emoji: form.emoji });
    setEditId(null);
  };

  const startEdit = (p: Product) => {
    setEditId(p.id);
    setForm({ name: p.name, price: String(p.price), category: p.category, emoji: p.emoji });
  };

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Produtos</h1>
          <p className="text-muted-foreground text-sm mt-1">{products.length} itens cadastrados</p>
        </div>
        <motion.button whileTap={{ scale: 0.96 }}
          onClick={() => { setShowForm(!showForm); setEditId(null); }}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium text-sm">
          <Plus size={16} /> Novo Produto
        </motion.button>
      </div>

      {/* Add form */}
      {showForm && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
          className="card-surface p-5 space-y-4">
          <h3 className="font-display font-semibold">Novo Produto</h3>
          <div className="grid grid-cols-2 gap-3">
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Nome" className="bg-muted/50 px-3 py-2.5 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/50 text-foreground placeholder:text-muted-foreground" />
            <input value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })}
              placeholder="Preço" type="number" className="bg-muted/50 px-3 py-2.5 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/50 font-mono text-foreground placeholder:text-muted-foreground" />
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as Product['category'], emoji: emojiMap[e.target.value as Product['category']] })}
              className="bg-muted/50 px-3 py-2.5 rounded-lg text-sm outline-none text-foreground">
              {categoryOptions.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <input value={form.emoji} onChange={(e) => setForm({ ...form, emoji: e.target.value })}
              placeholder="Emoji" className="bg-muted/50 px-3 py-2.5 rounded-lg text-sm text-center outline-none text-foreground placeholder:text-muted-foreground" />
          </div>
          <div className="flex gap-2">
            <button onClick={handleAdd} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium">Adicionar</button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 bg-muted text-muted-foreground rounded-lg text-sm">Cancelar</button>
          </div>
        </motion.div>
      )}

      {/* Products list */}
      <div className="space-y-2">
        {products.map((product) => (
          <motion.div key={product.id} layout className="card-surface-sm p-4 flex items-center gap-4">
            {editId === product.id ? (
              <>
                <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-2">
                  <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="bg-muted/50 px-2 py-1.5 rounded text-sm outline-none text-foreground" />
                  <input value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })}
                    type="number" className="bg-muted/50 px-2 py-1.5 rounded text-sm font-mono outline-none text-foreground" />
                  <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as Product['category'] })}
                    className="bg-muted/50 px-2 py-1.5 rounded text-sm outline-none text-foreground">
                    {categoryOptions.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <input value={form.emoji} onChange={(e) => setForm({ ...form, emoji: e.target.value })}
                    className="bg-muted/50 px-2 py-1.5 rounded text-sm text-center outline-none text-foreground" />
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
                <span className="font-mono text-primary font-semibold">R$ {product.price.toFixed(2)}</span>
                <button onClick={() => startEdit(product)} className="text-muted-foreground hover:text-foreground p-2 rounded hover:bg-muted/50"><Edit2 size={14} /></button>
                <button onClick={() => removeProduct(product.id)} className="text-muted-foreground hover:text-accent p-2 rounded hover:bg-accent/10"><Trash2 size={14} /></button>
              </>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
