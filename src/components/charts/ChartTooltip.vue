<script setup lang="ts">
defineProps<{ x: number; y: number; value: string; label: string }>()
</script>

<template>
  <div data-testid="chart-tooltip"
    role="status"
    class="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-md bg-ink-900 px-2 py-1 text-xs whitespace-nowrap text-white shadow-md"
    :style="{ left: `${x}px`, top: `${y - 8}px` }"
  >
    <strong class="font-semibold">{{ value }}</strong>
    <span class="ml-1 text-white/80">{{ label }}</span>
  </div>
</template>
