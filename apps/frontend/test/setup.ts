import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Membersihkan DOM antar tes agar hasil tidak saling menumpuk.
afterEach(() => {
  cleanup();
});
