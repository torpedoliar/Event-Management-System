'use client';

import { Maximize2, Minimize2, Volume2, VolumeX } from 'lucide-react';
import Button from '@/components/ui/Button';
import type { ReactNode } from 'react';

/** Small backstage controls, visually quiet until an operator needs them. */
export default function LuckyDrawControls({
  isFullscreen,
  soundEnabled,
  onToggleFullscreen,
  onToggleSound,
  modeSelector,
}: {
  isFullscreen: boolean;
  soundEnabled: boolean;
  onToggleFullscreen: () => void;
  onToggleSound: () => void;
  modeSelector: ReactNode;
}) {
  return (
    <>
      <div className="draw-operator-controls" aria-label="Kontrol operator">
        <Button
          size="sm"
          variant="outline"
          onClick={onToggleFullscreen}
          aria-label={isFullscreen ? 'Tampilkan navigasi' : 'Sembunyikan navigasi'}
          title={isFullscreen ? 'Tampilkan navigasi' : 'Mode layar penuh'}
        >
          {isFullscreen ? <Minimize2 size={17} /> : <Maximize2 size={17} />}
        </Button>
        <Button
          size="sm"
          variant={soundEnabled ? 'primary' : 'outline'}
          onClick={onToggleSound}
          aria-label={soundEnabled ? 'Matikan suara' : 'Aktifkan suara'}
          title={soundEnabled ? 'Suara aktif' : 'Aktifkan suara'}
        >
          {soundEnabled ? <Volume2 size={17} /> : <VolumeX size={17} />}
        </Button>
      </div>
      <div className="draw-mode-selector">{modeSelector}</div>
    </>
  );
}

export function SoundConsentBanner({
  onEnable,
  onDismiss,
}: {
  onEnable: () => void;
  onDismiss: () => void;
}) {
  return (
    <div className="draw-sound-consent" role="status">
      <span>Aktifkan suara untuk pengalaman undian penuh</span>
      <div>
        <Button size="sm" onClick={onEnable}>Aktifkan suara</Button>
        <Button size="sm" variant="outline" onClick={onDismiss}>Lanjut tanpa suara</Button>
      </div>
    </div>
  );
}
