"use client";
import { useEffect, useRef, useState } from "react";
import { Camera, Loader2 } from "lucide-react";

type Props = {
  open: boolean;
  onClose: () => void;
  onCapture: (file: File) => void;
  aspect?: "square" | "landscape" | "portrait";
};

export default function WebcamCapture({ open, onClose, onCapture, aspect = "square" }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!open) {
      setIsLoading(true);
      setIsReady(false);
      setError(null);
      return;
    }
    let active = true;
    
    const startCamera = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // Check if we're in a secure context (required for camera access)
        if (typeof window !== 'undefined' && !window.isSecureContext) {
          throw new Error("Kamera membutuhkan koneksi aman (HTTPS atau localhost). Akses via https:// atau localhost.");
        }
        
        // Check if getUserMedia is available
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error("Browser tidak mendukung akses kamera. Gunakan HTTPS atau localhost.");
        }
        
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            facingMode: "user",
            width: { ideal: 640 },
            height: { ideal: 480 }
          }, 
          audio: false 
        });
        
        if (!active) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          
          // Wait for video to be ready
          videoRef.current.onloadedmetadata = () => {
            if (!active) return;
            videoRef.current?.play()
              .then(() => {
                if (active) {
                  setIsLoading(false);
                  setIsReady(true);
                }
              })
              .catch((playError) => {
                console.error("Video play error:", playError);
                if (active) {
                  setError("Gagal memutar video kamera");
                  setIsLoading(false);
                }
              });
          };
        }
      } catch (e: any) {
        console.error("Camera access error:", e);
        let errorMsg = "Tidak dapat mengakses kamera";
        if (e.name === "NotAllowedError" || e.name === "PermissionDeniedError") {
          errorMsg = "Akses kamera ditolak. Berikan izin kamera di browser.";
        } else if (e.name === "NotFoundError" || e.name === "DevicesNotFoundError") {
          errorMsg = "Kamera tidak ditemukan.";
        } else if (e.name === "NotReadableError" || e.name === "TrackStartError") {
          errorMsg = "Kamera sedang digunakan oleh aplikasi lain.";
        } else if (e.name === "OverconstrainedError") {
          errorMsg = "Kamera tidak mendukung resolusi yang diminta.";
        } else if (e.message) {
          errorMsg = e.message;
        }
        if (active) {
          setError(errorMsg);
          setIsLoading(false);
        }
      }
    };
    
    startCamera();
    
    return () => {
      active = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, [open]);

  const capture = async () => {
    if (!videoRef.current || !isReady) return;
    const video = videoRef.current;
    const width = video.videoWidth || 640;
    const height = video.videoHeight || 480;

    // Calculate canvas size based on aspect
    let targetW = width;
    let targetH = height;
    if (aspect === "square") {
      const size = Math.min(width, height);
      targetW = size; targetH = size;
    } else if (aspect === "landscape") {
      const ratio = 16/9;
      targetW = width;
      targetH = Math.round(width / ratio);
      if (targetH > height) { targetH = height; targetW = Math.round(height * ratio); }
    } else if (aspect === "portrait") {
      const ratio = 3/4;
      targetH = height;
      targetW = Math.round(height * ratio);
      if (targetW > width) { targetW = width; targetH = Math.round(width / ratio); }
    }

    const canvas = document.createElement("canvas");
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Draw centered crop
    const sx = Math.max(0, (width - targetW) / 2);
    const sy = Math.max(0, (height - targetH) / 2);
    ctx.drawImage(video, sx, sy, targetW, targetH, 0, 0, targetW, targetH);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob((b) => resolve(b), "image/jpeg", 0.9));
    if (!blob) return;
    const file = new File([blob], "webcam.jpg", { type: "image/jpeg" });
    onCapture(file);
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-brand-secondary border border-brand-border rounded-xl shadow-2xl p-6 w-full max-w-lg">
        <div className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <Camera size={24} className="text-brand-success" />
          Ambil Foto via Webcam
        </div>
        
        {error && (
          <div className="bg-brand-danger/10 border border-brand-danger/30 text-brand-danger text-sm p-3 rounded-lg mb-4">
            <p className="font-medium mb-1">Error:</p>
            <p>{error}</p>
            {error.includes("HTTPS") && (
              <div className="mt-2 text-xs text-white/60">
                <p>Kamera membutuhkan koneksi HTTPS atau localhost.</p>
                <p className="mt-1">Untuk HTTP di jaringan lokal, aktifkan "Insecure origins treated as secure" di chrome://flags</p>
              </div>
            )}
          </div>
        )}
        
        <div className="relative w-full aspect-video bg-black overflow-hidden rounded-lg border border-white/10">
          {isLoading && !error && (
            <div className="absolute inset-0 flex items-center justify-center bg-black">
              <div className="text-center text-white">
                <Loader2 className="animate-spin mx-auto mb-2" size={32} />
                <p className="text-sm text-white/60">Memuat kamera...</p>
              </div>
            </div>
          )}
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <video 
            ref={videoRef} 
            className={`absolute inset-0 w-full h-full object-cover ${isLoading ? 'opacity-0' : 'opacity-100'}`} 
            playsInline 
            muted 
          />
        </div>
        
        <div className="mt-4 flex items-center justify-end gap-3">
          <button 
            onClick={onClose} 
            className="px-5 py-2.5 border border-white/30 text-white rounded-lg hover:bg-white/10 transition-colors"
          >
            Batal
          </button>
          <button 
            onClick={capture} 
            disabled={!isReady || !!error}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            <Camera size={18} />
            Ambil Foto
          </button>
        </div>
      </div>
    </div>
  );
}
