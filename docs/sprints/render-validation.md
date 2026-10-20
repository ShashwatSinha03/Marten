# Sprint 0: actual Render validation

Status: deployment procedure, not a recorded pass. Checked official docs on 2026-10-06. Local tests do not establish Render feasibility.

## Deploy the fixture harness

1. Use the user's connected Git repository containing the reviewed harness and lockfile. Record its commit SHA. No local Docker or Render CLI is required: Render builds the repository Dockerfile. If the repository/service is not connected, that is the deployment prerequisite.
2. In Render select **New → Web Service**, connect that repository and sprint branch, choose **Docker**, and select **Free** compute. Use the actual committed Dockerfile path. Keep its default command unless the harness README explicitly supplies a probe-and-health command. Do not add a disk, database, paid worker, or registry subscription. [Docker deployment](https://render.com/docs/docker)
3. The harness must expose only health on `0.0.0.0:$PORT`, while its test fixture binds loopback. Configure the health path actually implemented by the harness. [Web service requirements](https://render.com/docs/web-services)
4. Enable the documented **startup-once fixture probe** if implemented. If the implementation has no startup probe or documented command that runs the probe and then keeps health serving, stop and add that reviewed capability before deploying; do not invent an environment switch. Free services have no shell or one-off jobs. No public probe trigger or supplied-URL endpoint is needed. [Free restrictions](https://render.com/docs/free)
5. Use no Gemini, Neon, or other application credentials for this probe. Capture deploy/runtime logs and the actual Free compute allocation shown in the dashboard. A successful image build or green health check is not a successful browser probe.

## Measurements and gates

Record every result against service ID, commit SHA, image/browser versions, region, timestamp, and configured limits. Run three sequential fixture probes (separate controlled restarts if startup-only); record each, including failures.

| Check | Record | Pass criterion |
| --- | --- | --- |
| Sandbox | Effective browser UID, launch flags, sandbox-enabled launch result and diagnostic | Non-root; no `--no-sandbox`/sandbox-disabling fallback. Successful launch is necessary but not sufficient evidence of effective isolation. |
| Real collection | Fixture URLs/statuses, screenshot hash, evidence count, terminal state | Healthy and seeded 404 distinguished; evidence and events correspond to real observations. |
| Resource bounds | Whole-container peak memory plus sampled process-tree peak; elapsed time; CPU graph | No OOM/restart; all runs respect actual configured caps. Provisional target: peak below 80% of actual memory allocation, leaving API headroom. Label sampled peaks as lower bounds. |
| Cleanup | Process count/memory after completion, cancellation, timeout | No orphan Chromium processes; next probe succeeds. |
| Cold start | One request after at least 15 minutes without traffic | Record wake latency and health/probe outcome. No continuous keepalive workaround. |
| Restart | Controlled redeploy during a fixture run; logs before/after | No false completed result or assumption local evidence survived. Durable recovery is a later acceptance gate until storage exists. |
| Public surface | Requests to non-health routes and any supplied-URL attempts | Rejected; no arbitrary investigation trigger. |

Use Render's **Metrics** tab for CPU/memory and correlate with runtime timestamps. Request latency percentiles may require a paid workspace; measure client elapsed time directly instead. Outbound graphs are hourly and delayed, so they cannot prove that a particular blocked request never left the browser. [Metrics documentation](https://render.com/docs/service-metrics)

Export the non-secret summary from logs before restart. If evidence files exist only on ephemeral disk and the harness cannot export them, record screenshot verification as **not remotely inspected**, even if its hash was logged. Do not expose the evidence directory publicly just to retrieve it.

## Isolation and egress remain separate gates

Render's Docker documentation does not establish whether its runtime supports the custom seccomp/user-namespace settings recommended for untrusted Playwright crawling. Playwright recommends non-root plus suitable seccomp settings; the default development image is not a sufficient isolation argument. Never disable Chromium sandbox to make the probe pass. A launch failure is a useful no-go result requiring a hosting/isolation decision. [Playwright Docker guidance](https://playwright.dev/docs/docker)

A fixture-origin allowlist proves only the harness's bounded behavior. Before arbitrary public URLs, separately verify enforceable browser egress for redirects, frames/subresources, workers, websockets, IPv4/IPv6 private addresses, DNS rebinding, and non-HTTP schemes. Use owned test servers and synthetic controlled DNS; do not probe real cloud metadata or unrelated internal networks. Routing callbacks and a pre-navigation URL check alone do not prove network isolation. Record this gate as **pending** if no enforceable boundary exists.

Outcome labels: **local pass**, **Render fixture pass**, **sandbox unresolved/failed**, **egress pending**, and **public release blocked** are independently reportable. A Render fixture pass permits the next controlled vertical slice; it does not authorize arbitrary-URL release or establish free production viability.
