# Name Search & Duplicate Guests Check-in Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Memperbaiki pencarian tamu berbasis nama di halaman check-in (`/checkin`) agar menampilkan daftar pemilih ketika ditemukan > 1 tamu (nama kembar/mirip) dan menampilkan modal konfirmasi yang jelas ketika ditemukan tepat 1 tamu.

**Architecture:** Frontend React di Next.js App Router (`apps/frontend/app/(main)/checkin/page.tsx`). Memperbaiki state `results` pada `processRapidQueue` & `doSearch` (online & offline mode), memperkaya kartu hasil pencarian dengan pembeda lengkap (Perusahaan, Divisi, Meja, Status Check-in) serta tombol 1-klik check-in via internal ID (`checkin-by-id`), dan menyempurnakan modal konfirmasi `pendingNameCheckin`.

**Tech Stack:** Next.js (React 18), TypeScript, Tailwind CSS, Lucide Icons, IndexedDB (Offline cache).

## Global Constraints
- Minimal diff & preserve existing offline/online sync logic.
- Do not break QR scanner fast check-in flow (QR scans should still auto check-in without name confirmation).
- When checking in from a multi-result list, always send `id: guest.id` to `/public/guests/checkin-by-id` (or offline equivalent) to avoid ambiguity.

---

### Task 1: Search & Rapid Queue Logic for Multi-Result and Single-Result Matching

**Files:**
- Modify: `apps/frontend/app/(main)/checkin/page.tsx:173-279` (processRapidQueue), `apps/frontend/app/(main)/checkin/page.tsx:553-749` (doSearch)

**Interfaces:**
- Consumes: `/public/guests/search?guestId=...&name=...`
- Produces: `results` state array populated with `Guest[]` when `data.length > 1`, `pendingNameCheckin` when `data.length === 1` and query is name search.

- [ ] **Step 1: Inspect and update `processRapidQueue`**
Update `processRapidQueue` so when `data.length > 1` (both online and offline IndexedDB catch block), it calls `setResults(data)` and logs an informative message `appendLog(activeQuery, 'DUPLICATE', 'Ditemukan ' + data.length + ' tamu. Silakan pilih tamu di bawah.')` instead of leaving `results` empty.

- [ ] **Step 2: Update offline search fallback in `processRapidQueue`**
When offline search finds `matchedGuests.length > 1`, map `matchedGuests` to `Guest[]` and call `setResults(guestResults)`, clearing any previous errors and setting `appendLog(activeQuery, 'DUPLICATE', 'Ditemukan ' + matchedGuests.length + ' tamu (offline). Silakan pilih.')`. When `matchedGuests.length === 1` and `isNameSearchQuery(activeQuery)` is true, set `setPendingNameCheckin({ guest: guestFromCache, source: activeQuery, fromQueue: true })`.

- [ ] **Step 3: Update `doSearch` consistency**
Ensure `doSearch` handles offline and online `data.length > 1` by setting `setResults` properly and clearing any stale state.

- [ ] **Step 4: Commit changes**
```bash
git add apps/frontend/app/\(main\)/checkin/page.tsx
git commit -m "fix(checkin): update search and queue handlers to show multiple match results"
```

---

### Task 2: Polish Single-Result Name Confirmation Modal

**Files:**
- Modify: `apps/frontend/app/(main)/checkin/page.tsx:1835-1880`

**Interfaces:**
- Consumes: `pendingNameCheckin: { guest: Guest; source: string; fromQueue: boolean } | null`
- Produces: UI modal asking "Apakah benar tamu bernama [Nama] ini yang mau check-in?" with Cancel / Confirm buttons.

- [ ] **Step 1: Enhance `pendingNameCheckin` modal content**
Add clear question phrasing, guest photo / avatar, large name typography, guest ID badge, company & division info, table location, and current checkin status.

- [ ] **Step 2: Test cancel and confirmation handler**
Ensure "Batal" closes the modal and focuses the search input, while "Konfirmasi Check-in" performs `doCheckin` (or queue checkin) and properly closes the modal.

- [ ] **Step 3: Commit changes**
```bash
git add apps/frontend/app/\(main\)/checkin/page.tsx
git commit -m "feat(checkin): polish single name confirmation modal"
```

---

### Task 3: Enhance Results List UI for Duplicate / Similar Name Selection

**Files:**
- Modify: `apps/frontend/app/(main)/checkin/page.tsx:1720-1786`

**Interfaces:**
- Consumes: `results: Guest[]`, `checking: boolean`, `checkingId: string | null`
- Produces: Result cards with rich distinguishing details and single-click check-in button calling `doCheckin(g, true)`.

- [ ] **Step 1: Update card layout with distinguishing badges**
In `results.map(g => ...)`:
- Display status badge: `Sudah Check-in` (warning/amber) or `Belum Check-in` (emerald/subtle).
- Display Company & Division prominently with distinct icon/badge styling.
- Display Table Location & Guest ID.
- Check-in button: single click calls `doCheckin(g, true)` with loading spinner for `checkingId === g.id`.

- [ ] **Step 2: Commit changes**
```bash
git add apps/frontend/app/\(main\)/checkin/page.tsx
git commit -m "feat(checkin): enhance multi-guest result cards with distinguishing info and 1-click checkin"
```

---

### Task 4: Typecheck & Build Verification

**Files:**
- Verify: `apps/frontend/app/(main)/checkin/page.tsx`

- [ ] **Step 1: Run TypeScript compiler check**
Run `npm run build` or `npx tsc --noEmit` on frontend to verify zero typing errors.

- [ ] **Step 2: Commit any final fixes**
```bash
git add .
git commit -m "chore(checkin): verify typecheck and build"
```
