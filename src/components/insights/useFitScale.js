// Scale a fixed-size sheet (mm) down to fit its container width on screen.
import { onBeforeUnmount, onMounted, ref } from 'vue'

export function useFitScale(sheetWidthMm, { max = 1, padding = 0 } = {}) {
  const host = ref(null)
  const scale = ref(0.5)
  const MM = 96 / 25.4
  let ro
  const update = () => {
    const el = host.value
    if (!el) return
    const cs = getComputedStyle(el)
    const w = el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight) - padding
    if (w > 0) scale.value = Math.min(max, w / (sheetWidthMm * MM))
  }
  onMounted(() => {
    ro = new ResizeObserver(update)
    if (host.value) ro.observe(host.value)
    update()
  })
  onBeforeUnmount(() => ro?.disconnect())
  return { host, scale, MM }
}
