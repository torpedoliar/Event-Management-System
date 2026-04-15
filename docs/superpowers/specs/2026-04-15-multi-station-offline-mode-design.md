# Multiple Scanner Stations + Offline Mode - Design Spec

> **Date:** 2026-04-15  
> **Feature:** Multi-station check-in with offline support and auto-sync  
> **Status:** Design for Review

---

## Goal

Enable multiple physical check-in stations to operate independently with offline capability, automatic data synchronization, and conflict resolution when reconnecting to the server.

---

## Architecture Overview

### Current State
- Single check-in page with no station identity
- `counterName` field exists in DB but never populated
- No offline support - fails immediately on network loss
- No local queuing mechanism

### Target State
- Each station has unique identity (`stationId`, `stationName`)
- Check-ins stored locally in IndexedDB when offline
- Auto-sync when connection restored
- Conflict resolution for duplicate check-ins
- Real-time sync across stations when online

---

## Design Decisions

### 1. Station Identity

**Option A: Manual station name input**
- User types station name in settings modal
- Stored in `localStorage`
- Simple but error-prone (typos, duplicates)

**Option B: Auto-generated station ID with optional name**
- UUID auto-generated on first visit
- User can set friendly name (e.g., "Station A - Main Door")
- Stored in `localStorage` + `IndexedDB`
- Server tracks registered stations

**✅ Recommended: Option B** - More robust, supports admin dashboard station management

### 2. Offline Storage

**Option A: localStorage**
- Simple API
- Limited to ~5MB
- Synchronous (blocks UI)

**Option B: IndexedDB**
- Larger capacity (~50MB+)
- Asynchronous (non-blocking)
- Supports complex queries
- Better for queue management

**✅ Recommended: IndexedDB** - Better for offline queue with potentially hundreds of check-ins

### 3. Sync Strategy

**Option A: Server-pull (station pulls from server)**
- Station fetches all check-ins since last sync
- Merges with local data
- Good for read-heavy scenarios

**Option B: Client-push (station pushes to server)**
- Station uploads pending check-ins
- Server validates and stores
- Simpler conflict resolution

**✅ Recommended: Hybrid (Push then Pull)**
1. Push: Upload all pending local check-ins
2. Pull: Fetch all check-ins from other stations since last sync
3. Merge: Update local state with remote data

### 4. Conflict Resolution

**Scenario:** Guest G001 checked in at Station A (offline), then at Station B (offline). Both sync when online.

**Resolution Strategy:**
- **First write wins** for primary check-in status
- **Both records kept** in `GuestCheckin` table (multiple check-ins allowed if event config permits)
- **Server timestamp** determines order
- **Client timestamp** preserved for audit
- **Conflict flag** set if same guest checked at multiple stations within short time window

**Rules:**
- If `allowMultipleCheckin = false`: First check-in wins, second marked as `duplicate: true`
- If `allowMultipleCheckin = true`: Both kept, subject to `maxCheckinCount` limit
- If `allowMultipleCheckinPerCounter = true`: Both kept (different counters)
- All attempts logged for audit trail

---

## Database Schema Changes

### 1. New Table: `CheckinStation`

```prisma
model CheckinStation {
  id          String   @id @default(uuid())
  name        String   // Friendly name (e.g., "Station A - Main Door")
  stationId   String   @unique // UUID for identification
  eventId     String
  isActive    Boolean  @default(true)
  lastSyncAt  DateTime?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  checkins    GuestCheckin[]
  event       Event    @relation(fields: [eventId], references: [id], onDelete: Cascade)
  
  @@index([eventId])
  @@index([stationId])
}
```

### 2. Modify: `GuestCheckin`

```prisma
model GuestCheckin {
  id                  String   @id @default(uuid())
  guestId             String
  checkinAt           DateTime @default(now())
  checkinById         String?
  checkinByName       String?
  counterName         String?  // ← NOW USED: station name
  stationId           String?  // ← NEW: FK to CheckinStation
  station             CheckinStation? @relation(fields: [stationId], references: [id])
  
  // Offline sync fields
  isOffline           Boolean  @default(false) // Created while offline
  clientTimestamp     DateTime? // When check-in happened on client
  syncedAt            DateTime? // When synced to server
  isDuplicate         Boolean  @default(false) // Marked as duplicate during sync
  
  guest               Guest    @relation(fields: [guestId], references: [id], onDelete: Cascade)
  
  @@index([guestId])
  @@index([stationId])
  @@index([isOffline])
  @@index([syncedAt])
}
```

