# Lucky Draw Live Display — Slot Machine Mode (Revised v2)

## Deskripsi Fitur

Halaman baru **Live Display** diakses dari tombol pada halaman Lucky Draw (`/luckydraw`). Halaman ini membuka tampilan layar penuh di `/luckydraw/display` bergaya **mesin slot kasino** yang dirancang untuk ditayangkan di layar besar/proyektor agar seluruh ruangan dapat menyaksikan pengundian.

**Konsep Utama:**
- **10 karakter alfanumerik reels** (kolom bergulir vertikal) yang merepresentasikan **Guest ID / ID Pegawai**.
- Karakter yang dimunculkan: `0-9` dan `A-Z` (36 karakter total).
- Guliran dimulai dari **kanan ke kiri** (karakter terakhir berhenti duluan, karakter pertama berhenti terakhir) — persis seperti mesin slot sungguhan.
- Guest ID yang kurang dari 10 karakter akan di-**pad dengan `0`** di depan (contoh: `ABC1234` → `000ABC1234`).
- Hadiah **HIBURAN** mendukung multi-winner → ditampilkan **PARALEL** (banyak baris slot berputar bersamaan).
- Hadiah **UTAMA** tetap satu per satu dengan drama maksimal.
- Audio dan kemeriahan (confetti, screen flash, dark reveal) dipertahankan dari halaman Lucky Draw utama.

---

## Arsitektur & Routing

```
/luckydraw              ← Halaman kontrol (existing, tambahkan tombol "Live Display")
/luckydraw/display      ← [NEW] Halaman Live Display (slot machine, fullscreen)
```

Halaman `/luckydraw/display` adalah halaman **standalone** yang:
- Mengambil data hadiah & kandidat dari API yang sama (`/api/prizes`, `/api/guests?checkedIn=true`).
- Memanggil API draw yang sama (`POST /api/prizes/:id/draw`).
- Mendengarkan SSE events (`prize_draw`, `prize_reset`, `config`, `event_change`) untuk sinkronisasi real-time.
- Memiliki kontrol sendiri (pilih hadiah, set draw count, tombol spin).

---

## Charset & Konversi Guest ID

### Charset Alfanumerik

Setiap reel menampilkan 36 karakter: `0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ`

```typescript
const SLOT_CHARSET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
// Index 0 = '0', Index 9 = '9', Index 10 = 'A', Index 35 = 'Z'
```

### Logika Konversi Guest ID → 10 Karakter

```typescript
const guestIdToSlotChars = (guestId: string): string[] => {
    // 1. Uppercase
    const upper = guestId.toUpperCase();
    // 2. Strip semua karakter non-alfanumerik (hapus -, _, spasi, dll)
    const cleaned = upper.replace(/[^A-Z0-9]/g, '');
    // 3. Pad ke 10 karakter dengan '0' di depan
    const padded = cleaned.padStart(10, '0');
    // 4. Ambil 10 karakter terakhir (jika lebih dari 10)
    const final = padded.slice(-10);
    return final.split('');
};
```

### Contoh Konversi

```
Input: "INV-00234"  → clean "INV00234"  → pad 10 → "00INV00234"
Input: "1234567"    → clean "1234567"   → pad 10 → "0001234567"
Input: "EMP-G001"   → clean "EMPG001"   → pad 10 → "000EMPG001"
Input: "ABC1234567" → clean "ABC1234567" → sudah 10 → "ABC1234567"
Input: "X"          → clean "X"         → pad 10 → "000000000X"
```

### Fallback
- Jika `guestId` kosong/undefined → gunakan `queueNumber` dikonversi ke string.
- Jika setelah cleaning hasilnya kosong (misal guestId = `---`) → fallback ke `queueNumber`.

---

## Desain Visual

### Layout Utama (Fullscreen Landscape)

