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
