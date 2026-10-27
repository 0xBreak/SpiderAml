# SpiderAML — agent instructions

Product: free AML screening of crypto wallets/tokens, in plain language
(Russian default at `/`, English under `/en`). i18n via next-intl.
Site is server-rendered; there is NO public JSON API by design.

## Layout

- `web/` — Next.js 16 App Router site (Turbopack). Routes live under
  `src/app/[locale]/` (`ru` unprefixed, `en` under `/en`). Copy in
  `messages/ru.json` + `messages/en.json`; `src/lib/texts.ts` keeps the
  typed Russian copy for not-yet-translated pages.
- `contracts/` — Solidity + Foundry. `deployments/<chainId>.json` shared with the site.
- `scripts/` — deploy / verify / local run. Data layer lives in a separate private repo.

## Web rules (must follow)

- Server Components by default. `"use client"` only for wallet (`/send`),
  forms with steps (`/report`) and interactive islands.
- Client data fetching goes through TanStack Query (`AppQueryProvider` in the
  locale layout, `useQuery` in components) — no ad-hoc `useEffect` fetching.
- Multi-step flows use `@stepperize/react` (`defineStepper` + `Steps` indicator
  in `src/components/ui/stepper.tsx`).
- Forms use `react-hook-form` + `zod` via `@hookform/resolvers/standard-schema`.
  Server submission still goes through Server Actions (`src/lib/action.ts`
  envelope: `ok` / `fail`); client schema mirrors server checks.
- URL state (search, filters) goes through `nuqs` (`NuqsAdapter` in the locale
  layout, `useQueryState` in client islands) — shareable links, no manual
  `URLSearchParams` juggling.
- Tables with client sorting use `@tanstack/react-table` v8 (see
  `WhalesTable`). Lists are capped server-side, so no virtualization needed.
- Toasts via `sonner` (`Toaster` in the locale layout).
- `DATA_URL` + `DATA_SECRET` are server-only (`src/lib/data.ts`, `server-only`). Never prefix with `NEXT_PUBLIC_`, never leak into client bundles.
- Pages call the data layer from the server and render HTML. No public API routes except the write-only beacon `/api/e`.
- Risk wording: reasons, never accusations. Disclaimer next to every score.
- Rate limits per IP on expensive pages (`checkLimit` in `src/lib/action-server.ts`).
- Security headers + CSP in `next.config.mjs`. `experimental.optimizePackageImports`
  covers `lucide-react` and `recharts`. Images below the fold: `loading="lazy"`.
- `src/proxy.ts` (was `middleware.ts` in Next ≤15): canonical-host redirect →
  next-intl routing → pageview counting. Matcher covers app pages only.

## UI — one style: Perpetuity

- Theme: Perpetuity preset (muted teal, JetBrains Mono everywhere, square
  corners) in `web/src/app/globals.css` `@theme` (Tailwind v4, CSS-first).
  Legacy brand names (`bg`, `surface`, `silver`, `accent`...) are aliases to
  the preset palette — pages keep working, new code uses semantic tokens.
- Primitives: `web/src/components/ui.tsx` (site API: `Tone`, `Badge`, `Card`,
  `Stat`, `Bar`, `PageTitle`, `Notice`, `ErrorBox`, `Skeleton`, `Empty`) composed
  from `web/src/components/ui/*` (shadcn, Lyra style). Steps indicator: `ui/stepper`.
- New UI: `ui/*` primitives + semantic colors (`bg-background`,
  `text-muted-foreground`). Never raw hex, never `space-x-*`, use `gap-*`,
  `size-*` for squares, `cn()` from `@/lib/utils` for conditionals.
  Details: `.agents/skills/shadcn`.
- After `npx shadcn add ...`: fix `from "cn"` imports to `@/lib/utils`,
  re-remove the `cn`/`shadcn` npm packages it reinstalls, verify no `use client`
  leaked into server components, run typecheck. Never `--overwrite` without approval.

## Skills

- Project: `.agents/skills/shadcn` (shadcn workflow), `.agents/skills/spideraml-web` (product conventions).
- Global (already installed, do not duplicate): `nextjs-app-router-patterns`, `vercel-react-best-practices`, `vercel-composition-patterns`, `frontend-testing-best-practices`, `playwright-best-practices`, `core-web-vitals`.

## Commands (run in `web/`)

- `npm run dev` → http://localhost:3000 (needs `DATA_URL`/`DATA_SECRET`, else pages show "service unavailable").
- `npm run typecheck`, `npm test` (vitest, 16 unit tests), `npm run build` (must pass; Docker uses standalone output).
- `npm audit --omit=dev` must stay at 0 vulnerabilities.
- Public URL for manual checks: `tuna http 3000` (authenticated account, random subdomain).
