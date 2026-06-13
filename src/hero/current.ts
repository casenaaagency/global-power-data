/**
 * The Current — "the route".
 *
 * A single engineered line of light that already exists, dormant, threaded
 * through the headline. A charge travels it (load), then the user's scroll
 * carries the head across POWER, igniting it. The line passes BEHIND the
 * non-POWER words (letters occlude it — depth) and IN FRONT across POWER
 * (it energises from on top). Behind/front is derived from live word rects, so
 * the weave is correct at any wrap or font size.
 *
 * Two Canvas-2D layers (behind the <h1>, in front of it); additive bloom via
 * 'lighter' + three stacked strokes. Position is ALWAYS linear in the driver;
 * the tension before ignite lives only in luminance/width.
 */

interface Pt {
  x: number
  y: number
  d: number // normalized arc-length 0..1
  front: boolean // draw on the front (above type) layer?
}

const DORMANT = 'rgba(31, 58, 79, 0.55)' // --steel-deep, low alpha
const HALO = 'rgba(95, 184, 204, 0.13)' // --cyan-soft wash
const CORE = 'rgba(143, 227, 240, 0.92)' // --cyan
const FILAMENT = 'rgba(236, 234, 228, 0.9)' // --bone near-white

export class Route {
  private bctx: CanvasRenderingContext2D
  private fctx: CanvasRenderingContext2D
  private dpr = 1
  private w = 0
  private h = 0
  private pts: Pt[] = []
  private head = 0
  private em = 64
  private powerStart = 0.62 // normalized dist where POWER begins (recomputed)

  constructor(
    private behind: HTMLCanvasElement,
    private front: HTMLCanvasElement,
    private hero: HTMLElement,
    private headline: HTMLElement,
    private power: HTMLElement,
    private lowPower = false,
  ) {
    this.bctx = behind.getContext('2d')!
    this.fctx = front.getContext('2d')!
  }

