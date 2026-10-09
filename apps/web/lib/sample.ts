import type { Report } from "./client";
export const sampleReport: Report = {
  summary:
    "A visitor can compare plans, but the route from pricing to signup breaks.",
  findings: [
    {
      id: "sample-broken-link",
      title: "The primary signup link leads to a missing page",
      observation:
        "In this illustrative example, selecting “Start your trial” on the pricing page opens /signup, which returns HTTP 404.",
      impact: "Visitors following this route cannot begin a trial.",
      recommendation:
        "Point the pricing call to action at the current signup route, then check the complete journey.",
      kind: "observed",
      severity: "high",
      evidenceIds: ["sample-pricing", "sample-signup"],
    },
    {
      id: "sample-copy",
      title: "Trial length differs between two pages",
      observation:
        "The example homepage says “14-day trial”; the pricing page says “7 days”.",
      impact:
        "Visitors may be uncertain which trial duration applies. This is a usability interpretation, not a measured conversion effect.",
      recommendation:
        "Confirm the intended trial duration and align the two pages.",
      kind: "interpretation",
      severity: "low",
      evidenceIds: ["sample-home", "sample-pricing"],
    },
  ],
  limitations: [
    "Illustrative sample content, not a live investigation or a real customer website.",
    "Three example pages: homepage, pricing, and signup. No form submissions, authentication, or backend testing.",
  ],
};
