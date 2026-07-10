export function apiBase() {
  // Always use same-origin '/api' in the browser so that LAN devices work
  if (typeof window !== 'undefined') return '/api';
  
  // Determine protocol based on USE_HTTPS environment variable
  const useHttps = process.env.USE_HTTPS === 'true';
  const protocol = useHttps ? 'https' : 'http';
  
  // On the server (SSR/build), fall back to env or local dev default
  if (process.env.BACKEND_ORIGIN) {
    return `${process.env.BACKEND_ORIGIN}/api`;
  }
  if (process.env.IS_DOCKER === 'true') {
    const backendPort = process.env.BACKEND_PORT || '4000';
    return `${protocol}://backend:${backendPort}/api`;
  }
  const envBase = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (envBase) return envBase;
  // Fallback to localhost with configurable port
  const backendPort = process.env.BACKEND_PORT || '4000';
  return `${protocol}://localhost:${backendPort}/api`;
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (typeof FormData !== 'undefined' && options.body instanceof FormData) {
    // Let browser set the Content-Type with boundary automatically
  } else {
    headers.set('Content-Type', headers.get('Content-Type') || 'application/json');
  }
  const token = getToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);

  let res: Response;
  try {
    res = await fetch(`${apiBase()}${path}`, { ...options, headers });
  } catch (networkError: any) {
    throw new Error('Gagal terhubung ke server. Periksa koneksi internet Anda.');
  }

  // Get response text first
  const text = await res.text();

  // Global 401 handler: token expired or invalid → auto-logout
  if (res.status === 401 && typeof window !== 'undefined') {
    localStorage.removeItem('token');
    window.location.href = '/admin/login';
    throw new Error('Sesi telah berakhir. Silakan login kembali.');
  }

  if (!res.ok) {
    // Parse error message for user-friendly display
    const errorMessage = parseErrorMessage(text);
    throw new Error(errorMessage);
  }

  // Handle empty response
  if (!text || text.trim() === '') {
    return {} as T;
  }

  // Try to parse as JSON
  try {
    return JSON.parse(text) as T;
  } catch {
    // If response is not JSON, return as-is wrapped in object or throw error
    console.warn('Response is not valid JSON:', text.substring(0, 100));
    throw new Error('Server mengembalikan response yang tidak valid. Silakan coba lagi.');
  }
}

export function toApiUrl(path?: string | null): string {
  const p = path ?? '';
  if (!p) return '';
  if (p.startsWith('http://') || p.startsWith('https://')) return p;
  if (p.startsWith('data:')) return p;
  
  if (p.startsWith('/api/')) {
    return `${apiBase()}${p.substring(4)}`;
  }
  
  // For local paths like 'uploads/...' or '/uploads/...'
  const cleanPath = p.startsWith('/') ? p : `/${p}`;
  return `${apiBase()}${cleanPath}`;
}

