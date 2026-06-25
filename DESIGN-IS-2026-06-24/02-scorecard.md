# Dieter Rams Scorecard

1. **Good design is innovative** — Score: 1/3
   Evidence: Grand-prize slowdown, screen flash, and dark reveal are present (`luckydraw/page.tsx`), but the overall UI relies on generic glassmorphism + gold-gradient dashboards seen in many AI-generated event apps.
   Justification: A few custom animations exist, yet no pattern meaningfully advances the form beyond off-the-shelf celebratory effects.

2. **Good design makes a product useful** — Score: 2/3
   Evidence: Primary check-in flow works; dashboard shows counts; lucky draw runs. Repeated label→behavior mismatches (settings modal, auto-create toggle, manual check-in) add friction.
   Justification: Task completes, but misleading labels force users to relearn affordances.

3. **Good design is aesthetic** — Score: 1/3
   Evidence: ~38 distinct colors, multiple stacked blurs, gradient text shadows, and inconsistent radii. Lowest contrast is 1.8:1 (`luckydraw/page.tsx:782` on `brand-primarySoft`).
   Justification: No single visible system; visual noise competes with content.

4. **Good design makes a product understandable** — Score: 1/3
   Evidence: Mixed-language labels ("Check-in Manual" / "Batal Check-in"), English "Eligible" in an Indonesian UI, and inflated "KOKPIT INTELIJEN" obscure purpose.
   Justification: A first-time operator would need exploration to trust each control.

5. **Good design is unobtrusive** — Score: 1/3
   Evidence: Persistent noise overlay, gold glows, 22 keyframe animations, and heavy glass panels dominate every screen.
   Justification: Chrome repeatedly competes with content instead of receding.

6. **Good design is honest** — Score: 1/3
   Evidence: Confirmshaming auto-create nudge, coercive uncheck-in warning, and a "Live" indicator that only measures SSE not real API connectivity.
   Justification: Multiple points manipulate or misrepresent system state.

7. **Good design is long-lasting** — Score: 1/3
   Evidence: Gold-charcoal glassmorphism, gradient text, "KOKPIT INTELIJEN", and slot-machine aesthetics are 2024-2025 AI-default event-dashboard markers.
   Justification: Visual language is tied to current trend templates.

8. **Good design is thorough down to the last detail** — Score: 2/3
   Evidence: Empty, loading, error, success, focus, and disabled states are all present. Yet unused imports/dead code (`StatsCard`, `colorMap`, `Calendar`, `MapPin`, `UserCog`, `Sparkles`) and 1.8:1 contrast show rough edges.
   Justification: States exist, but polish is inconsistent.

9. **Good design is environmentally friendly** — Score: 1/3
   Evidence: ~500-600 KB JS minified, stacked backdrop-filter blurs, noise overlay, 22 keyframe animations, and idle pulse animations increase CPU/GPU load.
   Justification: Bundle and runtime energy cost are above what the task requires.

10. **Good design is as little design as possible** — Score: 1/3
    Evidence: ~110 interactive elements, 38 colors, repeated gradient buttons, 5 close-button implementations, persistent decorative noise.
    Justification: Many elements are duplicated or decorative; removing them would not break the task.

**Total: 12/30**
