# Marten security and quality discovery

Design proposal, 6 October 2026. No implementation or deployment validation has occurred. Scope: public sites, browser collection, tentative navigation-only interaction, Google/GitHub sign-in, saved private reports, transient Gemini BYOK. Limits and retention below require product agreement.

## Identity and data model

Use Supabase Auth as the identity authority. Validate the access token on every Render request, including the event stream, cancellation, deletion, and evidence downloads; derive the owner from verified identity, never request parameters or editable user metadata. Use `getClaims` for token validation and `getUser` where fresh account information matters; an unvalidated `getSession` user is insufficient. Use exact production OAuth redirect URLs and separate development configuration. Do not retain Google/GitHub provider tokens: Marten needs identity, not repository access. [Supabase authentication methods](https://supabase.com/docs/guides/getting-started/tutorials/with-angular)

Proposed entities:

| Entity | Minimum fields |
| --- | --- |
| investigations | id, owner_id, target_url, brief, status, stage, created_at, finished_at, expires_at, heartbeat_at, failure_code |
| investigation_events | investigation_id, sequence, type, safe_payload, created_at; unique investigation/sequence |
| evidence | id, investigation_id, source_url, captured_at, kind, private_object_path or bounded text, content_hash, viewport |
| findings | id, investigation_id, observation, interpretation, confidence_label, reproduction_context |
| finding_evidence | finding_id, evidence_id; enforce both belong to the same investigation |
| reports | investigation_id, structured_report, model_identifier, prompt_version, coverage, limitations |

Do not duplicate all source DOM or network response bodies by default. Constrain sizes at ingestion. A separate profile table is unnecessary until user preferences require one.

Enable RLS on every exposed table, revoke anonymous grants, and grant authenticated users only owner-scoped reads. Backend-controlled tables receive no direct client insert/update privileges. Child policies check the investigation owner; protect ownership and state transitions from client changes. Prefer user-scoped database access where practical; privileged worker writes require explicit owner/run checks because service credentials bypass RLS. Never ship secret/service-role keys in frontend bundles. Avoid views unless security-invoker behavior is deliberate. [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security)

Store screenshots in a private bucket with a run/owner-bound object policy. Prefer authorized downloads; if signed URLs are used, propose 60-second expiry and treat them as bearer capabilities. A UUID or hard-to-guess path is not authorization. Delete storage objects through the Storage API, with retryable cleanup; deleting database metadata alone is insufficient. [Private bucket access](https://supabase.com/docs/guides/storage/buckets/fundamentals)

## Gemini key and content isolation

Keep the submitted key in browser memory only until transferred over TLS to the authenticated Render endpoint, then clear the input reference. Retain it only in the active run's server memory; never URLs, cookies, browser storage, database, queue payloads, tracing, analytics, exception dumps, or logs. Redact request bodies/headers centrally. Do not put it into the target browser process environment or page context. Separate the key-bearing analysis process from the browser's minimally populated environment. Garbage-collected runtimes cannot promise cryptographic memory erasure; describe this accurately as no intentional persistence.

Call a fixed Gemini service endpoint server-side; page content cannot supply endpoint URLs, headers, code, or permissions. Schema-validate model output and verify evidence references before storing findings. Render all extracted/model text as inert content. Explain before a run that selected page evidence is sent to Gemini using the user's key; provider processing terms are separate from Marten retention. [Gemini key guidance](https://ai.google.dev/gemini-api/docs/api-key)

## Browser security release gate

- Only parsed HTTP(S) public targets on approved ports; reject credentials in URLs. Restrict navigations to the accepted origin; record off-origin links without exploring them. Public third-party assets may be necessary to render pages, but require identical destination checks.
- Enforce public-address egress at connection time for all traffic, including redirects, subresources, popups, workers, and IPv6. Deny loopback/private/link-local/reserved destinations, metadata endpoints, and Marten control-plane destinations. Validate all DNS answers and prevent DNS rebinding by connecting through a controlled resolver/proxy to the validated destination. URL parsing or an initial DNS check alone is insufficient. [OWASP SSRF prevention](https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html)
- Disable service workers, downloads, unsolicited popups, permissions, and unnecessary network transports. Restrict requests to GET/HEAD initially; report missing functionality caused by this restriction. Navigate discovered link URLs without invoking arbitrary click handlers. No form submissions, login, checkout, consent-changing buttons, or generated scripts. Even GET navigation can mutate poorly designed sites; do not promise absolute read-only behavior.
- Launch Chromium non-root with its sandbox active and a fresh context/profile per run. A browser context isolates sessions, not a compromised browser process. Verify the Render environment supports required sandbox and enforced egress; if it cannot, keep arbitrary-site execution disabled and use controlled fixtures until architecture changes are approved. Do not silently add `--no-sandbox`. [Playwright container guidance](https://playwright.dev/docs/docker)

## Free-tier bounds and restart semantics

Propose one browser run globally, one active run per user, three pages, a two-minute deadline, bounded asset bytes, and at most six compressed viewport screenshots. These are starting caps to benchmark, not capacity claims. Reject excess work with an explicit busy response rather than keeping a queue of API keys. Add per-account/IP admission limits and a hard global daily/storage cap; stop accepting runs before quotas are exhausted.

Render free services can restart, lose local files, and spin down after inactivity; free services are documented for preview/hobby use rather than production reliability. Persist events and evidence incrementally in Supabase, never exclusively on local disk. Use a database lease/heartbeat and conditional terminal-state updates. On startup or access, reconcile stale active runs to `interrupted`; retain committed partial evidence. A lost memory-only Gemini key requires explicit retry with a fresh key, not automatic restart. Live-feed reconnect uses persisted sequence numbers; disconnection is not completion. [Render free-service limitations](https://render.com/docs/free)

Proposed retention: reports and evidence expire together after seven days, with immediate owner-requested deletion. Enforce expiry on reads even when cleanup has not executed; cleanup runs on startup and periodic activity with retries. A sleeping free service cannot guarantee physical deletion at an exact deadline. Add a bounded deployment-wide byte cap and owner quota; show retention before a run. If persistent report summaries are later desired, visibly label missing/expired evidence.

## Acceptance tests before public release

1. **Authorization:** two real test users plus anonymous access; deny cross-user report, event, screenshot, cancel, and delete requests through both backend and direct Data API. Reject forged/expired tokens and foreign-project tokens. Test ownership reassignment and child references to another investigation. Run database RLS tests and Supabase advisors.
2. **Secrets:** inject a canary key and inspect logs, database rows, storage, frontend persistence, errors, event payloads, browser environment, and target requests. None may contain it. Verify concurrent rejected runs do not retain keys.
3. **Network:** controlled fixtures exercise private IPv4/IPv6, encoded IPs, mixed DNS answers, rebinding, redirect chains, subresource fetches, service workers, WebSockets, and forbidden schemes. Assert no forbidden connection occurs, rather than merely asserting a blocked UI response.
4. **Interaction:** fixtures with POST requests, downloads, forms, popups, and action links cannot trigger forbidden operations. Record collector-imposed limitations so restrictions are not misreported as target defects.
5. **Evidence:** seeded defect and healthy fixtures; all finding references resolve to same-run evidence. Distinguish observation from inference, show explored coverage, and reject fabricated citations. Page prompt injection cannot alter policy or expose keys.
6. **Resources/recovery:** benchmark one run within the actual Render instance's measured memory ceiling with headroom; stress large DOM/images, hanging pages, rapid navigation, and repeated sequential runs. Test timeout, cancellation, forced process death, redeploy, lost stream, database outage, and storage failure. No orphan Chromium processes, duplicate terminal transitions, or permanently running investigations. A restart requests a fresh key and preserves only committed evidence.
7. **Retention/quota:** expired data is inaccessible even before physical cleanup; deletion retries remove objects and rows; storage/admission caps fail closed without charging an operator-funded AI key.

## Documentation freshness

Read the Supabase skill and current RLS/auth/storage docs. The Markdown changelog endpoint was unsupported by the web fetcher and shell network resolution failed; reviewed the official HTML changelog instead. Its 5 October 2026 entry deprecates `@supabase/server` framework adapters, with removal planned for 1 December 2026. Avoid adopting those adapter paths; verify chosen SDK versions during implementation. This design does not require new middleware packages. [Supabase changelog](https://supabase.com/changelog)
