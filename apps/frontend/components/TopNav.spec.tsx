import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import TopNav from './TopNav';

const mockPathname = vi.fn(() => '/register');
const sseMocks = vi.hoisted(() => ({
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  connected: false,
}));
const tokenMock = vi.hoisted(() => ({ value: null as string | null }));
vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname(),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

vi.mock('../lib/api', () => ({ apiBase: () => '/api' }));
vi.mock('../lib/sse-context', () => ({
  useSSE: () => sseMocks,
}));
vi.mock('./HelpPanel', () => ({ default: () => null }));
vi.mock('./EventSelector', () => ({ default: () => null }));

describe('TopNav public navigation behavior', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/');
    mockPathname.mockReturnValue('/register');
    tokenMock.value = null;
    sseMocks.connected = false;
    vi.stubGlobal('localStorage', {
      getItem: () => tokenMock.value,
      setItem: vi.fn((key: string, value: string) => { if (key === 'token') tokenMock.value = value; }),
      removeItem: vi.fn((key: string) => { if (key === 'token') tokenMock.value = null; }),
    });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('gives the brand home link an accessible name on mobile', () => {
    render(<TopNav />);
    expect(screen.getByRole('link', { name: 'Event Management — Beranda' })).toHaveAttribute('href', '/');
  });

  it('does not show a misleading offline badge to an unauthenticated visitor', () => {
    mockPathname.mockReturnValue('/about');
    render(<TopNav />);
    expect(screen.queryByText('Offline')).not.toBeInTheDocument();
  });

  it('marks the current public page for assistive technology', () => {
    render(<TopNav />);
    expect(screen.getByRole('link', { name: 'Daftar' })).toHaveAttribute('aria-current', 'page');
  });

  it('shows a precise realtime state to authenticated operators', async () => {
    mockPathname.mockReturnValue('/about');
    tokenMock.value = 'test-token';
    render(<TopNav />);
    expect(await screen.findByText('Realtime terputus')).toBeInTheDocument();
  });

  it('marks a settings destination current and groups the Admin disclosure', async () => {
    mockPathname.mockReturnValue('/admin/settings/email');
    tokenMock.value = 'test-token';
    render(<TopNav />);

    const adminButton = await screen.findByRole('button', { name: /Admin/ });
    expect(adminButton).toHaveClass('bg-brand-primary/10');
    fireEvent.click(adminButton);

    expect(screen.getByRole('heading', { name: 'Ringkasan' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Operasional' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Pengaturan' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Email' })).toHaveAttribute('aria-current', 'page');
  });

  it('keeps the closed mobile drawer out of the accessibility tree', () => {
    render(<TopNav />);
    expect(screen.queryByRole('dialog', { name: 'Navigasi utama' })).not.toBeInTheDocument();
  });

  it('traps focus in the open drawer and Escape closes it restoring focus', async () => {
    render(<TopNav />);

    const menuButton = screen.getByRole('button', { name: 'Buka menu navigasi' });
    fireEvent.click(menuButton);

    const drawer = screen.getByRole('dialog', { name: 'Navigasi utama' });
    const closeButton = screen.getByRole('button', { name: 'Tutup menu' });
    await waitFor(() => expect(closeButton).toHaveFocus());
    expect(drawer).toHaveAttribute('aria-modal', 'true');

    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Navigasi utama' })).not.toBeInTheDocument());
    expect(menuButton).toHaveFocus();
  });

  it('does not allow Tab to escape past the last drawer control', () => {
    render(<TopNav />);
    const menuButton = screen.getByRole('button', { name: 'Buka menu navigasi' });
    fireEvent.click(menuButton);
    const drawer = screen.getByRole('dialog', { name: 'Navigasi utama' });
    const links = within(drawer).getAllByRole('link');
    const last = links[links.length - 1];
    last.focus();
    fireEvent.keyDown(last, { key: 'Tab' });
    expect(screen.getByRole('button', { name: 'Tutup menu' })).toHaveFocus();
  });

  it('does not put the closed mobile drawer in the Tab sequence', () => {
    render(<TopNav />);
    const drawer = document.getElementById('topnav-mobile-drawer');
    expect(drawer).toHaveAttribute('inert');
    expect(drawer).toHaveAttribute('aria-hidden', 'true');
  });
});
