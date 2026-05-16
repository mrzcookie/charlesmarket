# Convex backend setup

The frontend is wired to Convex (`convex/`) with Google OAuth via Convex Auth. To bring the backend up locally, you need to provision a Convex deployment, configure auth, and seed the markets table.

## 1. Provision a Convex deployment

```sh
npx convex dev
```

This will:

- Prompt you to log in to Convex (browser opens once)
- Create a new dev deployment for the project
- Print a `VITE_CONVEX_URL=https://...convex.cloud` line
- Watch `convex/` and push your schema + functions on every save
- Generate `convex/_generated/` so the React side type-checks

Leave it running. Copy the printed URL into `.env.local`:

```env
VITE_CONVEX_URL=https://<your-deployment>.convex.cloud
```

## 2. Initialize Convex Auth

In a second terminal:

```sh
npx @convex-dev/auth
```

This generates `JWT_PRIVATE_KEY` and `JWKS` and writes them to your **Convex deployment's** environment variables (not local `.env`). It also sets `SITE_URL` to `http://localhost:3000` by default — change later for prod.

## 3. Add Google OAuth credentials

1. Open [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials).
2. Create **OAuth 2.0 Client ID** → Web application.
3. Add an **Authorized redirect URI**:
   ```
   https://<your-deployment>.convex.site/api/auth/callback/google
   ```
   (Note: `convex.site`, not `convex.cloud`. The site URL is your deployment's HTTP-action endpoint.)
4. Save and copy the **Client ID** and **Client secret**.
5. Set them on the Convex deployment:
   ```sh
   npx convex env set AUTH_GOOGLE_ID <client-id>
   npx convex env set AUTH_GOOGLE_SECRET <client-secret>
   ```

`npx convex dev` will pick the new env vars up automatically.

## 4. Seed the markets

In a terminal (with `npx convex dev` running):

```sh
npx convex run seed:run
```

You should see `{ inserted: 12, skipped: null }`. To start over:

```sh
npx convex run seed:wipe
npx convex run seed:run
```

## 4a. (Optional) Production deploy

```sh
npx convex deploy
```

Set `SITE_URL`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` on the **prod** deployment too — and add the prod redirect URI in Google Cloud.

## 5. What's wired up

**Server functions** (in `convex/`):

| File | Exports |
| --- | --- |
| `auth.ts` | `convexAuth` with Google provider; `createOrUpdateUser` sets handle + ₪1,000 balance on first sign-in |
| `users.ts` | `me`, `updateHandle`; `requireUser`/`currentUser` helpers |
| `wallet.ts` | `get`, `topUp`, `reset` |
| `markets.ts` | `list`, `getBySlug`, `trending`, `history` |
| `orders.ts` | `place`, `sell` — full buy/sell with position aggregation, trade logging, and price impact |
| `trades.ts` | `byMarket`, `positions`, `settled` |
| `comments.ts` | `byMarket`, `add` |
| `activity.ts` | `feed` — merged stream of trades, comments, resolutions |
| `leaderboard.ts` | `top` — per-user P&L (realized + unrealized) |
| `seed.ts` | `run`, `wipe` — idempotent market seed and dev-only nuke |

**Frontend wiring**:

- `src/lib/convex.ts` — `ConvexReactClient` keyed by `VITE_CONVEX_URL`
- `src/routes/__root.tsx` — wraps everything in `ConvexAuthProvider`
- `src/components/auth-controls.tsx` — `SignInButton` (Google), `UserMenu` (avatar + dropdown + sign-out), `AuthControls` (auth-aware swap)
- `src/components/header.tsx` — uses `<Authenticated>`/`<Unauthenticated>` to swap balance pill + Top up button vs. sign-in button

The existing pages still read from the static seed in `src/lib/markets.ts`. To migrate a page:

```tsx
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

// In a component:
const markets = useQuery(api.markets.list, { category: "All" });
// Returns `undefined` while loading, then the live array.
```

For the order ticket on the market detail page:

```tsx
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";

const placeOrder = useMutation(api.orders.place);
await placeOrder({ marketId, side: "Yes", amount: 100 });
```

## Notes

- The header's balance pill currently reads from `useBalance()` (localStorage). Swap it to `useQuery(api.wallet.get)` when you migrate the wallet — the existing UI components already accept a `balance` value and re-render reactively.
- `convex/_generated/` is gitignored by default after `convex dev` runs. The frontend won't typecheck until you've run `npx convex dev` once.
- `VITE_CONVEX_URL` must be set before `pnpm dev` for the React side to connect.
