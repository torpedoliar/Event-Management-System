# Design-Is Audit Scope

## What is being audited
Guest registry / event management frontend (`apps/frontend`) in repo `E:\Vibe\Registrasi Tamu`.
Audited surfaces:
- Public display: `/show`
- Check-in kiosk: `/checkin`
- Admin dashboard: `/admin/dashboard`
- Lucky draw operator page: `/luckydraw`
- Admin login: `/admin/login`
- Shared chrome: `TopNav`, `Button`, `Card`, `Input`, `Skeleton`, global CSS, Tailwind tokens.

## Primary user and primary task
**Primary users:** event staff operating check-in kiosks, admin users monitoring attendance, operators running lucky-draw.
**Primary task:** register guest arrivals, monitor check-in counts in real time, and run prize draws.

## Constraints
- Stack: Next.js 15 (App Router), React 18, Tailwind CSS v3, TypeScript.
- Icons: `lucide-react` (already installed).
- Existing brand palette: warm gold / charcoal (`#D4A853`, `#1A1A2E`).
- No backend changes requested; frontend-only rework.
- Must preserve existing functionality: offline mode, SSE real-time updates, QR scan, photo capture, lucky-draw animation, uncheck-in flow.

## References
- taste-skill anti-slop directives
- redesign-skill upgrade techniques