```
┌────────────────────────────────────────────────────────────────────┐
│  [Logo]        LUCKY DRAW ★ SLOT MACHINE           🔊 [Sound]    │
│────────────────────────────────────────────────────────────────────│
│                                                                    │
│   ┌───────────────── HADIAH AKTIF ────────────────┐               │
│   │   🏆 Hadiah Utama - Samsung Galaxy S25         │               │
│   │   Sisa: 3/5        [▼ Pilih Hadiah]            │               │
│   └────────────────────────────────────────────────┘               │
│                                                                    │
│   ═══════════════ SINGLE WINNER MODE ═══════════════              │
│   ╔═══╦═══╦═══╦═══╦═══╦═══╦═══╦═══╦═══╦═══╗                     │
│   ║ 0 ║ 0 ║ I ║ N ║ V ║ 0 ║ 0 ║ 2 ║ 3 ║ 4 ║  ← 10 reels      │
│   ╚═══╩═══╩═══╩═══╩═══╩═══╩═══╩═══╩═══╩═══╝                     │
│                                                                    │
│   ═══════════════ MULTI WINNER MODE (5x) ═══════════════          │
│   Row 1: ╔═══╦═══╦═══╦═══╦═══╦═══╦═══╦═══╦═══╦═══╗  ← BUDI     │
│   Row 2: ║ 🔄║ 🔄║ 🔄║ 🔄║ 🔄║ 🔄║ 🔄║ 🔄║ 🔄║ 🔄║  ← spinning │
│   Row 3: ║ 🔄║ 🔄║ 🔄║ 🔄║ 🔄║ 🔄║ 🔄║ 🔄║ 🔄║ 🔄║  ← spinning │
│   Row 4: ║ 🔄║ 🔄║ 🔄║ 🔄║ 🔄║ 🔄║ 🔄║ 🔄║ 🔄║ 🔄║  ← spinning │
│   Row 5: ╚═══╩═══╩═══╩═══╩═══╩═══╩═══╩═══╩═══╩═══╝  ← spinning │
│                                                                    │
│   PEMENANG: BUDI SANTOSO - PT. ABC Corp                           │
│                                                                    │
│   [Draw Count: 1 5 10 20 __]    [ ◆ PUTAR UNDIAN ◆ ]             │
│                                                                    │
│  ┌─────────────────── PEMENANG ───────────────────┐               │
│  │ #00INV00234  Budi Santoso    PT ABC            │               │
│  │ #000EMPG001  Siti Rahayu     PT XYZ            │               │
│  └────────────────────────────────────────────────┘               │
└────────────────────────────────────────────────────────────────────┘
```

### Komponen Slot Reel (Detail Visual)

Setiap **reel** (kolom karakter) adalah `<div>` overflow-hidden dengan **strip vertikal** berisi 36 karakter (0-9, A-Z) yang bergulir ke atas. Saat berhenti, reel "snap" ke karakter pemenang dengan efek **bounce/elastic**.

```
  ┌─────┐
  │  I  │  ← karakter di atas (opacity 30%, blur, scale kecil)
  ├─────┤
  │  J  │  ← karakter tengah (FOKUS, terang, scale 100%)
  ├─────┤
  │  K  │  ← karakter di bawah (opacity 30%, blur, scale kecil)
  └─────┘
```

**Visual per reel:**
- Container: `w-[60px] h-[120px]` dengan `overflow: hidden` dan `perspective: 400px`.
- Background: `bg-black/80` dengan inner shadow gelap.
- Border: metallic gold glow (`border-brand-primary/40`, `box-shadow: inset 0 0 20px rgba(0,0,0,0.8)`).
- Strip: berisi 36 karakter × 3 loops = 108 elemen vertikal. Setiap elemen = `h-[120px]` (tinggi container).
- Font: `font-mono font-black text-5xl` (pada layar besar) atau `text-3xl` (pada multi-row).
- Saat spinning: CSS `animation: slot-spin 0.3s linear infinite` (translasi `translateY` loop).
- Saat locked: snap ke posisi exact + `animation: slot-lock-bounce 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)`.

