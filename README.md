# CHARLES.MARKET

A near-future prediction console built on **one chaotic friend named
Charles**. Trade Yes/No tickets in shekels (₪) on his next mishap,
milestone, or antic — locking himself out, showing up late on Friday,
finishing the half marathon under two hours, calling his mom on Mother's
Day. Anyone can propose a ticket; admins approve, edit, resolve.

Play money only. Real feelings.

> _Not affiliated with Charles (probably). Not a real betting product._

## What's in the box

- 12 seeded tickets across Antics, Mishaps, Relationships, Career,
  Health, Travel, Money
- Live order placement with atomic balance deduction, position
  aggregation, trade logging, and simple linear price impact
- **Public profiles** at `/profile/<handle>` — same UI for everyone, with
  inline owner-only sections (cash on hand, handle edit, your proposals)
  if you're viewing your own page
- **Community proposals**: anyone signed in can pitch a new ticket via
  `/propose`; admins approve, reject (with optional reason), or delete
- **Admin console** at `/admin`:
  - `/admin/tickets` — list + filters + per-ticket edit drawer; bell
    notification surfaces pending proposals and ended-but-unresolved
    tickets with inline approve/reject/resolve buttons
  - `/admin/users` — table with inline drawer to edit handle, adjust
    balance (±, set), toggle admin, view full activity (trades +
    comments + proposals), delete
- Real-time global activity feed at `/activity`
- Leaderboard at `/leaderboard` — top traders by realized + unrealized
  P&L, every handle clickable to its profile
- Per-user portfolio at `/portfolio` — cash, open positions, settled
- Comments per ticket, every handle linked to profile
- Google sign-in via Convex Auth — every account starts with ₪1,000
- Console-grade design system: dark by default, chemical-lime brand,
  Funnel + JetBrains Mono, sharp 4px corners. See `DESIGN.md`.
- Mobile-tight: sticky-bottom buy bar on ticket detail, full responsive
  table → list fallbacks, iOS-safe input sizing
- 100% server-enforced trading, proposals, and admin actions

## Stack

| Layer    | Pick                                                                                  |
| -------- | ------------------------------------------------------------------------------------- |
| Frontend | TanStack Start (Vite + Nitro SSR), React 19 + React Compiler, Tailwind v4             |
| UI       | shadcn/ui (restyled), Lucide icons, Sonner toasts, Funnel + JetBrains Mono            |
| Backend  | [Convex](https://convex.dev) — schema, queries, mutations, realtime                   |
| Auth     | [Convex Auth](https://labs.convex.dev/auth) with `@auth/core` Google provider         |
| Tooling  | pnpm, Biome (format + lint), Lefthook (pre-commit), TypeScript 6                      |

## Quick start

```sh
pnpm install
pnpm dev                 # http://localhost:3000
```

You'll see the home page render with skeletons and an empty-board banner
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

# 4. Seed the 12 starter tickets
npx convex run seed:run

# 5. Sign in once at http://localhost:3000, then promote yourself to admin
npx convex run admin:bootstrapAdmin '{"email":"you@example.com"}'
```

Full walkthrough: [`CONVEX_SETUP.md`](./CONVEX_SETUP.md).

## Configuration

`VITE_CONVEX_URL` is the only env var the frontend reads. Convex
auto-writes it to `.env.local` on first `npx convex dev`. Mirror it in
`.env.example` so teammates know what's expected.

Everything else — Google credentials, JWT keys, `SITE_URL` — lives on
the Convex deployment, not in `.env.local`.

For Vercel deploys, set `CONVEX_DEPLOY_KEY` (Production scope) and use
`npx convex deploy --cmd 'pnpm run build'` as the build command.
`pnpm build` runs `convex codegen` before `vite build`, so the generated
client is always present at bundle time regardless of what the outer
deploy does.

## Scripts

```sh
pnpm dev                # Vite dev server on :3000
pnpm build              # convex codegen + vite build
pnpm preview            # Preview the production bundle
pnpm check              # biome check --write (format + lint)

npx convex dev          # Watch + push convex/ to the dev deployment
npx convex codegen      # Regenerate convex/_generated/ without pushing
npx convex run seed:run # Seed the starter tickets (idempotent)
npx convex run seed:wipe# Drop markets/positions/trades/comments/priceTicks

# One-shot ops
npx convex run admin:bootstrapAdmin '{"email":"you@example.com"}'
npx convex run migrations:stripResolutionSource
```

## Project layout (TL;DR)

```
convex/        Schema, auth, ticket lifecycle, admin tools, seed
src/routes/    File-based pages: /, /tickets, /ticket/$id, /portfolio,
               /activity, /leaderboard, /propose, /profile, /profile/$username,
               /admin/{tickets,users}; redirect stubs at /markets, /market/$id
src/components/  Header, footer, market-card, console helpers, auth controls
src/components/ui/  shadcn primitives (restyled to console palette)
src/lib/       Convex client, wallet hook, market helpers, cn()
src/styles/    Tailwind v4 @theme tokens + console palette + dark default
public/        favicon.svg (lime "C.") + robots.txt
```

Full architectural notes — UI conventions, currency formatting, auth
patterns, ticket lifecycle, design system, gotchas, deploy — live in
[`CLAUDE.md`](./CLAUDE.md). Brand voice and product positioning live in
[`PRODUCT.md`](./PRODUCT.md). The design system is documented in
[`DESIGN.md`](./DESIGN.md).

## Roadmap

Done:

- Console design system ("The Console") with a single brand color and
  sharp instrument-panel chrome
- Tickets / proposals lifecycle with admin edit, approve, resolve,
  close, reopen, delete
- Google sign-in via Convex Auth, server-enforced trading
- Realtime everywhere (orders, positions, leaderboard, activity feed)
- Public profile pages with merged activity, owner-only sections
- Admin notifications bell tied to pending proposals + overdue tickets
- Mobile-first responsive layout with sticky-bottom buy CTA
- SEO meta + OG, favicon, robots.txt, chunk-error auto-recovery
- URL rename `/markets` → `/tickets` with redirects for old links

Next:

- Scheduled cron to auto-close tickets at `closesAtMs`
- LMSR-style pricing to replace the linear price-impact stub
- Real order book + matching engine (current book is synthetic)
- Friend-group invites + private tickets
- Twitter/Discord webhook posting on resolution

## Disclaimer

CHARLES.MARKET runs on play-money shekels. No real value changes
hands. The tickets describe behavior of a fictionalized "Charles" for
entertainment between friends — please don't use this to operate an
actual betting business without talking to a lawyer.
