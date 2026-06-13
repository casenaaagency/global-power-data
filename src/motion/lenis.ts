import Lenis from 'lenis'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { prefersReducedMotion } from '../lib/env'

gsap.registerPlugin(ScrollTrigger)

/**
 * Smoothing only — momentum on top of the user's own scroll. The user always
 * owns pace and distance; we never hijack the wheel or force scroll steps.
 * Under reduced-motion we return null and let native scroll stand; reveals and
 * the hero both have non-Lenis paths.
 */
export function initSmoothScroll(): Lenis | null {
  if (prefersReducedMotion()) return null

  const lenis = new Lenis({
    duration: 1.05,
    // weighted expo-out — momentum that feels like mass coming to rest
    easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
    wheelMultiplier: 1,
    touchMultiplier: 1.35,
    lerp: 0.1,
  })

  // Keep ScrollTrigger in lockstep with Lenis, and drive Lenis from GSAP's
  // ticker so there is a single rAF for the whole page.
  lenis.on('scroll', ScrollTrigger.update)
  gsap.ticker.add((time: number) => lenis.raf(time * 1000))
  gsap.ticker.lagSmoothing(0)

  return lenis
}

/**
 * In-page anchors: smooth via Lenis when available, native otherwise, and
 * always move focus to the destination so keyboard users are not stranded.
 */
export function initAnchors(lenis: Lenis | null): void {
  const headerOffset = -76
  document.querySelectorAll<HTMLAnchorElement>('a[href^="#"]').forEach((a) => {
    const id = a.getAttribute('href')
    if (!id || id === '#') return
    const target = document.querySelector<HTMLElement>(id)
    if (!target) return

    a.addEventListener('click', (e) => {
      e.preventDefault()
      if (lenis) {
        lenis.scrollTo(target, { offset: headerOffset, duration: 1.1 })
      } else {
        target.scrollIntoView({ behavior: 'auto', block: 'start' })
      }
      // Restore focus for accessibility without yanking the scroll position.
      target.setAttribute('tabindex', '-1')
      target.focus({ preventScroll: true })
    })
  })
}