**Separator antar reel:**
- Line tipis `w-[1px] bg-brand-primary/20` tinggi penuh.
- Setiap 3 atau 5 reel diberi gap sedikit lebih lebar untuk readability.

---

## Multi-Winner Paralel (HIBURAN)

### Konsep Layout

Ketika `drawCount > 1`, halaman menampilkan **N baris slot** secara bersamaan, di mana N = `drawCount`.

**Layout adaptif berdasarkan jumlah:**

| Draw Count | Layout | Ukuran Reel | 
|------------|--------|-------------|
| 1          | Single row, besar | `text-6xl`, `h-[140px]` |
| 2-3        | Stacked rows | `text-5xl`, `h-[120px]` |
| 4-5        | Stacked rows, compact | `text-4xl`, `h-[100px]` |
| 6-10       | 2 columns × N/2 rows | `text-3xl`, `h-[80px]` |
| 11-20      | 2 columns × N/2 rows, small | `text-2xl`, `h-[60px]` |
| 21+        | 3 columns, auto rows | `text-xl`, `h-[50px]` |

### Animasi Paralel

Semua baris berputar **bersamaan**, lalu berhenti secara **staggered per-reel dari kanan ke kiri**:

```
Waktu 0s:   Row1[🔄🔄🔄🔄🔄🔄🔄🔄🔄🔄]  Row2[🔄🔄🔄🔄🔄🔄🔄🔄🔄🔄]  Row3[🔄🔄🔄🔄🔄🔄🔄🔄🔄🔄]

Waktu 1.0s: Row1[🔄🔄🔄🔄🔄🔄🔄🔄🔄 4]  Row2[🔄🔄🔄🔄🔄🔄🔄🔄🔄 1]  Row3[🔄🔄🔄🔄🔄🔄🔄🔄🔄 7]
             ↑ Reel ke-10 SEMUA BARIS terkunci bersamaan

Waktu 1.4s: Row1[🔄🔄🔄🔄🔄🔄🔄🔄 3 4]  Row2[🔄🔄🔄🔄🔄🔄🔄🔄 0 1]  Row3[🔄🔄🔄🔄🔄🔄🔄🔄 6 7]
             ↑ Reel ke-9 SEMUA BARIS terkunci bersamaan

...dst...

Waktu 4.6s: Row1[0 0 I N V 0 0 2 3 4]  → REVEAL: Budi Santoso ✨
            Row2[0 0 0 E M P G 0 0 1]  → REVEAL: Siti Rahayu ✨
            Row3[0 0 0 A B C 1 2 3 7]  → REVEAL: Andi Wijaya ✨
```

**Kunci:** Semua row lock reel di posisi yang sama secara sinkron. Digit ke-10 semua row lock bersama, lalu digit ke-9 semua row lock bersama, dst. Ini memberikan efek dramatis "angka terbentuk secara paralel".

### Implementasi State Multi-Row

```typescript
interface SlotRow {
    winnerId: string;           // Guest ID untuk display
    winnerChars: string[];      // Array 10 karakter target
    winner: Guest;              // Full guest object
}

// State
const [slotRows, setSlotRows] = useState<SlotRow[]>([]);
const [globalLockedCount, setGlobalLockedCount] = useState(0); // 0-10, semua row sinkron

// Animasi
const animateParallelReveal = async (winners: Guest[]) => {
    // Siapkan rows
    const rows: SlotRow[] = winners.map(w => ({
        winnerId: w.guestId || String(w.queueNumber),
        winnerChars: guestIdToSlotChars(w.guestId || String(w.queueNumber)),
        winner: w
    }));
    setSlotRows(rows);
    setGlobalLockedCount(0);
    
    // Spin duration
    await sleep(2000);
    
    // Lock dari kanan ke kiri, semua row bersamaan
    const lockDelay = 400; // ms per kolom
    for (let col = 9; col >= 0; col--) {
        setGlobalLockedCount(10 - col); // 1, 2, 3, ... 10
        
        // Mini confetti burst
        confetti({ particleCount: 10 * rows.length, spread: 40, origin: { x: 0.12 + (col * 0.08), y: 0.5 } });
        
        await sleep(lockDelay);
    }
    
    // Semua terkunci → REVEAL
    stopSound(audioRollRef);
    playSound(audioWinRef);
    
    // Confetti besar
    confetti({
        particleCount: 100 * rows.length,
        spread: 120,
        origin: { y: 0.6 },
        colors: ['#FFD700', '#FFA500', '#FF69B4', '#00FF00', '#00BFFF']
    });
};
```

