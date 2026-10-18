<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import type { LandingWisata } from '@/api/landing'
import MaskIcon from '@/components/MaskIcon.vue'
import PublicWisataCard from './PublicWisataCard.vue'
import iconArrowLeft from '@/assets/icons/arrow-left.svg'
import iconArrowRight from '@/assets/icons/arrow-right.svg'

const props = defineProps<{
  title: string
  subtitle: string
  items: LandingWisata[]
  loading?: boolean
  error?: string | null
  emptyText?: string
  testid: string
}>()

const CARD_WIDTH = 300
const GAP = 18

const container = ref<HTMLElement | null>(null)
const perView = ref(3)
const start = ref(0)
let observer: ResizeObserver | null = null

function updatePerView(width: number) {
  // Sisakan ruang untuk kolom judul (~180px) di layar lebar.
  const next = Math.max(1, Math.min(3, Math.floor((width - 180 + GAP) / (CARD_WIDTH + GAP))))
  perView.value = next
  start.value = Math.min(start.value, Math.max(0, props.items.length - next))
}

onMounted(() => {
  const el = container.value
  if (!el) return
  if (el.clientWidth > 0) updatePerView(el.clientWidth)
  if (typeof ResizeObserver !== 'undefined') {
    observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width
      if (width) updatePerView(width)
    })
    observer.observe(el)
  }
})
onBeforeUnmount(() => observer?.disconnect())

const visible = computed(() => props.items.slice(start.value, start.value + perView.value))
const hasPrev = computed(() => start.value > 0)
const hasNext = computed(() => start.value + perView.value < props.items.length)

function prev() {
  if (hasPrev.value) start.value = Math.max(0, start.value - perView.value)
}
function next() {
  if (hasNext.value) start.value = Math.min(props.items.length - perView.value, start.value + perView.value)
}
</script>

<template>
  <section ref="container" class="flex w-full flex-col items-center py-10" :data-testid="testid" :aria-label="title">
    <div class="flex w-full flex-wrap items-center justify-center gap-[18px] px-4 lg:px-[71px]">
      <!-- Deretan kartu; panah mengapit deretan ini saja (Figma 496:6734) -->
      <div class="relative flex max-w-full items-center justify-center gap-[18px]">
        <p v-if="loading" class="min-w-[300px] py-10 text-center text-xs text-ink-500" aria-live="polite" :data-testid="`${testid}-loading`">Memuat…</p>
        <p v-else-if="error" role="alert" class="min-w-[300px] py-10 text-center text-xs text-red-700" :data-testid="`${testid}-error`">{{ error }}</p>
        <p v-else-if="items.length === 0" class="min-w-[300px] py-10 text-center text-xs text-ink-500" :data-testid="`${testid}-empty`">
          {{ emptyText ?? 'Belum ada destinasi.' }}
        </p>
        <template v-else>
          <PublicWisataCard v-for="item in visible" :key="item.id" :item="item" variant="landing" :testid="`${testid}-card-${item.id}`" />
        </template>

        <button
          v-if="items.length > perView"
          type="button"
          class="absolute top-1/2 -left-3 flex size-12 -translate-y-1/2 items-center justify-center rounded-full border border-brand-500 bg-white/75 text-ink-900 hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
          :disabled="!hasPrev"
          aria-label="Sebelumnya"
          :data-testid="`${testid}-prev`"
          @click="prev"
        >
          <MaskIcon :src="iconArrowLeft" :size="20" />
        </button>
        <button
          v-if="items.length > perView"
          type="button"
          class="absolute top-1/2 -right-3 flex size-12 -translate-y-1/2 items-center justify-center rounded-full border border-brand-500 bg-white/75 text-ink-900 hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
          :disabled="!hasNext"
          aria-label="Selanjutnya"
          :data-testid="`${testid}-next`"
          @click="next"
        >
          <MaskIcon :src="iconArrowRight" :size="20" />
        </button>
      </div>

      <div class="flex w-full max-w-[300px] flex-col gap-[18px] lg:w-[180px]">
        <div class="flex flex-col gap-2">
          <span class="h-0.5 w-10 bg-accent-500" aria-hidden="true" />
          <h2 class="text-[32px] leading-[1.1] font-bold text-brand-700" :data-testid="`${testid}-title`">{{ title }}</h2>
          <p class="text-xs leading-[1.4] text-ink-900">{{ subtitle }}</p>
        </div>
        <RouterLink
          :to="{ name: 'public-attractions' }"
          class="inline-flex w-fit items-center gap-2 rounded-lg bg-accent-500 px-3 py-2 text-xs leading-none font-medium text-white transition hover:bg-accent-600"
          :data-testid="`${testid}-more`"
        >
          Lihat lebih banyak
          <MaskIcon :src="iconArrowRight" :size="16" />
        </RouterLink>
      </div>
    </div>
  </section>
</template>
