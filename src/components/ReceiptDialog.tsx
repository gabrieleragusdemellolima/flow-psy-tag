import { motion, AnimatePresence } from 'framer-motion';
import { Receipt, X, MessageCircle, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { buildReceiptText, whatsAppLink, type ReceiptData } from '@/lib/receipt';

interface Props {
  data: ReceiptData | null;
  onClose: () => void;
}

export default function ReceiptDialog({ data, onClose }: Props) {
  const text = data ? buildReceiptText(data) : '';
  const link = data ? whatsAppLink(data.customerPhone, text) : null;

  const handleWhats = () => {
    if (!link) {
      toast.error('Cliente sem WhatsApp cadastrado. Cadastre o telefone em "Cadastrar Tag".');
      return;
    }
    window.open(link, '_blank', 'noopener,noreferrer');
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text.replace(/\*/g, ''));
      toast.success('Recibo copiado');
    } catch {
      toast.error('Não foi possível copiar');
    }
  };

  return (
    <AnimatePresence>
      {data && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-background/80 backdrop-blur-sm p-4"
        >
          <motion.div
            initial={{ y: 30, scale: 0.97 }} animate={{ y: 0, scale: 1 }} exit={{ y: 30, opacity: 0 }}
            className="card-surface w-full max-w-sm p-5 space-y-4 max-h-[85vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between">
              <h2 className="font-display font-bold text-base flex items-center gap-2">
                <Receipt size={18} className="text-primary" />
                {data.type === 'load' ? 'Recibo de carga' : 'Recibo de compra'}
              </h2>
              <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
                <X size={18} />
              </button>
            </div>

            <pre className="whitespace-pre-wrap font-mono text-[11px] leading-relaxed bg-muted/30 rounded-lg p-3 text-foreground">
              {text.replace(/\*/g, '')}
            </pre>

            <div className="space-y-2">
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleWhats}
                className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-display font-bold text-sm glow-primary flex items-center justify-center gap-2"
              >
                <MessageCircle size={16} /> ENVIAR NO WHATSAPP
              </motion.button>
              {!link && (
                <p className="text-[11px] text-muted-foreground text-center">
                  Nenhum WhatsApp vinculado a esta tag.
                </p>
              )}
              <button
                onClick={handleCopy}
                className="w-full py-2.5 rounded-lg bg-muted/40 text-muted-foreground text-xs font-medium flex items-center justify-center gap-2 hover:text-foreground"
              >
                <Copy size={14} /> Copiar recibo
              </button>
              <button onClick={onClose} className="w-full py-2 text-xs text-muted-foreground hover:text-foreground">
                Fechar
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
