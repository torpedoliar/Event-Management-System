"use client";

import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import Button from '@/components/ui/Button';

/**
 * Pembaca QR berbasis kamera (html5-qrcode) dengan fallback unggah foto.
 *
 * Diekstrak dari halaman check-in: komponen ini mandiri, hanya berkomunikasi
 * lewat props, dan tidak menyentuh state halaman.
 */
const Html5QrcodePlugin = ({ qrCodeSuccessCallback, onScanFailure, fps, qrbox }: any) => {
  const [startError, setStartError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isScanningRef = useRef(false);
  const uniqueIdRef = useRef(`reader-${Math.random().toString(36).slice(2)}`);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const elementId = uniqueIdRef.current;

    // Ensure element exists
    if (!document.getElementById(elementId)) return;

    const html5QrCode = new Html5Qrcode(elementId);
    scannerRef.current = html5QrCode;

    const config = { fps: fps || 10, qrbox: qrbox || 250 };

    // Start scanning
    html5QrCode.start(
      { facingMode: "environment" },
      config,
      (decodedText, decodedResult) => {
        if (!isScanningRef.current) return;
        isScanningRef.current = false;

        html5QrCode.stop().then(() => {
          html5QrCode.clear();
          qrCodeSuccessCallback(decodedText, decodedResult);
        }).catch(err => {
          console.error("Failed to stop after scan", err);
          qrCodeSuccessCallback(decodedText, decodedResult);
        });
      },
      (errorMessage) => {
        if (onScanFailure) onScanFailure(errorMessage);
      }
    ).then(() => {
      isScanningRef.current = true;
    }).catch((err) => {
      console.error("Error starting QR scanner", err);
      setStartError(err?.message || "Gagal memulai kamera.");
    });

    return () => {
      isScanningRef.current = false;
      if (html5QrCode.isScanning) {
        html5QrCode.stop().then(() => {
          html5QrCode.clear();
        }).catch(err => console.error(err));
      } else {
        html5QrCode.clear();
      }
    };
  }, []);

  const resizeImage = (file: File, maxWidth: number): Promise<File> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);

          canvas.toBlob((blob) => {
            if (blob) {
              resolve(new File([blob], file.name, { type: file.type }));
            } else {
              reject(new Error("Canvas to Blob failed"));
            }
          }, file.type, 0.8);
        };
        img.onerror = reject;
        img.src = event.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !scannerRef.current) return;

    try {
      // Attempt 1: Original file
      await scannerRef.current.scanFileV2(file, false)
        .then((decodedText) => {
          qrCodeSuccessCallback(decodedText, null);
        });
    } catch (err: any) {
      console.warn("First scan attempt failed, retrying with resized image...", err);

      // Attempt 2: Resize image if it's likely too large
      try {
        const resizedFile = await resizeImage(file, 800); // Resize to max 800px width
        await scannerRef.current.scanFileV2(resizedFile, false)
          .then((decodedText) => {
            qrCodeSuccessCallback(decodedText, null);
          });
      } catch (retryErr: any) {
        console.error("Retry scan error:", retryErr);
        setStartError(`Gagal memindai QR Code: ${retryErr?.message || "Tidak ditemukan QR Code"}. Pastikan gambar jelas, pencahayaan cukup, dan QR Code terlihat utuh.`);
      }
    }
  };

  return (
    <div className="w-full">
      <div id={uniqueIdRef.current} className="w-full overflow-hidden rounded-lg bg-black border border-brand-border relative min-h-[300px]">
        {startError && (
          <div className="absolute inset-0 flex items-center justify-center p-4 text-center bg-brand-bgElevated text-brand-text overflow-y-auto">
            <div className="max-h-full py-4">
              <p className="text-brand-danger font-semibold mb-2">Kamera Error</p>
              <p className="text-sm text-brand-textMuted mb-4">{startError}</p>
              <Button onClick={() => fileInputRef.current?.click()}>Buka Kamera / Upload</Button>
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 text-center">
        <button onClick={() => fileInputRef.current?.click()} className="text-sm text-brand-primary hover:text-brand-primarySoft font-medium">
          Masalah dengan kamera? Upload foto
        </button>
        <input type="file" accept="image/*" capture="environment" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
      </div>

    </div>
  );
};

export default Html5QrcodePlugin;
