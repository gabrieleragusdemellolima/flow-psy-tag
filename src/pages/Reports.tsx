import { useStore } from '@/store/useStore';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['hsl(82,84%,67%)', 'hsl(270,70%,60%)', 'hsl(25,95%,60%)', 'hsl(200,80%,60%)'];

export default function Reports() {
  const { transactions, tags, products } = useStore();

  const purchases = transactions.filter((t) => t.type === 'purchase');
  const loads = transactions.filter((t) => t.type === 'load');

  const totalSales = purchases.reduce((s, t) => s + t.amount, 0);
  const totalLoaded = loads.reduce((s, t) => s + t.amount, 0);
  const totalBalance = tags.reduce((s, t) => s + t.balance, 0);

  // Sales by category
  const categoryMap: Record<string, number> = {};
  purchases.forEach((tx) => {
    tx.items?.forEach((item) => {
      const cat = item.product.category;
      categoryMap[cat] = (categoryMap[cat] || 0) + item.product.price * item.quantity;
    });
  });
  const categoryData = Object.entries(categoryMap).map(([name, value]) => ({ name, value }));

  // Product popularity
  const productMap: Record<string, number> = {};
  purchases.forEach((tx) => {
    tx.items?.forEach((item) => {
      productMap[item.product.name] = (productMap[item.product.name] || 0) + item.quantity;
    });
  });
  const productData = Object.entries(productMap)
    .map(([name, qty]) => ({ name, qty }))
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 8);

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <div>
        <h1 className="font-display text-2xl font-bold">Relatórios</h1>
        <p className="text-muted-foreground text-sm mt-1">Análise de vendas e transações</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total Vendido', value: `R$ ${totalSales.toFixed(2)}`, glow: 'glow-primary' },
          { label: 'Total Carregado', value: `R$ ${totalLoaded.toFixed(2)}`, glow: 'glow-secondary' },
          { label: 'Saldo em Tags', value: `R$ ${totalBalance.toFixed(2)}`, glow: 'glow-primary' },
        ].map((s) => (
          <div key={s.label} className={`card-surface p-4 ${s.glow}`}>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">{s.label}</p>
            <p className="font-mono text-xl font-bold mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Bar chart */}
        <div className="card-surface p-5">
          <h3 className="font-display font-semibold text-sm mb-4">Produtos Mais Vendidos</h3>
          {productData.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-12">Realize vendas para ver dados</p>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={productData}>
                <XAxis dataKey="name" tick={{ fill: 'hsl(0,0%,55%)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'hsl(0,0%,55%)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: 'hsl(240,5%,7.5%)', border: 'none', borderRadius: 8, color: '#fff' }} />
                <Bar dataKey="qty" fill="hsl(82,84%,67%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Pie chart */}
        <div className="card-surface p-5">
          <h3 className="font-display font-semibold text-sm mb-4">Vendas por Categoria</h3>
          {categoryData.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-12">Realize vendas para ver dados</p>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={categoryData} cx="50%" cy="50%" innerRadius={50} outerRadius={90} dataKey="value" label={({ name }) => name}>
                  {categoryData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: 'hsl(240,5%,7.5%)', border: 'none', borderRadius: 8, color: '#fff' }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Transaction log */}
      <div className="card-surface p-5">
        <h3 className="font-display font-semibold text-sm mb-4">Histórico Completo ({transactions.length})</h3>
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {transactions.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-8">Nenhuma transação registrada</p>
          ) : (
            transactions.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
                <div>
                  <span className={`text-xs font-medium uppercase tracking-wider ${tx.type === 'load' ? 'text-primary' : 'text-secondary'}`}>
                    {tx.type === 'load' ? 'CARGA' : 'COMPRA'}
                  </span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="font-mono text-xs text-muted-foreground">{tx.tagId}</span>
                    <span className="text-xs text-muted-foreground">
                      {tx.timestamp.toLocaleTimeString('pt-BR')}
                    </span>
                  </div>
                </div>
                <span className={`font-mono font-semibold ${tx.type === 'load' ? 'text-primary' : 'text-secondary'}`}>
                  {tx.type === 'load' ? '+' : '-'}R$ {tx.amount.toFixed(2)}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
