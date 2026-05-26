# V1 → V2 migration runbook

The v1 schema had a single `markets` table where every ticket was implicitly
about Charles, plus a `marketProposals` approval flow. V2 generalizes: tickets
are about any user (`subjectUserId`), anyone can publish (`creatorId`),
proposals are gone. Tables and identifiers were renamed `markets` → `tickets`,
`marketId` → `ticketId`, `by_market` → `by_ticket`.

This runbook migrates a live v1 prod deployment to v2 in place. It uses a
snapshot bounce: export → wipe legacy tables → push v2 → import.

**Expected downtime: 10–15 minutes.** Plan a maintenance window. Post a banner.

## Inputs you need before starting

- `CONVEX_DEPLOY_KEY` for prod (Convex dashboard → Settings)
- The user ID for Charles in prod (every legacy ticket gets this as
  `subjectUserId`). Find it via the dashboard's data tab or:
  ```sh
  npx convex data users --prod | grep -i charles
  ```
- Your admin user ID (becomes `creatorId` on all migrated tickets). Same
  lookup.
- A clean working tree on the `v2` branch. `pnpm tsc --noEmit` clean.

## Steps

### 1. Export v1 data

Before doing anything else, snapshot prod. This is your rollback safety net.

```sh
npx convex export --prod --path v1-snapshot.zip
```

Verify the zip contains `markets/`, `positions/`, `trades/`, `comments/`,
`priceTicks/`, `ticketReports/`, plus `users/` and `auth*/`. Tuck this file
somewhere safe.

### 2. Wipe the legacy tables

V2 schema has no `markets` or `marketProposals` tables, so pushing it will
refuse until those are empty. Other tables (`positions`, `trades`, etc.)
change their `marketId` field to `ticketId`; existing rows won't match the
new validator either.

In the Convex dashboard's **Data** tab for prod, click each of these tables
and **Clear table**:

- `markets`
- `marketProposals`
- `positions`
- `trades`
- `comments`
- `priceTicks`
- `ticketReports`

**Do not touch** `users`, `authAccounts`, `authSessions`, or the rest of the
`auth*` family. Users keep their existing IDs, balances, admin status, and
sign-ins.

### 3. Push v2 schema + code

```sh
git checkout v2
npx convex deploy --prod
```

This pushes the renamed schema. With the legacy tables empty, the push
succeeds. Your prod is now on v2 with `users` populated and everything else
empty.

### 4. Build the migration payload

Unzip the snapshot and transform it into a single JSON args object:

```sh
unzip v1-snapshot.zip -d ./v1
node scripts/build-migration-payload.mjs \
  ./v1 \
  <charlesUserId> \
  <yourAdminUserId> \
  > payload.json
```

The script prints a one-line summary to stderr (counts per table). Confirm it
matches expectations before continuing.

### 5. Dry-run the migration

```sh
node scripts/build-migration-payload.mjs ./v1 <charlesUserId> <yourAdminUserId> --dry-run \
  | npx convex run --prod migrations:importV1Snapshot
```

Returns counts of what *would* be inserted. Compare against the export
summary. `orphans` should be 0; if not, you have child rows pointing at a
market that's no longer in the export, which means the export was incomplete
or someone mutated prod mid-snapshot.

### 6. Run the migration

```sh
cat payload.json | npx convex run --prod migrations:importV1Snapshot
```

Returns the actual counts. Cross-check against step 5. Sanity:

- `ticketsInserted == markets.length` (or `ticketsInserted + ticketsSkipped`
  if you reran)
- `positions`, `trades`, `comments`, `priceTicks`, `ticketReports` should all
  match their source counts
- `orphans == 0`

### 7. Smoke test

Sign in on prod, walk these pages, confirm data shows up:

- `/tickets` — every ticket present, correct status, correct yes price
- `/leaderboard` — top trader is correct, P&L matches
- `/portfolio` (as a known v1 trader) — open positions and trade history
  visible
- `/ticket/<known-slug>` — chart renders from priceTicks, comments are there
- `/admin/tickets` — every ticket lists Charles as the subject and you as the
  creator

### 8. Lift the maintenance banner

Remove the maintenance banner. You're done.

## What does and doesn't survive

| Carried over | Lost |
|---|---|
| All users + auth | Original ticket / position / trade `_id`s (slugs are stable) |
| Ticket questions, slugs, descriptions, tags | `category` field (dropped) |
| Yes prices, volume, liquidity, openInterest | `resolutionSource` (deprecated) |
| Status + resolution (Yes / No) | Original `_creationTime` on child rows |
| Position avg prices, realized P&L | All `marketProposals` rows (no v2 equivalent) |
| Trade history (qty, price, cost) | |
| Price ticks (chart history) | |
| Insider-trading reports | |
| Comments | |

The `_creationTime` loss means trade and comment timestamps will all show as
the migration moment in v2. For a friend-group app the close-time stamps on
tickets and the resolution data are the things that actually matter; trade
timestamps are mostly cosmetic. If you need true historical timestamps, the
schema would need an explicit `originalCreatedAt` field on each child table
before running this.

## Rollback

If something goes sideways before step 7, the rollback is:

1. `git checkout <last-v1-commit>` locally
2. `npx convex deploy --prod` to push v1 schema back
3. Wipe the v2-populated tables in the dashboard
4. `npx convex import --prod --replace v1-snapshot.zip` to restore the v1
   snapshot

If you've already lifted the banner and accepted traffic on v2, rollback
loses any trades placed after step 8. Don't roll back lightly.

## Re-running

`importV1Snapshot` is idempotent on the `tickets` table: it dedupes by slug
and reports `ticketsSkipped`. **Child rows are not deduped** — rerunning
duplicates positions, trades, comments, etc. If a run fails partway through:

1. Clear the v2 child tables (`positions`, `trades`, `comments`,
   `priceTicks`, `ticketReports`) via the dashboard
2. Leave the partially-inserted `tickets` rows alone
3. Rerun. Existing tickets will be skipped; child rows reinsert cleanly.

## Notes

- `npx convex run` with `--prod` requires `CONVEX_DEPLOY_KEY` exported in the
  shell, or a logged-in Convex CLI session with prod access.
- Convex mutation args have a size limit (around 8MB after JSON-encoding).
  For a friend-group prod, the payload will be well under that. If a future
  migration needs to handle more, batch by splitting `trades` and feeding it
  across multiple mutation calls.
- The migration mutation has no `requireAdmin` check. The `CONVEX_DEPLOY_KEY`
  is the only thing that lets you call it. Treat that key like prod
  credentials.
