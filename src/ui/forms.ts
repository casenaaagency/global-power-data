/**
 * The contact gate. Quiet, exclusive. The submit stays gated (dimmed,
 * aria-disabled, and announced) until the required fields are valid — the door
 * opens when you're ready to walk through it, not before. Submission is stubbed
 * until the client's endpoint is confirmed (§13); we acknowledge personally.
 */
export function initInquiry(): void {
  const form = document.querySelector<HTMLFormElement>('[data-inquiry]')
  if (!form) return
  const submit = form.querySelector<HTMLButtonElement>('button[type="submit"]')
  const status = form.querySelector<HTMLElement>('[data-inquiry-status]')
  const required = Array.from(
    form.querySelectorAll<HTMLInputElement>('[required]'),
  )
  if (!submit) return

  let wasValid: boolean | null = null

  const setStatus = (text: string, state: '' | 'ok' | 'error') => {
    if (!status) return
    status.textContent = text
    status.dataset.state = state
  }

  const refreshGate = () => {
    const ok = form.checkValidity()
    // Visual-only gate — the button is never set `disabled`/`aria-disabled`, so
    // keyboard and pointer users can always submit and get validation feedback.
    submit.classList.toggle('is-gated', !ok)
    if (ok && wasValid === false) setStatus('Ready to send.', 'ok')
    if (!ok && wasValid === true) setStatus('', '')
    wasValid = ok
  }

  // Clear an invalid mark as soon as the field is touched again.
  form.addEventListener('input', (e) => {
    ;(e.target as HTMLElement).removeAttribute('aria-invalid')
    refreshGate()
  })

  form.addEventListener('submit', (e) => {
    e.preventDefault()
    if (!form.checkValidity()) {
      const firstInvalid = required.find((el) => !el.checkValidity())
      required.forEach((el) =>
        el.checkValidity()
          ? el.removeAttribute('aria-invalid')
          : el.setAttribute('aria-invalid', 'true'),
      )
      firstInvalid?.focus()
      setStatus('Please complete the required fields.', 'error')
      wasValid = null // force a clean recompute so the error clears correctly
      return
    }
    // Stub — no backend wired yet. UI confirms; nothing leaves the page.
    submit.classList.add('is-gated')
    setStatus('Received. We respond personally — expect a direct reply.', 'ok')
    form.reset()
    wasValid = false
  })

  refreshGate()
}
