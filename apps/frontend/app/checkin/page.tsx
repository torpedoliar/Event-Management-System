"use client";
import { useEffect, useMemo, useState, useRef } from "react";
import { apiBase, toApiUrl, parseErrorMessage } from "../../lib/api";
import { Html5Qrcode } from "html5-qrcode";
import { Search, QrCode, Loader2, CheckCircle, Clock, Users, X, XCircle, UserPlus, Settings, Camera, UserCheck } from 'lucide-react';

type EventConfig = {
  id: string;
  name: string;
  date?: string | null;
  location?: string | null;
  logoUrl?: string | null;
  backgroundType: 'NONE' | 'IMAGE' | 'VIDEO';
  backgroundImageUrl?: string | null;
  backgroundVideoUrl?: string | null;
  overlayOpacity: number;
  checkinPopupTimeoutMs?: number;
  autoCreateGuestOnCheckin?: boolean;
  enablePhotoCapture?: boolean;
  allowMultipleCheckinPerCounter?: boolean;
};

type GuestCheckin = {
  id: string;
  checkinAt: string;
  checkinByName?: string;
  counterName?: string;
};

type Guest = {
  id: string;
  queueNumber: number;
  guestId: string;
  name: string;
  photoUrl?: string | null;
  tableLocation: string;
  company?: string | null;
  department?: string | null;
  division?: string | null;
  notes?: string | null;
  checkedIn: boolean;
  checkedInAt?: string | null;
  checkedInByName?: string | null;
  checkinCount?: number;
  checkins?: GuestCheckin[];
  alreadyCheckedByThisAdmin?: boolean;
  maxReached?: boolean;
  message?: string;
};

function cleanQrContent(text: string): string {
  if (!text) return "";
  try {
    // Jika diawali http/https, anggap URL dan ambil bagian terakhir path-nya
    if (text.startsWith('http://') || text.startsWith('https://')) {
      const url = new URL(text);
      const parts = url.pathname.split('/').filter(p => p.trim() !== '');
      if (parts.length > 0) {
        return parts[parts.length - 1];
      }
    }
  } catch (e) {
    // ignore error, return original
  }
  return text;
}

import { useSSE } from "../../lib/sse-context";

