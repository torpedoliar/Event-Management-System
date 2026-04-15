# Offline Check-in Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix offline check-in flaws: add PWA support, fix stale search results, add bulk guest download, and improve offline search.

**Architecture:** Four independent changes to frontend: (1) add next-pwa for Service Worker, (2) fix doSearch to clear stale results, (3) add bulk download button in Settings panel, (4) update ConnectionStatusIndicator to show cached guest count.

**Tech Stack:** Next.js 15, next-pwa, React, IndexedDB (idb library), TypeScript

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `apps/frontend/package.json` | Modify | Add `next-pwa` dependency |
| `apps/frontend/next.config.mjs` | Modify | Wrap config with `withPWA` |
| `apps/frontend/public/sw.js` | Create | Fallback service worker (if needed) |
| `apps/frontend/app/checkin/page.tsx` | Modify | Fix doSearch, add bulk download button, fix offline search |
| `apps/frontend/components/ConnectionStatusIndicator.tsx` | Modify | Show cached guest count |
| `apps/frontend/lib/indexeddb.ts` | Modify | Add `cacheGuestsBulk` method |

---

### Task 1: Add next-pwa Dependency

**Files:**
- Modify: `apps/frontend/package.json`

- [ ] **Step 1: Install next-pwa package**

Run in `apps/frontend` directory:
```bash
cd apps/frontend && npm install next-pwa
```

- [ ] **Step 2: Verify installation**

Check package.json has `next-pwa` in dependencies:
```bash
cd apps/frontend && npm list next-pwa
```
Expected: `next-pwa@<version>` listed.

- [ ] **Step 3: Commit**

```bash
git add apps/frontend/package.json apps/frontend/package-lock.json
git commit -m "feat: add next-pwa for offline PWA support"
```

---

### Task 2: Configure PWA in next.config.mjs

**Files:**
- Modify: `apps/frontend/next.config.mjs`

- [ ] **Step 1: Wrap config with withPWA**

Modify `apps/frontend/next.config.mjs`:

```javascript
import withPWA from 'next-pwa';

/** @type {import('next').NextConfig} */
const nextConfig = {
  typedRoutes: true,
  async rewrites() {
    const backendOrigin = (() => {
      const fromEnv = process.env.BACKEND_ORIGIN;
      const fromPublic = process.env.NEXT_PUBLIC_API_BASE_URL;
      const isDocker = process.env.IS_DOCKER === 'true';
      const backendPort = process.env.BACKEND_PORT || '4000';
      const useHttps = process.env.USE_HTTPS === 'true';
      const protocol = useHttps ? 'https' : 'http';

      if (fromEnv) return fromEnv;
      if (isDocker) return `${protocol}://backend:${backendPort}`;
      if (fromPublic) return fromPublic.replace(/\/?api\/?$/, '');

      return `${protocol}://localhost:${backendPort}`;
    })();

    console.log('[Next.js] Rewriting API requests to:', backendOrigin);

    return [
      {
        source: '/api/:path*',
        destination: `${backendOrigin}/api/:path*`,
      },
    ];
  },
};

const withPWAConfig = withPWA({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  runtimeCaching: [
    {
      urlPattern: /^https?.*/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'offline-cache',
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 24 * 60 * 60, // 24 hours
        },
      },
    },
    {
      urlPattern: /^\/api\/.*/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'api-cache',
        expiration: {
          maxEntries: 20,
          maxAgeSeconds: 60 * 60, // 1 hour
        },
      },
    },
  ],
});

