# CHARLES.MARKET — Design System

> "The Console" — a near-future trading desk built for one chaotic friend.

This file documents the design language. It is the contract every new surface answers to. If a screen could appear on Polymarket, Robinhood, or the default shadcn starter without changes, it has drifted away from this system.

---

## 1. The world

Imagine the design as a physical object. CHARLES.MARKET is a **2030 sports book console** — a single panel of instruments on a black anodized desk in a low-light room. The friend group runs Charles like a portfolio. Numbers tick. Lines pulse. One chemical-lime light glows on the bezel. The whole thing has the cold confidence of a Bloomberg terminal but the cheek of a group chat.

Every choice that follows is in service of that scene.

- **Ink, not slate.** Backgrounds are deep ink with a faint cool undertone. Never pure black, never SaaS slate-blue.
- **One lit color.** A single chemical lime carries the brand, the Yes outcome, every CTA, and the live pulse. No second accent. No gradients. No glow blur.
- **Mono is structural.** Numerals, ratios, timestamps, ticket IDs — all mono, all tabular. The mono is part of the chassis.
- **Hairlines, not shadows.** Surfaces are separated by 1px rules in `--rule`. No drop shadows. No glass blur. No frosted anything.

---

## 2. Color

**Strategy: Committed — single-accent on dark.** One color (`--brand`, chemical lime) carries every emphasis. The No outcome is rendered as `--magenta`, a hot pink-red used only on No, only on loss states. Everything else is ink and bone.

All tokens are OKLCH. Neutrals carry a faint cool undertone (hue 225) so the whole palette holds together; the brand lime sits at hue 130 with high chroma.

### Dark ("Console") — default

| Token | OKLCH | Use |
|---|---|---|
| `--ink` | `oklch(0.13 0.014 232)` | Page background |
| `--ink-2` | `oklch(0.17 0.016 228)` | Card / surface |
| `--ink-3` | `oklch(0.22 0.018 225)` | Inset, sticky bottom CTA |
| `--ink-4` | `oklch(0.28 0.018 225)` | Heavier inset, hover |
| `--bone` | `oklch(0.96 0.006 225)` | Primary text |
| `--bone-2` | `oklch(0.78 0.008 225)` | Secondary text |
| `--bone-3` | `oklch(0.56 0.01 225)` | Tertiary, labels |
| `--rule` | `oklch(0.26 0.014 225)` | Hairline borders |
| `--rule-bright` | `oklch(0.40 0.018 225)` | Section rules, hovered borders |
| `--brand` | `oklch(0.88 0.22 130)` | Chemical lime — the only accent |
| `--brand-deep` | `oklch(0.74 0.22 130)` | Pressed / hover |
| `--brand-wash` | `oklch(0.22 0.08 130)` | Subtle background tint |
| `--magenta` | `oklch(0.68 0.26 8)` | No outcome, loss, sell |
| `--magenta-wash` | `oklch(0.22 0.10 8)` | No surface tint |

### Light ("Daylight") — alt theme

A clean instrument-panel light theme. Same lime, deeper for legibility on bone.

| Token | OKLCH | Use |
|---|---|---|
| `--ink` | `oklch(0.97 0.004 225)` | Page background (bone) |
| `--ink-2` | `oklch(0.94 0.006 225)` | Card / surface |
| `--ink-3` | `oklch(0.90 0.008 225)` | Inset |
| `--ink-4` | `oklch(0.86 0.010 225)` | Heavier inset |
| `--bone` | `oklch(0.16 0.014 232)` | Primary text (now ink) |
| `--bone-2` | `oklch(0.40 0.014 225)` | Secondary text |
| `--bone-3` | `oklch(0.55 0.012 225)` | Tertiary, labels |
| `--rule` | `oklch(0.85 0.012 225)` | Hairline borders |
| `--rule-bright` | `oklch(0.70 0.014 225)` | Section rules |
| `--brand` | `oklch(0.66 0.20 132)` | Chemical lime, deeper for AA on bone |
| `--brand-deep` | `oklch(0.55 0.20 132)` | Pressed / hover |
| `--brand-wash` | `oklch(0.94 0.08 132)` | Subtle background tint |
| `--magenta` | `oklch(0.55 0.25 8)` | No outcome |
| `--magenta-wash` | `oklch(0.94 0.06 8)` | No surface tint |

