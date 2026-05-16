# Convex backend setup

The frontend is wired to Convex (`convex/`) with Google OAuth via Convex
Auth. To bring the backend up locally, provision a Convex deployment,
configure auth, seed the tickets, and promote yourself to admin.

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

This generates `JWT_PRIVATE_KEY` and `JWKS` and writes them to your
**Convex deployment's** environment variables (not local `.env`). It also
sets `SITE_URL` to `http://localhost:3000` by default — change later for
prod.

## 3. Add Google OAuth credentials

1. Open [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials).
2. Create **OAuth 2.0 Client ID** → Web application.
3. Add an **Authorized redirect URI**:
   ```
   https://<your-deployment>.convex.site/api/auth/callback/google
   ```
   (Note: `convex.site`, not `convex.cloud`. The site URL is your
   deployment's HTTP-action endpoint.)
4. Save and copy the **Client ID** and **Client secret**.
5. Set them on the Convex deployment:
   ```sh
   npx convex env set AUTH_GOOGLE_ID <client-id>
   npx convex env set AUTH_GOOGLE_SECRET <client-secret>
   ```

`npx convex dev` will pick the new env vars up automatically.

## 4. Seed the tickets

In a terminal (with `npx convex dev` running):

```sh
npx convex run seed:run
```

You should see `{ inserted: 12, skipped: null }`. To start over:

```sh
npx convex run seed:wipe
npx convex run seed:run
```

## 5. Promote yourself to admin

Sign in once at `http://localhost:3000` so your user row exists, then
run the bootstrap mutation (only works while zero admins exist, so it
can't be used as a backdoor later):

```sh
npx convex run admin:bootstrapAdmin '{"email":"you@example.com"}'
```

After that, the `/admin` route lights up for you and the user menu
shows an Admin entry. From `/admin/users` you can grant or revoke admin
on anyone via the inline toggle.

## 6. (Optional) Production deploy

For Vercel:

- Build command: `npx convex deploy --cmd 'pnpm run build'`
- Env var: `CONVEX_DEPLOY_KEY` (copy from Convex dashboard → Settings → URL & Deploy Key, scope to Production)
- Do **not** set `VITE_CONVEX_URL` manually — `convex deploy --cmd` injects it.

For a manual prod push from the CLI:

```sh
npx convex deploy
```

Set `SITE_URL`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` on the **prod**
deployment too — and add the prod redirect URI in Google Cloud.

## 7. Schema field cleanup (one-time)

`resolutionSource` used to live on `markets` and `marketProposals` but
was removed. Existing rows still carry the field, so the validator
keeps it as `v.optional(v.string())` for now. Drop it from every row
with:

```sh
npx convex run migrations:stripResolutionSource
```

Then remove the `resolutionSource: v.optional(v.string())` lines from
`convex/schema.ts` and push again.

## 8. What's wired up

**Server functions** (in `convex/`):

| File             | Exports                                                                                                                |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `auth.ts`        | `convexAuth` with Google provider; `createOrUpdateUser` sets handle + ₪1,000 balance                                   |
| `users.ts`       | `me`, `amIAdmin`, `updateHandle`, `publicProfile`, `publicPositions`, `publicTrades`; `requireUser`/`requireAdmin` helpers |
| `wallet.ts`      | `get` — read your own balance                                                                                          |
| `markets.ts`     | `list`, `getBySlug`, `trending`, `history`                                                                             |
| `orders.ts`      | `place`, `sell` — buy/sell with position aggregation, trade logging, and price impact                                  |
| `trades.ts`      | `byMarket`, `positions`, `settled`                                                                                     |
| `comments.ts`    | `byMarket`, `add`                                                                                                      |
| `activity.ts`    | `feed` — merged stream of trades, comments, resolutions                                                                |
| `leaderboard.ts` | `top` — per-user P&L (realized + unrealized)                                                                           |
| `proposals.ts`   | `submit`, `listMine`, `listAll`, `pendingCount`, `approve`, `reject`, `remove`                                          |
| `admin.ts`       | `listAll`, `createMarket`, `updateMarket`, `closeMarket`, `reopenMarket`, `resolveMarket`, `deleteMarket`,             |
|                  | `grantAdmin`, `revokeAdmin`, `bootstrapAdmin`, `listUsers`, `adminUpdateUser`, `deleteUser`, `userTrades`,             |
|                  | `userActivity`, `adjustBalance`                                                                                        |
| `migrations.ts`  | `stripResolutionSource` — admin-only field cleanup                                                                     |
| `seed.ts`        | `run`, `wipe` — idempotent ticket seed and dev-only nuke                                                               |

**Frontend wiring**:

- `src/lib/convex.ts` — `ConvexReactClient` keyed by `VITE_CONVEX_URL`
- `src/routes/__root.tsx` — wraps everything in `ConvexAuthProvider`,
  ships the chunk-error auto-recovery script + the 404 / error boundary
- `src/components/auth-controls.tsx` — `SignInButton` (Google),
  `UserMenu` (Profile, Portfolio, Propose, Admin, Sign out)
- `src/components/header.tsx` — iconified nav, mobile Sheet with Propose
  CTA, balance pill, search-to-/tickets
- `src/routes/propose.tsx` — guided proposal form, calls
  `api.proposals.submit`
- `src/routes/admin/tickets.tsx` — table + notifications sheet (pending
  proposals + ended tickets) + edit drawer + create dialog
- `src/routes/admin/users.tsx` — table + drawer (handle, balance ±,
  admin toggle, merged activity feed, delete)

To read data on the client, always go through Convex hooks:

```tsx
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

const tickets = useQuery(api.markets.list, { category: "All" });
// Returns `undefined` while loading, then the live array.
```

For the order ticket on the ticket detail page:

```tsx
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";

const placeOrder = useMutation(api.orders.place);
await placeOrder({ marketId, side: "Yes", amount: 100 });
```

## Notes

- `convex/_generated/` is gitignored. The frontend won't typecheck
  until you've run `npx convex dev` once (or `npx convex codegen`).
  `pnpm build` runs codegen before Vite, so production builds work
  without committing it.
- `VITE_CONVEX_URL` must be set before `pnpm dev` for the React side to
  connect. In production on Vercel, `convex deploy --cmd` injects it.
- When you remove a field from `convex/schema.ts`, Convex will reject
  the push until existing rows are rewritten. The pattern is: re-add
  the field as `v.optional(...)`, push, write a migration that uses
  `ctx.db.replace` to drop the field from each row, run it, then
  remove the optional declaration.
  `convex/migrations.ts:stripResolutionSource` is the working template.
- `users.by_handle` is the index that powers `/profile/<handle>`. If
  you ever drop it, `publicProfile`, `publicPositions`, and
  `publicTrades` will throw at runtime.
