/**
 * The cyan CTA is the current's terminus: on hover a single point of light
 * travels once around the perimeter (the current completing a circuit around
 * the action), then the fill arrives. The animation is CSS; here we only inject
 * the perimeter trace. Non-scaling stroke keeps it even at any button size.
 */
const NS = 'http://www.w3.org/2000/svg'

export function initCyanButtons(): void {
  document.querySelectorAll<HTMLElement>('.btn--cyan').forEach((btn) => {
    if (btn.querySelector('.btn__circuit')) return
    const svg = document.createElementNS(NS, 'svg')
    svg.setAttribute('class', 'btn__circuit')
    svg.setAttribute('viewBox', '0 0 100 100')
    svg.setAttribute('preserveAspectRatio', 'none')
    svg.setAttribute('aria-hidden', 'true')

    const rect = document.createElementNS(NS, 'rect')
    rect.setAttribute('class', 'btn__circuit-rect')
    rect.setAttribute('x', '0.7')
    rect.setAttribute('y', '0.7')
    rect.setAttribute('width', '98.6')
    rect.setAttribute('height', '98.6')
    rect.setAttribute('rx', '1.2')
    rect.setAttribute('pathLength', '1000')
    rect.setAttribute('vector-effect', 'non-scaling-stroke')

    svg.appendChild(rect)
    btn.appendChild(svg)
  })
}
