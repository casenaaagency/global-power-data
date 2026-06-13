import { prefersReducedMotion } from '../lib/env'

/**
 * Scroll-triggered reveals (§6): fire once on enter, then settle. Calm
 * fade + translate handled by CSS; we only toggle .is-visible and stagger
 * grouped elements via transition-delay. Reveals never un-reveal on scroll up.
 */
export function initReveals(): void {
  const reveals = Array.from(
    document.querySelectorAll<HTMLElement>('[data-reveal]'),
  )

  if (prefersReducedMotion()) {
    reveals.forEach((el) => el.classList.add('is-visible'))
    revealAllNumbers()
    return
  }

  // Stagger within explicit groups — weighted, 75ms apart, capped.
  document
    .querySelectorAll<HTMLElement>('[data-reveal-group]')
    .forEach((group) => {
      group
        .querySelectorAll<HTMLElement>('[data-reveal]')
        .forEach((el, i) => {
          el.style.transitionDelay = `${Math.min(i * 0.075, 0.45)}s`
        })
    })

  const io = new IntersectionObserver(
    (entries, obs) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue
        entry.target.classList.add('is-visible')
        obs.unobserve(entry.target)
      }
    },
    { rootMargin: '0px 0px -12% 0px', threshold: 0.12 },
  )
  reveals.forEach((el) => io.observe(el))

  initNumberResolve()
}

/**
 * Numbers RESOLVE, they do not count up — for a finance-literate reader a
 * count-up reads as carnival. Digits arrive already at value, then sharpen
 * from a soft blur into focus (handled in CSS via .is-resolved).
 */
function initNumberResolve(): void {
  const nums = document.querySelectorAll<HTMLElement>('[data-count-to]')
  if (!nums.length) return
  const io = new IntersectionObserver(
    (entries, obs) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue
        entry.target.classList.add('is-resolved')
        obs.unobserve(entry.target)
      }
    },
    { rootMargin: '0px 0px -15% 0px', threshold: 0.6 },
  )
  nums.forEach((el) => io.observe(el))
}

function revealAllNumbers(): void {
  document
    .querySelectorAll<HTMLElement>('[data-count-to]')
    .forEach((el) => el.classList.add('is-resolved'))
}

/** Header contracts to GPD once past the hero; reversible. */
export function initHeaderState(): void {
  const header = document.querySelector<HTMLElement>('[data-header]')
  if (!header) return
  let ticking = false
  const update = () => {
    header.classList.toggle('is-scrolled', window.scrollY > 48)
    ticking = false
  }
  update()
  window.addEventListener(
    'scroll',
    () => {
      if (ticking) return
      ticking = true
      requestAnimationFrame(update)
    },
    { passive: true },
  )
}

/** Scroll cue retracts the instant its job is done (first real scroll). */
export function initScrollCue(): void {
  const cue = document.querySelector<HTMLElement>('[data-scroll-cue]')
  if (!cue) return
  const retract = () => cue.classList.add('is-retracted')
  window.addEventListener(
    'scroll',
    () => {
      if (window.scrollY > 1) retract()
    },
    { passive: true, once: true },
  )
}

/** Stamp the current year in the footer. */
export function initYear(): void {
  const el = document.querySelector<HTMLElement>('[data-year]')
  if (el) el.textContent = String(new Date().getFullYear())
}
