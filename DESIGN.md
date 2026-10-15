# Marten visual system

Approved direction: dark woodland palette, a calm 3D marten with manga-inspired features, evidence-first workspace. The landing page persuades through an asymmetric typographic introduction and one dimensional mascot. Investigation screens operate; reports prioritize reading.

## Tokens

- Background #12100f; surface #1c1917; raised #26211d; border #39312b.
- Primary text #f3eee5; secondary #b8aea1; action amber #dfa85c.
- Errors #efa796. State is always expressed in text as well as color.
- Manrope, self-hosted variable font under apps/web/public/fonts with OFL license. Monospace only for inspected URLs.
- Display 39–78px, medium weight, -0.04em tracking; section headings 24–36px; body 13–18px.
- Page width 1440px; desktop margins 64px; mobile 22px. Borders define sections, not stacks of cards.
- Controls 7px radius; notices 10px; no decorative glow, gradients, or numerical product score.

## Behavior

The URL is the entry point. Fixture scope is disclosed before authentication. OAuth preserves only URL and brief in session storage. API keys remain transient state and are cleared on submission/navigation/sign-in. Screenshots are private authenticated blobs; selection remains stable as incremental events arrive. The sample report is explicitly static and has no simulated screenshots or activity.

Keyboard focus uses amber outlines; mobile activity/evidence tabs preserve selection. Screenshots can toggle between fitted and original width. Live announcements describe status rather than every event. Respect reduced motion.

## Mascot and motion

`apps/web/components/marten-mascot.tsx` selects six transparent PNG poses from `apps/web/public/mascot`. The user requested a return to 3D on 2026-10-11, with manga-inspired expression and contours while preserving dimensional volume, warm brown fur, and the cream throat patch. Keep the character curious and composed rather than childish. All mascot art is decorative; visible interface text communicates the actual state.

- Home: a curious observing pose.
- Setup: seated and ready; thinking while the request starts.
- Collection: leaning in to investigate.
- Analysis and history loading: a contemplative thinking pose.
- Completed and sample report: presenting a report.
- Empty history and incomplete runs: resting.

Hero art is 440px wide on desktop; workspace art is 96px. Square image dimensions reserve layout space, and contain sizing preserves the artwork. CSS applies a brief attentive rock, investigative lean, contemplative sway, or completion settle to the whole image. These are rendered pose assets with restrained motion, not a rigged interactive 3D model. Animations run once for at most 2.8 seconds and are removed under reduced-motion preference. No additional animation runtime.