### Render Multi-Row (SlotReel menggunakan globalLockedCount)

```tsx
// Setiap SlotReel menerima:
<SlotReel
    spinning={spinning}
    targetChar={row.winnerChars[colIndex]}    // Karakter target per cell
    locked={colIndex >= (10 - globalLockedCount)}  // Sinkron semua row
    reelIndex={colIndex}
/>
```

---

## Alur Grand Prize (UTAMA) — Slot Machine Version

1. Drawcount paksa = 1. Draw count selector di-hide.
2. Tekan "◆ GRAND PRIZE ◆".
3. Tombol disable + pulsing animation.
4. API dipanggil: `POST /prizes/:id/draw { count: 1 }`.
5. **Drama sequence (total ~12 detik):**
   - **[0-2s]** Semua 10 reel spin sangat cepat (`animation-duration: 0.1s`). Roll sound loop.
   - **[2-4s]** Tension sound dimulai. Screen shake mulai. Reel speed perlahan melambat (`0.1s → 0.2s`).
   - **[4-5s]** Lock reel ke-10 (paling kanan). Mini flash + clank. Shake intensify.
   - **[5-5.8s]** Lock reel ke-9.
   - **[5.8-6.5s]** Lock reel ke-8.
   - **[6.5-7.2s]** Lock reel ke-7. (delay mulai memanjang untuk drama)
   - **[7.2-8s]** Lock reel ke-6.
   - **[8-9s]** Lock reel ke-5. Tension sound volume naik.
   - **[9-10s]** Lock reel ke-4. Screen flash kecil.
   - **[10-11s]** Lock reel ke-3. 
   - **[11-12s]** Lock reel ke-2.
   - **[12-13.5s]** Lock reel ke-1 (paling kiri) — **jeda terpanjang**. Screen flash besar.
6. **[13.5s]** Semua terkunci:
   - Dark reveal overlay.
   - Grand win sound.
   - Nama pemenang muncul besar di bawah slot.
   - Epic confetti explosion (burst tengah + cannon kiri-kanan + gold rain).
7. **[18.5s]** Dark reveal fade out. Slot tetap menampilkan ID.

### Timing Lock (Grand Prize) — Progressive Delay

```typescript
const GRAND_PRIZE_LOCK_DELAYS = [
    600,  // reel 10 → 9
    500,  // reel 9 → 8
    500,  // reel 8 → 7
    600,  // reel 7 → 6
    700,  // reel 6 → 5
    800,  // reel 5 → 4
    900,  // reel 4 → 3
    1000, // reel 3 → 2
    1200, // reel 2 → 1
    1500, // final reel (paling kiri) — maximum suspense
];
```

---

## Komponen SlotReel — Detail Implementasi

### Arsitektur Animasi (JavaScript-driven, bukan CSS-only)

> **BUG PREVENTION:** CSS `animation: slot-spin` yang `linear infinite` memiliki masalah krusial:
> ketika kita menghapus class animasi untuk "lock", posisi strip akan jump ke `translateY(0)` 
> alih-alih snap ke karakter target. Ini menyebabkan **visual glitch/jump**.
>
> **Solusi:** Gunakan `requestAnimationFrame` loop + `ref` untuk mengontrol posisi strip secara manual.

