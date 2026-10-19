<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'
import type { LandingWisata } from '@/api/landing'
import { formatRupiah } from '@/utils/format'
import WisataTypeTag from '@/components/WisataTypeTag.vue'
import placeholderUrl from '@/assets/landing/placeholder.png'

/**
 * Kartu destinasi untuk situs publik.
 * - `landing`: kartu 300px bersudut 25px seperti carousel beranda (Figma 496:6534).
 * - `grid`: kartu berbingkai untuk halaman daftar (Figma 496:7852).
 */
const props = withDefaults(defineProps<{ item: LandingWisata; variant?: 'landing' | 'grid'; testid?: string }>(), {
  variant: 'landing',
  testid: 'wisata-card',
})

const broken = ref(false)
const showImage = computed(() => !!props.item.imageUrl && !broken.value)

const target = computed(() => ({ name: 'public-attraction-detail', params: { id: props.item.id } }))
</script>

<template>
  <RouterLink
    :to="target"
    class="group flex flex-col overflow-hidden bg-white text-left transition focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none"
    :class="variant === 'landing' ? 'w-[300px] shrink-0 rounded-[25px] shadow-sm hover:shadow-md' : 'w-full rounded-lg border border-ink-200 hover:shadow-md'"
    :data-testid="testid"
  >
    <div
      class="relative w-full overflow-hidden bg-[#e3e3e3]"
      :class="variant === 'landing' ? 'h-[181px] rounded-t-[20px]' : 'aspect-[312.5/188.8] rounded-t-lg'"
    >
      <img
        v-if="showImage"
        :src="item.imageUrl ?? undefined"
        :alt="item.nama"
        class="size-full object-cover transition group-hover:scale-[1.02]"
        loading="lazy"
        @error="broken = true"
      />
      <img v-else :src="placeholderUrl" alt="" class="absolute inset-0 m-auto size-20 opacity-20" aria-hidden="true" />
    </div>

    <div class="flex flex-col gap-4 p-3">
      <WisataTypeTag :jenis="item.jenis" />
      <div class="flex flex-col text-ink-900">
        <p class="text-base leading-[1.5] font-bold tracking-[-0.48px]" :data-testid="`${testid}-nama`">{{ item.nama }}</p>
        <template v-if="variant === 'landing'">
          <p class="text-xs leading-[1.5]" :data-testid="`${testid}-kecamatan`">Kec. {{ item.kecamatan }}</p>
        </template>
        <template v-else>
          <p class="text-xs leading-[1.5]" :data-testid="`${testid}-kecamatan`">Kecamatan {{ item.kecamatan }}</p>
          <p class="text-xs leading-[1.5]" :data-testid="`${testid}-kelurahan`">Kelurahan {{ item.kelurahan }}</p>
          <p class="text-[15px] leading-[1.5] font-bold" :data-testid="`${testid}-harga`">{{ formatRupiah(item.hargaTiket) }}</p>
        </template>
      </div>
    </div>
  </RouterLink>
</template>
