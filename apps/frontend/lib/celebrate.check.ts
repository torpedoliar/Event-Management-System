/**
 * Self-check for the two ways the reveal has gone silent before:
 *  1. reduced motion must SCALE the bursts, never mute them
 *     (Windows "Show animations: off" + disableForReducedMotion swallowed
 *      every reveal — the flag must never come back);
 *  2. we must render on OUR canvas with useWorker: false — the library's
 *     default export goes through an OffscreenCanvas worker that fails
 *     silently when Blob workers or GPU accel are unavailable.
 *
 * Run: node lib/celebrate.check.ts   (from apps/frontend)
 *
 * ponytail: stubs matchMedia + document + the confetti module instead of a DOM
 * runner — the repo has no test framework. Move to a real runner if a second
 * module needs a browser-ish environment.
 */
import assert from 'node:assert/strict';
import { register } from 'node:module';
import { pathToFileURL } from 'node:url';

const calls: any[] = [];
const created: any[] = [];
(globalThis as any).__confettiCalls = calls;
(globalThis as any).__confettiCreated = created;

// Stub canvas-confetti before celebrate.ts imports it: record create + every fire.
register(
  'data:text/javascript,' +
    encodeURIComponent(`
    export async function resolve(spec, ctx, next) {
      if (spec === 'canvas-confetti') return { url: 'data:text/javascript,' +
        encodeURIComponent([
          'const f = (o) => { globalThis.__confettiCalls.push(o); };',
          'f.create = (canvas, opts) => {',
          '  globalThis.__confettiCreated.push({ canvas, opts });',
          '  return (o) => { globalThis.__confettiCalls.push(o); };',
          '};',
          'export default f;',
        ].join('\\n')),
        shortCircuit: true, format: 'module' };
      return next(spec, ctx);
    }`),
  pathToFileURL('./'),
);

// Minimal DOM: celebrate.ts creates one fixed canvas and appends it to body.
const appended: any[] = [];
(globalThis as any).document = {
  createElement: () => ({ setAttribute() {}, style: { cssText: '' } }),
  body: { appendChild: (el: any) => appended.push(el) },
};

async function run(reduced: boolean) {
  (globalThis as any).matchMedia = (q: string) => ({
    matches: reduced && q.includes('prefers-reduced-motion'),
  });
  calls.length = 0;
  created.length = 0;
  const m = await import(`./celebrate.ts?reduced=${reduced}`);
  assert.equal(m.__motionScale(), reduced ? 0.5 : 1, 'motionScale');
  m.popWinner({ x: 0.5, y: 0.6 }, 60);
  m.finale(2);
  // One lazily-created cannon shared by both bursts, never the worker path.
  assert.equal(created.length, 1, 'exactly one cannon created');
  assert.equal(created[0].opts.useWorker, false, 'useWorker must be false');
  assert.ok(created[0].canvas, 'renders on our own canvas');
  return calls.slice();
}

const normal = await run(false);
const reduced = await run(true);

// Both modes must actually fire — muting is the bug this file exists for.
assert.equal(normal.length, 2, 'normal fires 2 bursts');
assert.equal(reduced.length, 2, 'reduced-motion still fires 2 bursts');
for (const c of reduced) assert.ok(c.particleCount > 0, 'reduced burst has particles');

// Reduced motion halves the count; the clamp survives either way.
assert.equal(normal[0].particleCount, 60);
assert.equal(reduced[0].particleCount, 30);
assert.equal(normal[1].particleCount, 200); // 120 + 2*40
assert.equal(reduced[1].particleCount, 100);

// The 600 clamp applies before the scale, so grand blasts stay bounded.
calls.length = 0;
(globalThis as any).matchMedia = () => ({ matches: false });
const m = await import('./celebrate.ts?clamp=1');
m.popWinner({ x: 0.5, y: 0.5 }, 5000);
assert.equal(calls[0].particleCount, 600, 'clamped to MAX_PARTICLES');

// disableForReducedMotion must never come back — it mutes the reveal outright.
for (const c of [...normal, ...reduced, ...calls]) {
  assert.equal(c.disableForReducedMotion, undefined, 'no disableForReducedMotion');
}

console.log('celebrate.check: ok');
