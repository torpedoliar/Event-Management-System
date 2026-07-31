/**
 * Self-check for toApiUrl() path routing.
 * Run: node lib/api.check.ts   (from apps/frontend)
 *
 * ponytail: plain asserts, no test runner — the repo has none. Move to a real
 * runner when a second module needs checking. Excluded from tsconfig because
 * the .ts import specifier is for node's type stripping, not for next build.
 */
import assert from 'node:assert/strict';
import { toApiUrl, apiBase } from './api.ts';

const base = apiBase(); // server-side: http://localhost:4000/api

// Local static assets under public/ must NOT be routed to the API.
assert.equal(toApiUrl('/sounds/roll.mp3'), '/sounds/roll.mp3');
assert.equal(toApiUrl('/sounds/grand-win.mp3'), '/sounds/grand-win.mp3');

// Uploaded files still go through the API base.
assert.equal(toApiUrl('/api/uploads/branding/sounds/x.mp3'), `${base}/uploads/branding/sounds/x.mp3`);
assert.equal(toApiUrl('/uploads/a.png'), `${base}/uploads/a.png`);
assert.equal(toApiUrl('uploads/a.png'), `${base}/uploads/a.png`);

// Absolute + data URLs and empties pass through untouched.
assert.equal(toApiUrl('https://cdn.example.com/a.mp3'), 'https://cdn.example.com/a.mp3');
assert.equal(toApiUrl('data:audio/mp3;base64,AAA'), 'data:audio/mp3;base64,AAA');
assert.equal(toApiUrl(null), '');
assert.equal(toApiUrl(undefined), '');

console.log('api.check: ok');
