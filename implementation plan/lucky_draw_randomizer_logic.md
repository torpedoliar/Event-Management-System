# Lucky Draw Randomizer Logic Documentation

Berikut adalah penjelasan mengenai bagian kode yang menangani pengocokan (randomizer) pemenang Lucky Draw dari keseluruhan list tamu yang hadir secara acak.

## 1. Logika Pengocokan Utama (Backend)

Penentuan pemenang yang sebenarnya dilakukan di sisi backend untuk memastikan integritas data dan mencegah manipulasi di sisi client.

**File:** [prizes.service.ts](file:///e:/Vibe/Registrasi%20Tamu/apps/backend/src/prizes/prizes.service.ts)
**Fungsi:** `drawWinner(prizeId: string)`

Bagian kode yang melakukan pemilihan acak:

```typescript
// baris 122 di prizes.service.ts
const winner = eligible[Math.floor(Math.random() * eligible.length)];
```

### Detail Filter Peserta (Eligibility):
Sebelum dipilih secara acak, sistem menyaring daftar tamu (`eligible`) dengan kriteria:
- **Hadir:** Tamu harus sudah melakukan registrasi/check-in (`checkedIn: true`).
- **Belum Menang:** Secara default, tamu yang sudah memenangkan hadiah apapun tidak akan diikutkan lagi (`prizeWins: { none: {} }`), kecuali jika hadiah tersebut diatur untuk memperbolehkan menang berkali-kali (`allowMultipleWins`).

```typescript
// Query untuk mendapatkan tamu yang memenuhi syarat
if (prize.allowMultipleWins) {
    eligible = await this.prisma.guest.findMany({
        where: {
            eventId: active.id,
            checkedIn: true,
            ...(currentWinnerGuestIds.length > 0 ? { id: { notIn: currentWinnerGuestIds } } : {})
        }
    });
} else {
    eligible = await this.prisma.guest.findMany({
        where: {
            eventId: active.id,
            checkedIn: true,
            prizeWins: { none: {} } // Belum pernah menang sama sekali
        }
    });
}
```

---

## 2. Animasi Visual (Frontend)

Halaman frontend menampilkan animasi "spin" (pengacakan visual) sebelum menampilkan pemenang asli yang dikirim oleh backend.

**File:** [page.tsx](file:///e:/Vibe/Registrasi%20Tamu/apps/frontend/app/luckydraw/page.tsx)
**Fungsi:** `handleDraw()`

Bagian kode yang melakukan pengacakan visual selama 3 detik:

```typescript
// baris 112-128 di apps/frontend/app/luckydraw/page.tsx
const interval = setInterval(() => {
    if (candidates.length > 0) {
        const randomIdx = Math.floor(Math.random() * candidates.length);
        setDisplayCandidate(candidates[randomIdx]);
    } else {
        // Fallback jika list kandidat kosong
        const randomNum = Math.floor(Math.random() * 1000);
        setDisplayCandidate({
            id: 'temp',
            name: `Guest #${randomNum}`,
            // ... data dummy lainnya
        });
    }
}, 50); // Berputar setiap 50ms
```

### Alur Eksekusi:
1. Tombol **"Putar Undian"** ditekan.
2. Frontend memulai animasi `setInterval` setiap 50ms untuk menampilkan nama-nama acak dari list tamu yang sudah `checkedIn`.
3. Frontend secara bersamaan memanggil API Backend `POST /prizes/:id/draw`.
4. Backend memilih 1 pemenang secara acak menggunakan `Math.random()` dari list yang valid.
5. Backend menyimpan pemenang ke database.
6. Frontend menerima data pemenang asli, menunggu 3 detik (untuk drama/suspense), lalu menghentikan animasi dan menampilkan pemenang yang sah dari backend.
