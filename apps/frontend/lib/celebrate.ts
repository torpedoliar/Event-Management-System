/**
 * Shared confetti choreography for the three lucky-draw modes.
 *
 * Gold-only palette per apps/frontend/.docs/redesign-fix-spec.md — do not
 * reintroduce pink/violet/blue festive accents here.
 */
import confetti from 'canvas-confetti';

export const GOLD = ['#D4A853', '#F5ECD7', '#B8934A', '#FFFFFF'];
export const GOLD_DEEP = ['#D4A853', '#F5ECD7'];

/** Above Modal (z-50) and the grand winner card (z-70), below WinnerHistoryModal (z-200). */
const Z_INDEX = 150;

/** Beyond ~600 particles per call the reveal drops frames on event-laptop GPUs. */
const MAX_PARTICLES = 600;

type Origin = { x?: number; y?: number };

function fire(opts: confetti.Options) {
  confetti({
    zIndex: Z_INDEX,
    disableForReducedMotion: true,
    colors: GOLD,
    ...opts,
    particleCount: Math.min(opts.particleCount ?? 50, MAX_PARTICLES),
  });
}

/** Small pop for one revealed winner. */
export function popWinner(origin: Origin = { x: 0.5, y: 0.6 }, count = 60) {
  fire({ particleCount: count, spread: 60, startVelocity: 35, origin });
}

/** Closing burst after all winners of a regular draw are revealed. */
export function finale(winnerCount = 1) {
  fire({
    particleCount: 120 + winnerCount * 40,
    spread: 120,
    startVelocity: 45,
    origin: { y: 0.6 },
  });
}

/** Left/right cannons for `durationMs`. Returns a cancel function. */
export function sideCannons(durationMs = 3000) {
  const end = Date.now() + durationMs;
  let cancelled = false;
  (function frame() {
    if (cancelled) return;
    fire({ particleCount: 5, angle: 60, spread: 55, origin: { x: 0, y: 0.6 }, colors: GOLD_DEEP });
    fire({ particleCount: 5, angle: 120, spread: 55, origin: { x: 1, y: 0.6 }, colors: GOLD_DEEP });
    if (Date.now() < end) requestAnimationFrame(frame);
  })();
  return () => { cancelled = true; };
}

/** Full grand-prize sequence: centre blast → 3s side cannons → gold dust rain. */
export function grandFinale() {
  fire({
    particleCount: MAX_PARTICLES,
    spread: 160,
    startVelocity: 70,
    origin: { x: 0.5, y: 0.5 },
    ticks: 400,
  });
  const cancel = sideCannons(3000);
  const dust = setTimeout(() => {
    fire({ particleCount: 300, spread: 360, startVelocity: 30, origin: { x: 0.5, y: 0.2 } });
  }, 1000);
  return () => { cancel(); clearTimeout(dust); };
}
