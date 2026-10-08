<script setup lang="ts">
import { computed, ref } from 'vue'
import ChartTooltip from './ChartTooltip.vue'
import { useChartWidth } from './useChartWidth'
import type { ChartPoint } from './LineChart.vue'

const props = withDefaults(
  defineProps<{
    title: string
    bars: ChartPoint[]
    max?: number
    step?: number
    rowHeight?: number
    barThickness?: number
    /** Width reserved for the category labels on the left, in px. */
    labelWidth?: number
  }>(),
  { max: 100, step: 20, rowHeight: 31, barThickness: 20, labelWidth: 72 },
)

const container = ref<HTMLElement | null>(null)
const width = useChartWidth(container)
const active = ref<number | null>(null)

const margin = computed(() => ({ top: 1, right: 16, bottom: 20, left: props.labelWidth }))
const innerWidth = computed(() => Math.max(width.value - margin.value.left - margin.value.right, 1))
const innerHeight = computed(() => props.bars.length * props.rowHeight)
const height = computed(() => margin.value.top + innerHeight.value + margin.value.bottom)

const ticks = computed(() => {
  const list: number[] = []
  for (let v = 0; v <= props.max; v += props.step) list.push(v)
  return list
})

function x(v: number): number {
  return margin.value.left + (Math.min(v, props.max) / props.max) * innerWidth.value
}
function rowTop(i: number): number {
  return margin.value.top + i * props.rowHeight
}
function barY(i: number): number {
  return rowTop(i) + (props.rowHeight - props.barThickness) / 2
}
</script>

<template>
  <figure class="flex h-full flex-col gap-4 px-4 py-3">
    <figcaption data-testid="chart-legend" class="flex flex-wrap items-center justify-center gap-1 px-2 text-xs text-black/70">
      <span class="inline-block size-3 border border-white bg-brand-500" aria-hidden="true" />
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
        @pointerleave="active = null"
      >
        <!-- Grid + axes -->
        <g class="text-black/70" font-size="12" text-anchor="middle">
          <template v-for="tick in ticks" :key="tick">
            <line
              :x1="x(tick)"
              :x2="x(tick)"
              :y1="margin.top"
              :y2="margin.top + innerHeight"
              stroke="currentColor"
              stroke-opacity="0.25"
              stroke-dasharray="4 4"
            />
            <text :x="x(tick)" :y="height - 4" fill="currentColor">{{ tick }}</text>
          </template>
        </g>
        <g class="text-black/70" font-size="12" text-anchor="end">
          <template v-for="(bar, i) in bars" :key="bar.label">
            <line
              :x1="margin.left"
              :x2="margin.left + innerWidth"
              :y1="rowTop(i)"
              :y2="rowTop(i)"
              stroke="currentColor"
              stroke-opacity="0.25"
              stroke-dasharray="4 4"
            />
            <text :x="margin.left - 8" :y="rowTop(i) + rowHeight / 2 + 4" fill="currentColor">{{ bar.label }}</text>
          </template>
          <line
            :x1="margin.left"
            :x2="margin.left + innerWidth"
            :y1="margin.top + innerHeight"
            :y2="margin.top + innerHeight"
            stroke="currentColor"
            stroke-opacity="0.25"
            stroke-dasharray="4 4"
          />
        </g>

        <!-- Bars -->
        <g v-for="(bar, i) in bars" :key="bar.label">
          <rect
            :x="margin.left"
            :y="barY(i)"
            :width="Math.max(x(bar.value) - margin.left, 0)"
            :height="barThickness"
            class="fill-brand-500"
            :fill-opacity="active === i ? 1 : 0.8"
          />
          <rect :data-testid="`chart-bar-${bar.label}`"
            :x="margin.left"
            :y="rowTop(i)"
            :width="innerWidth"
            :height="rowHeight"
            fill="transparent"
            tabindex="0"
            :aria-label="`${bar.label}: ${bar.value}`"
            @pointerenter="active = i"
            @focus="active = i"
            @blur="active = null"
          />
        </g>
      </svg>

      <ChartTooltip
        v-if="active !== null && bars[active]"
        :x="x(bars[active].value)"
        :y="barY(active)"
        :value="String(bars[active].value)"
        :label="bars[active].label"
      />
    </div>

    <table data-testid="chart-table" class="sr-only">
      <caption>{{ title }}</caption>
      <tbody>
        <tr v-for="bar in bars" :key="bar.label">
          <th scope="row">{{ bar.label }}</th>
          <td>{{ bar.value }}</td>
        </tr>
      </tbody>
    </table>
  </figure>
</template>