```typescript
const SlotReel: React.FC<{
    spinning: boolean;
    targetChar: string;
    locked: boolean;
    reelIndex: number;
    charSize: number;       // tinggi per karakter dalam pixel
}> = ({ spinning, targetChar, locked, reelIndex, charSize }) => {
    const stripRef = useRef<HTMLDivElement>(null);
    const positionRef = useRef(0);          // posisi Y saat ini (pixel)
    const speedRef = useRef(0);             // kecepatan scroll (pixel/frame)
    const targetPosRef = useRef(0);         // posisi Y target saat lock
    const animFrameRef = useRef<number>(0);
    const isLockedRef = useRef(false);
    
    // Karakter set
    const chars = SLOT_CHARSET.split('');    // ['0','1',...'9','A','B',...'Z']
    const totalChars = chars.length;         // 36
    const stripHeight = totalChars * charSize; // total tinggi 1 loop
    
    // Mulai spinning
    useEffect(() => {
        if (spinning && !locked) {
            isLockedRef.current = false;
            // Kecepatan berbeda per reel untuk efek visual
            speedRef.current = 15 + (reelIndex * 2); 
            
            const animate = () => {
                positionRef.current = (positionRef.current + speedRef.current) % stripHeight;
                if (stripRef.current) {
                    stripRef.current.style.transform = `translateY(-${positionRef.current}px)`;
                }
                if (!isLockedRef.current) {
                    animFrameRef.current = requestAnimationFrame(animate);
                }
            };
            animFrameRef.current = requestAnimationFrame(animate);
        }
        
        return () => cancelAnimationFrame(animFrameRef.current);
    }, [spinning, locked]);
    
    // Lock ke target
    useEffect(() => {
        if (locked && !isLockedRef.current) {
            isLockedRef.current = true;
            
            // Hitung posisi target
            const charIndex = SLOT_CHARSET.indexOf(targetChar);
            const targetY = charIndex * charSize;
            
            // Animasi slowdown + snap menggunakan easing manual
            const startPos = positionRef.current;
            const startTime = performance.now();
            const duration = 500; // ms
            
            // Hitung jalur: harus melewati minimal 1 rotasi penuh sebelum berhenti
            const extraRotation = stripHeight;
            const endPos = targetY + extraRotation;
            
            const easeOutElastic = (t: number): number => {
                if (t === 0 || t === 1) return t;
                const p = 0.5;
                return Math.pow(2, -10 * t) * Math.sin((t - p / 4) * (2 * Math.PI) / p) + 1;
            };
            
            const animateLock = (now: number) => {
                const elapsed = now - startTime;
                const progress = Math.min(elapsed / duration, 1);
                const eased = easeOutElastic(progress);
                
                const currentPos = startPos + (endPos - startPos) * eased;
                positionRef.current = currentPos % stripHeight;
                
                if (stripRef.current) {
                    stripRef.current.style.transform = `translateY(-${positionRef.current}px)`;
                }
                
                if (progress < 1) {
                    animFrameRef.current = requestAnimationFrame(animateLock);
                }
            };
            
            animFrameRef.current = requestAnimationFrame(animateLock);
        }
    }, [locked, targetChar]);
    
    return (
        <div className="slot-reel-container relative overflow-hidden"
             style={{ height: `${charSize * 3}px`, width: charSize * 0.75 + 'px' }}>
            {/* Gradient overlay top & bottom */}
            <div className="absolute top-0 left-0 right-0 h-1/3 bg-gradient-to-b from-black/90 to-transparent z-10 pointer-events-none" />
            <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-black/90 to-transparent z-10 pointer-events-none" />
            
            {/* Center highlight line */}
            <div className="absolute top-1/3 left-0 right-0 h-1/3 border-y-2 border-brand-primary/50 z-10 pointer-events-none" 
                 style={{ boxShadow: locked ? '0 0 20px rgba(212,168,83,0.6)' : 'none' }} />
            
            {/* Strip */}
            <div ref={stripRef} className="absolute left-0 right-0"
                 style={{ top: charSize + 'px' }}>  {/* offset 1 char to center */}
                {/* Render 3 loops for seamless wrap */}
                {[0, 1, 2].map(loop => (
                    chars.map((char, i) => (
                        <div key={`${loop}-${i}`}
                             className={`flex items-center justify-center font-mono font-black select-none
                                 ${locked && char === targetChar ? 'text-brand-primary' : 'text-white/90'}`}
                             style={{ height: charSize + 'px' }}>
                            {char}
                        </div>
                    ))
                ))}
            </div>
        </div>
    );
};
```

