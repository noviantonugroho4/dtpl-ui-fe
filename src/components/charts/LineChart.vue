<script setup lang="ts">
import { computed, ref } from 'vue'
import ChartTooltip from './ChartTooltip.vue'
import { useChartWidth } from './useChartWidth'

export interface ChartPoint {
  label: string
  value: number
}

const props = withDefaults(
  defineProps<{
    title: string
    points: ChartPoint[]
    max?: number
    step?: number
    height?: number
  }>(),
  { max: 100, step: 20, height: 200 },
)

const container = ref<HTMLElement | null>(null)
const width = useChartWidth(container)
const active = ref<number | null>(null)

const margin = { top: 8, right: 12, bottom: 20, left: 32 }
const innerWidth = computed(() => Math.max(width.value - margin.left - margin.right, 1))
const innerHeight = computed(() => props.height - margin.top - margin.bottom)

const ticks = computed(() => {
  const list: number[] = []
  for (let v = 0; v <= props.max; v += props.step) list.push(v)
  return list
})

function x(i: number): number {
  const n = props.points.length
  return margin.left + (n <= 1 ? innerWidth.value / 2 : (i * innerWidth.value) / (n - 1))
}
function y(v: number): number {
  return margin.top + innerHeight.value - (Math.min(v, props.max) / props.max) * innerHeight.value
}

const path = computed(() => props.points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i)},${y(p.value)}`).join(' '))

function onPointerMove(event: PointerEvent) {
  const rect = (event.currentTarget as SVGSVGElement).getBoundingClientRect()
  const px = event.clientX - rect.left
  let nearest = 0
  let best = Infinity
  props.points.forEach((_, i) => {
    const d = Math.abs(x(i) - px)
    if (d < best) {
      best = d
      nearest = i
    }
  })
  active.value = nearest
}
</script>

<template>
  <figure class="flex h-full flex-col gap-2.5 py-3">
    <figcaption data-testid="chart-legend" class="flex flex-wrap items-center justify-center gap-1 px-2 text-xs text-black/70">
      <span class="relative inline-block size-4" aria-hidden="true">
        <span class="absolute top-[7px] left-0 h-0.5 w-4 bg-brand-500" />
        <span class="absolute top-[4px] left-[4px] size-2 rounded-full border-2 border-brand-500 bg-white" />
      </span>
      <span class="p-1">{{ title }}</span>
    </figcaption>

    <div ref="container" class="relative w-full">
      <svg
        :width="width"
        :height="height"
        :viewBox="`0 0 ${width} ${height}`"
        class="block h-auto w-full overflow-visible"
        role="img"
        :aria-label="title"
        @pointermove="onPointerMove"
        @pointerleave="active = null"
      >
        <!-- Grid + axes -->
        <g class="text-black/70" font-size="12" text-anchor="end">
          <template v-for="tick in ticks" :key="tick">
            <line
              :x1="margin.left"
              :x2="margin.left + innerWidth"
              :y1="y(tick)"
              :y2="y(tick)"
              stroke="currentColor"
              stroke-opacity="0.25"
              stroke-dasharray="4 4"
            />
            <text :x="margin.left - 6" :y="y(tick) + 4" fill="currentColor">{{ tick }}</text>
          </template>
        </g>
        <g class="text-black/70" font-size="12" text-anchor="middle">
          <template v-for="(p, i) in points" :key="p.label">
            <line
              :x1="x(i)"
              :x2="x(i)"
              :y1="margin.top"
              :y2="margin.top + innerHeight"
              stroke="currentColor"
              stroke-opacity="0.25"
              stroke-dasharray="4 4"
            />
            <text :x="x(i)" :y="height - 4" fill="currentColor">{{ p.label }}</text>
          </template>
        </g>

        <!-- Crosshair -->
        <line
          v-if="active !== null"
          :x1="x(active)"
          :x2="x(active)"
          :y1="margin.top"
          :y2="margin.top + innerHeight"
          class="stroke-brand-500"
          stroke-opacity="0.6"
        />

        <!-- Series -->
        <path :d="path" fill="none" class="stroke-brand-500" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" />
        <g v-for="(p, i) in points" :key="p.label">
          <circle :cx="x(i)" :cy="y(p.value)" r="6" fill="#fff" />
          <circle
            :cx="x(i)"
            :cy="y(p.value)"
            :r="active === i ? 5 : 4"
            fill="#fff"
            class="stroke-brand-500"
            stroke-width="1.5"
          />
          <circle :data-testid="`chart-point-${p.label}`"
            :cx="x(i)"
            :cy="y(p.value)"
            r="12"
            fill="transparent"
            tabindex="0"
            :aria-label="`${p.label}: ${p.value}`"
            @focus="active = i"
            @blur="active = null"
          />
        </g>
      </svg>

      <ChartTooltip
        v-if="active !== null && points[active]"
        :x="x(active)"
        :y="y(points[active].value)"
        :value="String(points[active].value)"
        :label="points[active].label"
      />
    </div>

    <table data-testid="chart-table" class="sr-only">
      <caption>{{ title }}</caption>
      <tbody>
        <tr v-for="p in points" :key="p.label">
          <th scope="row">{{ p.label }}</th>
          <td>{{ p.value }}</td>
        </tr>
      </tbody>
    </table>
  </figure>
</template>
