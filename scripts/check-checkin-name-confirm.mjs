import { readFileSync } from 'node:fs';

const page = readFileSync('apps/frontend/app/(main)/checkin/page.tsx', 'utf8');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(page.includes('isNameSearchQuery'), 'missing name-search classifier');
assert(page.includes('setPendingNameCheckin'), 'missing pending name confirmation state');
assert(page.includes('Konfirmasi Check-in'), 'missing confirmation modal action');
assert(
  page.includes('isNameSearchQuery(activeQuery)') && page.includes('setPendingNameCheckin({ guest: data[0], source: activeQuery, fromQueue: true })'),
  'rapid name search must wait for confirmation',
);
assert(
  page.includes('isNameSearchQuery(searchQuery)') && page.includes('setPendingNameCheckin({ guest: data[0], source: searchQuery, fromQueue: false })'),
  'button name search must wait for confirmation',
);
assert(page.includes('doCheckinWrapperForQueue(pending.guest, false, pending.source)'), 'confirmed rapid search must check in');
assert(page.includes('doCheckin(pending.guest)'), 'confirmed button search must check in');
