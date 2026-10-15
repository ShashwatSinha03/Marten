# Marten

## Product purpose

Marten is an investigation platform for modern software. Its central experience is: **Paste a URL. Watch Marten investigate your product.** The browser collects evidence; it is not the investigator. The conceptual pipeline is collect → map → understand → investigate → reason → report.

The first release must perform real investigations, not simulate activity using sample data. Findings must be supported by collected evidence and distinguish observation from interpretation.

## Confirmed choices

- Investigate public websites for navigation problems, broken flows, visible errors, and usability issues.
- Offer automatic exploration plus an optional investigation brief.
- Operate entirely through a website; no desktop app, local runner, or installation for users.
- Host the frontend on Vercel, backend on Render, and database on Supabase.
- Target zero operator spend using free allowances; this is a budget constraint, not a verified infrastructure capability or promise of unlimited usage.
- Users provide their own AI API key.
- Require sign-in; support Google and GitHub and save investigation history and reports.
- Show live activity events and screenshots, rather than live browser video.
- Use a dark theme inspired by the marten animal and a 3D mascot with a manga-inspired look, distinct page/state poses, and restrained animation. The user returned to 3D on 2026-10-11, superseding the preceding 2D direction.
- Mascot personality: curious, intelligent, calm, methodical, observant, helpful, quietly confident. Avoid childish styling.
- Use specialist agents and relevant skills for major architecture, frontend, backend, AI, UX, security, and testing work. The orchestrator synthesizes their recommendations.

## Tentative boundaries and recommendations

- The user tentatively agreed to navigation, menus, tabs, and accordions without form submissions or state-changing actions. Precise enforcement remains a design task.
- Gemini-only BYOK was recommended; no separate explicit provider confirmation was requested before continuing UX discovery. Treat it as the proposed initial provider, not support for all providers.
- Proposed API-key handling: transient backend memory for a run, no persistence in database or logs.
- Proposed palette: brown-black surfaces, warm ivory text, restrained amber accents.

## Outstanding design and feasibility work

- Verify cloud Chromium resource requirements against Render's free service constraints.
- Establish run limits, admission control, cancellation, interruption handling, and retention.
- Design strict destination/action policies for untrusted target pages.
- Choose implementation frameworks and approve the integrated design.
- Define private screenshot storage, evidence citations, report access, and deletion.
- Validate real provider output on seeded defects and healthy pages.

## Status

The integrated design was approved on 2026-10-06 and Sprint 0 was authorized. The Sprint 0 local fixture harness is implemented and verified; live Render feasibility remains pending. See `docs/sprints/sprint-0-results.md`. Sprint 1 local interface and authenticated fixture-flow code are implemented; live integrations remain unverified. See `docs/sprints/sprint-1-results.md`. No services have been deployed or external accounts configured. Specialist proposals live under `docs/discovery`; the integrated design and sprint roadmap will live under `docs/plans`.

## Mascot correction — 2026-10-10

The user requested a true 2D vector mascot instead of the generated 3D animal. Home should show curious behavior; report analysis should show thinking. Use reusable SVG poses for observe, ready, investigate, think, report, and rest. Actual investigation status drives active poses. Preserve text status and provide reduced-motion behavior.

## Mascot direction — 2026-10-11

The user requested a return to 3D with a manga-style look. Preserve the six state-specific poses and real status mappings, replacing the inline vector art with transparent rendered character images. Maintain dimensional volume, a consistent woodland palette, mature expression, and reduced-motion behavior.