### 3. Modify: `Event` (new settings)

```prisma
model Event {
  // ... existing fields ...
  
  // NEW: Offline mode settings
  allowOfflineMode        Boolean @default(true)  // Enable offline check-in
  offlineSyncInterval     Int     @default(30)    // Seconds between sync attempts
  offlineQueueLimit       Int     @default(500)   // Max pending check-ins before warning
}
```

---

## API Endpoints

### 1. Station Management

#### Register/Update Station
```
POST /api/stations/register
Request:
{
  "stationId": "uuid-or-existing",
  "stationName": "Station A - Main Door",
  "eventId": "event-uuid"
}

Response:
{
  "id": "station-db-id",
  "stationId": "uuid",
  "name": "Station A - Main Door",
  "eventId": "event-uuid",
  "isActive": true,
  "lastSyncAt": null
}
```

#### Get Active Stations
```
GET /api/stations?eventId=xxx
Response:
[
  {
    "id": "...",
    "name": "Station A - Main Door",
    "stationId": "...",
    "lastSyncAt": "2026-04-15T10:30:00Z",
    "checkinCount": 45
  }
]
```

### 2. Offline Check-in Queue

#### Submit Offline Check-in
```
POST /api/guests/checkin-offline
Request:
{
  "stationId": "station-uuid",
  "guestIdentifier": "G001", // guestId or UUID from QR
  "clientTimestamp": "2026-04-15T10:25:30Z",
  "photo": "base64-string?" // Optional photo
}

Response (200 - Success):
{
  "success": true,
  "guest": { ... },
  "checkin": {
    "id": "...",
    "isOffline": false,
    "syncedAt": "2026-04-15T10:25:35Z"
  }
}

Response (409 - Conflict/Duplicate):
{
  "success": false,
  "conflict": true,
  "reason": "already_checked_in",
  "existingCheckin": { ... },
  "action": "keep_as_duplicate"
}
```

#### Bulk Sync (Push + Pull)
```
POST /api/guests/sync-batch
Request:
{
  "stationId": "station-uuid",
  "lastSyncAt": "2026-04-15T10:00:00Z",
  "pendingCheckins": [
    {
      "guestIdentifier": "G001",
      "clientTimestamp": "2026-04-15T10:25:30Z",
      "photo": "base64-string?"
    },
    {
      "guestIdentifier": "G002",
      "clientTimestamp": "2026-04-15T10:26:00Z"
    }
  ]
}

Response:
{
  "success": true,
  "serverTimestamp": "2026-04-15T10:30:00Z",
  "results": [
    { "clientTimestamp": "...", "success": true, "checkinId": "..." },
    { "clientTimestamp": "...", "success": false, "conflict": true, "reason": "..." }
  ],
  "remoteUpdates": [
    // All check-ins from OTHER stations since lastSyncAt
    { "guestId": "...", "checkinAt": "...", "stationName": "Station B" }
  ]
}
```

### 3. Connection Status

#### Ping/Health Check
```
GET /api/public/health
Response:
{
  "status": "ok",
  "timestamp": "2026-04-15T10:30:00Z",
  "eventId": "event-uuid",
  "allowOfflineMode": true
}
```

---

## Frontend Implementation

### 1. IndexedDB Schema

```typescript
// Database: 'guest-checkin-db', version: 1

const dbSchema = {
  stores: {
    pendingCheckins: {
      keyPath: 'id',
      indexes: ['guestIdentifier', 'clientTimestamp', 'status']
    },
    localGuests: {
      keyPath: 'id',
      indexes: ['guestId', 'name', 'checkedIn']
    },
    stationConfig: {
      keyPath: 'stationId'
    },
    syncLog: {
      keyPath: 'id',
      indexes: ['timestamp']
    }
  }
}
```

### 2. Local Data Structures