### Banned colors

- `#fff`, `#000` — pure white/black breaks the instrument-panel metaphor.
- NVIDIA green (`#76b900`) — the previous primary; never return to it.
- Cyan blue + dark navy — the AI-reflex "futuristic" palette. The lime is doing the work.
- Any gradient between two brand colors. The brand is ONE color.

---

## 3. Typography

**Two families. No others.**

### Funnel Display + Funnel Sans (display + body)

[Google Fonts](https://fonts.google.com/specimen/Funnel+Display). Funnel is a Vlad Zinger geometric family with two faces — Display (chunky) and Sans (text). It reads as confident and a little subversive; not on any AI-default reject list.

- Body: Funnel Sans, weight 400, leading 1.5, tracking 0.
- UI labels: Funnel Sans, weight 600, all-caps, tracking 0.10em, size 0.72rem.
- Section headers: Funnel Display, weight 700, tracking -0.02em.
- Tabloid headlines: Funnel Display, weight 800, tracking -0.04em, line-height 0.96.
- Wordmark: Funnel Display, weight 800, tracking -0.05em, set in one row.

### JetBrains Mono (numerals + instrument)

[Google Fonts](https://fonts.google.com/specimen/JetBrains+Mono). Weights 500, 700.

Use exclusively for:
- Money (`₪78`, `₪1,200`)
- Odds, ratios, percentages
- Ticket IDs (`M-007`)
- Timestamps (`THU 21:00`)
- Trade tape rows
- Tab labels (`YES / NO / VOL / LIQ`)
- Status chips (`[ LIVE ]`, `[ CLOSED ]`)

`font-variant-numeric: tabular-nums` is on by default.

### Banned families

Inter, IBM Plex (any), Space Mono, Space Grotesk, Outfit, DM Sans, DM Serif, Fraunces, Cormorant, Playfair, Instrument Sans/Serif, Geist (becoming the new SaaS-cliché default). Orbitron, Eurostile, and any "futuristic" reflex font.

### Scale (fluid)

| Step | Token / class | Use |
|---|---|---|
| Display XL | `clamp(3rem, 6vw + 1rem, 5.5rem)` | Tabloid hero on home |
| Display L | `clamp(2.25rem, 3.5vw + 0.5rem, 3.5rem)` | Ticket detail question |
| Display M | `clamp(1.6rem, 1.6vw + 0.6rem, 2.1rem)` | Section heads |
| Display S | `clamp(1.2rem, 0.8vw + 0.7rem, 1.4rem)` | Ticket question |
| Body | `1rem` | Default |
| Label | `0.72rem` | UPPER-CASE mono labels |
| Mono XL | `2.5rem` | Hero outcome price |
| Mono L | `1.5rem` | Stamp prices on tickets |
| Mono | `0.875rem` | Inline figures, tape |

---

## 4. Layout

### Grid

12-column max-width `1280px` with `clamp(16px, 4vw, 40px)` outer margins. Pages lean toward dense, single-column instrument-panel layouts: a tall asymmetric sidebar isn't the move — instead, sections stack with high information density inside each one.

### Spacing rhythm

`--space-xs: 4px`, `--space-sm: 8px`, `--space: 12px`, `--space-md: 16px`, `--space-lg: 24px`, `--space-xl: 40px`, `--space-2xl: 80px`. Pad tight; the console is dense by design.

### Rules

Hairlines (1px, `--rule`) separate sections and rows. Never use a heavier border for emphasis; use type weight or the brand accent instead. The chassis is hairlines all the way down.

### Background

Solid `--ink`. No texture. No noise. No grid background. The interface is a sealed black panel. (The old "ledger paper" texture from v1 is gone.)

### Corners

`--radius-sm: 2px`, `--radius: 4px`, `--radius-lg: 6px`. Sharp. The previous 10–12px pillows are exactly the SaaS-default tell we are leaving behind.

### Shadows

Banned, with one exception: a 1px inset highlight on the top edge of CTAs (`inset 0 1px 0 var(--rule-bright)`) — like light catching a metal bezel.

### Glow

Banned. No `box-shadow: 0 0 24px var(--brand)`. The brand color carries itself through chroma, not bloom.

---

## 5. Signature motifs

These are the moves that make CHARLES.MARKET *look like CHARLES.MARKET*. Use them, don't generalize them away.

1. **The console wordmark.** `CHARLES.MARKET` set in Funnel Display 800 with a `[ LIVE ]` lime bracket-chip next to it. The dot in the middle is rendered in `--brand`.
2. **Bracket chips.** Status badges use `[ LABEL ]` square brackets in mono — `[ LIVE ]`, `[ CLOSED ]`, `[ RESOLVED YES ]`. The brackets are part of the type, not a UI element.
3. **Numbered tickets.** Every ticket gets a `M-007` style ID prefix (left-padded zeros). Reads as a stock ticker / trade ID.
4. **Hand-stamped price slabs.** Yes/No display as bordered ink slabs: top-line UPPER-CASE mono label, bottom-line big mono price. Lime on Yes when active, magenta on No when active.
5. **Hairline ledger rows.** Ticket lists are 1px-separated rows with tabular numerals. No cards.
6. **Tabloid headlines.** Section headers are oversized Display with a `// SECTION` mono kicker above. The `//` is a literal character used as a marker.
7. **Mini sparklines.** Every ticket in a list shows a 24-point mono sparkline (just `<path>` strokes, no fill, lime if up, magenta if down). Animates `stroke-dashoffset` once on first paint.
8. **Sticky mobile buy bar.** On `/ticket/$id` below `lg`, a sticky-bottom strip hosts full-width lime Yes / magenta No buttons that open the same `QuickBuyDialog` used by the ticket grid.
9. **Bell badge.** Admin sidebar surfaces pending proposals as a lime `[N]` badge next to "Tickets"; `/admin/tickets` carries the same count on its header bell. Click the bell to open a sheet split into "Proposals · awaiting review" and "Tickets · awaiting resolution" with inline approve / reject / resolve actions.

---

## 6. Component recipes

### Button

- `default` → lime fill (`--brand`) on ink-2 page, ink-text-on-lime via `--brand-foreground`. Bone outline `inset 0 1px 0 var(--rule-bright)` on top edge. Mono uppercase, weight 700, sharp 4px corners.
- `outline` → transparent with 1px `--rule` border, bone text. Hover sets `--rule-bright`.
- `ghost` → no border, bone-2 text, ink-3 hover.
- `yes` / `no` → solid `--brand` / `--magenta`, ink text.
- `yes-soft` / `no-soft` → `--brand-wash` / `--magenta-wash` background with matching brand/magenta text.
- `link` → underlined inline, brand text, hover brand-deep.

Body buttons default to mono uppercase. Long-form actions like "Post comment" override with sans by passing className.

### Badge

- `default` → lime fill, ink text, sharp 2px corners.
- `outline` → 1px `--rule`, bone-2 text.
- `bracket` → renders `[ LABEL ]` literal-bracket style, mono, lime text on no background.
- `yes` / `no` → outcome wash with outcome text.

### Card

Cards are rare. When used, they are `--ink-2` with a 1px `--rule` border, no shadow, sharp 4px corners. Most "card-like" surfaces are actually `<article>` blocks separated by hairline rules.

### MarketCard

A horizontal trade-ticket layout, dense:

```
┌──────────────────────────────────────────────────────────────────────────┐
│ M-007 · ANTICS                            CLOSES THU 21:00      ▲ +6%    │
│                                                                           │
│ Will Charles show up more than 30 minutes late on Friday?      ────────╮ │
│                                                                ── sparkline │
│ ┌────────────┐  ┌────────────┐                  VOL ₪12.4k · LIQ ₪4.8k    │
│ │ YES   ₪78  │  │ NO    ₪22  │                                            │
│ └────────────┘  └────────────┘                                            │
└──────────────────────────────────────────────────────────────────────────┘
```

Three variants in `src/components/market-card.tsx`:

- `default` (tile) — the shape above. Used on the home grid and the ticket index.
- `featured` — doubles in size, uses Display L for the question, fits a 140px-tall sparkline. Used as the home "big ticket" hero.
- `compact` — single-line `M-### · question · sparkline · ₪yes / ₪no` row. Reserved for dense lists when a route needs to show many tickets at once.

`MarketCard` also opens `QuickBuyDialog` (exported from the same file) when a price slab is tapped.

### Order ticket (ticket detail sidebar)

Mono header `ORDER · M-007`, Yes/No slab selectors, amount field with the ₪ glyph as a mono prefix, single lime stamp button at the bottom. On `lg` it sticks at `top-20`; below `lg` it's hidden and replaced by a sticky bottom buy bar that opens `QuickBuyDialog`.

### NotificationsSheet (admin)

Right-side sheet on `/admin/tickets`. Bell badge counts pending proposals + ended tickets. Sheet body is two sections (`PROPOSALS · AWAITING REVIEW`, `TICKETS · AWAITING RESOLUTION`). Each row is a `border border-rule bg-ink-2` card with inline approve / reject / resolve buttons + an "Open" / "Edit" ghost that routes to the per-ticket drawer. Empty state is a single `ALL CLEAR` panel — no per-section emptiness when nothing's pending.

---

## 7. Motion

Minimal and instrument-grade. No bounces, no spring, no `transition: all`.

- Hover on tickets: 80ms `--ink-3 → --ink-4` background change and `--rule → --rule-bright` border. No translation.
- Stamp buttons on click: 100ms scale to 0.98, then snap back.
- Brand pulse on `[ LIVE ]`: 1.4s alternate ease-in-out opacity 1 → 0.55 → 1. No glow, just alpha.
- Sparklines and chart paths animate `stroke-dashoffset` on first render only, 600ms `cubic-bezier(0.2, 0.8, 0.2, 1)`.
- `prefers-reduced-motion`: kills scale, pulse, and stroke-dashoffset.

---

## 8. Iconography

Use **lucide-react** at default stroke 1.75. Icons sit inline with mono labels at the same optical weight. Prefer Unicode glyphs for arrows (`▲ ▼`) over icon components — they tabulate better with mono numerals.

Permitted icon roles:
- nav (`Store`, `Activity`, `Trophy`, `Wallet`)
- action (`Plus`, `Search`, `LogIn`, `LogOut`)

Forbidden: any "sparkle" icons, glowing icons, custom gradient SVGs, emoji.

---

## 9. Imagery

CHARLES.MARKET is text-first. There is no Charles photograph; the brand is the typography and the lime. **Don't generate fake Charles avatars, don't add stock photos of dudes, don't add hand-drawn illustrations.** When a market needs a visual, render a small mono category code (`[ANT]`, `[MIS]`) in `--brand` instead.

---

## 10. Accessibility

- Bone-on-ink hits AAA. Bone-2-on-ink is AA at body, AAA at large.
- Brand lime on ink hits AA at 14px+. Use lime *text* only above 14px; for smaller labels use bone-2.
- Focus rings: a 2px `--brand` outline at 2px offset on every interactive element.
- All mono prices include `aria-label` with the long-form value (`aria-label="78 percent yes"` on `₪78`).
- `prefers-reduced-motion` honored as above.

---

## 11. Anti-patterns (we already failed these once)

- Drop shadows on cards. Use rules.
- Pillowy 10–12px corners. Use ≤6px.
- Gradient text. Banned everywhere.
- NVIDIA green primary. Banned forever.
- Inter as a font. Banned.
- A "Live ●" pulsing dot. `[ LIVE ]` bracket chip only.
- Sentence-case "Yes price · history" tab labels with a middot. Use `YES PRICE / HISTORY` in mono.
- A SaaS-style centered hero with `<icon> <title> <subtitle>` over a soft gradient. Tabloid hero only.
- Cyan + navy + glass cards — the AI-reflex "futuristic" palette. The lime carries the future on its own.
- Auto-scrolling marquees / live tickers. We don't ship them.
- Emails or "display names" on non-admin surfaces. Handles only.
- Em dashes (`—`) and double-hyphens (`--`) in user copy. Commas, colons, periods.

---

## 12. Open questions for future iterations

- A weekly "session" mechanic where the wordmark rotates a session number every Monday.
- A real chart engine (currently SVG `<path>` only).
- An ambient sound mark for trades, a single mechanical "click" tone.
- The trade tape ribbon (originally planned, deferred — would live above the footer on `lg` only).