### BUG PREVENTION NOTES

| Bug | Penyebab | Solusi |
|-----|----------|-------|
| **Jump saat lock** | CSS animation removal resets `translateY` ke 0 | Gunakan `requestAnimationFrame` + `ref`, bukan CSS animation |
| **Strip tidak seamless** | Strip habis di akhir lalu jump balik | Render 3x loop charset (108 elemen), modulo posisi |
| **Lock timing desync multi-row** | Setiap row punya state lock sendiri | Gunakan `globalLockedCount` — satu state untuk semua rows |
| **Confetti spam crash** | 20 row × 10 lock = 200 confetti calls | Batch confetti per-kolom (1 call per lock step, bukan per row) |
| **Audio overlap** | Multi-row lock memicu banyak win sounds | Audio hanya dipanggil 1× setelah SEMUA reel terkunci |
| **Memory leak animasi** | `requestAnimationFrame` tidak di-cancel saat unmount | `cancelAnimationFrame` di useEffect cleanup |
| **Guest ID fully non-alnum** | `guestId = "---"` → empty after clean | Fallback ke `queueNumber.toString()` |
| **Flickering saat re-render** | State update per-frame memicu React re-render | Gunakan `ref` untuk posisi strip, hindari `setState` di animation loop |
| **Reel offset salah** | charSize tidak konsisten antara container dan strip | Gunakan 1 sumber: prop `charSize` untuk semua kalkulasi |

---

## Proposed Changes

### Frontend

#### [NEW] `apps/frontend/app/luckydraw/display/page.tsx`

File utama halaman Live Display (~800-1000 baris). Komponen:

**1. State & Data Loading** (reuse pattern dari `luckydraw/page.tsx`)
- Fetch prizes, candidates, event config via `apiFetch`
- SSE listeners untuk `prize_draw`, `config`, `event_change`
- `spinningRef` untuk mencegah SSE reload saat animasi jalan

**2. SlotReel component** (inline, seperti pseudocode di atas)
- Props: `spinning`, `targetChar`, `locked`, `reelIndex`, `charSize`
- requestAnimationFrame-based animation (bukan CSS)
- 3-loop strip (108 elemen) dengan gradient overlay

**3. handleSpin()** — Entry point
- Cek `!spinning && selectedPrizeId`
- Tentukan single/multi via `category` dan `drawCount`
- Panggil API → fork ke `animateGrandPrize()` atau `animateParallelReveal()`

**4. animateParallelReveal(winners[])** — HIBURAN multi-winner
- Setup `slotRows[]` dari winners
- Start semua spinning
- Lock kanan-ke-kiri sinkron via `globalLockedCount`
- Final confetti + sound + display winners list

**5. animateGrandPrize(winner)** — UTAMA single winner
- Tension buildup (2s spin fast, 2s tension)
- Progressive lock delays (600ms → 1500ms)
- Screen flash + dark reveal + epic confetti

**6. UI Layout**
- Header: logo, judul, sound toggle
- Dynamic background (image/video/gradient, sama seperti halaman utama)
- Prize selector + draw count (hide count jika UTAMA)
- Slot machine area (single row atau multi-row grid)
- Winner display area (nama + perusahaan setelah reveal)
- Winners list (daftar semua pemenang hadiah ini)
- Screen flash overlay, dark reveal overlay, screen shake

