import jsPDF from 'jspdf';

interface ReportData {
  totalSales: number;
  totalLoaded: number;
  totalBalance: number;
  totalCost: number;
  totalRevenue: number;
  totalProfit: number;
  profitMargin: number;
  totalCourtesy: number;
  ingressosCount: number;
  ingressosRevenue: number;
  estacionamentoCount: number;
  estacionamentoRevenue: number;
  categoryData: { name: string; value: number }[];
  productData: { name: string; qty: number }[];
  operatorData: { name: string; value: number }[];
  courtesyTransactions: { amount: number; courtesy_name?: string | null; courtesy_role?: string | null; created_at: string }[];
  transactions: { amount: number; type: string; created_at: string }[];
}

export function generateReportPdf(data: ReportData) {
  const doc = new jsPDF();
  const W = doc.internal.pageSize.getWidth();
  let y = 20;

  const addLine = (text: string, size = 10, bold = false, color: [number, number, number] = [255, 255, 255]) => {
    if (y > 270) { doc.addPage(); fillBg(); y = 20; }
    doc.setTextColor(...color);
    doc.setFontSize(size);
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.text(text, 15, y);
    y += size * 0.5 + 3;
  };

  const addValue = (label: string, value: string) => {
    if (y > 270) { doc.addPage(); fillBg(); y = 20; }
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(150, 150, 150);
    doc.text(label, 15, y);
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.text(value, W - 15, y, { align: 'right' });
    y += 7;
  };

  const addSeparator = () => {
    doc.setDrawColor(60, 60, 65);
    doc.line(15, y, W - 15, y);
    y += 5;
  };

  const fillBg = () => {
    doc.setFillColor(10, 10, 15);
    doc.rect(0, 0, W, doc.internal.pageSize.getHeight(), 'F');
  };

  // Page 1
  fillBg();

  // Header bar
  doc.setFillColor(184, 242, 71);
  doc.rect(0, 0, W, 5, 'F');

  y = 25;
  doc.setTextColor(184, 242, 71);
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.text('TagFlow', 15, y);
  const tw = doc.getTextWidth('TagFlow');
  doc.setTextColor(168, 85, 247);
  doc.text('Psy', 15 + tw + 2, y);
  y += 10;

  doc.setTextColor(150, 150, 150);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Relatório gerado em ${new Date().toLocaleString('pt-BR')}`, 15, y);
  y += 15;

  // Summary
  addLine('RESUMO FINANCEIRO', 14, true, [184, 242, 71]);
  y += 3;
  addValue('Total Vendido', `R$ ${data.totalSales.toFixed(2)}`);
  addValue('Total Carregado', `R$ ${data.totalLoaded.toFixed(2)}`);
  addValue('Saldo em Tags', `R$ ${data.totalBalance.toFixed(2)}`);
  addValue('Custo Total', `R$ ${data.totalCost.toFixed(2)}`);
  addValue('Receita', `R$ ${data.totalRevenue.toFixed(2)}`);
  addValue('Lucro', `R$ ${data.totalProfit.toFixed(2)} (${data.profitMargin.toFixed(1)}%)`);
  addValue('Consumação (Cortesia)', `R$ ${data.totalCourtesy.toFixed(2)}`);
  y += 5;
  addSeparator();

  // Ingressos & Estacionamento
  addLine('INGRESSOS & ESTACIONAMENTO', 14, true, [168, 85, 247]);
  y += 3;
  addValue('Ingressos vendidos', `${data.ingressosCount} — R$ ${data.ingressosRevenue.toFixed(2)}`);
  addValue('Estacionamento vendido', `${data.estacionamentoCount} — R$ ${data.estacionamentoRevenue.toFixed(2)}`);
  y += 5;
  addSeparator();

  // Categories
  if (data.categoryData.length > 0) {
    addLine('VENDAS POR CATEGORIA', 14, true, [184, 242, 71]);
    y += 3;
    data.categoryData.forEach(c => addValue(c.name, `R$ ${c.value.toFixed(2)}`));
    y += 5;
    addSeparator();
  }

  // Products
  if (data.productData.length > 0) {
    addLine('PRODUTOS MAIS VENDIDOS', 14, true, [168, 85, 247]);
    y += 3;
    data.productData.forEach(p => addValue(p.name, `${p.qty} un.`));
    y += 5;
    addSeparator();
  }

  // Operators
  if (data.operatorData.length > 0) {
    addLine('VENDAS POR OPERADOR', 14, true, [184, 242, 71]);
    y += 3;
    data.operatorData.forEach(o => addValue(o.name, `R$ ${o.value.toFixed(2)}`));
    y += 5;
    addSeparator();
  }

  // Courtesy
  if (data.courtesyTransactions.length > 0) {
    addLine('CONSUMAÇÃO DJ / STAFF', 14, true, [168, 85, 247]);
    y += 3;
    data.courtesyTransactions.forEach(tx => {
      addValue(
        `${(tx as any).courtesy_name || 'Sem nome'} (${(tx as any).courtesy_role || ''})`,
        `R$ ${tx.amount.toFixed(2)}`
      );
    });
    y += 5;
    addSeparator();
  }

  // Transaction history
  addLine('HISTÓRICO DE TRANSAÇÕES', 14, true, [184, 242, 71]);
  y += 3;
  const typeLabel = (t: string) => t === 'load' ? 'CARGA' : t === 'courtesy' ? 'CONSUMAÇÃO' : 'COMPRA';
  data.transactions.slice(0, 50).forEach(tx => {
    addValue(
      `${typeLabel(tx.type)} — ${new Date(tx.created_at).toLocaleString('pt-BR')}`,
      `${tx.type === 'purchase' ? '-' : '+'}R$ ${tx.amount.toFixed(2)}`
    );
  });
  if (data.transactions.length > 50) {
    addLine(`... e mais ${data.transactions.length - 50} transações`, 9, false, [150, 150, 150]);
  }

  // Footer on last page
  doc.setFillColor(168, 85, 247);
  doc.rect(0, doc.internal.pageSize.getHeight() - 3, W, 3, 'F');

  doc.save(`TagFlow_Relatorio_${new Date().toISOString().slice(0, 10)}.pdf`);
}
