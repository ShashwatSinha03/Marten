# Marten UX design for review

Status: discovery proposal, not an approved implementation specification. Updated 2026-10-06.

## Confirmed product decisions

- Marten investigates real public product URLs through a browser. The browser collects evidence; the investigation interprets that evidence.
- The user may supply a brief. Without one, Marten uses an automatic investigation default.
- Sign-in is required; GitHub and Google support saved investigation history and reports.
- The live experience shows events and screenshots, not a video stream.
- The visual theme is dark and draws from the marten animal. The mascot is a softly rendered 3D marten: curious, intelligent, calm, observant, helpful, and quietly confident.
- The conceptual sequence is collect, map, understand, investigate, reason, report. This does not require six separate screens or a strictly linear progress indicator.

All choices below are proposals unless explicitly identified as confirmed above.

## Experience and screen proposals

### 1. Start an investigation

Make the URL field the main action. Place an optional brief beneath it with a short example such as “Investigate whether a visitor can find pricing and reach signup.” Show a concise explanation of the automatic default before submission; its precise capabilities must match the implemented collector.

Proposed automatic scope: explore reachable public pages, identify visible journeys, inspect supported interactions, and report evidence-backed problems and coverage limits. Do not imply exhaustive testing or authenticated access. The exact limits belong to the architecture and security decisions.

Use one prominent mascot beside the introduction, never overlapping the form. Provide an entry to previous investigations and a clear sign-in affordance. Require authentication before starting a run. If a visitor first enters a URL and brief, preserve those non-sensitive inputs through sign-in; no guest investigations are proposed.

For BYOK, propose a separate, plainly labeled setup step before the first run with Gemini presented as the recommended provider. Supported providers, key storage, and retention depend on the AI/security contract; the interface must explain the implemented behavior accurately. Never put a full key in logs, URLs, or saved report content.

### 2. Live investigation workspace

Use a persistent investigation header containing target domain, brief, run status, and cancellation. Beneath it, use a two-panel desktop composition: an ordered event feed and a larger selected-evidence viewer. Selecting an event shows its screenshot and available page metadata. Keep completed evidence inspectable while new events arrive.

Events describe actual actions and outcomes: “Opened pricing,” “Captured signup screen,” or “Page could not be reached.” Distinguish queued, working, waiting, and completed states. Never simulate internal thoughts or use an invented percentage. Show elapsed time and concrete counts only when available.

Represent conceptual phases through concise status labels while allowing revisits and overlapping activity. A compact coverage view can list visited pages and attempted journeys; do not add a decorative graph without meaningful navigation value.

Auto-follow new events only while the user is at the latest event. If they inspect older evidence, show a “New events” action without moving their selection or scroll position. Screenshots are snapshots with capture times, not a live view of the remote browser.

### 3. Report and finding detail

Lead with investigation outcome and the most useful supported findings. Follow with coverage and limitations. Avoid a universal numerical product score unless a separately agreed methodology justifies it.

Each finding separates observation, interpretation, and suggested next step. Include affected page, evidence references, reproduction steps where supported, and a clear distinction between confirmed observations and hypotheses. Confidence and impact are different concepts; any labels need agreed definitions rather than decorative badges.

Selecting evidence opens it alongside the finding on wide screens and as a focused detail view on smaller screens. Preserve the reader's place when closing it. Link to the inspected URL where appropriate, while making clear the report describes the captured state.

A run with no supported findings still produces a useful report: what was inspected, what could not be checked, and the limits of the conclusion. Partial runs retain useful evidence and prominently identify incompleteness. Do not claim the product is healthy solely because no issue was found.

### 4. Saved history and account

Use a simple list of investigations showing domain, date, status, and a short outcome when available. Opening a run restores its evidence and report. Start with recency ordering; add filtering only when history volume warrants it.

Provide GitHub and Google sign-in, sign-out, and a clear path back to the run after authentication. Account/provider settings and run deletion require explicit behavior and retention decisions before implementation. Sharing, exports, teams, scheduling, and comparison between runs are not confirmed scope.

## Material states and interactions

