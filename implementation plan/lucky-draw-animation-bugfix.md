# Lucky Draw Animation Bugfix + Winner Takeout

Memperbaiki bug animasi dan menambahkan fitur auto-remove pemenang dari ticker/candidates.

## Bug Report

### Bug 1: Nama Duplikat di Live Eligible Ticker (Panel Kanan)
**Gejala:** Nama yang sama muncul 2x berturut-turut di daftar rolling Live Eligible.

**Root Cause:** Fungsi `injectWinnerToCenter()` langsung menyisipkan pemenang ke posisi index ke-3 **tanpa mengecek apakah nama itu sudah ada** di array `tickerNames`. Jika orang yang sama sudah ada di posisi lain (misalnya posisi 1 atau 5), maka nama itu tampil dua kali.

### Bug 2: Animasi Nama Kiri Berhenti Saat Grand Prize
**Gejala:** Saat mengundi hadiah UTAMA, tampilan nama di panel kiri (mesin undian) berhenti di satu nama sementara panel kanan (ticker) masih berputar. Pemenang belum diumumkan.

**Root Cause:** Alur `handleDraw` saat ini:
1. Start `setInterval` → rolling nama kiri setiap 50ms ✅
2. `await sleep(8000)` → tunggu 8 detik ✅
3. **`clearInterval(interval)`** → **STOP rolling kiri terlalu awal** ❌
4. `await executeGrandPrizeSlowdown()` → 12 detik slowdown ticker **TAPI kiri sudah mati**

Panel kiri stuck selama ~12 detik sementara ticker kanan masih berputar.

### Feature Request: Winner Takeout dari Ticker
**Permintaan:** Setelah tamu menang hadiah (dan hadiah TIDAK punya opsi "menang berkali-kali"), keluarkan nama pemenang dari daftar ticker dan candidates agar tidak muncul lagi di rolling.

**Logika Backend (sudah ada):**
- Prize dengan `allowMultipleWins = false` → pemenang tidak boleh menang hadiah apa pun lagi
- Prize dengan `allowMultipleWins = true` → pemenang hanya tidak boleh menang hadiah ini lagi

---

## Proposed Changes

### [MODIFY] [page.tsx](file:///e:/Vibe/Registrasi%20Tamu/apps/frontend/app/luckydraw/page.tsx)

---

#### Fix 1: Perbaiki `injectWinnerToCenter` — Hapus duplikat sebelum inject

```diff
 const injectWinnerToCenter = (winnerGuest: Guest) => {
     setTickerNames(prev => {
-        const arr = [...prev];
-        if (arr.length >= 4) {
-            arr[3] = winnerGuest;
-        } else {
-            arr.push(winnerGuest);
-        }
-        return arr;
+        // Remove existing entries of this winner to prevent duplicates
+        const arr = prev.filter(g => g.id !== winnerGuest.id);
+        // Insert winner at center position (index 3)
+        const centerIdx = Math.min(3, arr.length);
+        arr.splice(centerIdx, 0, winnerGuest);
+        // Keep max 7 entries
+        return arr.slice(0, 7);
     });
 };
```

---

#### Fix 2: Ticker sampler — Enforce unique + handle sedikit tamu

Ketika `candidates.length < 7`, jangan paksa mengisi 7 slot:

```diff
 // Initialization: Fill with unique candidates
-if (newArr.length < 7) {
+const maxSlots = Math.min(7, candidates.length);
+if (newArr.length < maxSlots) {
     const currentIds = new Set(newArr.map(n => n.id));
-    while (newArr.length < 7) {
+    while (newArr.length < maxSlots) {
         // ... existing fill logic ...
     }
 }
```

---

#### Fix 3: Pindahkan `clearInterval` ke DALAM `executeGrandPrizeSlowdown`

Alur baru Grand Prize:
```
[KLIK] → Kiri rolling cepat + Kanan rolling cepat (8 detik spinDuration)
       → Kiri MASIH rolling + Kanan mulai lambat (12 detik slowdown)
       → FLASH! → Kiri BERHENTI + Kanan BERHENTI → REVEAL 🎉
```

**Di `handleDraw`:**
```diff
     await sleep(drama.spinDuration);
-    clearInterval(interval);
     if (drama === DRAMA_CONFIGS.UTAMA) {
-        await executeGrandPrizeSlowdown(result);
+        await executeGrandPrizeSlowdown(result, interval);
     } else {
+        clearInterval(interval);
         setDisplayCandidate(result);
         // ... HIBURAN flow unchanged ...
     }
```

