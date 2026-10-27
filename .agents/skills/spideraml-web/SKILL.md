# SpiderAML web conventions

Product context for agents working on `web/` in this repo.

## What this is

SpiderAML: free AML screening of crypto addresses and tokens, in plain
language. Russian default (no URL prefix), English under `/en` (next-intl).
Verdict = score 0–100 + reasons + source of each reason + what to do next.
Always a disclaimer: automatic, not legal advice, listings can be wrong.

## Data model

- The site holds no data. Every page calls the private data layer
  (`DATA_URL`, header `x-spider-key: DATA_SECRET`) from server code only.
- Without a running data layer pages render the "service unavailable" state —
  that is expected, not a bug.
- Never add public JSON endpoints; the browser gets HTML. Only exception is
  the write-only metrics beacon `/api/e`.

## UI language and tone (Russian)

- All strings live in `src/lib/texts.ts`.
- Say "риск", "сигналы", "отметки". Never "мошенник"/accusations about an address.
- Numbers: `src/lib/format.ts` (`usd`, `price`, `num`, `pct`, `dateTime`).

## Style

- Single dark theme, dense, strict. Tokens in `src/app/globals.css` `@theme`.
- Compose `src/components/ui.tsx` (`Badge`, `Card`, `Stat`, `Notice`, ...),
  which wraps `src/components/ui/*` (shadcn). Same `Tone` scale everywhere:
  `ok` / `warn` / `crit` / `info` / `muted`, severity via `toneOfSeverity`.
- Networks: `src/lib/networks.ts` (label, explorer, color per chain).

## Pages

- `/` explains the product (tools, score levels, data sources).
- `/check` address screening, `/token` token analytics (+charts),
  `/whales` large transfers, `/sanctions` official lists only,
  `/send` wallet flow (only client-side page, viem + injected wallet),
  `/report` free report form, `/blog` MDX posts in `src/content`.
