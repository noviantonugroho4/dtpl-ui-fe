<script setup lang="ts">
import { computed } from 'vue'

/**
 * Renders an SVG asset as a CSS mask filled with `currentColor`, so the
 * design-system icons exported from Figma can follow the text colour of
 * their parent (e.g. white on the active menu item) without editing the file.
 */
const props = withDefaults(defineProps<{ src: string; size?: number }>(), { size: 20 })

// Vite inlines small SVGs as data URIs that contain single quotes, so the
// url() must be double-quoted to stay valid CSS.
const style = computed(() => ({
  width: `${props.size}px`,
  height: `${props.size}px`,
  maskImage: `url("${props.src}")`,
  maskSize: '100% 100%',
  maskRepeat: 'no-repeat',
  maskPosition: 'center',
}))
</script>

<template>
  <span aria-hidden="true" class="inline-block shrink-0 bg-current" :style="style" />
</template>
