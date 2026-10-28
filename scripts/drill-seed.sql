-- Data uji untuk drill verifikasi backup.
-- Tidak menyentuh database produksi; dijalankan di container sementara.

INSERT INTO "Event" (id, name, date, time, location, "isActive", "enableLuckyDraw", "enableSouvenir", "createdAt", "updatedAt")
VALUES
  ('11111111-1111-1111-1111-111111111111', 'Event Drill 2026', '2026-10-27 00:00:00', '09:00', 'Jakarta', true, true, true, now(), now()),
  ('22222222-2222-2222-2222-222222222222', 'Event Arsip 2025', '2025-05-01 00:00:00', '08:00', 'Bandung', false, false, false, now(), now());

INSERT INTO "AdminUser" (id, username, "passwordHash", "displayName", "isActive", "createdAt", "updatedAt")
VALUES ('33333333-3333-3333-3333-333333333333', 'admin', '$2b$10$abcdefghijklmnopqrstuv', 'Administrator', true, now(), now());

INSERT INTO "Guest" (id, "queueNumber", "guestId", name, email, "tableLocation", company, category, "registrationSource", "checkedIn", "checkinCount", "eventId", "createdAt", "updatedAt")
VALUES
  ('aaaaaaaa-0000-0000-0000-000000000001', 1, 'TAMU-001', 'Budi Santoso',  'budi@example.com',  'Meja 1', 'PT Alpha', 'VIP',     'MANUAL', true,  1, '11111111-1111-1111-1111-111111111111', now(), now()),
  ('aaaaaaaa-0000-0000-0000-000000000002', 2, 'TAMU-002', 'Siti Rahayu',   'siti@example.com',  'Meja 2', 'PT Beta',  'REGULAR', 'IMPORT', true,  1, '11111111-1111-1111-1111-111111111111', now(), now()),
  ('aaaaaaaa-0000-0000-0000-000000000003', 3, 'TAMU-003', 'Agus Wijaya',   NULL,                'Meja 3', 'PT Gamma', 'REGULAR', 'IMPORT', false, 0, '11111111-1111-1111-1111-111111111111', now(), now()),
  ('aaaaaaaa-0000-0000-0000-000000000004', 4, 'TAMU-004', 'Dewi Lestari',  'dewi@example.com',  'Meja 4', 'PT Alpha', 'SPONSOR', 'WALKIN', false, 0, '11111111-1111-1111-1111-111111111111', now(), now()),
  ('aaaaaaaa-0000-0000-0000-000000000005', 5, 'TAMU-005', 'Rizky Pratama', NULL,                '-',      NULL,       'REGULAR', 'PUBLIC', false, 0, '11111111-1111-1111-1111-111111111111', now(), now());

INSERT INTO "GuestCheckin" (id, "guestId", "checkinAt", "checkinById", "checkinByName", "isOffline", "isDuplicate")
VALUES
  ('bbbbbbbb-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', now(), '33333333-3333-3333-3333-333333333333', 'Administrator', false, false),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000002', now(), NULL, 'Station A', true, false),
  ('bbbbbbbb-0000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000001', now(), NULL, 'Station B', true, true);

INSERT INTO "Prize" (id, name, description, quantity, category, "eventId", "createdAt", "updatedAt")
VALUES ('cccccccc-0000-0000-0000-000000000001', 'Grand Prize', 'Sepeda motor', 1, 'UTAMA', '11111111-1111-1111-1111-111111111111', now(), now()),
       ('cccccccc-0000-0000-0000-000000000002', 'Doorprize',   'Voucher belanja', 10, 'HIBURAN', '11111111-1111-1111-1111-111111111111', now(), now());

INSERT INTO "Souvenir" (id, name, quantity, "eventId", "createdAt", "updatedAt")
VALUES ('dddddddd-0000-0000-0000-000000000001', 'Tote Bag', 100, '11111111-1111-1111-1111-111111111111', now(), now());

INSERT INTO "SouvenirTake" (id, "guestId", "souvenirId", "takenAt", "takenByName")
VALUES ('eeeeeeee-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'dddddddd-0000-0000-0000-000000000001', now(), 'Administrator');
