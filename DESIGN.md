# Marten visual system

Approved direction: dark woodland palette, a calm soft-3D marten, evidence-first workspace. The landing page persuades through an asymmetric typographic introduction and one real mascot asset. Investigation screens operate; reports prioritize reading.

## Tokens

- Background #12100f; surface #1c1917; raised #26211d; border #39312b.
- Primary text #f3eee5; secondary #b8aea1; action amber #dfa85c.
- Errors #efa796. State is always expressed in text as well as color.
- Manrope, self-hosted variable font under apps/web/public/fonts with OFL license. Monospace only for inspected URLs.
- Display 39–78px, medium weight, -0.04em tracking; section headings 24–36px; body 13–18px.
- Page width 1440px; desktop margins 64px; mobile 22px. Borders define sections, not stacks of cards.
- Controls 7px radius; notices 10px; no decorative glow, gradients, animated mascot, or numerical product score.

## Behavior

The URL is the entry point. Fixture scope is disclosed before authentication. OAuth preserves only URL and brief in session storage. API keys remain transient state and are cleared on submission/navigation/sign-in. Screenshots are private authenticated blobs; selection remains stable as incremental events arrive. The sample report is explicitly static and has no simulated screenshots or activity.

Keyboard focus uses amber outlines; mobile activity/evidence tabs preserve selection. Screenshots can toggle between fitted and original width. Live announcements describe status rather than every event. Respect reduced motion.

## Asset

`apps/web/public/marten-observe.png`: generated transparent softly rendered marten. Decorative on setup; descriptive alternative text on landing. It never represents confirmation or operational status.