**7. Audio system** (copy dari halaman utama)
- 4 audio refs: roll, tension, win, grandWin
- `playSound()`, `stopSound()`, `toggleSound()`
- Sound initiation overlay (browser autoplay compliance)

---

#### [MODIFY] `apps/frontend/app/luckydraw/page.tsx`

Tambah 1 tombol **"LIVE DISPLAY"** di panel kanan (setelah tombol "RIWAYAT PEMENANG", ~line 1021). Tombol ini membuka `/luckydraw/display` di tab baru.

Tambah import: `Monitor` dari `lucide-react`.

```tsx
{/* Live Display Button — di bawah RIWAYAT PEMENANG */}
<button
    onClick={() => window.open('/luckydraw/display', '_blank')}
    className="bg-gradient-to-r from-brand-primary/20 to-brand-accent/20 
               hover:from-brand-primary/30 hover:to-brand-accent/30 
               border border-brand-primary/30 text-brand-primarySoft text-lg rounded-2xl 
               px-6 py-5 focus:outline-none focus:ring-2 focus:ring-brand-primary/50 
               backdrop-blur-xl transition-all flex items-center justify-center gap-3 
               font-mono tracking-widest uppercase shadow-xl"
>
    <Monitor size={24} />
    LIVE DISPLAY
</button>
```

---

#### [MODIFY] `apps/frontend/app/globals.css`

Tambahkan CSS baru di dalam `@layer components { ... }`:

```css
/* ── Slot Machine Reel Styles ── */

.slot-reel-container {
    background: rgba(0, 0, 0, 0.85);
    border: 2px solid rgba(212, 168, 83, 0.3);
    border-radius: 0.5rem;
    box-shadow: 
        inset 0 0 30px rgba(0, 0, 0, 0.9),
        0 0 15px rgba(212, 168, 83, 0.1);
    position: relative;
    overflow: hidden;
}

.slot-reel-container.slot-locked {
    border-color: rgba(212, 168, 83, 0.7);
    box-shadow:
        inset 0 0 30px rgba(0, 0, 0, 0.9),
        0 0 25px rgba(212, 168, 83, 0.4);
}

/* Slot Lock Flash — one-shot */
@keyframes slot-lock-flash {
    0% { background-color: rgba(212, 168, 83, 0); }
    30% { background-color: rgba(212, 168, 83, 0.3); }
    100% { background-color: rgba(212, 168, 83, 0); }
}

.slot-lock-flash {
    animation: slot-lock-flash 0.4s ease-out;
}

/* Slot frame — metallic border around entire slot bank */
.slot-frame {
    background: linear-gradient(145deg, #2a2a3d 0%, #1a1a2e 50%, #15152a 100%);
    border: 3px solid rgba(212, 168, 83, 0.4);
    border-radius: 1.5rem;
    box-shadow:
        0 0 60px rgba(212, 168, 83, 0.15),
        inset 0 2px 0 rgba(255, 255, 255, 0.05);
    padding: 2rem;
}

/* Winner reveal animation */
@keyframes winner-name-reveal {
    0% { opacity: 0; transform: translateY(30px) scale(0.9); }
    60% { opacity: 1; transform: translateY(-5px) scale(1.05); }
    100% { opacity: 1; transform: translateY(0) scale(1); }
}

.animate-winner-reveal {
    animation: winner-name-reveal 0.8s cubic-bezier(0.34, 1.56, 0.64, 1);
}
```

---

### Backend

**TIDAK ADA PERUBAHAN BACKEND.** Semua API sudah tersedia:

| Endpoint | Kegunaan |
|----------|----------|
| `GET /api/prizes` | Daftar hadiah + winners |
| `GET /api/guests?checkedIn=true&pageSize=10000` | Kandidat eligible |
| `POST /api/prizes/:id/draw` | Eksekusi undian (body: `{ count }`) |
| `GET /api/config/event` | Konfigurasi event (logo, bg, sounds) |
| SSE `prize_draw` | Real-time notifikasi saat ada undian |
| SSE `config` | Real-time notifikasi perubahan config |
| SSE `event_change` | Real-time notifikasi ganti event |