// Helper function to parse API error messages into user-friendly messages
export function parseErrorMessage(errorText: string): string {
  const errorMap: Record<string, string> = {
    // Authentication & Authorization
    'Invalid credentials': 'Login gagal. Username atau password salah.',
    'Unauthorized': 'Sesi telah berakhir. Silakan login kembali.',
    'Wrong password': 'Password yang Anda masukkan salah.',
    'User not found': 'User tidak ditemukan.',
    'Token expired': 'Sesi telah berakhir. Silakan login kembali.',
    'Invalid token': 'Sesi tidak valid. Silakan login kembali.',
    
    // Event errors
    'Event not found': 'Event tidak ditemukan. Silakan pilih event yang aktif terlebih dahulu.',
    'No active event': 'Tidak ada event aktif. Silakan aktifkan event terlebih dahulu.',
    'Cannot delete active event': 'Tidak dapat menghapus event yang sedang aktif.',
    'Invalid date format': 'Format tanggal tidak valid.',
    
    // Guest errors
    'Guest not found': 'Data tamu tidak ditemukan.',
    'Guest already checked in': 'Tamu sudah melakukan check-in sebelumnya.',
    'Guest not checked in': 'Tamu belum melakukan check-in.',
    'Duplicate guest ID': 'ID Tamu sudah digunakan.',
    'Guest ID already exists': 'ID Tamu sudah ada dalam sistem.',
    
    // Email errors
    'Email settings not configured': 'Pengaturan email belum dikonfigurasi. Silakan atur SMTP terlebih dahulu.',
    'Guest does not have an email': 'Tamu ini tidak memiliki alamat email.',
    'Failed to send email': 'Gagal mengirim email. Periksa pengaturan SMTP.',
    'Authentication rejected': 'Autentikasi SMTP ditolak. Periksa username dan password email.',
    'SMTP connection failed': 'Gagal terhubung ke server email. Periksa host dan port SMTP.',
    'SMTP password is required': 'Password SMTP wajib diisi untuk konfigurasi baru.',
    
    // File upload errors
    'No logo file provided': 'File logo tidak ditemukan.',
    'No background file provided': 'File background tidak ditemukan.',
    'File too large': 'Ukuran file terlalu besar.',
    'Invalid file type': 'Tipe file tidak didukung.',
    
    // Validation errors
    'Password salah': 'Password yang Anda masukkan salah.',
    'Password diperlukan': 'Password wajib diisi.',
    'Alasan pembatalan harus diisi': 'Alasan pembatalan wajib diisi (minimal 5 karakter).',
    'Required field missing': 'Data wajib belum diisi lengkap.',
    'Invalid input': 'Data yang dimasukkan tidak valid.',
    
    // Souvenir & Prize errors
    'Souvenir not found': 'Souvenir tidak ditemukan.',
    'Prize not found': 'Hadiah tidak ditemukan.',
    'Already taken': 'Souvenir sudah diambil sebelumnya.',
    'Not eligible': 'Tamu tidak memenuhi syarat.',
    'Must check in first': 'Tamu harus check-in terlebih dahulu.',
    
    // Server errors
    'Internal Server Error': 'Terjadi kesalahan pada server. Silakan coba lagi nanti.',
    'Internal server error': 'Terjadi kesalahan pada server. Silakan coba lagi nanti.',
    'Service unavailable': 'Layanan sedang tidak tersedia. Silakan coba lagi nanti.',
    'Database error': 'Terjadi kesalahan database. Silakan hubungi administrator.',
    'Connection refused': 'Tidak dapat terhubung ke server.',
    
    // Network errors
    'Failed to fetch': 'Gagal terhubung ke server. Periksa koneksi internet.',
    'Network error': 'Terjadi kesalahan jaringan. Periksa koneksi internet.',
    'Timeout': 'Koneksi timeout. Silakan coba lagi.',
  };

  // Handle empty or undefined input
  if (!errorText || errorText.trim() === '') {
    return 'Terjadi kesalahan. Silakan coba lagi.';
  }

  try {
    const parsed = JSON.parse(errorText);
    const message = parsed.message || parsed.error || parsed.statusMessage || '';
    
    // Check if we have a friendly message for this error
    for (const [key, friendlyMessage] of Object.entries(errorMap)) {
      if (message.toLowerCase().includes(key.toLowerCase())) {
        return friendlyMessage;
      }
    }
    
    // If message exists and is reasonably formatted, return it
    if (message && message.length < 200 && !message.includes('<')) {
      return message;
    }
    
    return 'Terjadi kesalahan. Silakan coba lagi.';
  } catch {
    // Not JSON, check raw text against error map
    for (const [key, friendlyMessage] of Object.entries(errorMap)) {
      if (errorText.toLowerCase().includes(key.toLowerCase())) {
        return friendlyMessage;
      }
    }
    
    // If it's a short, readable message without HTML, return it
    if (errorText.length < 200 && !errorText.includes('<') && !errorText.includes('{')) {
      return errorText;
    }
    
    return 'Terjadi kesalahan. Silakan coba lagi.';
  }
}