```typescript
// Pending check-in queue (IndexedDB: pendingCheckins)
interface PendingCheckin {
  id: string; // UUID
  guestIdentifier: string; // From QR or search
  clientTimestamp: string; // ISO date
  photo?: string; // Base64
  status: 'pending' | 'syncing' | 'synced' | 'failed';
  retryCount: number;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

// Station config (IndexedDB: stationConfig)
interface StationConfig {
  stationId: string; // UUID
  stationName: string;
  eventId: string;
  lastSyncAt?: string;
  isActive: boolean;
}

// Local guest cache (IndexedDB: localGuests)
interface LocalGuest {
  id: string; // Guest UUID
  guestId: string;
  name: string;
  checkedIn: boolean;
  checkinCount: number;
  lastCheckinAt?: string;
  photoUrl?: string;
  updatedAt: string;
}
```

### 3. Auto-Sync Service

```typescript
class OfflineSyncService {
  private syncInterval: number; // From event config
  private isSyncing: boolean = false;
  private connectionStatus: 'online' | 'offline' = 'online';
  
  // Initialize
  async init(stationId: string): Promise<void> {
    // Load station config from IndexedDB
    // Set up connection monitoring
    // Start periodic sync timer
    // Listen for online/offline events
  }
  
  // Add check-in to queue
  async queueCheckin(guestIdentifier: string, photo?: string): Promise<string> {
    // Create PendingCheckin record
    // Store in IndexedDB
    // Trigger immediate sync if online
    return pendingId;
  }
  
  // Sync pending check-ins to server
  async syncPending(): Promise<SyncResult> {
    if (this.isSyncing || this.connectionStatus === 'offline') return;
    
    // Get all pending check-ins
    // Bulk upload to server
    // Handle conflicts
    // Fetch remote updates
    // Update local cache
    // Update lastSyncAt
  }
  
  // Process remote updates
  private processRemoteUpdates(updates: RemoteCheckin[]): void {
    // Update local guest cache
    // Emit SSE-like events for UI updates
    // Resolve conflicts
  }
}
```

### 4. UI Components

#### A. Station Setup Modal (New)
```
┌──────────────────────────────────────────┐
│  ⚙️ Station Setup                        │
├──────────────────────────────────────────┤
│                                          │
│  Station Name: [__________________]      │
│                                          │
│  📍 This station will be identified as:  │
│  Station A - Main Door                   │
│                                          │
│  [✓] Enable offline mode                 │
│      (Store check-ins locally when       │
│       connection is lost)                │
│                                          │
│  ⚡ Sync interval: [30] seconds          │
│                                          │
│  ─────────────────────────────────────   │
│  Station ID: abc123-def456-ghi789        │
│  (Auto-generated, do not share)          │
│                                          │
│  [Cancel] [Save & Start]                 │
└──────────────────────────────────────────┘
```

#### B. Connection Status Indicator (New)
```
┌──────────────────────────────────────────┐
│  🟢 Online                               │
│  Last sync: 5s ago                       │
│  Queue: 0 pending                        │
└──────────────────────────────────────────┘

┌──────────────────────────────────────────┐
│  🟡 Offline Mode                         │
│  Check-ins queued: 12                    │
│  Will sync when connection restored      │
│  [Sync Now]                              │
└──────────────────────────────────────────┘

┌──────────────────────────────────────────┐
│  🔴 Connection Lost                      │
│  Check-ins queued: 12                    │
│  Retrying in 15s...                      │
│  [Retry Now]                             │
└──────────────────────────────────────────┘
```

#### C. Queue Management Panel (New)
```
┌──────────────────────────────────────────┐
│  📋 Pending Check-ins (12)               │
├──────────────────────────────────────────┤
│  ✓ G001 - John Doe      10:25:30        │
│  ✓ G002 - Jane Smith    10:26:00        │
│  ⏳ G003 - Bob Johnson  10:26:15        │
│  ❌ G004 - Alice Brown  10:26:30        │
│     Error: Guest not found               │
│                                          │
│  [Retry Failed] [Clear All] [Force Sync] │
└──────────────────────────────────────────┘
```

#### D. Modified Check-in Page
- Add station indicator in header
- Add connection status badge
- Show offline mode notification
- Display queue count when offline
- Add "View Queue" button when offline

---

## Sync Flow

### Normal Operation (Online)
```
1. User scans QR or searches guest
2. Frontend calls POST /api/public/guests/checkin-qr (normal endpoint)
3. Server processes immediately
4. Response received, UI updated
5. SSE broadcasts to all stations
```

