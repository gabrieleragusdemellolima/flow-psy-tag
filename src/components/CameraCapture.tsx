import { useState, useRef, useCallback, useEffect } from 'react';
import { Camera, SwitchCamera, X, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface CameraCaptureProps {
  onCapture: (base64: string, blob: Blob) => void;
  onCancel: () => void;
  open: boolean;
}

export default function CameraCapture({ onCapture, onCancel, open }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [captured, setCaptured] = useState<string | null>(null);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
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

      // List devices after permission
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = allDevices.filter((d) => d.kind === 'videoinput');
      setDevices(videoDevices);
      if (!selectedDeviceId && videoDevices.length > 0) {
        setSelectedDeviceId(videoDevices[0].deviceId);
      }
    } catch (err) {
      console.error('Camera error:', err);
    }
  }, [facingMode, selectedDeviceId, isMobile, stream]);

  useEffect(() => {
    if (open && !captured) {
      startCamera();
    }
    return () => {
      stream?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, facingMode, selectedDeviceId]);

  const handleCapture = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(video, 0, 0);

    const base64 = canvas.toDataURL('image/jpeg', 0.85).split(',')[1];
    canvas.toBlob((blob) => {
      if (blob) {
        setCaptured(canvas.toDataURL('image/jpeg', 0.85));
        setCapturedBlob(blob);
      }
    }, 'image/jpeg', 0.85);

    stream?.getTracks().forEach((t) => t.stop());
  };

  const handleConfirm = () => {
    if (captured && capturedBlob) {
      const b64 = captured.split(',')[1];
      onCapture(b64, capturedBlob);
      setCaptured(null);
      setCapturedBlob(null);
    }
  };

  const handleRetake = () => {
    setCaptured(null);
    setCapturedBlob(null);
    startCamera();
  };

  const handleCancel = () => {
    stream?.getTracks().forEach((t) => t.stop());
    setCaptured(null);
    setCapturedBlob(null);
    onCancel();
  };

  const toggleFacing = () => {
    setFacingMode((f) => (f === 'user' ? 'environment' : 'user'));
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
          {/* Header */}
          <div className="flex items-center justify-between">
            <h3 className="font-display font-semibold text-foreground">📸 Capturar Foto</h3>
            <button onClick={handleCancel} className="p-2 rounded-lg bg-muted/30 hover:bg-muted/50 text-muted-foreground">
              <X size={20} />
            </button>
          </div>

          {/* Camera / Preview */}
          <div className="relative aspect-[4/3] bg-muted/20 rounded-xl overflow-hidden">
            {captured ? (
              <img src={captured} alt="Foto capturada" className="w-full h-full object-cover" />
            ) : (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
                style={{ transform: facingMode === 'user' ? 'scaleX(-1)' : 'none' }}
              />
            )}
          </div>

          {/* Device selector (PC) */}
          {!isMobile && devices.length > 1 && !captured && (
            <select
              value={selectedDeviceId}
              onChange={(e) => setSelectedDeviceId(e.target.value)}
              className="w-full bg-muted/50 text-foreground text-sm px-4 py-2.5 rounded-lg outline-none focus:ring-2 focus:ring-primary/50"
            >
              {devices.map((d) => (
                <option key={d.deviceId} value={d.deviceId}>
                  {d.label || `Câmera ${devices.indexOf(d) + 1}`}
                </option>
              ))}
            </select>
          )}

          {/* Controls */}
          <div className="flex gap-3">
            {captured ? (
              <>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={handleRetake}
                  className="flex-1 py-3 bg-muted/30 text-foreground rounded-lg font-medium text-sm flex items-center justify-center gap-2"
                >
                  <Camera size={18} /> Tirar outra
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={handleConfirm}
                  className="flex-1 py-3 bg-primary text-primary-foreground rounded-lg font-medium text-sm flex items-center justify-center gap-2 glow-primary"
                >
                  <Check size={18} /> Confirmar
                </motion.button>
              </>
            ) : (
              <>
                {isMobile && (
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={toggleFacing}
                    className="px-4 py-3 bg-muted/30 text-foreground rounded-lg"
                  >
                    <SwitchCamera size={20} />
                  </motion.button>
                )}
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={handleCapture}
                  className="flex-1 py-3 bg-primary text-primary-foreground rounded-lg font-display font-bold text-sm flex items-center justify-center gap-2 glow-primary"
                >
                  <Camera size={18} /> CAPTURAR
                </motion.button>
              </>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
