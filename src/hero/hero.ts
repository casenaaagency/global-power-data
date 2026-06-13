import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { Field, type FieldTier } from './field'
import { Route } from './current'
import { canRunHero, cappedDPR, isLowPower } from '../lib/env'

function pickTier(): FieldTier {
  const mobile = window.matchMedia('(max-width: 860px)').matches
  if (isLowPower())
    return { count: 2000, dpr: 1, sizeCap: 4, glints: false, driftScale: 0.5 }
  if (mobile)
    return { count: 4500, dpr: cappedDPR(1.5), sizeCap: 5, glints: true, driftScale: 0.85 }
  return { count: 14000, dpr: cappedDPR(1.5), sizeCap: 6, glints: true, driftScale: 1 }
}

const REST_HEAD = 0.45 // where the load charge parks the head, inviting scroll

export function initHero(): void {
  const hero = document.querySelector<HTMLElement>('.hero')
  const stage = hero?.querySelector<HTMLElement>('[data-hero-stage]')
  const headline = hero?.querySelector<HTMLElement>('[data-headline]')
  const power = hero?.querySelector<HTMLElement>('[data-power]')
  const subhead = hero?.querySelector<HTMLElement>('[data-subhead]')
  if (!hero || !stage || !headline || !power || !subhead) return
  if (!canRunHero()) return // reduced-motion / no-WebGL → static composition stands

  let field: Field
  let route: Route
  const fieldCanvas = document.createElement('canvas')
  fieldCanvas.className = 'hero__field'
  const behind = document.createElement('canvas')
  behind.className = 'hero__current-behind'
  const front = document.createElement('canvas')
  front.className = 'hero__current-front'

  try {
    field = new Field(fieldCanvas, pickTier())
    route = new Route(behind, front, hero, headline, power, isLowPower())
  } catch {
    return // GL failed at runtime — keep the static hero
  }

  let scrollProgress = 0
  let scrollVel = 0
  let loadHead = 0
  let charged = false
  let restHead = REST_HEAD
  let visible = true
  let lastHead = -1

  const sizeAll = () => {
    const r = hero.getBoundingClientRect()
    field.setSize(r.width, r.height)
    route.resize()
    lastHead = -1 // geometry changed — force a route redraw next frame
    // Park the resting head clearly before POWER, whatever the wrap/font size —
    // threaded through the earlier words but not yet igniting.
    restHead = Math.min(0.55, Math.max(0.12, route.getPowerStart() - 0.05))
  }

  const updateResolve = (ig: number) => {
    hero.style.setProperty('--dim', String(1 - 0.07 * ig))
    power.classList.toggle('is-lit', ig > 0.5)
    subhead.classList.toggle('is-in', ig > 0.6)
  }

  const frame = (tMs: number) => {
    const t = tMs / 1000
    // Two clocks, one head. Before scroll: the load charge drives 0 -> restHead.
    // On scroll: the head advances restHead -> 1, crossing POWER (the resolve).
    const restNow = charged ? restHead : loadHead
    // Scroll spends its travel crossing POWER and settling just past it; the
    // far exit tail stays dormant (it "carries into the page", not traversed).
    const headMax = Math.min(1, route.getPowerStart() + 0.2)
    const scrollTerm = restHead + (headMax - restHead) * scrollProgress
    const head =
      scrollProgress > 0.0001 ? Math.max(restHead, scrollTerm) : restNow
    route.setHead(head)
    // The route only changes when the head moves — skip the redraw (and its
    // stroke/bloom cost) when it's parked, e.g. idle after the load charge.
    if (head !== lastHead) {
      route.draw()
      lastHead = head
    }

    const n = route.headNorm()
    field.setHead(n.x, n.y, 0.75)
    field.setScroll(scrollProgress)
    field.setVelocity(scrollVel)
    field.render(t)

    updateResolve(route.ignitionProgress())
    scrollVel *= 0.92
  }

  // One always-scheduled rAF. The expensive work (WebGL field render + route
  // draw) is skipped entirely when offscreen, so the only residual cost there is
  // an empty callback — negligible, and far more robust than a cancel/restart
  // gate that can wedge paused if the IntersectionObserver never reports
  // intersecting. Backgrounded tabs are paused by the browser regardless.
  const tick = (tMs: number) => {
    requestAnimationFrame(tick)
    if (!visible) return
    frame(tMs)
  }

  const boot = () => {
    // Mount enhancement layers and drop the static composition.
    stage.appendChild(fieldCanvas)
    stage.appendChild(behind)
    hero.appendChild(front)
    sizeAll()
    hero.classList.add('is-enhanced')
    requestAnimationFrame(tick)

    // The route already exists; a charge travels it to the resting head.
    gsap.to(
      { v: 0 },
      {
        v: restHead,
        duration: 1.5,
        ease: 'power2.inOut',
        onUpdate() {
          loadHead = (this.targets()[0] as { v: number }).v
        },
        onComplete() {
          charged = true
        },
      },
    )

    // Scroll-linked threading + resolve — scrubs both ways, user owns pace.
    ScrollTrigger.create({
      trigger: hero,
      start: 'top top',
      end: 'bottom top',
      scrub: true,
      onUpdate: (self) => {
        scrollProgress = self.progress
        scrollVel = Math.max(-1, Math.min(1, self.getVelocity() / 2600))
      },
    })

    // Render only while the hero is on screen.
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting), {
      threshold: 0.05,
    })
    io.observe(hero)

    // Recompute geometry on resize (debounced) and on font load.
    let rT = 0
    window.addEventListener('resize', () => {
      clearTimeout(rT)
      rT = window.setTimeout(() => {
        sizeAll()
        ScrollTrigger.refresh()
      }, 150)
    })
  }

  // Gate on fonts so the weave is computed against final letter rects.
  const ready =
    'fonts' in document ? (document as Document).fonts.ready : Promise.resolve()
  Promise.race([ready, new Promise((r) => setTimeout(r, 2000))]).then(boot)
}
