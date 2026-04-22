# Blueprint: 3D Carousel Wheel Lucky Draw (For Sub-Agent Execution)

## 1. Arsitektur & Struktur Direktori

Sub-agent harus membuat dan memodifikasi file berikut:
- **[NEW] `apps/frontend/components/LuckyDraw3DWheel.tsx`**: Mesin rotasi 3D dan animasi fisika.
- **[NEW] `apps/frontend/app/luckydraw/carousel/page.tsx`**: Halaman utama pengundian (menggunakan layout grid untuk multiple winners).
- **[MODIFY] `apps/frontend/app/luckydraw/page.tsx` & `apps/frontend/app/luckydraw/display/page.tsx`**: Tambahkan navigasi dropdown ke `/luckydraw/carousel`.

---

## 2. Implementasi Mesin 3D: `LuckyDraw3DWheel.tsx`

Komponen ini bertanggung jawab merender satu "roda" silinder 3D.

### A. Props Komponen
```typescript
interface LuckyDraw3DWheelProps {
  candidates: Guest[]; // Semua kandidat (untuk mengisi roda)
  winner: Guest; // Pemenang sebenarnya (harus ada di candidates)
  spinning: boolean; // Triggger mulai/berhenti putar
  isGrandPrize: boolean; // Jika true, gunakan efek "Teasing/Near-miss"
  stopDelay: number; // Untuk staggered stop pada multiple winners
  onStop: () => void; // Callback saat roda benar-benar berhenti
}
```

### B. Kalkulasi Matematika Silinder (3D CSS Math)
- Minimal butuh **20 item** agar silinder terlihat melingkar (tidak berbentuk kotak). Jika `candidates.length < 20`, *duplicate* array kandidat hingga jumlahnya >= 20.
- Misalkan `N` = jumlah item di roda. Tinggi satu kartu `H = 80px`.
- Sudut per item: `theta = 360 / N`.
- Jari-jari silinder (Radius): `R = Math.round((H / 2) / Math.tan(Math.PI / N))`.
- CSS untuk Container Roda (`.wheel-container`):
  `transform-style: preserve-3d; transition: transform ...`
- CSS untuk Kartu/Item (`.wheel-item`):
  `position: absolute; transform: rotateX(${index * theta}deg) translateZ(${R}px);`
- **Penting:** Item yang dirender dengan CSS harus memiliki struktur desain *Glassmorphism* (misal: `bg-black/40 backdrop-blur-md border border-brand-primary/50 text-white`). Tampilkan `guestId` dan `name`.

### C. Logika Physics & Teasing Animation (`requestAnimationFrame`)
Gunakan `useRef` untuk melacak `currentAngle`, `velocity`, dan `animationFrame`.

1. **Fase Spinning (Kecepatan Penuh):**
   Saat `spinning === true`, set `velocity` statis (misal 15 derajat per frame). Putar roda tanpa henti.
   `currentAngle -= velocity`.

2. **Fase Deceleration & Teasing (Ketika `spinning` di-set `false`):**
   - Cari indeks dari `winner` di array kandidat roda. Hitung sudut akhir yang harus dicapai: `targetAngle = -(winnerIndex * theta)`. Normalisasi sudut.
   - **Jika `isGrandPrize` == false (Normal Stop):**
     Gunakan fungsi *Ease-Out* atau perlambatan (friction). Kurangi `velocity` hingga mencapai `targetAngle`.
   - **Jika `isGrandPrize` == true (The Heart-Attack Effect):**
     1. Hitung sudut "Fake Winner" (Satu item SEBELUM atau SESUDAH winner sebenarnya, misal `fakeTargetAngle = targetAngle - theta`).
     2. Lakukan perlambatan hingga roda **BERHENTI** persis di `fakeTargetAngle`.
     3. Tahan (delay) kecepatan 0 selama **1.5 detik**.
     4. Setelah 1.5 detik, aktifkan transisi lambat (*snap/slip*) menuju `targetAngle` sebenarnya. Gunakan CSS `transition: transform 1s cubic-bezier(0.175, 0.885, 0.32, 1.275)` untuk memberikan efek *bounce* (pantulan).