---

## Ringkasan File

| File | Aksi | Deskripsi |
|------|------|-----------|
| `apps/frontend/app/luckydraw/display/page.tsx` | **[NEW]** | Halaman live display slot machine (~800-1000 baris) |
| `apps/frontend/app/luckydraw/page.tsx` | **[MODIFY]** | Tambah tombol "LIVE DISPLAY" (+12 baris) |
| `apps/frontend/app/globals.css` | **[MODIFY]** | Tambah CSS slot machine (+50 baris) |

---

## Dependensi & Reuse

| Komponen | Sumber | Reuse |
|----------|--------|-------|
| `apiFetch`, `apiBase`, `toApiUrl` | `lib/api.ts` | Import langsung |
| `useSSE` | `lib/sse-context.tsx` | Import langsung |
| `confetti` | `canvas-confetti` (npm) | Import langsung |
| Audio system | `luckydraw/page.tsx` | Copy pattern (refs + helpers) |
| Prize/Guest interfaces | `luckydraw/page.tsx` | Copy type defs |
| Background system | `luckydraw/page.tsx` | Copy JSX |
| `calculateRevealInterval` | `luckydraw/page.tsx` | Tidak dipakai lagi (paralel, bukan sequential) |

---

## Edge Cases & Error Handling

| Case | Handling |
|------|----------|
| Guest ID = `null`/`undefined` | Fallback ke `String(queueNumber)` |
| Guest ID = `"---"` (full non-alnum) | Setelah clean = empty → fallback ke `queueNumber` |
| Guest ID > 10 chars (misal `ABCDEF123456`) | `slice(-10)` → `EF12345656` |
| Draw count > remaining slots | API sudah handle ini (draw `min(count, remaining)`) |
| Semua hadiah habis | Tombol disabled + teks "Habis Terbagi" |
| API error saat draw | `try/catch` → alert error → reset spinning state |
| User spam klik spin | Guard: `if (spinning) return` |
| SSE event masuk saat animasi jalan | Guard: `if (spinningRef.current) return` (skip reload) |
| Layar portrait/kecil | Responsive: `text-3xl` → `text-xl`, reel size auto-shrink |
| 20+ winners paralel | Layout auto-switch ke 3-col grid, reel kecil |

---

## Verification Plan

### Automated
- Dev server start → `/luckydraw/display` accessible tanpa 404.
- Build production → no TypeScript/ESLint errors.

### Manual (Browser Testing)
1. `/luckydraw` → klik "LIVE DISPLAY" → tab baru terbuka di `/luckydraw/display`.
2. Enable sound → roll/win/grand-win sounds terdengar di momen yang tepat.
3. **HIBURAN single (count=1):** spin → 10 reel berputar → lock kanan-ke-kiri → nama muncul.
4. **HIBURAN multi (count=5):** spin → 5 row slot berputar PARALEL → lock sinkron kanan-ke-kiri → 5 nama muncul bersamaan.
5. **HIBURAN multi besar (count=20):** layout otomatis 2-col, reel lebih kecil, animasi tetap smooth.
6. **UTAMA:** spin → tension buildup → progressive lock (semakin lambat) → screen flash → dark reveal → epic confetti → nama.
7. Guest ID alfanumerik: `INV-00234` → slot menampilkan `00INV00234` (huruf dan angka campur).
8. Guest ID pendek: `X` → slot menampilkan `000000000X`.
9. Responsive: test di 1920×1080 dan 1366×768.
10. SSE sync: draw dari `/luckydraw` → data refresh di `/luckydraw/display`.
11. Error scenario: pilih hadiah yang sudah habis → tombol disabled.
