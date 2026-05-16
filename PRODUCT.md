# CHARLES.MARKET — Product context

> One chaotic friend. A trading console in his name.

## What it is

A play-money prediction console about **a real person named Charles**.
Not "users." Not "markets." Not "predictions in general." Charles. The
whole site is an inside joke that the friend group runs like a
near-future trading desk: every dumb thing Charles is *probably* about
to do becomes a tradable Yes/No **ticket** priced in shekels (₪).

The product reads as personal, irreverent, and a little chaotic —
because the subject is. It is the opposite of Polymarket, Kalshi, and
every Robinhood-clone fintech app the model has seen.

## Users

Three audiences, in order of weight:

1. **Charles's friends** — they propose tickets, trade them, and roast
   him in the comments. They visit weekly, in clusters, after something
   Charles did.
2. **Friends-of-friends** — they hear about a particularly stupid
   Charles incident, get a link, sign in to bet, and stay.
3. **Charles himself** — visits to grimace at his own hit-rate. Should
   not feel personally attacked, just affectionately roasted.

State of mind on arrival: amused. They are not here to manage a
portfolio. They are here for the gossip column with a buy button.

## Register

**Brand-leaning product.** The trading UI is functional product
surface, but the brand IS the product. A flat, neutral, Stripe-clean
redesign would erase the only thing that makes this site interesting.
Voice carries through every surface — order ticket, admin console,
empty states.

## Anti-references

- **Polymarket.** Purple-glass fintech. CHARLES.MARKET is not a market
  for global news, it's a console for one guy.
- **Robinhood / Kalshi.** Clean, institutional, big-app.
  CHARLES.MARKET is small, irreverent, instrument-grade.
- **The default shadcn template.** NVIDIA-green primary, Inter sans,
  rounded cards, soft shadows. The previous version of this site was
  exactly that, and that is what we are leaving behind.
- **Editorial-magazine pastiche.** Cream paper + italic serif +
  uppercase tracked labels. Currently a saturated AI aesthetic; if
  CHARLES.MARKET lands there, it failed.
- **Generic crypto neon / "futuristic" reflex.** No glowing gradients,
  no glassmorphism, no cyan-on-navy, no Orbitron headlines. The
  future is not a glow.

## Strategic principles

1. **Charles is a character.** Reference him by name in copy. "Will
   Charles…" not "Will the subject…". Personality > neutrality, every
   time.
2. **Shekels are central.** ₪ is the brand. Never use $. Always render
   whole shekels (no decimals).
3. **Tickets, not markets.** Every public surface calls them tickets
   and numbers them `M-007` style. The word "market" survives only in
   Convex code identifiers.
4. **Density is voice.** A console is dense. Don't pad to look "clean"
   — that's the AI tell. Hairlines, tight rows, a lot in a small
   space.
5. **Play money, real feelings.** The site is a joke. Loss states
   should still sting a little.

## Voice & copy

- Second-person, warm, low-key sardonic. "He's done worse." "Probably
  not." "You sure?"
- Avoid all em-dashes and double-hyphens. Use commas, colons, periods.
- Reserve UPPER-CASE for mono labels (`VOL`, `LIQ`, `CLOSES`,
  `M-007`, `[ LIVE ]`). Don't shout in prose.
- Time references are concrete: `CLOSES THU 21:00`, not "in 2 days."
- Status chips use the bracket idiom: `[ LIVE ]`, `[ CLOSED ]`,
  `[ ADMIN ]`, `[ RESOLVING ]`. The brackets are part of the type, not
  UI chrome.

## Public profiles

`/profile/<handle>` is the canonical trader page. Same UI for everyone.
Owner-only inline sections (cash on hand, handle edit, your proposals)
gate on `me.handle === profile.handle`. **Never show emails on
non-admin surfaces.** Display names are deprecated and not surfaced
outside admin tools.

## Admin behavior

Admin is a person, not a role-with-permissions language. The console
uses "ADMIN" everywhere — never "moderator", "operator", "staff".
Pending proposals are the primary notification surface; ended-but-
unresolved tickets are secondary. The admin can edit any field on any
ticket, adjust any balance up or down, and grant/revoke admin from any
user drawer.

## Out of scope, intentionally

- No real money. Don't add language that implies real-money risk.
- No notifications / email — none of that infrastructure exists.
- No "top up" UI for end users. Admins adjust balances via
  `admin.adjustBalance`. There is no faucet.
- No social-graph features. The friend group IS the social graph;
  we don't recreate it.
- No display-name editing for users. Handles are the identity.

## Register field (for `/impeccable`)

```
register: brand-leaning-product
```
