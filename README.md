# Charlesmarket

A play-money prediction market for **one friend named Charles**. Trade Yes/No
contracts in shekels (₪) on his next mishap, milestone, or antic — locking
himself out, showing up late on Friday, finishing the half marathon under
two hours, calling his mom on Mother's Day.

Polymarket-style UI, NVIDIA-green brand, Convex backend with Google sign-in.
Play money only. Real feelings.

> _Not affiliated with Charles (probably). Not affiliated with Polymarket or
> NVIDIA at all._

## What's in the box

- 12 seeded markets with categories (Antics, Mishaps, Relationships, Career,
  Health, Travel, Money), volume/liquidity, closing dates
- Live order placement with atomic balance deduction, position aggregation,
  trade logging, and simple price impact
- Real-time activity feed (trades + comments + resolutions)
- Leaderboard with realized + unrealized P&L
- Per-user portfolio with cash, open positions, and settled history
- Comments per market
- Google sign-in via Convex Auth — every account starts with ₪1,000
- Light + dark mode, mobile sheet nav, sonner toasts on every mutation
- 100% server-enforced bidding — no auth, no orders

## Stack

| Layer    | Pick                                                                                  |
| -------- | ------------------------------------------------------------------------------------- |
| Frontend | TanStack Start (Vite + Nitro SSR), React 19 with the React Compiler, Tailwind v4      |
| UI       | shadcn/ui primitives, Lucide icons, Sonner toasts, Inter + JetBrains Mono             |
| Backend  | [Convex](https://convex.dev) — schema, queries, mutations, realtime, scheduler-ready  |
| Auth     | [Convex Auth](https://labs.convex.dev/auth) with `@auth/core` Google provider         |
| Tooling  | pnpm, Biome (format + lint), Lefthook (pre-commit), TypeScript 6                      |

## Quick start

```sh
pnpm install
pnpm dev                 # http://localhost:3000
```

You'll see the home page render with skeletons and an empty-markets banner
until you provision Convex.

To bring the backend online (one-time):

```sh
# 1. Provision a Convex deployment + watch convex/ for changes
npx convex dev

# 2. Initialize Convex Auth (writes JWT keys + SITE_URL to the Convex deployment)
npx @convex-dev/auth

# 3. Wire Google OAuth — see CONVEX_SETUP.md for the redirect URI
npx convex env set AUTH_GOOGLE_ID <client-id>
npx convex env set AUTH_GOOGLE_SECRET <client-secret>

# 4. Seed the 12 starter markets
npx convex run seed:run
```

Full walkthrough: [`CONVEX_SETUP.md`](./CONVEX_SETUP.md).

## Configuration

`VITE_CONVEX_URL` is the only env var the frontend reads. Convex auto-writes
it to `.env.local` on first `npx convex dev`. Mirror it in `.env.example`
so teammates know what's expected.

Everything else — Google credentials, JWT keys, `SITE_URL` — lives on the
Convex deployment, not in `.env.local`.

## Scripts

```sh
pnpm dev                # Vite dev server on :3000
pnpm build              # Production build
pnpm preview            # Preview the production bundle
pnpm check              # biome check --write (format + lint)

npx convex dev          # Watch + push convex/ to the dev deployment
npx convex run seed:run # Seed the starter markets (idempotent)
npx convex run seed:wipe# Drop markets/positions/trades/comments/priceTicks
```

## Project layout (TL;DR)

```
convex/        Backend functions, schema, auth, seed
src/routes/    File-based pages (home, /markets, /market/$id, …)
src/components/Header, footer, market-card, auth controls, theme toggle
src/components/ui/  shadcn primitives (owned, edit freely)
src/lib/       Convex client, wallet hook, market helpers, cn()
src/styles/    Tailwind v4 + brand tokens + dark mode
```

The agent-oriented guide ([`CLAUDE.md`](./CLAUDE.md) / [`AGENTS.md`](./AGENTS.md))
has the full architectural notes — UI conventions, currency formatting, auth
patterns, the chart fallback, and the gotchas you'll hit.

## Roadmap

Done:

- Full UI on shadcn primitives, light + dark
- Convex schema, queries, mutations for all surfaces
- Google sign-in via Convex Auth, server-enforced bidding
- Realtime everywhere (orders, positions, leaderboard, activity)
- Sonner toasts on every mutation

Next:

- Market resolution flow (`orders.sell` already lives — needs an admin-gated
  `markets.resolve` and payout sweep)
- Scheduled cron to auto-close markets at `closesAtMs`
- LMSR-style pricing to replace the linear price-impact stub
- Real order book + matching engine (current book is synthetic)
- Friend-group invites + private markets
- Twitter/Discord webhook posting on resolution

## Disclaimer

Charlesmarket runs on play-money shekels. No real value changes hands. The
markets describe behavior of a fictionalized "Charles" for entertainment
between friends — please don't use this to operate an actual betting business
without talking to a lawyer.
