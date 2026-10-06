<script setup lang="ts">
import { computed } from 'vue'
import { wisataTypeLabel } from '@/api/wisata'
import type { WisataType } from '@/api/types'

/** Warna Tag Toggle per jenis wisata (Figma 177:1389 dst.). */
const TAG_CLASSES: Record<WisataType, string> = {
  wisata_bahari: 'bg-[#d0e9ff] text-[#166dba]',
  wisata_alam: 'bg-[#d6ffd0] text-[#019606]',
  wisata_rekreasi: 'bg-[#ffd0f6] text-[#dd2ee0]',
  wisata_budaya_dan_sejarah: 'bg-[#fff8d0] text-[#927c00]',
}

const props = defineProps<{ jenis: string }>()
const tagClass = computed(() => TAG_CLASSES[props.jenis as WisataType] ?? 'bg-canvas text-ink-900')
</script>

<template>
  <span
    class="inline-flex items-center rounded-lg px-2 py-0.5 text-xs leading-[1.2] tracking-[-0.36px] whitespace-nowrap"
    :class="tagClass"
  >
    {{ wisataTypeLabel(jenis) }}
  </span>
</template>