**Di `executeGrandPrizeSlowdown`:**
```diff
-const executeGrandPrizeSlowdown = async (winnerGuest: Guest) => {
+const executeGrandPrizeSlowdown = async (
+    winnerGuest: Guest,
+    drawInterval: ReturnType<typeof setInterval>
+) => {
     // Stage 1-5 unchanged (ticker slows, left side still rolls)

     // REVEAL
     setTickerSpeed(999999);
     setIsGlitching(false);
+    clearInterval(drawInterval);  // ← STOP left-side HERE
     setScreenFlash(true);
     // ...
     setDisplayCandidate(winnerGuest);
+    setWinner(winnerGuest);       // ← was missing
     setHighlightedId(winnerGuest.id);
```

---

#### Fix 4 (NEW): Winner Takeout — Keluarkan pemenang dari candidates & ticker

Tambahkan `allowMultipleWins` ke interface Prize:
```diff
 interface Prize {
     id: string;
     name: string;
     description?: string;
     category?: string;
     quantity: number;
     winners: any[];
+    allowMultipleWins?: boolean;
 }
```

Tambahkan helper function baru + update `loadData`:
```typescript
// Compute set of winner IDs that should be excluded from ticker
const getExcludedWinnerIds = (prizesData: Prize[]): Set<string> => {
    const excluded = new Set<string>();
    for (const prize of prizesData) {
        if (!prize.allowMultipleWins) {
            // Pemenang hadiah non-multiwin → exclude dari semua undian
            for (const w of prize.winners) {
                excluded.add(w.id);
            }
        }
    }
    return excluded;
};
```

Update `loadData` untuk filter candidates:
```diff
 const loadData = async () => {
     const [prizesData, guestsData, configData] = await Promise.all([...]);
     setPrizes(prizesData);
-    setCandidates(guestsData.data || []);
+    // Filter out winners dari hadiah yang tidak allowMultipleWins
+    const excluded = getExcludedWinnerIds(prizesData);
+    const eligibleCandidates = (guestsData.data || []).filter(
+        g => !excluded.has(g.id)
+    );
+    setCandidates(eligibleCandidates);
     setEventCfg(configData);
 };
```

Update post-draw: Langsung keluarkan pemenang dari state lokal (tanpa tunggu loadData):
```diff
 // After draw is complete (both UTAMA and HIBURAN):
+// Immediately remove winner from local candidates if not allowMultipleWins
+if (!selectedPrize?.allowMultipleWins) {
+    setCandidates(prev => prev.filter(c => c.id !== result.id));
+}
 setSpinning(false);
 loadData(); // Will also re-filter on server data
```

**Efek:**
- Ticker langsung berhenti menampilkan pemenang setelah undian (tanpa delay)
- Counter "LIVE ELIGIBLE: X NAMES" berkurang otomatis
- `loadData()` tetap dipanggil sebagai backup untuk re-sync dari server
- Hadiah dengan `allowMultipleWins = true` → pemenang TETAP muncul di ticker

---

## Alur Lengkap Setelah Fix

### Undian HIBURAN (3 detik):
```
[KLIK] → Kiri+Kanan rolling cepat (3s)
       → STOP → Kiri tampilkan pemenang + Kanan highlight pemenang
       → 5s kemudian → Kanan resume rolling (TANPA nama pemenang)
       → Counter berkurang
```

### Undian UTAMA (20+ detik):
```
[KLIK] → Kiri+Kanan rolling cepat (8s spinDuration)
       → Kiri MASIH rolling + Kanan mulai slowdown 5-tahap (12s)
       → FLASH! → Kiri+Kanan BERHENTI bersamaan → REVEAL pemenang
       → Dark reveal + confetti 500 particles
       → 4s kemudian → Kanan resume rolling (TANPA nama pemenang)
       → Counter berkurang
```

---

## Verification Plan

### Automated Tests
```
npx next build --no-lint
```

### Manual Verification
1. **Duplikat:** 20 tamu → tidak ada nama 2x di ticker
2. **Grand Prize:** Kiri tetap rolling selama slowdown, berhenti saat flash
3. **Winner Takeout:** Setelah undian biasa, pemenang hilang dari ticker + counter berkurang
4. **AllowMultipleWins:** Undian pemenang yang boleh menang lagi → nama masih di ticker
5. **Edge Case:** 3 tamu tersisa → ticker 3 slot, no duplicate, no crash