export default function CheckinPage() {
  const [cfg, setCfg] = useState<EventConfig | null>(null);
  const [preview, setPreview] = useState<Partial<EventConfig> | null>(null);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Guest[]>([]);
  const [selected, setSelected] = useState<Guest | null>(null);
  const [checkedGuest, setCheckedGuest] = useState<Guest | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<Guest[]>([]);
  // Overlay customization (popup only)
  const [bgMode, setBgMode] = useState<'CONFIG' | 'NONE' | 'IMAGE' | 'VIDEO'>('CONFIG');
  const [overlayOverride, setOverlayOverride] = useState<number | null>(null);
  const [searching, setSearching] = useState(false);
  const [checking, setChecking] = useState(false);
  const [checkingId, setCheckingId] = useState<string | null>(null);
  const [unchecking, setUnchecking] = useState(false);
  const [isDuplicateCheckIn, setIsDuplicateCheckIn] = useState(false);
  const [isAuth, setIsAuth] = useState(false);
  const [currentAdmin, setCurrentAdmin] = useState<{ id: string; name: string } | null>(null);
  const [showUncheckModal, setShowUncheckModal] = useState(false);
  const [uncheckPassword, setUncheckPassword] = useState('');
  const [uncheckReason, setUncheckReason] = useState('');
  const [uncheckTarget, setUncheckTarget] = useState<Guest | null>(null);
  const [autoCreateGuest, setAutoCreateGuest] = useState(false);
  const [enablePhotoCapture, setEnablePhotoCapture] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [savingEventSetting, setSavingEventSetting] = useState(false);
  const [creatingGuest, setCreatingGuest] = useState(false);
  const [showPhotoCapture, setShowPhotoCapture] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [autoCapturing, setAutoCapturing] = useState(false);
  const [autoCaptureStatus, setAutoCaptureStatus] = useState<string>('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const autoVideoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const autoCanvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const autoStreamRef = useRef<MediaStream | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { addEventListener, removeEventListener } = useSSE();

  useEffect(() => {
    fetch(`${apiBase()}/config/event`).then(async (r) => {
      const data = await r.json();
      setCfg(data);
      // Load auto-create setting from localStorage or config
      const savedAutoCreate = localStorage.getItem('checkinAutoCreateGuest');
      if (savedAutoCreate !== null) {
        setAutoCreateGuest(savedAutoCreate === 'true');
      } else if (data.autoCreateGuestOnCheckin) {
        setAutoCreateGuest(data.autoCreateGuestOnCheckin);
      }
      // Load photo capture setting from localStorage or config
      const savedPhotoCapture = localStorage.getItem('checkinEnablePhotoCapture');
      if (savedPhotoCapture !== null) {
        setEnablePhotoCapture(savedPhotoCapture === 'true');
      } else if (data.enablePhotoCapture) {
        setEnablePhotoCapture(data.enablePhotoCapture);
      }
    });
  }, []);

  const effectiveOverlay = overlayOverride ?? preview?.overlayOpacity ?? cfg?.overlayOpacity ?? 0.5;
  const overlayStyle = useMemo(() => ({
    backgroundColor: `rgba(0,0,0,${effectiveOverlay})`,
  }), [effectiveOverlay]);

  // Helper to manage popup timeout
  const startPopupTimeout = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    const ms = cfg?.checkinPopupTimeoutMs ?? 5000;
    timeoutRef.current = setTimeout(() => {
      setCheckedGuest(null);
      setIsDuplicateCheckIn(false);
      timeoutRef.current = null;
    }, ms);
  };

  const clearPopupTimeout = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  const toggleMultipleCheckinPerCounter = async (enabled: boolean) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) {
      setError('Login diperlukan untuk mengubah pengaturan event');
      return;
    }
    setSavingEventSetting(true);
    try {
      const res = await fetch(`${apiBase()}/events/active`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ allowMultipleCheckinPerCounter: enabled }),
      });
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(parseErrorMessage(errorText));
      }
      setCfg(prev => prev ? { ...prev, allowMultipleCheckinPerCounter: enabled } : prev);
    } catch (e: any) {
      setError(e.message || 'Gagal menyimpan pengaturan');
    } finally {
      setSavingEventSetting(false);
    }
  };

  const createAndCheckin = async (guestIdOrName: string) => {
    setCreatingGuest(true);
    setError(null);
    clearPopupTimeout();
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      if (!token) throw new Error('Login diperlukan untuk membuat tamu baru');

      const res = await fetch(`${apiBase()}/public/guests/create-checkin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ guestIdOrName: guestIdOrName.trim() })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Gagal membuat tamu baru');
      }

      const newGuest = await res.json();
      setResults([newGuest]);
      setSelected(newGuest);
      setCheckedGuest(newGuest);
      setIsDuplicateCheckIn(false);
      setQ('');
      refreshHistory();
      startPopupTimeout();
      // Auto capture photo if enabled
      if (enablePhotoCapture && newGuest) {
        autoCapturephoto(newGuest);
      }
    } catch (e: any) {
      setError(e.message || 'Gagal membuat tamu baru');
    } finally {
      setCreatingGuest(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const doSearch = async () => {
    setError(null);
    setSelected(null);
    setCheckedGuest(null);
    clearPopupTimeout(); // Clear any existing popup
    const params = new URLSearchParams();
    if (!q.trim()) return;
    // gunakan q untuk keduanya agar mendukung ID atau Nama
    const cleanQ = cleanQrContent(q.trim());
    params.set('guestId', cleanQ);
    params.set('name', q.trim());
    // Detect if input looks like a QR code / ID (contains digits, dashes, or is all uppercase)
    // Pure alphabetic names like "Budi" should still trigger fuzzy search
    const looksLikeId = /[\d\-]/.test(q.trim()) || /^[A-Z0-9_\-]+$/.test(q.trim());
    if (looksLikeId) {
      params.set('exact', 'true');
    }
    setSearching(true);
    try {
      const res = await fetch(`${apiBase()}/public/guests/search?${params.toString()}`);
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(parseErrorMessage(errorText));
      }
      const data = await res.json();
      setResults(data);
      setQ(""); // Auto clear input after search
      // auto check-in hasil pertama bila ada HANYA JIKA hasil cuma 1
      if (data.length === 1) {
        await doCheckin(data[0]);
      } else if (data.length === 0) {
        // Guest not found - offer to create if setting is enabled
        if (autoCreateGuest) {
          await createAndCheckin(q.trim());
        } else {
          setError('Tamu tidak ditemukan');
        }
      }
      // Jika > 1, biarkan user memilih dari list
    } catch (e: any) {
      setError(e.message || 'Gagal mencari tamu');
    } finally {
      setSearching(false);
      // Keep focus on input for next checkin
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const doCheckin = async (g: Guest, useInternalId = false) => {
    setError(null);
    // Public check-in - use internal ID when there might be duplicates
    setChecking(true);
    setCheckingId(g.id);
    clearPopupTimeout(); // Clear existing before starting new checkin
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      
      // Use internal ID endpoint if explicitly requested or if there are multiple results
      const endpoint = useInternalId || results.length > 1 
        ? `${apiBase()}/public/guests/checkin-by-id`
        : `${apiBase()}/public/guests/checkin`;
      const body = useInternalId || results.length > 1
        ? { id: g.id }
        : { guestId: g.guestId };
      
      const res = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
      });


      if (res.status === 409) {
        const existing = await res.json();
        setCheckedGuest(existing);
        setSelected(existing);
        setIsDuplicateCheckIn(true);
        // refresh history
        refreshHistory();
        startPopupTimeout();
        return;
      }

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(parseErrorMessage(errorText));
      }
      const updated = await res.json();
      setCheckedGuest(updated);
      setSelected(updated);
      setIsDuplicateCheckIn(false);
      // refresh history
      refreshHistory();
      startPopupTimeout();
      // Auto capture photo if enabled
      if (enablePhotoCapture && updated) {
        autoCapturephoto(updated);
      }
    } catch (e: any) {
      setError(e.message || 'Gagal check-in');
    } finally {
      setChecking(false);
      setCheckingId(null);
    }
  };

  const openUncheckModal = (g: Guest) => {
    setUncheckTarget(g);
    setUncheckPassword('');
    setUncheckReason('');
    setShowUncheckModal(true);
    clearPopupTimeout();
  };

  const closeUncheckModal = () => {
    setShowUncheckModal(false);
    setUncheckTarget(null);
    setUncheckPassword('');
    setUncheckReason('');
  };

  const doUncheckin = async () => {
    if (!uncheckTarget) return;
    
    setError(null);
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) {
      setError('Login diperlukan untuk membatalkan check-in');
      return;
    }

    setUnchecking(true);
    try {
      const res = await fetch(`${apiBase()}/guests/${uncheckTarget.id}/uncheckin`, { 
        method: 'POST', 
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({
          password: uncheckPassword,
          reason: uncheckReason,
        }),
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || 'Gagal membatalkan check-in');
      }
      
      const updated = await res.json();
      setCheckedGuest(null);
      setSelected(updated);
      refreshHistory();
      closeUncheckModal();
    } catch (e: any) {
      setError(e.message || 'Gagal membatalkan check-in');
    } finally {
      setUnchecking(false);
    }
  };

  const refreshHistory = async () => {
    try {
      const r = await fetch(`${apiBase()}/public/guests/history?limit=10`);
      if (r.ok) setHistory(await r.json());
    } catch { }
  };

  // Photo capture functions
  const startCamera = async () => {
    try {
      // Check if we're in a secure context (required for camera access)
      if (typeof window !== 'undefined' && !window.isSecureContext) {
        throw new Error('Kamera membutuhkan koneksi aman (HTTPS atau localhost). Akses via https:// atau localhost.');
      }
      
      // Check if camera API is available
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Browser tidak mendukung akses kamera. Gunakan HTTPS atau localhost.');
      }
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } } 
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        // Wait for video to be ready
        await new Promise<void>((resolve, reject) => {
          if (videoRef.current) {
            videoRef.current.onloadedmetadata = () => {
              videoRef.current?.play()
                .then(() => resolve())
                .catch(reject);
            };
          }
        });
      }
    } catch (err: any) {
      console.error('Error accessing camera:', err);
      let errorMsg = 'Gagal mengakses kamera';
      if (err.name === 'NotAllowedError') {
        errorMsg = 'Akses kamera ditolak. Berikan izin kamera di browser.';
      } else if (err.name === 'NotFoundError') {
        errorMsg = 'Kamera tidak ditemukan.';
      } else if (err.name === 'NotReadableError') {
        errorMsg = 'Kamera sedang digunakan oleh aplikasi lain.';
      } else if (err.message) {
        errorMsg = err.message;
      }
      setError(errorMsg);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      // Check if video is ready
      if (video.videoWidth === 0 || video.videoHeight === 0) {
        setError('Kamera belum siap. Tunggu sebentar.');
        return;
      }
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        setCapturedPhoto(dataUrl);
        stopCamera();
      }
    }
  };

  const retakePhoto = () => {
    setCapturedPhoto(null);
    startCamera();
  };

  const uploadCapturedPhoto = async () => {
    if (!capturedPhoto || !checkedGuest) return;
    
    setUploadingPhoto(true);
    try {
      // Convert data URL to blob
      const response = await fetch(capturedPhoto);
      const blob = await response.blob();
      const file = new File([blob], `photo_${checkedGuest.id}.jpg`, { type: 'image/jpeg' });
      
      const fd = new FormData();
      fd.append('photo', file);
      
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const res = await fetch(`${apiBase()}/guests/${checkedGuest.id}`, {
        method: 'PUT',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: fd,
      });
      
      if (!res.ok) throw new Error('Gagal menyimpan foto');
      
      const updated = await res.json();
      setCheckedGuest(updated);
      setShowPhotoCapture(false);
      setCapturedPhoto(null);
      stopCamera();
    } catch (e: any) {
      setError(e.message || 'Gagal menyimpan foto');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const closePhotoCapture = () => {
    setShowPhotoCapture(false);
    setCapturedPhoto(null);
    stopCamera();
  };

  // Auto capture photo function - automatically captures and uploads photo
  const autoCapturephoto = async (guest: Guest) => {
    if (!guest || autoCapturing) return;
    
    // Check if we're in a secure context (required for camera access)
    if (typeof window !== 'undefined' && !window.isSecureContext) {
      console.warn('Camera requires secure context (HTTPS or localhost)');
      return;
    }
    
    // Check if camera API is available
    if (!navigator.mediaDevices?.getUserMedia) {
      console.warn('Camera API not available (requires HTTPS)');
      return;
    }
    
    setAutoCapturing(true);
    setAutoCaptureStatus('Menyiapkan kamera...');
    
    try {
      // Start camera for auto capture
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } } 
      });
      autoStreamRef.current = stream;
      
      if (autoVideoRef.current) {
        autoVideoRef.current.srcObject = stream;
        
        // Wait for video to be ready with timeout
        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error('Video timeout')), 5000);
          if (autoVideoRef.current) {
            autoVideoRef.current.onloadedmetadata = () => {
              clearTimeout(timeout);
              autoVideoRef.current?.play()
                .then(() => resolve())
                .catch(reject);
            };
            autoVideoRef.current.onerror = () => {
              clearTimeout(timeout);
              reject(new Error('Video error'));
            };
          }
        });
        
        // Wait a moment for camera to adjust/focus
        setAutoCaptureStatus('Mengambil foto dalam 2 detik...');
        await new Promise(resolve => setTimeout(resolve, 700));
        setAutoCaptureStatus('Mengambil foto dalam 1 detik...');
        await new Promise(resolve => setTimeout(resolve, 700));
        setAutoCaptureStatus('Mengambil foto...');
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Capture photo
        if (autoVideoRef.current && autoCanvasRef.current) {
          const video = autoVideoRef.current;
          const canvas = autoCanvasRef.current;
          
          // Ensure video has valid dimensions
          if (video.videoWidth === 0 || video.videoHeight === 0) {
            throw new Error('Video dimensions invalid');
          }
          
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(video, 0, 0);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
            
            // Upload photo
            setAutoCaptureStatus('Menyimpan foto...');
            const response = await fetch(dataUrl);
            const blob = await response.blob();
            const file = new File([blob], `photo_${guest.id}.jpg`, { type: 'image/jpeg' });
            
            const fd = new FormData();
            fd.append('photo', file);
            
            const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
            const res = await fetch(`${apiBase()}/guests/${guest.id}`, {
              method: 'PUT',
              headers: token ? { Authorization: `Bearer ${token}` } : undefined,
              body: fd,
            });
            
            if (res.ok) {
              const updated = await res.json();
              setCheckedGuest(updated);
              setAutoCaptureStatus('Foto berhasil disimpan!');
            } else {
              setAutoCaptureStatus('Gagal menyimpan foto');
            }
          }
        }
      }
    } catch (err: any) {
      console.error('Auto capture error:', err);
      let errorMsg = 'Gagal mengakses kamera';
      if (err.name === 'NotAllowedError') {
        errorMsg = 'Akses kamera ditolak';
      } else if (err.name === 'NotFoundError') {
        errorMsg = 'Kamera tidak ditemukan';
      } else if (err.message) {
        errorMsg = err.message;
      }
      setAutoCaptureStatus(errorMsg);
    } finally {
      // Stop auto capture stream
      if (autoStreamRef.current) {
        autoStreamRef.current.getTracks().forEach(track => track.stop());
        autoStreamRef.current = null;
      }
      // Clear status after a moment
      setTimeout(() => {
        setAutoCapturing(false);
        setAutoCaptureStatus('');
      }, 2000);
    }
  };

  // Stop auto capture stream on unmount
  useEffect(() => {
    return () => {
      if (autoStreamRef.current) {
        autoStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  useEffect(() => { refreshHistory(); }, []);

  // Auto focus input when popup is closed
  useEffect(() => {
    if (!checkedGuest && !searching && !checking) {
      // slight delay to ensure UI is ready
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [checkedGuest, searching, checking]);

  // Realtime: subscribe to server-sent events for config changes & history updates
  useEffect(() => {
    const onConfig = (e: MessageEvent) => {
      try { const data = JSON.parse((e as any).data); setCfg(data); } catch { }
    };
    const onPreview = (e: MessageEvent) => {
      try { const data = JSON.parse((e as any).data); setPreview(data || null); } catch { }
    };
    const onChange = () => { refreshHistory(); };
    const onEventChange = () => {
      // Reload config and clear results when event changes
      fetch(`${apiBase()}/config/event`).then(async (r) => {
        const data = await r.json();
        setCfg(data);
      }).catch(() => {});
      setResults([]);
      setSelected(null);
      setQ('');
      refreshHistory();
    };
    addEventListener('config', onConfig);
    addEventListener('preview', onPreview);
    addEventListener('checkin', onChange);
    addEventListener('uncheckin', onChange);
    addEventListener('event_change', onEventChange);
    return () => {
      removeEventListener('config', onConfig);
      removeEventListener('preview', onPreview);
      removeEventListener('checkin', onChange);
      removeEventListener('uncheckin', onChange);
      removeEventListener('event_change', onEventChange);
    };
  }, [addEventListener, removeEventListener]);

  // Detect auth (admin logged in) to conditionally show admin-only actions
  useEffect(() => {
    const check = async () => {
      if (typeof window === 'undefined') return;
      const token = localStorage.getItem('token');
      setIsAuth(!!token);
      
      // Fetch current admin info
      if (token) {
        try {
          const res = await fetch(`${apiBase()}/users/me`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (res.ok) {
            const user = await res.json();
            setCurrentAdmin({ id: user.id, name: user.displayName || user.username });
            console.log('[CheckinPage] Current admin:', user.displayName || user.username, 'ID:', user.id);
          } else {
            setCurrentAdmin(null);
          }
        } catch {
          setCurrentAdmin(null);
        }
      } else {
        setCurrentAdmin(null);
      }
    };
    check();
    const onStorage = (e: StorageEvent) => { if (e.key === 'token') check(); };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // Effective background mode for page (not popup): always follow config
  const pageBgType = (preview?.backgroundType as EventConfig['backgroundType'] | undefined) ?? cfg?.backgroundType;
  const pageBgImage = preview?.backgroundImageUrl ?? cfg?.backgroundImageUrl;
  const pageBgVideo = preview?.backgroundVideoUrl ?? cfg?.backgroundVideoUrl;

  const [showScanner, setShowScanner] = useState(false);

  const onScanSuccess = async (decodedText: string, decodedResult: any) => {
    // Stop scanning
    setShowScanner(false);

    // Attempt check-in
    setChecking(true);
    setError(null);
    clearPopupTimeout();
    try {
      const cleanCode = cleanQrContent(decodedText);
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch(`${apiBase()}/public/guests/checkin-qr`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ qrCode: cleanCode })
      });

      if (res.status === 409) {
        const existing = await res.json();
        setCheckedGuest(existing);
        setSelected(existing);
        setIsDuplicateCheckIn(true);
        refreshHistory();
        startPopupTimeout();
        return;
      }

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(parseErrorMessage(errorText));
      }
      const updated = await res.json();
      setCheckedGuest(updated);
      setSelected(updated);
      setIsDuplicateCheckIn(false);
      refreshHistory();
      startPopupTimeout();
      // Auto capture photo if enabled
      if (enablePhotoCapture && updated) {
        autoCapturephoto(updated);
      }
    } catch (e: any) {
      setError(e.message || 'Gagal scan QR');
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      {/* Background */}
      {pageBgType === 'IMAGE' && pageBgImage && (
        <div className="absolute inset-0 bg-center bg-cover" style={{ backgroundImage: `url(${toApiUrl(pageBgImage)})` }} />
      )}
      {pageBgType === 'VIDEO' && pageBgVideo && (
        <video className="absolute inset-0 w-full h-full object-cover" src={toApiUrl(pageBgVideo)} muted loop autoPlay playsInline />
      )}
      <div className="absolute inset-0" style={overlayStyle} />

      {/* Header brand */}
      <div className="relative z-10 p-4 md:p-6">
        <div className="flex items-center justify-between max-w-5xl mx-auto">
          <div className="flex items-center gap-4">
            {cfg?.logoUrl ? (
              <img src={toApiUrl(cfg.logoUrl)} className="h-12 md:h-16 w-auto drop-shadow-2xl" alt="logo" />
            ) : (
              <div className="w-12 h-12 md:w-16 md:h-16 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
                <Users size={28} className="text-white" />
              </div>
            )}
            <div className="text-white">
              <div className="text-xl md:text-3xl font-bold text-shadow-lg text-glow">{cfg?.name || 'Event'}</div>
              {(cfg?.date || cfg?.location) && (
                <div className="text-sm md:text-base text-white/70 text-shadow flex items-center gap-2 mt-0.5">
                  {cfg?.date && <span>{new Date(cfg.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>}
                  {cfg?.date && cfg?.location && <span>•</span>}
                  {cfg?.location && <span>{cfg.location}</span>}
                </div>
              )}
            </div>
          </div>
          {/* Admin indicator */}
          {currentAdmin ? (
            <div className="flex items-center gap-2 bg-emerald-500/20 border border-emerald-500/30 rounded-lg px-3 py-2">
              <UserCheck size={18} className="text-emerald-400" />
              <div className="text-sm">
                <div className="text-emerald-300 font-medium">{currentAdmin.name}</div>
                <div className="text-emerald-400/60 text-xs font-mono">{currentAdmin.id.substring(0, 8)}...</div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 bg-amber-500/20 border border-amber-500/30 rounded-lg px-3 py-2">
              <XCircle size={18} className="text-amber-400" />
              <span className="text-amber-300 text-sm">Tidak Login</span>
            </div>
          )}
        </div>
      </div>

      {/* Search (single input: ID atau Nama) */}
      <div className="relative z-10 px-4 py-6 flex flex-col items-center">
        <div className="w-full max-w-3xl">
          <div className="glass-card-dark p-6 md:p-8">
            {/* Search Input */}
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40">
                <Search size={22} />
              </div>
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !searching && !checking) { e.preventDefault(); doSearch(); } }}
                placeholder="Masukkan Guest ID atau Nama, lalu tekan Enter"
                className="w-full rounded-xl border border-white/20 bg-white/5 pl-12 pr-4 py-4 text-lg text-white placeholder:text-white/40 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                disabled={searching || checking}
                autoFocus
              />
            </div>
            
            {error && (
              <div className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 flex items-center justify-between">
                <span>{error}</span>
                {error === 'Tamu tidak ditemukan' && !autoCreateGuest && (
                  <button
                    onClick={() => {
                      setAutoCreateGuest(true);
                      localStorage.setItem('checkinAutoCreateGuest', 'true');
                      doSearch();
                    }}
                    className="text-sm text-blue-300 hover:text-blue-100 flex items-center gap-1 underline ml-2"
                  >
                    <UserPlus size={14} />
                    Buat & Check-in
                  </button>
                )}
              </div>
            )}
            
            {/* Action Buttons */}
            <div className="mt-6 flex flex-col sm:flex-row justify-center gap-3">
              <button
                disabled={searching || checking || creatingGuest}
                onClick={doSearch}
                className="flex-1 flex items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 px-6 py-4 text-lg font-semibold text-white shadow-lg hover:shadow-xl disabled:opacity-50 transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0"
              >
                {searching || creatingGuest ? <Loader2 className="animate-spin" size={24} /> : (checking ? <Loader2 className="animate-spin" size={24} /> : <Search size={24} />)}
                {searching ? 'Mencari...' : (creatingGuest ? 'Membuat Tamu...' : (checking ? 'Check-in...' : 'Cari & Check-in'))}
              </button>
              <button
                disabled={searching || checking || creatingGuest}
                onClick={() => setShowScanner(true)}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-6 py-4 text-lg font-semibold text-white shadow-lg hover:shadow-xl disabled:opacity-50 transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0"
              >
                <QrCode size={24} />
                Scan QR
              </button>
              <button
                onClick={() => setShowSettings(true)}
                className="flex items-center justify-center gap-2 rounded-xl bg-white/10 border border-white/20 px-4 py-4 text-white hover:bg-white/20 transition-all"
                title="Pengaturan"
              >
                <Settings size={24} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-xl border border-white/20 bg-slate-900/95 text-white shadow-2xl p-6 animate-in fade-in zoom-in duration-300">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <Settings size={24} className="text-blue-400" />
                Pengaturan Check-in
              </h3>
              <button
                onClick={() => setShowSettings(false)}
                className="text-white/60 hover:text-white"
              >
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4">
              <label className="flex items-center justify-between p-4 rounded-lg border border-white/20 bg-white/5 cursor-pointer hover:bg-white/10 transition-colors">
                <div className="flex items-center gap-3">
                  <UserPlus size={20} className="text-blue-400" />
                  <div>
                    <div className="font-medium text-white">Auto Buat Tamu Baru</div>
                    <div className="text-sm text-white/60">Jika tamu tidak ditemukan, buat tamu baru dan langsung check-in</div>
                  </div>
                </div>
                <div className={`w-12 h-7 rounded-full transition-colors relative ${autoCreateGuest ? 'bg-blue-500' : 'bg-white/20'}`}>
                  <div className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white transition-transform ${autoCreateGuest ? 'translate-x-5' : 'translate-x-0'}`} />
                  <input
                    type="checkbox"
                    className="hidden"
                    checked={autoCreateGuest}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setAutoCreateGuest(checked);
                      localStorage.setItem('checkinAutoCreateGuest', String(checked));
                    }}
                  />
                </div>
              </label>

              <label className="flex items-center justify-between p-4 rounded-lg border border-white/20 bg-white/5 cursor-pointer hover:bg-white/10 transition-colors">
                <div className="flex items-center gap-3">
                  <Camera size={20} className="text-emerald-400" />
                  <div>
                    <div className="font-medium text-white">Auto Foto Saat Check-in</div>
                    <div className="text-sm text-white/60">Otomatis ambil foto tamu via webcam setelah check-in berhasil</div>
                  </div>
                </div>
                <div className={`w-12 h-7 rounded-full transition-colors relative ${enablePhotoCapture ? 'bg-emerald-500' : 'bg-white/20'}`}>
                  <div className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white transition-transform ${enablePhotoCapture ? 'translate-x-5' : 'translate-x-0'}`} />
                  <input
                    type="checkbox"
                    className="hidden"
                    checked={enablePhotoCapture}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setEnablePhotoCapture(checked);
                      localStorage.setItem('checkinEnablePhotoCapture', String(checked));
                    }}
                  />
                </div>
              </label>

              {/* Event-level setting - only for authenticated admins */}
              {isAuth && (
                <div className="pt-4 border-t border-white/10">
                  <div className="text-xs text-white/40 uppercase tracking-wider mb-3">Pengaturan Event</div>
                  <label className={`flex items-center justify-between p-4 rounded-lg border border-white/20 bg-white/5 cursor-pointer hover:bg-white/10 transition-colors ${savingEventSetting ? 'opacity-50 pointer-events-none' : ''}`}>
                    <div className="flex items-center gap-3">
                      <UserCheck size={20} className="text-purple-400" />
                      <div>
                        <div className="font-medium text-white">Multiple Check-in Per Counter</div>
                        <div className="text-sm text-white/60">Tamu dapat check-in di berbagai admin/counter (maks 1x per counter)</div>
                      </div>
                    </div>
                    <div className={`w-12 h-7 rounded-full transition-colors relative ${cfg?.allowMultipleCheckinPerCounter ? 'bg-purple-500' : 'bg-white/20'}`}>
                      <div className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white transition-transform ${cfg?.allowMultipleCheckinPerCounter ? 'translate-x-5' : 'translate-x-0'}`} />
                      <input
                        type="checkbox"
                        className="hidden"
                        checked={cfg?.allowMultipleCheckinPerCounter ?? false}
                        disabled={savingEventSetting}
                        onChange={(e) => toggleMultipleCheckinPerCounter(e.target.checked)}
                      />
                    </div>
                  </label>
                </div>
              )}
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowSettings(false)}
                className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 font-medium text-white hover:bg-blue-700 transition-colors"
              >
                <CheckCircle size={18} />
                Selesai
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      <div className="relative z-10 px-4 pb-4 flex justify-center">
        <div className="w-full max-w-3xl glass-card-dark p-4 md:p-6">
          {!results.length && (
            <div className="text-center py-8 flex flex-col items-center gap-4">
              <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center">
                <Search size={40} className="text-white/20" />
              </div>
              <div>
                <p className="text-white/60 text-lg">Siap untuk check-in</p>
                <p className="text-white/40 text-sm mt-1">Masukkan Guest ID / Nama atau gunakan Scan QR</p>
              </div>
            </div>
          )}
          {!!results.length && (
            <div className="space-y-3">
              <div className="text-sm text-white/60 font-medium mb-2">
                {results.length} tamu ditemukan
                {results.length > 1 && (
                  <span className="ml-2 text-amber-400">- Pilih tamu untuk check-in</span>
                )}
              </div>
              {results.map((g) => (
                <div
                  key={g.id}
                  className={`flex items-center justify-between rounded-xl p-4 transition-all duration-200 ${selected?.id === g.id ? 'bg-blue-500/20 border border-blue-500/30' : 'bg-white/5 border border-white/10 hover:bg-white/10'}`}
                >
                  <div className="flex items-center gap-4">
                    <div className="h-14 w-14 rounded-xl bg-white/10 overflow-hidden flex-shrink-0">
                      {g.photoUrl ? (
                        <img src={toApiUrl(g.photoUrl)} className="h-full w-full object-cover" alt={g.name} />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <Users size={24} className="text-white/30" />
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="font-semibold text-white text-lg">
                        {g.name}
                      </div>
                      <div className="text-sm text-white/60 flex items-center gap-2 mt-0.5">
                        <span className="font-mono text-blue-300">{g.guestId}</span>
                        <span>•</span>
                        <span>{g.tableLocation}</span>
                      </div>
                      {g.company && (
                        <div className="text-sm text-amber-300/80 mt-0.5">
                          {g.company}
                          {g.division && <span className="text-white/50"> - {g.division}</span>}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 px-5 py-2.5 font-semibold text-white shadow-lg disabled:opacity-50 hover:shadow-xl transition-all duration-200 hover:-translate-y-0.5"
                      disabled={checking}
                      onClick={() => doCheckin(g, true)}
                    >
                      {checking && checkingId === g.id ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle size={18} />}
                      {checking && checkingId === g.id ? 'Check-in...' : 'Check-in'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* History */}
      <div className="relative z-10 px-4 pb-6 flex justify-center">
        <div className="w-full max-w-3xl glass-card-dark p-4 md:p-6">
          <div className="mb-4 flex items-center justify-between">
            <div className="font-semibold flex items-center gap-2 text-white">
              <Clock size={18} className="text-blue-400" />
              Riwayat Check-in Terbaru
            </div>
            <span className="text-xs text-white/40">{history.length} tamu</span>
          </div>
          {!history.length && (
            <div className="text-sm text-white/50 py-6 text-center flex flex-col items-center gap-2">
              <Clock size={32} className="text-white/20" />
              Belum ada riwayat check-in
            </div>
          )}
          {!!history.length && (
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
              {history.map((h) => (
                <div key={h.id} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3 hover:bg-white/10 transition-colors">
                  <div className="h-12 w-12 rounded-lg bg-white/10 overflow-hidden flex-shrink-0">
                    {h.photoUrl ? (
                      <img src={toApiUrl(h.photoUrl)} className="h-full w-full object-cover" alt={h.name} />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <Users size={20} className="text-white/30" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-white truncate">{h.name}</div>
                    <div className="text-xs text-white/50 truncate flex items-center gap-1.5">
                      <span className="font-mono text-blue-300/70">{h.guestId}</span>
                      <span>•</span>
                      <span>{h.tableLocation}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xs text-emerald-400 font-medium">#{h.queueNumber}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Confirmation full display */}
      {checkedGuest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-5xl overflow-hidden rounded-xl border border-white/20 bg-slate-900/90 text-white shadow-glass grid grid-cols-1 md:grid-cols-[320px_1fr] animate-in fade-in zoom-in duration-300">
            <div className="bg-white/10 flex items-center justify-center min-h-[300px] md:min-h-full relative">
              {autoCapturing ? (
                <div className="w-full h-full flex flex-col items-center justify-center">
                  <video
                    ref={autoVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-4 left-0 right-0 text-center">
                    <div className="inline-flex items-center gap-2 bg-black/70 text-white px-4 py-2 rounded-full text-sm font-medium">
                      <Loader2 className="animate-spin" size={16} />
                      {autoCaptureStatus}
                    </div>
                  </div>
                </div>
              ) : checkedGuest.photoUrl ? (
                <img src={toApiUrl(checkedGuest.photoUrl)} alt={checkedGuest.name} className="w-full h-full object-cover" />
              ) : (
                <div className="text-gray-400 p-8 flex flex-col items-center gap-2">
                  <Users size={48} className="opacity-50" />
                  <span>No Photo</span>
                </div>
              )}
              <canvas ref={autoCanvasRef} className="hidden" />
            </div>
            <div className="p-6 md:p-10 space-y-4 relative overflow-y-auto max-h-[60vh] md:max-h-full">
              {isDuplicateCheckIn ? (
                <div className="text-amber-500 text-xl font-bold flex items-center gap-2">
                  <XCircle size={24} />
                  SUDAH CHECK-IN
                </div>
              ) : (
                <div className="text-emerald-400 text-xl font-bold flex items-center gap-2">
                  <CheckCircle size={24} />
                  CHECK-IN BERHASIL
                  {(checkedGuest.checkinCount ?? 0) > 1 && (
                    <span className="text-sm bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full ml-2">
                      Check-in ke-{checkedGuest.checkinCount}
                    </span>
                  )}
                </div>
              )}

              {/* Show check-in history for both success and duplicate */}
              {checkedGuest.checkins && checkedGuest.checkins.length > 0 && (
                <div className={`mb-4 rounded-lg p-3 ${isDuplicateCheckIn ? 'bg-amber-500/10 border border-amber-500/20' : 'bg-emerald-500/10 border border-emerald-500/20'}`}>
                  {isDuplicateCheckIn && checkedGuest.message && (
                    <div className="text-base text-amber-300 font-medium mb-2">{checkedGuest.message}</div>
                  )}
                  <div className={`text-sm uppercase tracking-wider font-medium mb-2 ${isDuplicateCheckIn ? 'text-amber-200/80' : 'text-emerald-200/80'}`}>
                    Riwayat Check-in ({checkedGuest.checkinCount || checkedGuest.checkins.length}x)
                  </div>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {checkedGuest.checkins.map((c, idx) => (
                      <div key={c.id || idx} className={`flex items-center justify-between text-sm rounded px-2 py-1 ${isDuplicateCheckIn ? 'bg-amber-500/10' : 'bg-emerald-500/10'}`}>
                        <span className={`font-medium ${isDuplicateCheckIn ? 'text-amber-100' : 'text-emerald-100'}`}>
                          {c.checkinByName || 'Admin'}
                          {c.counterName && <span className="text-white/50 ml-1">({c.counterName})</span>}
                        </span>
                        <span className={`font-mono text-xs ${isDuplicateCheckIn ? 'text-amber-200/70' : 'text-emerald-200/70'}`}>
                          {new Date(c.checkinAt).toLocaleString('id-ID', {
                            day: '2-digit',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Fallback for old data without checkins array */}
              {isDuplicateCheckIn && (!checkedGuest.checkins || checkedGuest.checkins.length === 0) && checkedGuest.checkedInAt && (
                <div className="mb-4 bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
                  {checkedGuest.message && (
                    <div className="text-base text-amber-300 font-medium mb-2">{checkedGuest.message}</div>
                  )}
                  <div className="text-sm text-amber-200/80 uppercase tracking-wider font-medium">Waktu Check-in Sebelumnya</div>
                  <div className="text-xl font-mono font-bold text-amber-100">
                    {new Date(checkedGuest.checkedInAt).toLocaleString('id-ID', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit'
                    })}
                  </div>
                  {checkedGuest.checkedInByName && (
                    <div className="text-sm text-amber-200/70 mt-1">Oleh: {checkedGuest.checkedInByName}</div>
                  )}
                </div>
              )}

              <div className="mb-6">
                <div className="text-sm text-white/60 uppercase tracking-wider font-medium">Guest ID</div>
                <div className="text-xl font-mono font-semibold text-white">{checkedGuest.guestId}</div>
              </div>

              <div className="mb-6">
                <div className="text-sm text-white/60 uppercase tracking-wider font-medium">Nama</div>
                <div className="text-4xl md:text-6xl font-bold text-white leading-tight">{checkedGuest.name}</div>
              </div>

              <div className="mb-6">
                <div className="text-sm text-white/60 uppercase tracking-wider font-medium">Meja / Ruangan</div>
                <div className="text-3xl md:text-5xl font-bold text-white">{checkedGuest.tableLocation}</div>
              </div>

              {checkedGuest.company && (
                <div className="mb-6">
                  <div className="text-sm text-white/60 uppercase tracking-wider font-medium">Perusahaan</div>
                  <div className="text-2xl md:text-4xl font-bold text-white">{checkedGuest.company}</div>
                </div>
              )}

              {checkedGuest.department && (
                <div className="mb-6">
                  <div className="text-sm text-white/60 uppercase tracking-wider font-medium">Departemen</div>
                  <div className="text-2xl md:text-4xl font-bold text-white">{checkedGuest.department}</div>
                </div>
              )}

              {checkedGuest.division && (
                <div className="mb-6">
                  <div className="text-sm text-white/60 uppercase tracking-wider font-medium">Divisi</div>
                  <div className="text-2xl md:text-4xl font-bold text-white">{checkedGuest.division}</div>
                </div>
              )}

              {checkedGuest.notes && (
                <div className="bg-white/5 p-3 rounded-lg border border-white/10 mb-6">
                  <div className="text-sm text-white/60 uppercase tracking-wider font-medium mb-1">Catatan</div>
                  <div className="text-base md:text-lg text-white italic">"{checkedGuest.notes}"</div>
                </div>
              )}

              <div className="mt-auto pt-4 border-t border-white/10">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs text-white/50 uppercase tracking-wider font-medium">Queue Number</div>
                    <div className="text-3xl font-bold text-white/80">{checkedGuest.queueNumber}</div>
                  </div>
                </div>
              </div>

              <div className="pt-6 flex flex-wrap items-center gap-3">
                <button
                  className="flex items-center gap-2 rounded-lg border border-white/30 bg-white/10 px-6 py-3 text-base font-medium text-white hover:bg-white/20 transition-colors"
                  onClick={() => { setCheckedGuest(null); setIsDuplicateCheckIn(false); clearPopupTimeout(); }}
                  disabled={autoCapturing}
                >
                  <X size={20} />
                  Tutup
                </button>
                {enablePhotoCapture && !isDuplicateCheckIn && !autoCapturing && (
                  <button
                    className="flex items-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 px-6 py-3 text-base font-medium text-white transition-colors"
                    onClick={() => {
                      clearPopupTimeout();
                      setShowPhotoCapture(true);
                      startCamera();
                    }}
                  >
                    <Camera size={20} />
                    {checkedGuest?.photoUrl ? 'Ambil Ulang Foto' : 'Ambil Foto Manual'}
                  </button>
                )}
                {isAuth && (
                  <button
                    disabled={unchecking}
                    className="flex items-center gap-2 bg-red-600/80 hover:bg-red-600 text-white rounded-lg px-6 py-3 text-base font-medium disabled:opacity-50 transition-colors ml-auto"
                    onClick={() => openUncheckModal(checkedGuest)}
                  >
                    <XCircle size={20} />
                    Batal Check-in
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Popup-specific background override rendering */}
          {(() => {
            const mode = bgMode === 'CONFIG' ? cfg?.backgroundType : bgMode;
            return (
              <>
                {mode === 'IMAGE' && cfg?.backgroundImageUrl && (
                  <div className="absolute inset-0 -z-10 bg-center bg-cover blur-sm" style={{ backgroundImage: `url(${toApiUrl(cfg.backgroundImageUrl)})` }} />
                )}
                {mode === 'VIDEO' && cfg?.backgroundVideoUrl && (
                  // eslint-disable-next-line jsx-a11y/media-has-caption
                  <video className="absolute inset-0 -z-10 w-full h-full object-cover blur-sm" src={toApiUrl(cfg.backgroundVideoUrl)} muted loop autoPlay playsInline />
                )}
                {mode === 'NONE' && (
                  <div className="absolute inset-0 -z-10 bg-black" style={{ opacity: 0.2 }} />
                )}
              </>
            );
          })()}
        </div>
      )}

      {/* Scanner Modal */}
      {showScanner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-md">
          <div className="w-full max-w-md rounded-xl bg-white p-6 text-center shadow-2xl">
            <h3 className="mb-4 text-xl font-bold text-gray-900 flex items-center justify-center gap-2">
              <QrCode size={24} />
              Scan QR Code
            </h3>
            <Html5QrcodePlugin
              fps={10}
              qrbox={250}
              disableFlip={false}
              qrCodeSuccessCallback={onScanSuccess}
              onScanFailure={(err: any) => {
                // Silently ignore scan failures (frame not containing QR)
              }}
            />
            <button
              className="mt-6 flex items-center justify-center gap-2 w-full rounded-lg bg-red-600 px-4 py-3 text-white font-medium hover:bg-red-700 transition-colors"
              onClick={() => setShowScanner(false)}
            >
              <X size={20} />
              Batal
            </button>
          </div>
        </div>
      )}

      {/* Uncheck Confirmation Modal */}
      {showUncheckModal && uncheckTarget && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
          <div className="w-full max-w-md rounded-xl bg-slate-900 border border-red-500/30 p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
                <XCircle size={24} className="text-red-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Batalkan Check-in</h3>
                <p className="text-sm text-white/60">Tindakan ini memerlukan verifikasi</p>
              </div>
            </div>

            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 mb-4">
              <p className="text-sm text-amber-200">
                <strong>Peringatan:</strong> Membatalkan check-in akan membuat tamu <strong>{uncheckTarget.name}</strong> tidak eligible untuk lucky draw sampai check-in ulang.
              </p>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">
                  Password Admin <span className="text-red-400">*</span>
                </label>
                <input
                  type="password"
                  value={uncheckPassword}
                  onChange={(e) => setUncheckPassword(e.target.value)}
                  placeholder="Masukkan password Anda"
                  className="w-full rounded-lg border border-white/20 bg-white/5 px-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">
                  Alasan Pembatalan <span className="text-red-400">*</span>
                </label>
                <textarea
                  value={uncheckReason}
                  onChange={(e) => setUncheckReason(e.target.value)}
                  placeholder="Jelaskan alasan pembatalan check-in (min. 5 karakter)"
                  rows={3}
                  className="w-full rounded-lg border border-white/20 bg-white/5 px-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50 resize-none"
                />
              </div>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 text-sm">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={closeUncheckModal}
                disabled={unchecking}
                className="flex-1 flex items-center justify-center gap-2 rounded-lg border border-white/20 bg-white/5 px-4 py-3 text-white font-medium hover:bg-white/10 transition-colors disabled:opacity-50"
              >
                <X size={18} />
                Batal
              </button>
              <button
                onClick={doUncheckin}
                disabled={unchecking || !uncheckPassword || uncheckReason.length < 5}
                className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-red-600 hover:bg-red-700 px-4 py-3 text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {unchecking ? (
                  <>
                    <Loader2 className="animate-spin" size={18} />
                    Memproses...
                  </>
                ) : (
                  <>
                    <XCircle size={18} />
                    Konfirmasi Pembatalan
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Photo Capture Modal */}
      {showPhotoCapture && checkedGuest && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 p-4 backdrop-blur-md">
          <div className="w-full max-w-lg rounded-xl bg-slate-900 border border-white/20 p-6 text-center shadow-2xl">
            <h3 className="mb-4 text-xl font-bold text-white flex items-center justify-center gap-2">
              <Camera size={24} className="text-emerald-400" />
              Ambil Foto: {checkedGuest.name}
            </h3>
            
            <div className="relative aspect-[4/3] bg-black rounded-lg overflow-hidden mb-4">
              {!capturedPhoto ? (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
              ) : (
                <img src={capturedPhoto} alt="Captured" className="w-full h-full object-cover" />
              )}
            </div>
            
            <canvas ref={canvasRef} className="hidden" />
            
            <div className="flex gap-3 justify-center">
              {!capturedPhoto ? (
                <>
                  <button
                    onClick={closePhotoCapture}
                    className="flex items-center gap-2 rounded-lg border border-white/30 bg-white/10 px-6 py-3 text-white font-medium hover:bg-white/20 transition-colors"
                  >
                    <X size={20} />
                    Batal
                  </button>
                  <button
                    onClick={capturePhoto}
                    className="flex items-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 px-6 py-3 text-white font-medium transition-colors"
                  >
                    <Camera size={20} />
                    Ambil Foto
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={retakePhoto}
                    className="flex items-center gap-2 rounded-lg border border-white/30 bg-white/10 px-6 py-3 text-white font-medium hover:bg-white/20 transition-colors"
                  >
                    <Camera size={20} />
                    Ulangi
                  </button>
                  <button
                    onClick={uploadCapturedPhoto}
                    disabled={uploadingPhoto}
                    className="flex items-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-700 px-6 py-3 text-white font-medium transition-colors disabled:opacity-50"
                  >
                    {uploadingPhoto ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle size={20} />}
                    {uploadingPhoto ? 'Menyimpan...' : 'Simpan Foto'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div >
  );
}

// Helper component for html5-qrcode

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
        alert(`Gagal memindai QR Code: ${retryErr?.message || "Tidak ditemukan QR Code"}. Pastikan gambar jelas, pencahayaan cukup, dan QR Code terlihat utuh.`);
      }
    }
  };

  return (
    <div className="w-full">
      <div id={uniqueIdRef.current} className="w-full overflow-hidden rounded-lg bg-black border-2 border-gray-200 relative min-h-[300px]">
        {startError && (
          <div className="absolute inset-0 flex items-center justify-center p-4 text-center bg-slate-900 text-white overflow-y-auto">
            <div className="max-h-full py-4">
              <p className="text-red-400 font-bold mb-2">Kamera Error</p>
              <p className="text-sm text-white/70 mb-4">
                {startError}
              </p>
              <div className="text-xs text-left bg-black/30 p-3 rounded border border-white/10 mb-4 space-y-2">
                <p className="font-bold text-yellow-400">Solusi (Chrome/Edge):</p>
                <ol className="list-decimal pl-4 space-y-1 opacity-90">
                  <li>Buka tab baru, ketik: <code className="bg-white/20 px-1 rounded">chrome://flags</code></li>
                  <li>Cari: <code className="bg-white/20 px-1 rounded">insecure origins</code></li>
                  <li>Enable <b>"Insecure origins treated as secure"</b></li>
                  <li>Masukkan URL ini di kotak teks yang muncul: <br /><code className="bg-white/20 px-1 rounded block mt-1 select-all">{typeof window !== 'undefined' ? window.location.origin : 'http://...'}</code></li>
                  <li>Klik <b>Relaunch</b> di bawah layar.</li>
                </ol>
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="bg-white text-slate-900 px-4 py-2 rounded-full font-bold text-sm hover:bg-gray-200 transition-colors"
              >
                Buka Kamera / Upload
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Always show manual upload option as backup */}
      <div className="mt-4 text-center">
        <button
          onClick={() => fileInputRef.current?.click()}
          className="text-sm text-blue-600 hover:underline font-medium"
        >
          Masalah dengan kamera? Upload Foto / Buka Kamera App
        </button>
        <input
          type="file"
          accept="image/*"
          capture="environment"
          ref={fileInputRef}
          className="hidden"
          onChange={handleFileUpload}
        />
      </div>
    </div>
  );
};
