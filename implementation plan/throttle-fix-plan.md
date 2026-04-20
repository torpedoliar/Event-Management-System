# Implementasi: Bypass Throttler untuk Rapid Scan Souvenir

**Deskripsi Tugas Sub-Agent:**
Server Backend NestJS menggunakan modul Throttler (`@nestjs/throttler`) yang melimitasi setiap IP publik maksimum **10 request per detik**. Karena Event ini memakai jaringan WiFi terpusat dengan 1 IP Publik untuk ke-40 komputer operator, *rapid scan barcode* secara ONLINE via halaman Souvenir akan terblokir oleh perlindungan keamanan *(HTTP 429 Too Many Requests)* di detik pertama.

Tugas Anda adalah **menyisipkan bypass (pengecualian) Throttler** secara eksplisit pada controller khusus fungsi souvenir online tersebut. Dilarang merubah fungsionalitas logika yang berjalan saat ini.

---

## File Target
**Ubah File:** `apps/backend/src/souvenirs/souvenirs.controller.ts`

### Langkah 1: Tambahkan Import Statement
Di baris paling atas atau berdekatan dengan baris 1 (sesudah import `@nestjs/common`), tambahkan `SkipThrottle` dari modul nestjs throttler.

**Cari (Target):**
```typescript
import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards, Request } from '@nestjs/common';
import { SouvenirsService } from './souvenirs.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { emitEvent } from '../common/sse';
```

**Ganti Dengan / Ubah Menjadi:**
```typescript
import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards, Request } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { SouvenirsService } from './souvenirs.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { emitEvent } from '../common/sse';
```

---

### Langkah 2: Matikan Throttler di Fungsi `giveSouvenir`
Navigasi ke pembuatan route POST pada method `giveSouvenir` (yang menangkap route route `POST give`). Tempatkan decorator `@SkipThrottle` tepat di atas `@UseGuards`.

**Cari blok kode ini:**
```typescript
    // Give souvenir to guest
    @UseGuards(JwtAuthGuard)
    @Post('give')
    async giveSouvenir(@Body() body: { guestId: string; souvenirId: string }, @Request() req: any) {
        const adminId = req.user?.sub;
```

**Ubah menjadi:**
```typescript
    // Give souvenir to guest
    @SkipThrottle({ default: true, short: true, medium: true, long: true })
    @UseGuards(JwtAuthGuard)
    @Post('give')
    async giveSouvenir(@Body() body: { guestId: string; souvenirId: string }, @Request() req: any) {
        const adminId = req.user?.sub;
```

---

### Langkah 3: Matikan Throttler di Fungsi `createAndGiveSouvenir`
Navigasi ke pembuatan route POST pada method `createAndGiveSouvenir` (yang menangkap route `POST give-create`).

**Cari blok kode ini:**
```typescript
    // Create guest and give souvenir in one operation
    @UseGuards(JwtAuthGuard)
    @Post('give-create')
    async createAndGiveSouvenir(@Body() body: { guestIdOrName: string; souvenirId: string }, @Request() req: any) {
```

**Ubah menjadi:**
```typescript
    // Create guest and give souvenir in one operation
    @SkipThrottle({ default: true, short: true, medium: true, long: true })
    @UseGuards(JwtAuthGuard)
    @Post('give-create')
    async createAndGiveSouvenir(@Body() body: { guestIdOrName: string; souvenirId: string }, @Request() req: any) {
```

---

## Verifikasi oleh Sub-Agent
Setelah selesai melalukan penulisan dan replace di file `souvenirs.controller.ts`:
1.  Pastikan tidak ada salah ketik tanda kurung pada `@SkipThrottle(...)`.
2.  Pastikan syntax TypeScript tetap valid dan rapi.
3.  *(Jika Sub-Agent memicu restart Docker/Server)* Periksa terminal API dan pastikan status service Backend `OK` tidak ada module exception karena import yang terlewat.

## Catatan Penting
Kenapa hanya metode `give` dan `give-create` yang dibuka limitasi keamanannya? Karena operasi CRUD biasa (`create souvenir baru`, `update daftar suvenir`, `delete master suvenir`) tidak boleh dilonggarkan untuk menjaga server dari bahaya DDoS administrator iseng. Bypass hanya diberikan khusus untuk *rapid barcode scanner user*.
