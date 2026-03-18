import { useEffect, useState } from 'react';
import { useStore } from '@/store/useStore';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { generateReportPdf } from '@/lib/generateReportPdf';
import { Download } from 'lucide-react';

const COLORS = ['hsl(82,84%,67%)', 'hsl(270,70%,60%)', 'hsl(25,95%,60%)', 'hsl(200,80%,60%)'];

interface SaleDetail {
  product_name: string;
  product_category: string;
  quantity: number;
  unit_price: number;
  cost_price: number;
  operator_email: string;
  created_at: string;
  sale_number: string | null;
}

export default function Reports() {
  const { transactions, tags, fetchTransactions, fetchTags } = useStore();
  const { user } = useAuth();
  const [saleDetails, setSaleDetails] = useState<SaleDetail[]>([]);
  const [filterOperator, setFilterOperator] = useState<string>('all');
  const [operators, setOperators] = useState<{ id: string; email: string }[]>([]);

  useEffect(() => {
    if (user) {
      fetchTransactions();
      fetchTags();
      loadSaleDetails();
      loadOperators();
    }
  }, [user]);

  const loadSaleDetails = async () => {
    const { data } = await supabase
      .from('sale_items')
      .select(`
        quantity, unit_price, created_at, sale_number,
        product:products(name, category, cost_price),
        transaction:transactions(operator_id, created_at)
      `)
      .order('created_at', { ascending: false });

    if (data) {
      // Load profiles for operator names
      const opIds = [...new Set(data.map((d: any) => d.transaction?.operator_id).filter(Boolean))];
      const { data: profiles } = await supabase.from('profiles').select('user_id, email').in('user_id', opIds);
      const profileMap = new Map(profiles?.map(p => [p.user_id, p.email]) || []);

      setSaleDetails(data.map((d: any) => ({
        product_name: d.product?.name || 'Unknown',
        product_category: d.product?.category || '',
        quantity: d.quantity,
        unit_price: Number(d.unit_price),
        cost_price: Number(d.product?.cost_price || 0),
        operator_email: profileMap.get(d.transaction?.operator_id) || 'Unknown',
        created_at: d.transaction?.created_at || d.created_at,
        sale_number: d.sale_number || null,
      })));
    }
  };

  const loadOperators = async () => {
    const { data } = await supabase.from('profiles').select('user_id, email');
    if (data) setOperators(data.map(p => ({ id: p.user_id, email: p.email || '' })));
  };

  const filteredTransactions = filterOperator === 'all'
    ? transactions
    : transactions.filter(t => t.operator_id === filterOperator);

  const filteredSaleDetails = filterOperator === 'all'
    ? saleDetails
    : saleDetails.filter(d => {
        const op = operators.find(o => o.email === d.operator_email);
        return op?.id === filterOperator;
      });

  const totalSales = filteredTransactions.filter(t => t.type === 'purchase').reduce((s, t) => s + t.amount, 0);
  const totalLoaded = filteredTransactions.filter(t => t.type === 'load').reduce((s, t) => s + t.amount, 0);
  const totalBalance = tags.reduce((s, t) => s + t.balance, 0);
  const totalCost = filteredSaleDetails.reduce((s, d) => s + d.cost_price * d.quantity, 0);
  const totalRevenue = filteredSaleDetails.reduce((s, d) => s + d.unit_price * d.quantity, 0);
  const totalProfit = totalRevenue - totalCost;
  const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue * 100) : 0;
  const totalCourtesy = filteredTransactions.filter(t => t.type === 'courtesy').reduce((s, t) => s + t.amount, 0);
  const courtesyTransactions = filteredTransactions.filter(t => t.type === 'courtesy');

  // Ticket & parking counters
  const ingressosSold = filteredSaleDetails.filter(d => d.product_category === 'ingressos');
  const estacionamentoSold = filteredSaleDetails.filter(d => d.product_category === 'estacionamento');
  const ingressosCount = ingressosSold.reduce((s, d) => s + d.quantity, 0);
  const estacionamentoCount = estacionamentoSold.reduce((s, d) => s + d.quantity, 0);
  const ingressosRevenue = ingressosSold.reduce((s, d) => s + d.unit_price * d.quantity, 0);
  const estacionamentoRevenue = estacionamentoSold.reduce((s, d) => s + d.unit_price * d.quantity, 0);

  // Category breakdown
  const categoryMap: Record<string, number> = {};
  filteredSaleDetails.forEach(d => {
    categoryMap[d.product_category] = (categoryMap[d.product_category] || 0) + d.unit_price * d.quantity;
  });
  const categoryData = Object.entries(categoryMap).map(([name, value]) => ({ name, value }));

  // Product popularity
  const productMap: Record<string, number> = {};
  filteredSaleDetails.forEach(d => {
    productMap[d.product_name] = (productMap[d.product_name] || 0) + d.quantity;
  });
  const productData = Object.entries(productMap).map(([name, qty]) => ({ name, qty })).sort((a, b) => b.qty - a.qty).slice(0, 8);

  // Sales by operator
  const operatorSalesMap: Record<string, number> = {};
  filteredSaleDetails.forEach(d => {
    operatorSalesMap[d.operator_email] = (operatorSalesMap[d.operator_email] || 0) + d.unit_price * d.quantity;
  });
  const operatorData = Object.entries(operatorSalesMap).map(([name, value]) => ({ name: name.split('@')[0], value }));

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold">Relatórios</h1>
          <p className="text-muted-foreground text-sm mt-1">Análise completa de vendas e carregamentos</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={filterOperator}
            onChange={(e) => setFilterOperator(e.target.value)}
            className="bg-muted/50 px-3 py-2 rounded-lg text-sm outline-none text-foreground"
          >
            <option value="all">Todos os Operadores</option>
            {operators.map(op => (
              <option key={op.id} value={op.id}>{op.email}</option>
            ))}
          </select>
          <button
            onClick={() => generateReportPdf({
              totalSales, totalLoaded, totalBalance, totalCost, totalRevenue,
              totalProfit, profitMargin, totalCourtesy,
              ingressosCount, ingressosRevenue, estacionamentoCount, estacionamentoRevenue,
              categoryData, productData, operatorData,
              courtesyTransactions: courtesyTransactions as any,
              transactions: filteredTransactions,
            })}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Download size={16} /> PDF
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {[
          { label: 'Total Vendido', value: `R$ ${totalSales.toFixed(2)}`, glow: 'glow-primary' },
          { label: 'Total Carregado', value: `R$ ${totalLoaded.toFixed(2)}`, glow: 'glow-secondary' },
          { label: 'Saldo em Tags', value: `R$ ${totalBalance.toFixed(2)}`, glow: 'glow-primary' },
          { label: 'Custo Total', value: `R$ ${totalCost.toFixed(2)}`, glow: '' },
          { label: 'Lucro', value: `R$ ${totalProfit.toFixed(2)} (${profitMargin.toFixed(1)}%)`, glow: 'glow-secondary' },
          { label: 'Consumação', value: `R$ ${totalCourtesy.toFixed(2)}`, glow: '' },
        ].map((s) => (
          <div key={s.label} className={`card-surface p-4 ${s.glow}`}>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">{s.label}</p>
            <p className="font-mono text-xl font-bold mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Ingressos & Estacionamento */}
      <div className="grid grid-cols-2 gap-3">
        <div className="card-surface p-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-2xl">🎫</span>
            <div>
              <h3 className="font-display font-semibold text-sm">Ingressos</h3>
              <p className="text-xs text-muted-foreground">{ingressosCount} vendidos • R$ {ingressosRevenue.toFixed(2)}</p>
            </div>
          </div>
          {ingressosSold.filter(d => d.sale_number).length > 0 && (
            <div className="space-y-1 max-h-[150px] overflow-y-auto">
              {ingressosSold.filter(d => d.sale_number).map((d, i) => (
                <div key={i} className="flex items-center justify-between px-2 py-1.5 bg-muted/20 rounded text-xs">
                  <span className="font-mono font-semibold text-primary">{d.sale_number}</span>
                  <span className="text-muted-foreground">{new Date(d.created_at).toLocaleString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="card-surface p-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-2xl">🅿️</span>
            <div>
              <h3 className="font-display font-semibold text-sm">Estacionamento</h3>
              <p className="text-xs text-muted-foreground">{estacionamentoCount} vendidos • R$ {estacionamentoRevenue.toFixed(2)}</p>
            </div>
          </div>
          {estacionamentoSold.filter(d => d.sale_number).length > 0 && (
            <div className="space-y-1 max-h-[150px] overflow-y-auto">
              {estacionamentoSold.filter(d => d.sale_number).map((d, i) => (
                <div key={i} className="flex items-center justify-between px-2 py-1.5 bg-muted/20 rounded text-xs">
                  <span className="font-mono font-semibold text-secondary">{d.sale_number}</span>
                  <span className="text-muted-foreground">{new Date(d.created_at).toLocaleString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
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

        <div className="card-surface p-5">
          <h3 className="font-display font-semibold text-sm mb-4">Vendas por Categoria</h3>
          {categoryData.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-12">Realize vendas para ver dados</p>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={categoryData} cx="50%" cy="50%" innerRadius={50} outerRadius={90} dataKey="value" label={({ name }) => name}>
                  {categoryData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: 'hsl(240,5%,7.5%)', border: 'none', borderRadius: 8, color: '#fff' }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Sales by operator */}
        <div className="card-surface p-5 lg:col-span-2">
          <h3 className="font-display font-semibold text-sm mb-4">Vendas por Operador</h3>
          {operatorData.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-12">Nenhuma venda registrada</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={operatorData} layout="vertical">
                <XAxis type="number" tick={{ fill: 'hsl(0,0%,55%)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis dataKey="name" type="category" tick={{ fill: 'hsl(0,0%,55%)', fontSize: 11 }} axisLine={false} tickLine={false} width={100} />
                <Tooltip contentStyle={{ background: 'hsl(240,5%,7.5%)', border: 'none', borderRadius: 8, color: '#fff' }} />
                <Bar dataKey="value" fill="hsl(270,70%,60%)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Courtesy section */}
      {courtesyTransactions.length > 0 && (
        <div className="card-surface p-5">
          <h3 className="font-display font-semibold text-sm mb-4">🎵 Consumação DJ / Staff ({courtesyTransactions.length})</h3>
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {courtesyTransactions.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between p-3 bg-secondary/5 rounded-lg border border-secondary/10">
                <div>
                  <p className="text-sm font-medium">{(tx as any).courtesy_name || 'Sem nome'}</p>
                  <span className="text-xs text-muted-foreground capitalize">{(tx as any).courtesy_role || ''} • {new Date(tx.created_at).toLocaleString('pt-BR')}</span>
                </div>
                <span className="font-mono font-semibold text-secondary">R$ {tx.amount.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Transaction log */}
      <div className="card-surface p-5">
        <h3 className="font-display font-semibold text-sm mb-4">Histórico ({filteredTransactions.length})</h3>
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {filteredTransactions.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-8">Nenhuma transação registrada</p>
          ) : filteredTransactions.map((tx) => (
            <div key={tx.id} className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
              <div>
                <span className={`text-xs font-medium uppercase tracking-wider ${
                  tx.type === 'load' ? 'text-primary' : tx.type === 'courtesy' ? 'text-secondary' : 'text-accent'
                }`}>
                  {tx.type === 'load' ? 'CARGA' : tx.type === 'courtesy' ? 'CONSUMAÇÃO' : 'COMPRA'}
                </span>
                {tx.type === 'courtesy' && (tx as any).courtesy_name && (
                  <span className="text-xs text-muted-foreground ml-2">{(tx as any).courtesy_name}</span>
                )}
                <p className="font-mono text-xs text-muted-foreground mt-0.5">
                  {new Date(tx.created_at).toLocaleString('pt-BR')}
                </p>
              </div>
              <span className={`font-mono font-semibold ${
                tx.type === 'load' ? 'text-primary' : tx.type === 'courtesy' ? 'text-secondary' : 'text-accent'
              }`}>
                {tx.type === 'purchase' ? '-' : '+'}R$ {tx.amount.toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
