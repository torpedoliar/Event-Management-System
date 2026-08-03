import { readFileSync } from 'node:fs';

const frontendSse = readFileSync('apps/frontend/lib/sse-context.tsx', 'utf8');
const backendPublic = readFileSync('apps/backend/src/public/public.controller.ts', 'utf8');
const checkinPage = readFileSync('apps/frontend/app/(main)/checkin/page.tsx', 'utf8');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(frontendSse.includes("'sync_complete'"), 'frontend SSE EVENT_TYPES must include sync_complete');
assert(
  frontendSse.includes("console.warn('[SSE] No auth token found; realtime stream disabled for this page')"),
  'missing explicit no-token SSE warning',
);
assert(
  backendPublic.includes('const off = onEvent((ev) => send(ev.type, ev.data));'),
  'backend stream must forward every ServerEvent type',
);
assert(
  checkinPage.includes("fetch(`${apiBase()}/public/health`)") &&
    checkinPage.includes('health?.offlineSyncInterval ?? 30'),
  'checkin offline sync interval must use public health config fallback',
);