### Offline Operation
```
1. User scans QR or searches guest
2. Frontend detects offline status (or API fails)
3. Check-in stored in IndexedDB (pendingCheckins)
4. UI shows "✓ Check-in queued (offline)"
5. Auto-sync service retries every N seconds
```

### Reconnection & Sync
```
1. Browser detects online event
2. Auto-sync service triggered immediately
3. POST /api/guests/sync-batch with all pending check-ins
4. Server processes each:
   a. Validate guest exists
   b. Check for conflicts
   c. Create check-in record or mark duplicate
   d. Return results
5. Frontend processes results:
   a. Remove synced from queue
   b. Mark conflicts for review
   c. Update local guest cache
6. Fetch remote updates (other stations' check-ins)
7. Merge into local state
8. Update lastSyncAt
```

### Conflict Resolution (Server-Side)
```typescript
async function processOfflineCheckin(data: OfflineCheckinDTO) {
  const guest = await findGuestByIdentifier(data.guestIdentifier);
  
  // Check if already checked in
  const existingCheckins = await prisma.guestCheckin.findMany({
    where: { guestId: guest.id }
  });
  
  const event = await prisma.event.findUnique({
    where: { id: guest.eventId },
    select: { allowMultipleCheckin: true, maxCheckinCount: true }
  });
  
  // Conflict detection
  if (!event.allowMultipleCheckin && existingCheckins.length > 0) {
    // Mark as duplicate but keep for audit
    return await prisma.guestCheckin.create({
      data: {
        guestId: guest.id,
        stationId: data.stationId,
        counterName: data.stationName,
        checkinAt: new Date(data.clientTimestamp),
        isOffline: true,
        clientTimestamp: new Date(data.clientTimestamp),
        isDuplicate: true,
        syncedAt: new Date()
      }
    });
  }
  
  if (existingCheckins.length >= event.maxCheckinCount) {
    // Max reached, mark as duplicate
    return { isDuplicate: true, reason: 'max_checkins_reached' };
  }
  
  // Normal check-in
  return await prisma.$transaction(async (tx) => {
    const checkin = await tx.guestCheckin.create({
      data: {
        guestId: guest.id,
        stationId: data.stationId,
        counterName: data.stationName,
        checkinAt: new Date(data.clientTimestamp),
        isOffline: true,
        clientTimestamp: new Date(data.clientTimestamp),
        syncedAt: new Date()
      }
    });
    
    await tx.guest.update({
      where: { id: guest.id },
      data: {
        checkedIn: true,
        checkedInAt: guest.checkedInAt || new Date(data.clientTimestamp),
        checkinCount: { increment: 1 }
      }
    });
    
    return checkin;
  });
}
```

---

## Error Handling

### Network Errors
- **Immediate fallback:** Queue in IndexedDB
- **Retry strategy:** Exponential backoff (5s, 10s, 20s, max 60s)
- **User notification:** Show queue count and status
- **Manual override:** "Sync Now" button

### Server Errors (5xx)
- **Treat as offline:** Queue locally
- **Retry:** Same as network error
- **Alert:** If queue > 80% capacity

### Conflict Errors (409)
- **Mark for review:** Flag in queue
- **User notification:** "Guest already checked in at [Station X]"
- **Options:** Keep as duplicate / Skip / Force (if allowed)

### Queue Overflow
- **Warning at 80%:** "Queue almost full (400/500)"
- **Block at 100%:** "Queue full, cannot queue more check-ins"
- **Emergency sync:** Trigger immediately
- **Admin alert:** SSE event for admin dashboard

---

## Security Considerations

1. **Station Authentication:**
   - Station ID acts as lightweight auth token
   - Optionally add station secret for verification
   - Rate limiting per station ID

2. **Offline Data Integrity:**
   - Client timestamps immutable (server validates format)
   - Server timestamp always added
   - Audit trail preserved (both client + server time)

3. **Photo Storage:**
   - Offline photos stored as base64 in IndexedDB
   - Uploaded with check-in during sync
   - Size limit enforced (max 2MB per photo)

4. **Queue Encryption:**
   - Optional: Encrypt sensitive data in IndexedDB
   - Station ID + event ID as minimum

---

## Migration Plan

### Phase 1: Backend Foundation
1. Add database migrations (new tables + fields)
2. Implement station registration API
3. Implement offline check-in endpoint
4. Implement bulk sync endpoint
5. Add health check endpoint

