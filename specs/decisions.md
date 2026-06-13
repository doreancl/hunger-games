# Decisions

- Deploy on Vercel.
- Production framework: Next.js App Router.
- UI: shadcn/ui + Tailwind CSS.
- Default theme: `Eng Runbook`.
- Stateless server for continuity.
- Client keeps full snapshot in `localStorage`.
- Rehydration uses the client-submitted snapshot.
- No DB, shared memory, or filesystem recovery for matches in V1.
- Continuity is only guaranteed on the same browser/device.
- Snapshot compatibility across versions is not guaranteed.
- Corrupted or incompatible snapshots are rejected without fallback.
- Snapshot export as JSON is allowed.
- Game entry (`/`) opens new-match setup.
- `/new` redirects to `/`; it is not an accessible screen.
- History (`/sessions`) concentrates resume, summarize, duplicate, and delete for local matches.
- No fixed local match limit in V1.
- V1 does not require user accounts.
- Do not use CSS modules in new screens.

## Analytics Responsibilities

- PostHog is the product analytics source of truth. Use it for named funnel events, feature usage, retention, and debugging user flows.
- Google Analytics 4 measures acquisition and marketing outcomes. Use it for traffic sources, campaigns, referrals, and search-related reporting.
- Vercel Analytics measures frontend delivery and page-level performance on Vercel. Use it for Web Vitals and deployment-related regressions.
- Cloudflare Web Analytics provides privacy-oriented, edge-observed traffic totals. Use it as an independent check for visits and page views reaching the domain.
- Do not compare raw totals across tools as if they were equivalent; consent, blockers, bot filtering, and collection points differ.
- A product event is added to PostHog first. Add it to GA4 only when it represents a marketing conversion.
- Do not send roster names, seeds, snapshot contents, or other user-generated match data to analytics tools.
- Update `ruleset_version` whenever simulation behavior changes in a way that can affect match outcomes or metrics.
