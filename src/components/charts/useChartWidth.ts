import { onBeforeUnmount, onMounted, ref, type Ref } from 'vue'

/** Tracks the rendered width of a chart container so the SVG can be laid out in CSS pixels. */
export function useChartWidth(container: Ref<HTMLElement | null>, fallback = 480) {
  const width = ref(fallback)
  let observer: ResizeObserver | null = null

  onMounted(() => {
    const el = container.value
    if (!el) return
    if (el.clientWidth > 0) width.value = el.clientWidth
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver((entries) => {
        const next = entries[0]?.contentRect.width
        if (next && next > 0) width.value = next
      })
      observer.observe(el)
    }
  })

  onBeforeUnmount(() => observer?.disconnect())

  return width
}
