import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { usePopupTimeout } from './usePopupTimeout';

describe('usePopupTimeout', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('memanggil onTimeout setelah durasi habis', () => {
    const onTimeout = vi.fn();
    const { result } = renderHook(() => usePopupTimeout(5000, onTimeout));

    act(() => result.current.start());
    expect(onTimeout).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(onTimeout).toHaveBeenCalledTimes(1);
  });

  it('tidak memanggil onTimeout sebelum waktunya', () => {
    const onTimeout = vi.fn();
    const { result } = renderHook(() => usePopupTimeout(5000, onTimeout));

    act(() => result.current.start());
    act(() => {
      vi.advanceTimersByTime(4999);
    });
    expect(onTimeout).not.toHaveBeenCalled();
  });

  it('start ulang membatalkan timer sebelumnya (tidak dobel)', () => {
    const onTimeout = vi.fn();
    const { result } = renderHook(() => usePopupTimeout(5000, onTimeout));

    act(() => result.current.start());
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    act(() => result.current.start());
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(onTimeout).toHaveBeenCalledTimes(1);
  });

  it('clear membatalkan timer yang berjalan', () => {
    const onTimeout = vi.fn();
    const { result } = renderHook(() => usePopupTimeout(5000, onTimeout));

    act(() => result.current.start());
    act(() => result.current.clear());
    act(() => {
      vi.advanceTimersByTime(10000);
    });

    expect(onTimeout).not.toHaveBeenCalled();
  });

  it('memakai durasi terbaru saat timeout berubah', () => {
    const onTimeout = vi.fn();
    const { result, rerender } = renderHook(
      ({ ms }) => usePopupTimeout(ms, onTimeout),
      { initialProps: { ms: 5000 } },
    );

    rerender({ ms: 1000 });
    act(() => result.current.start());
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(onTimeout).toHaveBeenCalledTimes(1);
  });

  it('memakai callback terbaru tanpa membuat start tidak stabil', () => {
    const first = vi.fn();
    const second = vi.fn();
    const { result, rerender } = renderHook(
      ({ cb }) => usePopupTimeout(1000, cb),
      { initialProps: { cb: first } },
    );

    rerender({ cb: second });
    act(() => result.current.start());
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });

  it('membersihkan timer saat komponen dilepas', () => {
    const onTimeout = vi.fn();
    const { result, unmount } = renderHook(() => usePopupTimeout(5000, onTimeout));

    act(() => result.current.start());
    unmount();
    act(() => {
      vi.advanceTimersByTime(10000);
    });

    expect(onTimeout).not.toHaveBeenCalled();
  });
});
