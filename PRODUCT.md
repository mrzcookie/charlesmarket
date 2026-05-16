# Charlesmarket — Product Context

> One chaotic friend. A trading floor in his name.

## What it is

A play-money prediction market about **a real person named Charles**. Not "users." Not "markets." Charles. The whole site is an inside joke that the friend group runs like a neighborhood bookie's operation: every dumb thing Charles is *probably* about to do becomes a tradable contract priced in shekels (₪).

The product reads as personal, irreverent, and a little chaotic — because the subject is. It is the opposite of Polymarket, Kalshi, and every Robinhood-clone fintech app the model has seen.

## Users

Three audiences, in order of weight:

1. **Charles's friends** — they propose markets, trade them, and roast him in the comments. They visit weekly, in clusters, after something Charles did.
2. **Friends-of-friends** — they hear about a particularly stupid Charles incident, get a link, sign in to bet, and stay.
3. **Charles himself** — visits to grimace at his own hit-rate. Should not feel personally attacked, just affectionately roasted.

State of mind on arrival: amused. They are not here to manage a portfolio. They are here for the gossip column with a buy button.

## Register

**Brand-leaning product.** The trading UI is functional product surface, but the brand IS the product. A flat, neutral, Stripe-clean redesign would erase the only thing that makes this site interesting. Voice carries through every surface, even the order ticket.

## Anti-references

- **Polymarket.** Purple-glass fintech. Charlesmarket is not a market for global news, it's a market for one guy.
- **Robinhood / Kalshi.** Clean, institutional, big-app. Charlesmarket is small, irreverent, console-grade.
- **The default shadcn template.** NVIDIA-green primary, Inter sans, rounded cards, soft shadows. The previous version of this site was exactly that, and that is what we are leaving behind.
- **Editorial-magazine pastiche.** Cream paper + italic serif + uppercase tracked labels. Currently a saturated AI aesthetic; if Charlesmarket lands there, it failed.
- **Generic crypto neon / "futuristic" reflex.** No glowing gradients, no glassmorphism, no cyan-on-navy, no Orbitron headlines. The future is not a glow.

## Strategic principles

1. **Charles is a character.** Reference him by name in copy. "Will Charles…" not "Will the subject…". Personality > neutrality, every time.
2. **Shekels are central.** ₪ is the brand. Never use $. Always render whole shekels (no decimals).
3. **Markets are tickets, not cards.** Each market is a numbered console row (`M-007`), not a SaaS card.
4. **Density is voice.** A console is dense. Don't pad to look "clean" — that's the AI tell. Hairlines, tight rows, a lot in a small space.
5. **Play money, real feelings.** The site is a joke. Loss states should still sting a little.

## Voice & copy

- Second-person, warm, low-key sardonic. "He's done worse." "Probably not." "You sure?"
- Avoid all em-dashes and double-hyphens. Use commas, colons, periods.
- Never use UPPER_CASE labels just to fill space; use them only for ledger labels (NO., CLOSES, VOL, LIQ).
- Time references are concrete: `CLOSES THU 21:00`, not "in 2 days."

## Out of scope, intentionally

- No real money. Don't add language that implies real-money risk.
- No notifications/email — none of that infrastructure exists.
- No "top up" UI. Wallets reset on sign-in once; there is no faucet.
- No social-graph features. The friend group IS the social graph; we don't recreate it.

## Register field (for `/impeccable`)

```
register: brand-leaning-product
```