  resize(): void {
    const r = this.hero.getBoundingClientRect()
    this.w = r.width
    this.h = r.height
    this.dpr = Math.min(window.devicePixelRatio || 1, 2)
    for (const c of [this.behind, this.front]) {
      c.width = Math.round(this.w * this.dpr)
      c.height = Math.round(this.h * this.dpr)
      c.style.width = `${this.w}px`
      c.style.height = `${this.h}px`
    }
    this.bctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0)
    this.fctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0)
    this.em = parseFloat(getComputedStyle(this.headline).fontSize) || 64
    this.build(r)
  }

  /** Build the polyline (hero-local px) and classify behind/front per word rects. */
  private build(heroRect: DOMRect): void {
    const hRect = this.headline.getBoundingClientRect()
    const pRect = this.power.getBoundingClientRect()
    const ox = heroRect.left
    const oy = heroRect.top
    // local helper
    const L = (r: DOMRect) => ({
      left: r.left - ox,
      right: r.right - ox,
      top: r.top - oy,
      cx: r.left - ox + r.width / 2,
      cy: r.top - oy + r.height / 2,
    })
    const H = L(hRect)
    const P = L(pRect)

    const bleed = 80
    const cf = Math.min(this.w, this.h) * 0.05 // 45° chamfer size
    const runY = P.cy // thread along POWER's line
    const drop = Math.max(60, this.em * 0.9)

    // Control polyline: enter low-left, step up to the run, long horizontal
    // through the words, one committing diagonal onto POWER, across it, exit.
    const ctrl: Array<[number, number]> = [
      [-bleed, runY + drop],
      [H.left * 0.5, runY + drop],
      [H.left * 0.5 + cf, runY],
      [P.left - cf, runY],
      [P.left + Math.min(cf, P.left * 0.1), P.cy],
      [P.right + this.em * 0.4, P.cy],
      [P.right + this.em * 0.4 + cf, P.cy + cf],
      [this.w + bleed, P.cy + cf + drop * 0.3],
    ]

    // Resample to fixed-density segments, tag each by behind/front.
    const behindRects = Array.from(
      this.headline.querySelectorAll<HTMLElement>('.word'),
    )
      .filter((el) => !el.hasAttribute('data-power'))
      .map((el) => {
        const r = el.getBoundingClientRect()
        const pad = this.em * 0.12
        return {
          l: r.left - ox - pad,
          r: r.right - ox + pad,
          t: r.top - oy - pad,
          b: r.bottom - oy + pad,
        }
      })

    const segs: Pt[] = []
    let acc = 0
    const lens: number[] = []
    for (let i = 0; i < ctrl.length - 1; i++) {
      const dx = ctrl[i + 1][0] - ctrl[i][0]
      const dy = ctrl[i + 1][1] - ctrl[i][1]
      const len = Math.hypot(dx, dy)
      lens.push(len)
      acc += len
    }
    const total = acc
    const step = 4 // px per sample
    let dist = 0
    for (let i = 0; i < ctrl.length - 1; i++) {
      const [x0, y0] = ctrl[i]
      const [x1, y1] = ctrl[i + 1]
      const n = Math.max(1, Math.round(lens[i] / step))
      for (let j = 0; j < n; j++) {
        const t = j / n
        const x = x0 + (x1 - x0) * t
        const y = y0 + (y1 - y0) * t
        const inBehind = behindRects.some(
          (rr) => x >= rr.l && x <= rr.r && y >= rr.t && y <= rr.b,
        )
        segs.push({ x, y, d: dist / total, front: !inBehind })
        dist += lens[i] / n
      }
    }
    segs.push({ x: ctrl[ctrl.length - 1][0], y: ctrl[ctrl.length - 1][1], d: 1, front: true })
    this.pts = segs

    // POWER region start (normalized) for the tension/ignite mapping.
    const near = segs.find((p) => p.x >= P.left - cf) ?? segs[segs.length - 1]
    this.powerStart = near.d
  }

  setHead(head: number): void {
    this.head = Math.max(0, Math.min(1, head))
  }

  /** Normalized arc-length where POWER begins — used to park the resting head. */
  getPowerStart(): number {
    return this.powerStart
  }

  /** normalized POWER-crossing progress 0..1 — drives ignite/subtractive dim */
  ignitionProgress(): number {
    const pEnd = Math.min(1, this.powerStart + 0.16)
    if (this.head <= this.powerStart) return 0
    return Math.min(1, (this.head - this.powerStart) / (pEnd - this.powerStart))
  }

  /** Head position in viewport-normalized coords for the field glint. */
  headNorm(): { x: number; y: number } {
    const p = this.pointAt(this.head)
    const r = this.hero.getBoundingClientRect()
    return {
      x: (r.left + p.x) / window.innerWidth,
      y: (r.top + p.y) / window.innerHeight,
    }
  }

  private pointAt(d: number): { x: number; y: number } {
    if (!this.pts.length) return { x: 0, y: 0 }
    let prev = this.pts[0]
    for (const p of this.pts) {
      if (p.d >= d) {
        const span = p.d - prev.d || 1
        const t = (d - prev.d) / span
        return { x: prev.x + (p.x - prev.x) * t, y: prev.y + (p.y - prev.y) * t }
      }
      prev = p
    }
    return { x: prev.x, y: prev.y }
  }

  draw(): void {
    const { bctx, fctx, w, h } = this
    bctx.clearRect(0, 0, w, h)
    fctx.clearRect(0, 0, w, h)
    if (!this.pts.length) return

    // 1) dormant filament — the whole route, always present, barely there
    bctx.globalCompositeOperation = 'source-over'
    bctx.strokeStyle = DORMANT
    bctx.lineWidth = Math.max(1, this.em * 0.012)
    bctx.lineJoin = 'round'
    bctx.lineCap = 'round'
    this.tracePath(bctx, 0, 1, false)

    // 2) energised portion up to the head — tension lives in width/luminance
    const tension = smooth(this.powerStart - 0.08, this.powerStart + 0.02, this.head)
    const haloW = Math.max(6, this.em * 0.16) * (1 - 0.15 * tension)
    const coreW = Math.max(1.6, this.em * 0.03) * (1 - 0.32 * tension)
    const filW = Math.max(0.7, this.em * 0.012)
    const lum = 0.9 + 0.1 * tension
    // shadowBlur is the most expensive per-frame op on weak GPUs. Cap it on
    // capable devices and drop it entirely on low-power — the additive
    // ('lighter') stroke stack still reads as a glow without the blur kernel.
    const haloBlur = this.lowPower ? 0 : Math.min(haloW * 1.4, 7)
    const coreBlur = this.lowPower ? 0 : Math.min(coreW * 2.2, 4)

    for (const ctx of [bctx, fctx]) {
      ctx.globalCompositeOperation = 'lighter'
      ctx.lineJoin = 'round'
      ctx.lineCap = 'round'
      const front = ctx === fctx
      // halo
      ctx.strokeStyle = HALO
      ctx.lineWidth = haloW
      ctx.shadowBlur = haloBlur
      ctx.shadowColor = HALO
      this.tracePath(ctx, 0, this.head, front)
      // core
      ctx.strokeStyle = withAlpha(CORE, lum)
      ctx.lineWidth = coreW
      ctx.shadowBlur = coreBlur
      ctx.shadowColor = CORE
      this.tracePath(ctx, 0, this.head, front)
      // filament
      ctx.shadowBlur = 0
      ctx.strokeStyle = withAlpha(FILAMENT, lum)
      ctx.lineWidth = filW
      this.tracePath(ctx, 0, this.head, front)
      ctx.globalCompositeOperation = 'source-over'
    }

    // 3) the travelling tip node (radial), drawn on the head's own layer
    const tip = this.pointAt(this.head)
    const onFront = (this.pts.find((p) => p.d >= this.head) ?? this.pts[0]).front
    const tctx = onFront ? fctx : bctx
    const rad = Math.max(8, this.em * 0.14)
    const g = tctx.createRadialGradient(tip.x, tip.y, 0, tip.x, tip.y, rad)
    g.addColorStop(0, 'rgba(236,234,228,0.95)')
    g.addColorStop(0.3, 'rgba(143,227,240,0.7)')
    g.addColorStop(1, 'rgba(143,227,240,0)')
    tctx.globalCompositeOperation = 'lighter'
    tctx.fillStyle = g
    tctx.beginPath()
    tctx.arc(tip.x, tip.y, rad, 0, Math.PI * 2)
    tctx.fill()
    tctx.globalCompositeOperation = 'source-over'
  }

  /** Stroke contiguous runs whose layer matches `front`, between dist a..b. */
  private tracePath(
    ctx: CanvasRenderingContext2D,
    a: number,
    b: number,
    front: boolean,
  ): void {
    let drawing = false
    for (const p of this.pts) {
      if (p.d > b) break
      if (p.d < a) continue
      const match = front ? p.front : !p.front
      if (match) {
        if (!drawing) {
          ctx.beginPath()
          ctx.moveTo(p.x, p.y)
          drawing = true
        } else {
          ctx.lineTo(p.x, p.y)
        }
      } else if (drawing) {
        ctx.lineTo(p.x, p.y)
        ctx.stroke()
        drawing = false
      }
    }
    if (drawing) ctx.stroke()
  }
}

function smooth(a: number, b: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a || 1)))
  return t * t * (3 - 2 * t)
}

function withAlpha(rgba: string, mul: number): string {
  return rgba.replace(/,\s*([\d.]+)\)$/, (_, al) => `, ${(+al * mul).toFixed(3)})`)
}
