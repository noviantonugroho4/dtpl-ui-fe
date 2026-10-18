<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { ApiError } from '@/api/client'
import { errorMessageFor } from '@/api/errorMessages'
import { getWisata } from '@/api/wisata'
import type { Wisata } from '@/api/types'
import MaskIcon from '@/components/MaskIcon.vue'
import WisataDetailSummary from '@/components/WisataDetailSummary.vue'
import iconCornerUpLeft from '@/assets/icons/corner-up-left.svg'
import iconEdit from '@/assets/icons/edit.svg'

const route = useRoute()

const item = ref<Wisata | null>(null)
const loading = ref(true)
const notFound = ref(false)
const errorMessage = ref<string | null>(null)

const id = computed(() => String(route.params.id ?? ''))

async function load() {
  loading.value = true
  notFound.value = false
  errorMessage.value = null
  try {
    item.value = (await getWisata(id.value)).data
  } catch (err) {
    item.value = null
    if (err instanceof ApiError && err.status === 404) notFound.value = true
    else errorMessage.value = err instanceof ApiError ? errorMessageFor(err.code, err.message) : errorMessageFor('UNKNOWN_ERROR')
  } finally {
    loading.value = false
  }
}

watch(id, () => void load(), { immediate: true })
</script>

<template>
  <div class="flex flex-col gap-4" data-testid="wisata-detail-page">
    <!-- Title card -->
    <section class="flex flex-wrap items-center gap-x-12 gap-y-3 rounded-[20px] bg-white p-4">
      <h2 class="text-xl leading-[1.2] font-semibold tracking-[-0.6px] text-ink-900" data-testid="wisata-detail-title">Detail Destinasi Wisata</h2>
      <div class="ml-auto flex flex-wrap items-center gap-2.5">
        <RouterLink
          :to="{ name: 'attractions' }"
          class="inline-flex items-center gap-2 rounded-lg border border-brand-500 bg-white px-3 py-2 text-xs leading-none font-medium text-brand-500 transition hover:bg-brand-50 focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:outline-none"
          data-testid="wisata-detail-back"
        >
          <MaskIcon :src="iconCornerUpLeft" :size="16" />
          Kembali
        </RouterLink>
        <RouterLink
          v-if="item"
          :to="{ name: 'attractions-edit', params: { id: item.id } }"
          class="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-3 py-2 text-xs leading-none font-medium text-canvas transition hover:bg-brand-600 focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:outline-none"
          data-testid="wisata-detail-edit"
        >
          Ubah
          <MaskIcon :src="iconEdit" :size="16" />
        </RouterLink>
      </div>
    </section>

    <!-- Detail card -->
    <section class="rounded-[20px] bg-white px-4 py-8">
      <p v-if="loading" class="text-xs text-ink-500" aria-live="polite" data-testid="wisata-detail-loading">Memuat…</p>

      <div v-else-if="notFound" class="flex flex-col items-start gap-3" data-testid="wisata-detail-not-found">
        <p role="alert" class="text-sm text-ink-900">Destinasi wisata tidak ditemukan.</p>
        <p class="text-xs text-ink-500">Data mungkin sudah dihapus atau tautannya salah.</p>
      </div>

      <div
        v-else-if="errorMessage"
        role="alert"
        class="flex flex-wrap items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700"
        data-testid="wisata-detail-error"
      >
        <span>{{ errorMessage }}</span>
        <button type="button" class="font-semibold underline" data-testid="wisata-detail-retry" @click="load">Coba lagi</button>
      </div>

      <WisataDetailSummary v-else-if="item" :item="item" />
    </section>
  </div>
</template>
