<script setup lang="ts">
import { computed } from 'vue'
import MaskIcon from '@/components/MaskIcon.vue'
import iconArrowLeft from '@/assets/icons/arrow-left.svg'
import iconArrowRight from '@/assets/icons/arrow-right.svg'

const props = defineProps<{ page: number; totalPages: number }>()
const emit = defineEmits<{ change: [page: number] }>()

type Item = number | 'gap'

/** 1 2 3 … 67 68 style list: first three, last two, and the neighbours of the current page. */
const items = computed<Item[]>(() => {
  const total = Math.max(props.totalPages, 1)
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const wanted = new Set<number>([1, 2, 3, total - 1, total, props.page - 1, props.page, props.page + 1])
  const pages = [...wanted].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b)
  const out: Item[] = []
  pages.forEach((p, i) => {
    if (i > 0 && p - pages[i - 1]! > 1) out.push('gap')
    out.push(p)
  })
  return out
})

const hasPrev = computed(() => props.page > 1)
const hasNext = computed(() => props.page < props.totalPages)

function go(page: number) {
  if (page < 1 || page > props.totalPages || page === props.page) return
  emit('change', page)
}
</script>

<template>
  <nav class="flex flex-wrap items-center justify-center gap-2 text-xs" aria-label="Navigasi halaman">
    <button
      type="button"
      class="flex items-center gap-2 rounded-lg px-3 py-2 leading-none text-ink-900 hover:bg-canvas disabled:cursor-not-allowed disabled:text-ink-500 disabled:opacity-50 disabled:hover:bg-transparent"
      :disabled="!hasPrev"
      @click="go(page - 1)"
    >
      <MaskIcon :src="iconArrowLeft" :size="16" />
      Sebelumnya
    </button>

    <ul class="flex items-center gap-2">
      <li v-for="(item, index) in items" :key="index">
        <span v-if="item === 'gap'" class="block px-4 py-2 leading-[1.4] font-bold text-black" aria-hidden="true">...</span>
        <button
          v-else
          type="button"
          class="min-w-8 rounded-lg px-3 py-2 leading-none"
          :class="item === page ? 'bg-brand-500 text-canvas' : 'text-ink-900 hover:bg-canvas'"
          :aria-current="item === page ? 'page' : undefined"
          :aria-label="`Halaman ${item}`"
          @click="go(item)"
        >
          {{ item }}
        </button>
      </li>
    </ul>

    <button
      type="button"
      class="flex items-center gap-2 rounded-lg px-3 py-2 leading-none text-ink-900 hover:bg-canvas disabled:cursor-not-allowed disabled:text-ink-500 disabled:opacity-50 disabled:hover:bg-transparent"
      :disabled="!hasNext"
      @click="go(page + 1)"
    >
      Selanjutnya
      <MaskIcon :src="iconArrowRight" :size="16" />
    </button>
  </nav>
</template>