---

## 3. Implementasi Halaman Utama: `luckydraw/carousel/page.tsx`

Halaman ini akan mengorkestrasi logika data dan multi-roda.

### A. Setup Data & State
- *Copy* struktur dasar data fetching (SSE, Fetch Prizes, Fetch Guests) dari `display/page.tsx`.
- State utama:
  - `selectedPrizeId`: Hadiah yang sedang diundi.
  - `drawCount`: Jumlah undian (1, 5, 10).
  - `slotRows`: Array pemenang yang didapat dari API setelah klik Spin.
  - `isSpinning`: Status keseluruhan.

### B. Handle Spin (`POST /prizes/:id/draw`)
- Saat tombol "PUTAR UNDIAN" diklik:
  1. Set `isSpinning = true`.
  2. Panggil API `POST /prizes/:id/draw` dengan `body: { count: drawCount }`.
  3. API mengembalikan array `winners` (panjangnya sesuai `drawCount`).
  4. Simpan array `winners` ke state `slotRows`.

### C. Render Layout (Staggered Grid)
- Render daftar roda ke dalam Grid (`grid-cols-1 md:grid-cols-2 lg:grid-cols-3` tergantung `drawCount`).
- Petakan `slotRows`:
  ```tsx
  {slotRows.map((winner, index) => (
     <LuckyDraw3DWheel
        key={index}
        candidates={candidates}
        winner={winner}
        spinning={isSpinning}
        isGrandPrize={selectedPrize.category === 'UTAMA'}
        stopDelay={index * 1000} // Jeda berhenti 1 detik per roda
        onStop={() => handleWheelStop(index)}
     />
  ))}
  ```
- **Staggered Stop Logic:** Jika `spinning` diubah ke false, komponen `LuckyDraw3DWheel` harus menunda mulainya fase *Deceleration* sebesar `stopDelay`. Ini membuat roda ke-1 berhenti duluan, lalu disusul roda ke-2, dsb.

### D. Audio & Visual Enhancements
- Sertakan `<audio>` tags untuk `roll`, `tension`, `win`, `grandWin`.
- `playRollSound()` dimulai saat tombol diklik.
- `onStop` memicu `playWinSound()`. Jika itu roda terakhir, matikan `rollSound`.
- Jika `isGrandPrize`, putar `tensionSound` saat roda melambat, dan `grandWinSound` saat roda "tergelincir" ke pemenang asli. Memicu layar berkedip (`screenFlash`) dan `confetti` (menggunakan canvas-confetti).
- Sertakan **UI Bar Tamu (Tracker)** persis di bawah kotak pemilih hadiah (seperti di `display/page.tsx`).

---

## 4. Instruksi Eksekusi untuk Sub-Agent

Sub-agent wajib mengikuti langkah ini secara berurutan:
1. **Pahami Math:** Implementasikan `LuckyDraw3DWheel` secara terpisah, pastikan matematika pembentukan silinder 3D `rotateX` akurat. (Tips: gunakan state `radius` dan `theta`).
2. **Setup Halaman:** Buat struktur `carousel/page.tsx`, tangani fetch dan integrasi komponen 3D.
3. **Logika Grand Prize:** Tambahkan *if-statement* untuk *The Heart-Attack Effect* (Berhenti salah -> Delay -> Slip ke benar).
4. **Staggered Stop:** Pastikan penghentian multi-roda berurutan dengan menggunakan `setTimeout` berdasarkan prop `stopDelay`.
5. **Testing Kosmetik:** Jangan lupakan CSS untuk lampu sorot (`box-shadow`), efek kabur untuk kartu di belakang, dan panah statis di tengah komponen (`>>> <<<`).
