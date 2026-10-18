<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { ApiError } from '@/api/client'
import { errorMessageFor } from '@/api/errorMessages'
import { getWisata } from '@/api/wisata'
import type { Wisata } from '@/api/types'
import MaskIcon from '@/components/MaskIcon.vue'
import WisataDetailSummary from '@/components/WisataDetailSummary.vue'
import iconHome from '@/assets/icons/home.svg'
import iconChevronRight from '@/assets/icons/chevron-right.svg'

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
  <div class="mx-auto flex w-full max-w-[1021px] flex-col items-center gap-4 px-4 pt-6 pb-8 lg:pt-[100px]" data-testid="public-detail-page">
    <nav class="flex w-full flex-wrap items-center gap-1 px-2 text-xs text-black sm:px-8" aria-label="Breadcrumb" data-testid="public-detail-breadcrumb">
      <RouterLink :to="{ name: 'home' }" aria-label="Beranda" class="text-ink-900"><MaskIcon :src="iconHome" :size="16" /></RouterLink>
      <MaskIcon :src="iconChevronRight" :size="16" />
      <RouterLink :to="{ name: 'home' }" class="hover:underline">Beranda</RouterLink>
      <MaskIcon :src="iconChevronRight" :size="16" />
      <RouterLink :to="{ name: 'public-attractions' }" class="hover:underline">Destinasi Wisata</RouterLink>
      <template v-if="item">
        <MaskIcon :src="iconChevronRight" :size="16" />
        <span aria-current="page">{{ item.nama }}</span>
      </template>
    </nav>

    <section class="w-full rounded-[20px] bg-white px-8 py-4">
      <h1 class="text-xl leading-[1.2] font-semibold tracking-[-0.6px] text-ink-900" data-testid="public-detail-title">
        {{ item?.nama ?? 'Detail Destinasi Wisata' }}
      </h1>
    </section>

    <section class="w-full rounded-[20px] bg-white px-4 py-8 sm:px-8">
      <p v-if="loading" class="text-xs text-ink-500" aria-live="polite" data-testid="public-detail-loading">Memuat…</p>
      <div v-else-if="notFound" class="flex flex-col items-start gap-3" data-testid="public-detail-not-found">
        <p role="alert" class="text-sm text-ink-900">Destinasi wisata tidak ditemukan.</p>
        <RouterLink :to="{ name: 'public-attractions' }" class="text-xs text-brand-500 underline">Kembali ke daftar destinasi</RouterLink>
      </div>
      <div v-else-if="errorMessage" role="alert" class="flex flex-wrap items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700" data-testid="public-detail-error">
        <span>{{ errorMessage }}</span>
        <button type="button" class="font-semibold underline" data-testid="public-detail-retry" @click="load">Coba lagi</button>
      </div>
      <WisataDetailSummary v-else-if="item" :item="item" testid="public-detail" :show-history="false" />
    </section>
  </div>
</template>
