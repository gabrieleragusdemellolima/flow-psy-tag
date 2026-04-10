import { useState, useRef, useCallback, useEffect } from 'react';
import { ScanFace, SwitchCamera, X, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface FaceScanResult {
  id: string;
  name: string;
  phone: string | null;
  photo_url: string | null;
  tag_id: string | null;
  balance: number;
}

interface FaceScanProps {
  open: boolean;
  onMatch: (customer: FaceScanResult) => void;
  onCancel: () => void;
}

export default function FaceScan({ open, onMatch, onCancel }: FaceScanProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState('');
  const [scanning, setScanning] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setIsMobile(/Android|iPhone|iPad|iPod/i.test(navigator.userAgent));
  }, []);

  const startCamera = useCallback(async () => {
    try {
      if (stream) stream.getTracks().forEach((t) => t.stop());

      const constraints: MediaStreamConstraints = {
        video: isMobile
          ? { facingMode, width: { ideal: 640 }, height: { ideal: 480 } }
          : selectedDeviceId
            ? { deviceId: { exact: selectedDeviceId }, width: { ideal: 640 }, height: { ideal: 480 } }
            : { width: { ideal: 640 }, height: { ideal: 480 } },
      };

      const s = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(s);
      if (videoRef.current) {
        videoRef.current.srcObject = s;
        await videoRef.current.play();
      }

      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = allDevices.filter((d) => d.kind === 'videoinput');
      setDevices(videoDevices);
      if (!selectedDeviceId && videoDevices.length > 0) {
        setSelectedDeviceId(videoDevices[0].deviceId);
      }
    } catch (err) {
      console.error('Camera error:', err);
      toast.error('Não foi possível acessar a câmera');
    }
  }, [facingMode, selectedDeviceId, isMobile, stream]);

  useEffect(() => {
    if (open) startCamera();
    return () => {
      stream?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, facingMode, selectedDeviceId]);

  const handleScan = async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(video, 0, 0);

    const base64 = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];

    setScanning(true);
    try {
      const { data, error } = await supabase.functions.invoke('face-match', {
        body: { photo_base64: base64 },
      });

      if (error) throw error;

      if (data?.match && data.customer) {
        toast.success(`Cliente identificado: ${data.customer.name}`);
        stream?.getTracks().forEach((t) => t.stop());
        onMatch(data.customer);
      } else {
        toast.error('Nenhum cliente encontrado. Tente novamente ou cadastre o cliente.');
      }
    } catch (err: any) {
      console.error('Face scan error:', err);
      toast.error(err?.message || 'Erro ao escanear rosto');
    } finally {
      setScanning(false);
    }
  };

  const handleCancel = () => {
    stream?.getTracks().forEach((t) => t.stop());
    onCancel();
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-background/95 backdrop-blur-md flex flex-col items-center justify-center p-4"
      >
        <canvas ref={canvasRef} className="hidden" />

        <div className="w-full max-w-md space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-semibold text-foreground flex items-center gap-2">
              <ScanFace size={20} className="text-secondary" /> Face Scan
            </h3>
            <button onClick={handleCancel} className="p-2 rounded-lg bg-muted/30 hover:bg-muted/50 text-muted-foreground">
              <X size={20} />
            </button>
          </div>

          <div className="relative aspect-[4/3] bg-muted/20 rounded-xl overflow-hidden">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
              style={{ transform: facingMode === 'user' ? 'scaleX(-1)' : 'none' }}
            />
            {scanning && (
              <div className="absolute inset-0 bg-secondary/10 flex items-center justify-center backdrop-blur-sm">
                <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
                  <Loader2 size={48} className="text-secondary" />
                </motion.div>
                <p className="absolute bottom-4 text-sm text-secondary font-medium">Identificando...</p>
              </div>
            )}
            {/* Scan overlay */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 border-2 border-secondary/50 rounded-full" />
            </div>
          </div>

          {!isMobile && devices.length > 1 && (
            <select
              value={selectedDeviceId}
              onChange={(e) => setSelectedDeviceId(e.target.value)}
              className="w-full bg-muted/50 text-foreground text-sm px-4 py-2.5 rounded-lg outline-none focus:ring-2 focus:ring-secondary/50"
            >
              {devices.map((d) => (
                <option key={d.deviceId} value={d.deviceId}>
                  {d.label || `Câmera ${devices.indexOf(d) + 1}`}
                </option>
              ))}
            </select>
          )}

          <div className="flex gap-3">
            {isMobile && (
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setFacingMode((f) => (f === 'user' ? 'environment' : 'user'))}
                className="px-4 py-3 bg-muted/30 text-foreground rounded-lg"
              >
                <SwitchCamera size={20} />
              </motion.button>
            )}
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleScan}
              disabled={scanning}
              className="flex-1 py-3 bg-secondary text-secondary-foreground rounded-lg font-display font-bold text-sm flex items-center justify-center gap-2 glow-secondary disabled:opacity-50"
            >
              {scanning ? (
                <>
                  <Loader2 size={18} className="animate-spin" /> IDENTIFICANDO...
                </>
              ) : (
                <>
                  <ScanFace size={18} /> ESCANEAR ROSTO
                </>
              )}
            </motion.button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