export default { ...nextConfig, ...withPWAConfig, rewrites: nextConfig.rewrites };
```

- [ ] **Step 2: Test build**

```bash
cd apps/frontend && npm run build
```
Expected: Build succeeds without errors. PWA service worker generated in `public/` folder.

- [ ] **Step 3: Commit**

```bash
git add apps/frontend/next.config.mjs
git commit -m "feat: configure PWA with next-pwa for offline resilience"
```

---

### Task 3: Fix doSearch Stale Results Bug

**Files:**
- Modify: `apps/frontend/app/checkin/page.tsx` (doSearch function, around line 260-330)

- [ ] **Step 1: Add setResults([]) at start of doSearch**

Find the `doSearch` function and add `setResults([])` at the beginning:

```typescript
  const doSearch = async () => {
    setError(null);
    setSelected(null);
    setCheckedGuest(null);
    setResults([]); // Clear stale results before new search
    clearPopupTimeout(); // Clear any existing popup
    const params = new URLSearchParams();
    if (!q.trim()) return;
    // ... rest of function unchanged
```

- [ ] **Step 2: Commit**

```bash
git add apps/frontend/app/checkin/page.tsx
git commit -m "fix: clear stale search results before new search in doSearch"
```

---

### Task 4: Add Bulk Guest Download to IndexedDB

**Files:**
- Modify: `apps/frontend/lib/indexeddb.ts`
- Modify: `apps/frontend/app/checkin/page.tsx` (Settings panel)

- [ ] **Step 1: Add cacheGuestsBulk method to IndexedDBService**

Modify `apps/frontend/lib/indexeddb.ts`, add after the `cacheGuest` method:

```typescript
  async cacheGuestsBulk(guests: LocalGuest[]): Promise<{ success: number; failed: number }> {
    await this.init();
    let success = 0;
    let failed = 0;

    for (const guest of guests) {
      try {
        await this.db!.put('localGuests', guest);
        success++;
      } catch {
        failed++;
      }
    }

    return { success, failed };
  }
```

- [ ] **Step 2: Add state for bulk download in page.tsx**

Add these state variables near other settings states (around line 105):

```typescript
  const [downloadingGuests, setDownloadingGuests] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<string | null>(null);
```

- [ ] **Step 3: Add handleDownloadGuests function**

Add after the `toggleMultipleCheckinPerCounter` function:

```typescript
  const handleDownloadGuests = async () => {
    setDownloadingGuests(true);
    setDownloadProgress('Mengambil data tamu...');
    setError(null);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${apiBase()}/guests?limit=10000`, { headers });
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(parseErrorMessage(errorText));
      }

      const guests = await res.json();
      setDownloadProgress(`Menyimpan ${guests.length} tamu ke cache...`);

      // Map to LocalGuest format
      const localGuests: any[] = guests.map((g: any) => ({
        id: g.id,
        guestId: g.guestId,
        name: g.name,
        checkedIn: g.checkedIn,
        checkinCount: g.checkinCount || 0,
        lastCheckinAt: g.checkedInAt || undefined,
        photoUrl: g.photoUrl || undefined,
        updatedAt: new Date().toISOString(),
      }));

      const result = await indexedDBService.cacheGuestsBulk(localGuests);
      setDownloadProgress(`Berhasil: ${result.success} tamu tersimpan, ${result.failed} gagal.`);

      setTimeout(() => setDownloadProgress(null), 5000);
    } catch (e: any) {
      setError(e.message || 'Gagal mengunduh data tamu');
      setDownloadProgress(null);
    } finally {
      setDownloadingGuests(false);
    }
  };
```

- [ ] **Step 4: Add Download button in Settings panel**

Find the Settings modal JSX (around line 1195, before the "Selesai" button) and add:

```tsx
              {/* Bulk download for offline access */}
              <div className="pt-4 border-t border-white/10">
                <div className="text-xs text-white/40 uppercase tracking-wider mb-3">Akses Offline</div>
                <button
                  onClick={handleDownloadGuests}
                  disabled={downloadingGuests}
                  className={`w-full flex items-center justify-center gap-2 p-4 rounded-lg border border-white/20 bg-white/5 cursor-pointer transition-colors ${
                    downloadingGuests ? 'opacity-50 pointer-events-none' : 'hover:bg-white/10'
                  }`}
                >
                  {downloadingGuests ? (
                    <>
                      <Loader2 size={20} className="text-blue-400 animate-spin" />
                      <span className="text-sm text-white">{downloadProgress}</span>
                    </>
                  ) : (
                    <>
                      <Users size={20} className="text-blue-400" />
                      <div className="text-left">
                        <div className="font-medium text-white">Download Tamu untuk Akses Offline</div>
                        <div className="text-xs text-white/60">Simpan semua data tamu ke perangkat untuk pencarian saat offline</div>
                      </div>
                    </>
                  )}
                </button>
                {downloadProgress && !downloadingGuests && (
                  <div className="mt-2 text-xs text-emerald-400 text-center">{downloadProgress}</div>
                )}
              </div>
```

- [ ] **Step 5: Commit**

```bash
git add apps/frontend/lib/indexeddb.ts apps/frontend/app/checkin/page.tsx
git commit -m "feat: add bulk guest download for offline search"
```

---

### Task 5: Fix Offline Search to Use IndexedDB

**Files:**
- Modify: `apps/frontend/app/checkin/page.tsx` (doSearch catch block)

- [ ] **Step 1: Replace catch block offline search logic**

Find the catch block in `doSearch` (around line 320-340). Replace the entire catch block:

```typescript
    } catch (e: any) {
      const isNetworkError = e.message?.includes('Gagal terhubung') || e.message?.includes('NetworkError') || e.message?.includes('Failed to fetch');

      if (isNetworkError && stationConfig) {
        // Offline mode: search in local cache
        try {
          const cachedGuests = await indexedDBService.getAllCachedGuests();
          const cleanSearchQ = cleanQrContent(q.trim());

          // Search by guestId or name
          const matchedGuests = cachedGuests.filter(g =>
            g.guestId.toLowerCase().includes(cleanSearchQ.toLowerCase()) ||
            g.name.toLowerCase().includes(q.trim().toLowerCase())
          );

          if (matchedGuests.length === 1) {
            // Found single match - proceed with offline check-in
            const matchedGuest = matchedGuests[0];
            const queueLimit = cfg?.offlineQueueLimit || 500;
            const pendingCount = await offlineSyncService.getPendingCount();

            if (pendingCount >= queueLimit) {
              setError(`Antrian offline penuh (${pendingCount}/${queueLimit}). Hubungkan ke internet untuk sinkronisasi.`);
              return;
            }

            if (pendingCount >= queueLimit * 0.8) {
              setError(`⚠️ Antrian hampir penuh (${pendingCount}/${queueLimit}). Segera hubungkan ke internet.`);
            }

            // Create a Guest object from cached data
            const guestFromCache: Guest = {
              id: matchedGuest.id,
              guestId: matchedGuest.guestId,
              name: matchedGuest.name,
              queueNumber: 0,
              tableLocation: '',
              checkedIn: matchedGuest.checkedIn,
              checkedInAt: matchedGuest.lastCheckinAt,
              checkinCount: matchedGuest.checkinCount,
            };

            await offlineSyncService.addToQueue(guestFromCache.guestId);
            setResults([guestFromCache]);
            setSelected(guestFromCache);
            setCheckedGuest(guestFromCache);
            setIsDuplicateCheckIn(false);
            setQ('');
            refreshHistory();
            startPopupTimeout();
            return;
          } else if (matchedGuests.length > 1) {
            // Multiple matches - show list for selection
            const guestResults: Guest[] = matchedGuests.map(g => ({
              id: g.id,
              guestId: g.guestId,
              name: g.name,
              queueNumber: 0,
              tableLocation: '',
              checkedIn: g.checkedIn,
              checkedInAt: g.lastCheckinAt,
              checkinCount: g.checkinCount,
            }));
            setResults(guestResults);
            setError(`Ditemukan ${matchedGuests.length} tamu secara lokal. Pilih satu untuk check-in.`);
            return;
          }

          setError('Tamu tidak ditemukan dalam cache lokal. Hubungkan ke internet untuk pencarian server.');
        } catch (cacheErr) {
          console.error('Cache search error:', cacheErr);
          setError('Tidak ada koneksi internet dan cache tidak tersedia.');
        }
      } else {
        setError(e.message || 'Gagal mencari tamu');
      }
    } finally {
```

- [ ] **Step 2: Commit**

```bash
git add apps/frontend/app/checkin/page.tsx
git commit -m "fix: use IndexedDB cache for offline search instead of stale results"
```

---

### Task 6: Update ConnectionStatusIndicator with Cached Guest Count

**Files:**
- Modify: `apps/frontend/components/ConnectionStatusIndicator.tsx`

- [ ] **Step 1: Add cached guest count to expanded panel**

Modify `apps/frontend/components/ConnectionStatusIndicator.tsx`. Add state and effect for cached count:

Add new imports at top and state:

```typescript
import { indexedDBService } from '../lib/indexeddb';
```

Add state after existing states:

```typescript
  const [cachedGuestCount, setCachedGuestCount] = useState(0);
```

Add effect to load cached count (after existing useEffect):

```typescript
  useEffect(() => {
    const loadCachedCount = async () => {
      try {
        const guests = await indexedDBService.getAllCachedGuests();
        setCachedGuestCount(guests.length);
      } catch (err) {
        console.error('Failed to load cached guest count:', err);
      }
    };
    loadCachedCount();
  }, []);
```

Add cached guest info in expanded panel (after the "Offline Mode Info" section, before action buttons):

```tsx
            {/* Cached Guests Info */}
            {cachedGuestCount > 0 && (
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2 1 3 3 3h10c2 0 3-1 3-3V7c0-2-1-3-3-3H7c-2 0-3 1-3 3z" />
                  </svg>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-blue-800 dark:text-blue-300">
                      {cachedGuestCount} tamu ditarik cache lokal
                    </p>
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                      Tersedia untuk pencarian offline
                    </p>
                  </div>
                </div>
              </div>
            )}
```

- [ ] **Step 2: Commit**

```bash
git add apps/frontend/components/ConnectionStatusIndicator.tsx
git commit -m "feat: show cached guest count in connection status indicator"
```

---

### Task 7: Final Verification

**Files:** All modified files

- [ ] **Step 1: Build frontend**

```bash
cd apps/frontend && npm run build
```
Expected: Build succeeds. No TypeScript errors. PWA service worker generated.

- [ ] **Step 2: Verify all changes committed**

```bash
git status
```
Expected: Working tree clean.

- [ ] **Step 3: Final commit message if anything missed**

```bash
git add -A
git commit -m "chore: final verification and cleanup for offline fixes"
```

---

## Verification Checklist

After implementation, verify these scenarios:

1. **PWA**: Clear browser cache → load app → set DevTools to Offline → reload → app loads (no dinosaur)
2. **Bulk Download**: Click Settings → "Download Tamu" → IndexedDB populated with guests
3. **Offline Search**: DevTools Offline → search guest name → finds from cache → queues check-in
4. **Stale Results Fix**: Search → clear → search different guest → no old results shown
5. **Connection Indicator**: Shows "X tamu ditarik cache lokal" in expanded panel
6. **Online Sync**: Switch back to Online → pending check-ins auto-sync to server