| State | Proposed behavior |
| --- | --- |
| Empty history | Explain what an investigation produces and offer the URL form. |
| Invalid or unsupported URL | Explain the specific issue next to the field; preserve the brief. |
| Queued or initializing | State the actual condition without fabricating collector activity. |
| Key missing, rejected, or quota exhausted | Give an actionable provider/setup path; preserve the run inputs and any collected evidence. |
| Target unreachable or access blocked | Identify the affected page and what remains possible; do not present bypass as a default. |
| Screenshot unavailable | Keep the event and any other evidence readable with an explicit missing-capture state. |
| Connection interrupted | Show that updates are disconnected; avoid implying the server run stopped. Reconnect and reconcile existing events. |
| Cancellation requested | Show acknowledgement and pending stop; use “Canceled” only after confirmation. |
| Partial or failed run | Keep collected evidence accessible and explain whether retry begins a new run or resumes, according to backend support. |
| Complete without findings | Explain inspected coverage and limits without manufacturing an issue. |
| Expired session | Offer reauthentication with a return path and preserve non-sensitive in-progress inputs. |

The collector's action permissions, maximum duration, page limits, supported evidence, and retry semantics must be reflected consistently across start, live status, and report. Product UX must not promise a capability merely because the layout contains a placeholder for it.

## Visual direction proposal

Use a quiet nocturnal palette rooted in the animal: near-black brown background, slightly lighter warm surfaces, ivory primary text, muted taupe secondary text, and a restrained honey-amber interaction accent. Starting token candidates are background `#12100F`, surface `#1C1917`, raised surface `#26211D`, primary text `#F3EEE5`, secondary text `#B8AEA1`, and accent `#DFA85C`. These are review candidates and require contrast verification before adoption.

Reserve independent semantic colors for errors, caution, and success; never use amber alone to distinguish active work from a warning. Favor clear borders, spacing, and hierarchy over glows, blur, or texture. Evidence screenshots should retain their original colors and be visually separated from Marten's dark surfaces.

Use a readable sans serif for interface and report text. Reserve monospace for URLs, timestamps, and technical evidence. Specific fonts remain open. Keep the report comfortable for sustained reading rather than extending paragraphs across the full workspace.

On desktop, let evidence occupy the greater share of the live workspace. On narrow screens, provide explicit Activity/Evidence navigation and retain the selected event; stack report content in reading order. Mobile web should support starting a run and reviewing its outcome, with detailed screenshots zoomable without scaling the entire interface.

## Accessibility proposal

Target WCAG 2.2 AA for implemented screens, with verified text and control contrast. Support keyboard operation, visible focus, meaningful headings, labeled fields, and errors linked to their inputs. Do not encode status only by color or mascot pose.

Keep live announcements brief and batched so a busy investigation does not overwhelm assistive technology. Announce meaningful status changes, not every screenshot arrival. Avoid unexpected focus changes and preserve input values after validation errors.

Provide event descriptions and available textual evidence alongside screenshots; an image alone should not be the only accessible explanation of a finding. Allow zooming screenshots with keyboard-accessible controls. Respect reduced motion and avoid autoplay mascot movement during work. Ensure layouts reflow and controls remain usable at enlarged text sizes.

## Mascot asset brief

Create a consistent, softly rendered 3D marten with recognizable slender body, rounded ears, dark brown fur, lighter throat bib, and long tail. Use gentle directional lighting and a restrained material finish, with enough contrast against dark backgrounds. The animal should feel alert and capable without human costume or exaggerated baby-like proportions.

Proposed initial asset set:

- **Observe:** composed three-quarter pose for the start screen.
- **Inspect:** subtle forward lean for a collection or evidence empty state.
- **Wait:** relaxed seated pose for genuine waiting states.
- **Complete:** attentive settled pose beside a report introduction.
- **Recover:** calm, neutral pose for errors; avoid blame, distress, or comic failure.

Use static transparent image assets initially unless animation is separately approved. Soft 3D describes the rendered artwork, not a requirement for WebGL or a real-time 3D scene. Maintain a shared camera angle, lighting, proportions, and fur/bib appearance across poses. Prepare clean silhouettes at small display sizes and avoid embedding UI text in renders. Decorative instances get empty alternative text; essential status is always expressed separately in text.

The mascot is prominent at entry and occasional during work. It must never cover evidence, act as the only progress indicator, or suggest a finding is confirmed. No detective hat, magnifying glass, trench coat, celebratory confetti, or constant idle animation.

## Decisions required before implementation

1. Confirm this screen flow and visual direction, including the proposed automatic scope.
2. Resolve run limits, safe browser action boundaries, evidence retention, and cancellation/retry semantics with backend and security design.
3. Resolve supported AI providers and BYOK storage/setup with AI and security design.
4. Confirm whether visual work starts from a generated image composition or directly from code; no workflow preference has been assumed or stored.

Validation should exercise one genuine investigation from URL entry through captured evidence, report citations, and saved-history retrieval, alongside a blocked target, interrupted update connection, and partial run. UI completion requires keyboard and responsive checks, not only a successful screenshot.