### Phase 2: Frontend Infrastructure
1. Add IndexedDB wrapper service
2. Implement OfflineSyncService
3. Add connection status monitoring
4. Create station setup modal
5. Create connection status indicator

### Phase 3: UI Integration
1. Modify check-in page to support offline mode
2. Add queue management panel
3. Add offline notifications
4. Update confirmation UI for offline check-ins

### Phase 4: Testing & Polish
1. End-to-end offline testing
2. Conflict resolution testing
3. Queue overflow testing
4. Multi-station sync testing
5. Admin dashboard station management UI

---

## Testing Strategy

### Unit Tests
- IndexedDB CRUD operations
- OfflineSyncService queue management
- Conflict resolution logic
- Timestamp validation

### Integration Tests
- Station registration flow
- Offline check-in → sync → server
- Bulk sync with conflicts
- Remote updates merging

### E2E Tests
1. **Happy path:** Scan → online → immediate check-in
2. **Offline path:** Scan → offline → queued → online → synced
3. **Conflict path:** Station A + B offline → both sync → conflict resolved
4. **Queue overflow:** Fill queue → block → emergency sync → resume
5. **Multi-station:** 3 stations online → all see real-time updates
6. **Recovery:** Station offline for 1 hour → reconnect → sync all

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Offline check-in success rate | > 99% |
| Sync latency (online) | < 2 seconds |
| Conflict resolution accuracy | 100% (no data loss) |
| Queue capacity | 500 pending check-ins |
| Max offline duration | Unlimited (bounded by storage) |
| Multi-station sync delay | < 5 seconds |

---

## Files to Create/Modify

### Backend (NestJS)
```
apps/backend/src/
├── stations/ (NEW MODULE)
│   ├── stations.module.ts
│   ├── stations.controller.ts
│   ├── stations.service.ts
│   └── dto/
│       ├── register-station.dto.ts
│       └── station-response.dto.ts
├── guests/
│   ├── guests.controller.ts (MODIFY - add offline endpoints)
│   ├── guests.service.ts (MODIFY - add offline logic)
│   └── dto/
│       ├── offline-checkin.dto.ts (NEW)
│       └── sync-batch.dto.ts (NEW)
└── prisma/
    └── schema.prisma (MODIFY - add models)
```

### Frontend (Next.js)
```
apps/frontend/
├── lib/
│   ├── indexeddb.ts (NEW - IndexedDB wrapper)
│   ├── offline-sync.service.ts (NEW)
│   └── connection-status.ts (NEW)
├── components/
│   ├── StationSetupModal.tsx (NEW)
│   ├── ConnectionStatusIndicator.tsx (NEW)
│   └── QueueManagementPanel.tsx (NEW)
├── app/
│   └── checkin/
│       └── page.tsx (MODIFY - integrate offline mode)
└── types/
    └── offline.types.ts (NEW)
```

---

## Dependencies

### New Frontend Dependencies
```json
{
  "idb": "^8.0",           // IndexedDB wrapper (Promise-based)
  "localforage": "^1.10"   // Fallback/caching layer
}
```

### Backend Dependencies
- No new dependencies (uses existing Prisma + NestJS)

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| IndexedDB not supported | High | Fallback to localStorage with warning |
| Queue overflow during event | Medium | Warning at 80%, block at 100%, emergency sync |
| Conflict resolution fails | High | Keep both records, flag for manual review |
| Sync timeout on large queue | Medium | Batch sync (50 at a time), resume on failure |
| Station ID collision | Low | UUID v4 + server-side uniqueness check |
| Time drift between stations | Low | Server timestamp authoritative, client for audit |

---

## Future Enhancements

1. **Admin Dashboard:** Station management page (view, deactivate, rename)
2. **Station Analytics:** Check-ins per station, peak times, performance
3. **Offline Reports:** Generate local reports even when offline
4. **P2P Sync:** Direct station-to-station sync without server (WebRTC)
5. **Auto-provisioning:** QR code to configure new stations instantly
6. **Hardware Integration:** Barcode scanner, RFID, NFC support

---

## Approval

**Design reviewed by:** [Awaiting User Review]  
**Approved:** [ ]  
**Comments:** [ ]

---

> **Next Step:** After approval, invoke `writing-plans` skill to create detailed implementation plan with exact code and file paths.
