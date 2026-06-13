/**
 * Enhancement entry. The semantic document in index.html stands entirely on its
 * own; everything mounted here is additive. We import nothing that the static
 * site needs to be readable — styles are linked in the head, not here.
 *
 * The base bundle stays light on purpose: reveals are IntersectionObserver, the
 * form/CTA/nav are vanilla. The heavy motion stack (Lenis + GSAP) and the WebGL
 * hero (Three.js) are split into chunks loaded ONLY when they will actually run,
 * so reduced-motion / no-WebGL visitors never pay for them.
 */
import {
  initReveals,
  initHeaderState,
  initScrollCue,
  initYear,
} from './motion/reveals'
import { initCyanButtons } from './ui/cta'
import { initInquiry } from './ui/forms'
import { canRunHero, prefersReducedMotion } from './lib/env'

/** Native in-page anchors for the no-Lenis path — instant jump, keeps focus. */
function initNativeAnchors(): void {
  document.querySelectorAll<HTMLAnchorElement>('a[href^="#"]').forEach((a) => {
    const id = a.getAttribute('href')
    if (!id || id === '#') return
    const target = document.querySelector<HTMLElement>(id)
    if (!target) return
    a.addEventListener('click', (e) => {
      e.preventDefault()
      target.scrollIntoView({ behavior: 'auto', block: 'start' })
      target.setAttribute('tabindex', '-1')
      target.focus({ preventScroll: true })
    })
  })
}

function boot(): void {
  initYear()
  initReveals()
  initHeaderState()
  initScrollCue()
  initCyanButtons()
  initInquiry()

  if (prefersReducedMotion()) {
    initNativeAnchors()
  } else {
    // Lenis smoothing + GSAP load only when motion is welcome.
    import('./motion/lenis')
      .then((m) => {
        const lenis = m.initSmoothScroll()
        m.initAnchors(lenis)
      })
      .catch(() => initNativeAnchors())
  }

  // The WebGL hero (and Three.js) load only when they will actually run.
  if (canRunHero()) {
    import('./hero/hero')
      .then((m) => m.initHero())
      .catch(() => {
        /* keep the static composed hero */
      })
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot)
} else {
  boot()
}
