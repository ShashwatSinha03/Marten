# Sprint 2 — Controlled exploration checkpoint

Verified 2026-10-11. Local implementation complete; hosted and live-provider acceptance remains pending.

## Delivered

- Collector follows discovered same-origin links instead of a fixed path list. Fragment canonicalization, deduplication, bounded lexical brief ranking, three attempted navigations, at most 100 recorded destinations, bounded URL/link text, and explicit truncation keep exploration bounded.
- Captured, failed and policy/budget-skipped destinations record source evidence and outcomes. Timeout recovery can continue within the remaining attempt budget. Cancellation/deadline outcomes consume their attempt and preserve earlier evidence.
- Coverage persists incrementally and before analysis, including partial/cancelled results. Storage failures abort instead of being classified as target navigation defects.
- Deterministic captured HTTP-error checks cite both source link and destination evidence, with reproduction context and uncertainty. Model interpretations remain distinct; schema/citation validity does not prove their factual accuracy.
- Workspace includes an expandable navigation map, evidence selection, coverage/limit explanations, reproduction steps and uncertainty. Existing records without exploration metadata remain supported.
- Prior user-requested 3D manga mascot poses and resting favicon are preserved.

## Verification

- `node --import tsx --test --test-concurrency=1 apps/api/test/*.test.ts`: **31 passed, 0 failed**. Real Chromium fixtures exercise link discovery, healthy and 404 captures, brief ordering, duplicate fragments, off-origin blocking, timeout continuation, cancellation/deadline and persistence failures. Provider tests use mocked HTTP responses.
- `pnpm typecheck`, `pnpm web:typecheck`, `pnpm web:build`: passed.
- Desktop and 390px mobile coverage layout inspected through a clearly labeled synthetic static review artifact. This verifies layout, not live OAuth or hosted operation. Legacy metadata absence checked during rendering.

## Remaining limits

Public destinations remain disabled. Cloud resources, live OAuth, two-account Supabase isolation, live Gemini quality and Render sandbox/egress/memory remain unverified. Physical retention cleanup is still required before hosted use. Brief guidance is lexical ranking of discovered links; no autonomous model-selected actions or extra model follow-up loop was introduced. Exploration is a bounded destination map, not an exhaustive application graph. No claims about healthy-control model false-positive rates are made from deterministic/mock tests.

Next: Sprint 3 release hardening and configuration, then live fixture acceptance and Render feasibility before enabling public URLs.
