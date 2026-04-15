# Design: Offline Check-in Fixes

**Date**: 2026-04-15
**Status**: Approved

## Problem Statement

Offline check-in multi-station system has 3 flaws:

1. **No PWA support** - Browser shows dinosaur error when reload offline
2. **Stale search results** - `doSearch` doesn't clear old results before new search, causing wrong offline queue entries
3. **No local guest cache** - Offline search has no data to search against when network is down

## Architecture

### Components

```
┌─────────────────────────────────────────────────┐
│                   Frontend                       │
│                                                  │
│  ┌──────────────┐    ┌───────────────────────┐  │
│  │  PWA (SW)    │───▶│  Service Worker Cache │  │
│  │  next-pwa    │    │  (HTML/JS/CSS)        │  │
│  └──────────────┘    └───────────────────────┘  │
│                                                  │
│  ┌──────────────┐    ┌───────────────────────┐  │
│  │  doSearch    │───▶│  IndexedDB localGuests│  │
│  │  (fixed)     │    │  (bulk cached guests) │  │
│  └──────────────┘    └───────────────────────┘  │
│                                                  │
│  ┌──────────────┐    ┌───────────────────────┐  │
│  │  Settings    │───▶│  Bulk Download Button │  │
│  │  Panel       │    │  (fetch 10k guests)   │  │
│  └──────────────┘    └───────────────────────┘  │
│                                                  │
│  ┌──────────────────────────────────────────┐   │
│  │  ConnectionStatusIndicator               │   │
│  │  + "X guests cached locally" indicator   │   │
│  └──────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
```

### Data Flow

1. **PWA Install**: Service Worker caches app shell on first load
2. **Bulk Download**: User clicks button → fetch `/api/guests?limit=10000` → cache each guest to IndexedDB
3. **Offline Search**: Network error → `getAllCachedGuests()` → filter by name/guestId → queue check-in if found
4. **Sync**: When online → `offlineSyncService.syncPending()` → batch POST to `/api/public/guests/sync-batch`

## Error Handling

- **No network during bulk download**: Show error toast, retry button
- **Partial cache failure**: Continue with successful guests, log failed ones
- **Offline search no match**: Show "Guest not found in local cache" message
- **PWA not supported**: Graceful degradation (no SW, normal online-only mode)

## Testing Plan

1. Clear browser cache → click "Download database" → verify IndexedDB populated
2. DevTools → set network to Offline → reload page → app loads (PWA)
3. Offline → search guest → IndexedDB search returns correct result
4. Offline → search unknown guest → proper error message
5. Switch back to Online → auto-sync queue processes pending check-ins
