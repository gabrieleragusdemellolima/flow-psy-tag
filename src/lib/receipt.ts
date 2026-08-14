export interface ReceiptItem {
  name: string;
  quantity: number;
  unit_price: number;
}

export interface ReceiptData {
  type: 'load' | 'sale';
  tagCode?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  operatorName: string;
  operatorNumber?: string | null;
  paymentMethod?: string | null;
  amount: number;
  balanceAfter?: number | null;
  items?: ReceiptItem[];
  date: Date;
}

const brl = (v: number) => `R$ ${v.toFixed(2).replace('.', ',')}`;

const paymentLabels: Record<string, string> = {
  cash: 'Dinheiro',
  pix: 'Pix',
  card: 'Cartão',
  cortesia: 'Cortesia',
};

export function buildReceiptText(r: ReceiptData): string {
  const lines: string[] = [];
  lines.push('*TAGFLOW PSY*');
  lines.push(r.type === 'load' ? 'RECIBO DE CARGA' : 'RECIBO DE COMPRA');
  lines.push('--------------------------------');
  lines.push(`Data: ${r.date.toLocaleString('pt-BR')}`);
  if (r.customerName) lines.push(`Cliente: ${r.customerName}`);
  if (r.tagCode) lines.push(`Tag: ${r.tagCode}`);
  lines.push(`Operador: ${r.operatorName}${r.operatorNumber ? ` (#${r.operatorNumber})` : ''}`);
  lines.push('--------------------------------');

  if (r.items?.length) {
    for (const it of r.items) {
      lines.push(`${it.quantity}x ${it.name} — ${brl(it.unit_price * it.quantity)}`);
    }
    lines.push('--------------------------------');
  }

  if (r.paymentMethod) {
    lines.push(`Pagamento: ${paymentLabels[r.paymentMethod] ?? r.paymentMethod}`);
  }
  lines.push(`${r.type === 'load' ? 'Valor carregado' : 'Total'}: ${brl(r.amount)}`);
  if (r.balanceAfter != null) lines.push(`Saldo atual: ${brl(r.balanceAfter)}`);
  lines.push('--------------------------------');
  lines.push('Obrigado! 🍄');

  return lines.join('\n');
}

/** Normalizes a Brazilian phone number to the wa.me format (55 + DDD + number). */
export function toWhatsAppNumber(phone?: string | null): string | null {
  if (!phone) return null;
  let digits = phone.replace(/\D/g, '');
  if (digits.length < 10) return null;
  if (!digits.startsWith('55')) digits = `55${digits}`;
  if (digits.length < 12 || digits.length > 13) return null;
  return digits;
}

export function whatsAppLink(phone: string | null | undefined, text: string): string | null {
  const number = toWhatsAppNumber(phone);
  if (!number) return null;
  return `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
}

export { brl as formatBRL, paymentLabels };
