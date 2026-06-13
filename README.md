# Global Power Data

> The architecture of power.

A cinematic, scroll-driven brand site for Global Power Data (GPD) — financial
architecture for community-scale energy infrastructure. Built to manufacture
gravitas through craft: a near-black "Cold Current" world where light is earned,
a WebGL hero whose single line of current threads the headline and resolves on
**POWER**, and calm, weighted content beneath.

## Run

```bash
npm install
npm run dev      # → http://localhost:5173
npm run build    # type-checks, then bundles to /dist
npm run preview  # serve the production build
```

Node 18+ recommended.

## How it's built — progressive enhancement

The site is a **semantic HTML document that stands entirely on its own**
(`index.html`) — real headings, real copy, fully readable and crawlable with
zero JavaScript. Everything in `/src` is an *enhancement layer* mounted on top.
If JS fails, WebGL is unsupported, or the visitor prefers reduced motion, the
semantic site remains and the hero falls back to a static, composed
composition. This is how the site is both indexable/accessible **and**
cinematic — not one at the cost of the other.

```
index.html              full semantic content + SEO/OG + JSON-LD (the crawlable layer)
src/
  styles/
    tokens.css          §4 "Cold Current" palette, §5 type scale, motion curves
    base.css            reset, type, chrome, hero scaffold, reveal + reduced-motion contract
    sections.css        per-section layout
  lib/env.ts            capability detection (reduced-motion, WebGL, low-power, DPR cap)
  motion/
    lenis.ts            smooth-scroll (momentum only — never scroll-jacking) + anchors
    reveals.ts          IntersectionObserver reveals, number focus-resolve, header, scroll cue
  hero/
    field.ts            the Drifting Field — Three.js Points, one draw call, in-shader drift/fog/dither/glints
    current.ts          the Current ("the route") — Canvas 2D, behind/front weave, additive bloom
    hero.ts             orchestration: load charge, scroll-linked resolve, perf tiers, offscreen pause
  ui/
    cta.ts              the cyan CTA's perimeter circuit
    forms.ts            the contact gate (validation, gating, stubbed submit)
  main.ts               entry — lazy-loads the motion stack and WebGL hero only when they'll run
public/                 favicon.svg, og.png/.svg, robots.txt
```

### Bundle strategy

The critical path for **every** visitor is ~12 kB gzip (HTML + CSS + a 2.6 kB
entry). Lenis + GSAP load only when motion is welcome; Three.js (the largest
dependency) loads only when the WebGL hero will actually run. Reduced-motion /
no-WebGL visitors download none of it.

### The hero, in one paragraph

A single dim filament already exists, threaded through the headline. On load a
charge travels it (it does **not** draw in from an edge — the architecture was
already there; capital activates it). As you scroll, the head advances —
position is always linear in scroll; the tension before ignition lives only in
luminance and width. The line passes *behind* the earlier words (letters
occlude it) and *in front* across **POWER**, which ignites cyan **subtractively**
— everything else dims a hair so POWER lights because the room got darker around
it. The field's glints are *caused*: nearest points catch cyan-soft only in the
wake of the current's head. All of it respects `prefers-reduced-motion` and
pauses when offscreen.

## Accessibility & performance (built in, not bolted on)

- `prefers-reduced-motion`: full static path; nothing disappears, no render loop
  starts, POWER is already cyan, all content visible.
- Keyboard: visible `:focus-visible` ring, skip link, logical order; smooth
  scroll never traps focus.
- Only `transform` / `opacity` are animated in continuous motion; WebGL is
  lazy-init, DPR-capped, paused offscreen, and tiered down on low-power devices.
- Real heading hierarchy, form labels, descriptive `<title>`/meta/OG,
  Organization JSON-LD.

## Handoff — decisions to confirm (§13 of the brief)

These were built on the brief's documented defaults; confirm/replace before
launch:

| # | Decision | Current state | Where to change |
|---|----------|---------------|-----------------|
| 1 | **Motto** | #1 "The architecture of power." (recommended) | hero `<h1>`, `<title>`, JSON-LD `slogan` |
| 2 | **Domain / email** | `globalpowerdata.com` · `contact@globalpowerdata.com` | `index.html` (canonical, OG, footer, mailto), JSON-LD |
| 3 | **Contact backend** | **Stubbed** — UI works, nothing is sent | `src/ui/forms.ts` (submit handler) + form `action` in `index.html` |
| 4 | **Fonts** | Free pairing: Space Grotesk + Inter (Google Fonts) | `index.html` `<link>`, `--font-display`/`--font-body` in `tokens.css`. For production, self-host as subset `woff2`. |

### Confidentiality note

Per §9 of the brief, the site never references or implies any prior confidential
project. "Standing" and "The case for GPD" speak only to capability and regional
familiarity in general terms. Keep it that way.
