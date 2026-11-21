// Focus trap for UiModal / UiBottomSheet.
// activate(el): remembers the previously focused element, focuses the first
// [data-autofocus] or focusable child, keeps Tab/Shift+Tab inside, and locks
// body scroll. deactivate(): releases and restores focus.
import { onBeforeUnmount } from 'vue'

const FOCUSABLE = [
  'a[href]', 'area[href]', 'button:not([disabled])', 'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])', 'textarea:not([disabled])', 'iframe', '[tabindex]:not([tabindex="-1"])',
  '[contenteditable="true"]',
].join(',')

let lockCount = 0

export function useFocusTrap() {
  let container = null
  let previous = null

  function focusables() {
    if (!container) return []
    return [...container.querySelectorAll(FOCUSABLE)].filter(
      (el) => el.offsetParent !== null || el === document.activeElement,
    )
  }

  function onKeydown(e) {
    if (e.key !== 'Tab' || !container) return
    const list = focusables()
    if (!list.length) {
      e.preventDefault()
      container.focus()
      return
    }
    const first = list[0]
    const last = list[list.length - 1]
    if (e.shiftKey && (document.activeElement === first || document.activeElement === container)) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault()
      first.focus()
    }
  }

  function activate(el) {
    container = el
    previous = document.activeElement
    document.addEventListener('keydown', onKeydown, true)
    if (lockCount++ === 0) document.documentElement.style.overflow = 'hidden'
    requestAnimationFrame(() => {
      if (!container) return
      const target = container.querySelector('[data-autofocus]') ?? focusables()[0] ?? container
      target.focus({ preventScroll: true })
    })
  }

  function deactivate() {
    if (!container) return
    document.removeEventListener('keydown', onKeydown, true)
    container = null
    if (--lockCount <= 0) {
      lockCount = 0
      document.documentElement.style.overflow = ''
    }
    if (previous && typeof previous.focus === 'function') previous.focus({ preventScroll: true })
    previous = null
  }

  onBeforeUnmount(deactivate)
  return { activate, deactivate }
}
