# CHARLES.MARKET — Product context

> A trading console for betting on the friends you know.

## What it is

A play-money prediction console for **betting on people you know**.
Anyone signed in publishes a Yes/No **ticket** about another user;
the rest of the room sets the line in shekels (₪). The subject of a
ticket can't trade it. Neither can the creator. The market settles by
what everyone else thinks.

The brand wordmark is CHARLES.MARKET because Charles was the first
chaotic friend the site was built around. Charles still leads the
rotating-name hero, still gets the 404 punchlines, still anchors the
voice. The mechanic is now general; the personality stays his.

The product reads as personal, irreverent, and a little chaotic. It is
the opposite of Polymarket, Kalshi, and every Robinhood-clone fintech
app the model has seen.

## Users

Three audiences, in order of weight:

1. **The friend group.** They publish tickets about each other, trade
   them, roast each other in the comments. They visit in clusters
   after someone does something stupid.
2. **Friends-of-friends.** They get a link to a particularly stupid
   ticket, sign in to bet, and stay.
3. **The subjects.** Visit to grimace at their own ticker. Should not
   feel personally attacked, just affectionately roasted.

State of mind on arrival: amused. They are not here to manage a
portfolio. They are here for the gossip column with a buy button.

## Register

**Brand-leaning product.** The trading UI is functional product
surface, but the brand IS the product. A flat, neutral, Stripe-clean
redesign would erase the only thing that makes this site interesting.
Voice carries through every surface: order ticket, admin console,
empty states.

## Anti-references

- **Polymarket.** Purple-glass fintech. CHARLES.MARKET is not a market
  for global news, it's a console for the people in your group chat.
- **Robinhood / Kalshi.** Clean, institutional, big-app.
  CHARLES.MARKET is small, irreverent, instrument-grade.
- **The default shadcn template.** NVIDIA-green primary, Inter sans,
  rounded cards, soft shadows. The previous version of this site was
  exactly that, and that is what we are leaving behind.
- **Editorial-magazine pastiche.** Cream paper, italic serif,
  uppercase tracked labels. Currently a saturated AI aesthetic; if
  CHARLES.MARKET lands there, it failed.
- **Generic crypto neon / "futuristic" reflex.** No glowing gradients,
  no glassmorphism, no cyan-on-navy, no Orbitron headlines. The future
  is not a glow.

## Strategic principles

1. **Charles carries the voice.** Reference him by name in 404s,
   error states, and one-liners. New: tickets are now about anyone in
   the friend group, so generic mechanic copy ("a friend", "the room")
   replaces Charles-as-only-subject phrasing. Charles is still the
   first name in the rotating hero, the punchline on 404s, and the
   anchor of the wordmark.
2. **Tickets, not markets.** Every public surface and every database
   identifier says "ticket". Tickets are numbered `T-007` style.
3. **Shekels are central.** ₪ is the brand. Never use $. Always render
   whole shekels (no decimals). Starting balance is ₪2,000; users
   earn ₪50 each calendar day they log in (24h cooldown).
4. **Subjects + creators can't trade.** Both gates are server-enforced
   and the UI replaces the buy buttons with a "can't trade" panel.
   This is core to the game, not an edge case.
5. **Density is voice.** A console is dense. Don't pad to look "clean",
   that's the AI tell. Hairlines, tight rows, a lot in a small space.
6. **Play money, real feelings.** The site is a joke. Loss states
   should still sting a little.

## Voice & copy

- Second-person, warm, low-key sardonic. "He's done worse." "Probably
  not." "What's your read?"
- Avoid all em-dashes and double-hyphens in prose. Use commas,
  colons, semicolons, periods. The `—` glyph is allowed as a data
  placeholder for "no value yet" in mono cells.
- Reserve UPPER-CASE for mono labels (`VOL`, `LIQ`, `CLOSES`, `T-007`,
  `[ LIVE ]`). Don't shout in prose.
- Status chips use the bracket idiom: `[ LIVE ]`, `[ CLOSED ]`,
  `[ ADMIN ]`, `[ RANK #5 ]`, `[ RESOLVED YES ]`. The brackets are
  part of the type, not UI chrome.
- 404s and error screens keep the Charles-as-character voice
  ("Charles lost it.", "Probably Charles deleted it."). Generic
  mechanic copy stays clean.

## Public profiles

`/profile/<handle>` is the canonical trader page. Same UI for everyone.
Owner-only inline sections (private cash on hand, inline display-name
and handle editors) gate on `me.handle === profile.handle`. The page
shows the user's leaderboard rank (`[ RANK #5 ]`) or `[ UNRANKED ]`
when they have no trades yet. **Never show emails on non-admin
surfaces.**

## Tickets

A ticket has:
- A **subject** (the user it's about — can't trade it)
- A **creator** (the user who published it — can't trade it either)
- A question, optional description, tags, close time, starting Yes
  price, initial liquidity
- Status: `open`, `closed`, `resolved` (with `Yes` / `No`), or
  `cancelled` (positions refunded at avg price)

Anyone signed in publishes a ticket from `/create`. No proposal /
approval flow; admins moderate after the fact (resolve, close, cancel,
delete, edit any field, refund individual trades).

## Admin behavior

Admin is a person, not a role-with-permissions language. The console
uses "ADMIN" everywhere; never "moderator", "operator", "staff".
Notifications: ended-but-unresolved tickets and insider-trading
reports. The admin can edit any field on any ticket including the
subject and creator (override), refund individual trades, adjust any
user's balance, and grant/revoke admin from the user drawer. Admins
get one explicit override: they can create a ticket about themselves
through the admin create dialog (the public `/create` does not allow
this).

## Out of scope, intentionally

- No real money. Don't add language that implies real-money risk.
- No notifications / email; none of that infrastructure exists.
- No "top up" UI for end users. Admins adjust balances via
  `admin.adjustBalance`. There is no faucet beyond the ₪50 daily
  stipend.
- No social-graph features. The friend group IS the social graph;
  we don't recreate it.

## Register field (for `/impeccable`)

```
register: brand-leaning-product
```
