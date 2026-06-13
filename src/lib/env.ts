/* Capability detection — decides how far we enhance.
   The semantic + static layer always stands on its own; everything here is
   strictly additive and degrades down, never up. */

export const prefersReducedMotion = (): boolean =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

export const isTouch = (): boolean =>
  window.matchMedia('(hover: none), (pointer: coarse)').matches

/** Crude but reliable low-power signal: few cores, little RAM, or save-data. */
export const isLowPower = (): boolean => {
  const nav = navigator as Navigator & {
    deviceMemory?: number
    connection?: { saveData?: boolean }
  }
  const cores = navigator.hardwareConcurrency ?? 8
  const mem = nav.deviceMemory ?? 8
  const saveData = nav.connection?.saveData ?? false
  return saveData || cores <= 4 || mem <= 4
}

let webglMemo: boolean | null = null
/** One-time, cached WebGL availability probe. */
export const supportsWebGL = (): boolean => {
  if (webglMemo !== null) return webglMemo
  try {
    const c = document.createElement('canvas')
    const gl =
      c.getContext('webgl2') ||
      c.getContext('webgl') ||
      c.getContext('experimental-webgl')
    webglMemo = !!gl
  } catch {
    webglMemo = false
  }
  return webglMemo
}

/** Device pixel ratio, capped so we never pay for retina overdraw on the field. */
export const cappedDPR = (max = 1.75): number =>
  Math.min(window.devicePixelRatio || 1, max)

/** The single gate the WebGL hero checks before mounting. */
export const canRunHero = (): boolean =>
  supportsWebGL() && !prefersReducedMotion()
