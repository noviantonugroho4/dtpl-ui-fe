<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { ApiError } from '@/api/client'
import { errorMessageFor } from '@/api/errorMessages'
import { getWisata, wisataImageUrl } from '@/api/wisata'
import type { Wisata, WisataImage } from '@/api/types'
import { formatRupiah } from '@/utils/format'
import MaskIcon from '@/components/MaskIcon.vue'
import WisataTypeTag from '@/components/WisataTypeTag.vue'
import { useAuthStore } from '@/stores/auth'
import { buildTicketMessage, WHATSAPP_ADMIN_NUMBER, whatsappLink } from '@/utils/whatsapp'
import iconHome from '@/assets/icons/home.svg'
import iconChevronRight from '@/assets/icons/chevron-right.svg'
import iconCornerUpRight from '@/assets/icons/corner-up-right.svg'
import iconMap from '@/assets/icons/map.svg'
import iconArrowLeft from '@/assets/icons/arrow-left.svg'
import iconArrowRight from '@/assets/icons/arrow-right.svg'
import iconX from '@/assets/icons/x.svg'
import iconWhatsapp from '@/assets/icons/whatsapp.svg'
import mapPreviewUrl from '@/assets/landing/map-preview.jpg'
import placeholderUrl from '@/assets/landing/placeholder.png'

/** Galeri desain punya 6 slot; slot kosong diisi placeholder. */
const GALLERY_SLOTS = 6

const route = useRoute()
const auth = useAuthStore()
const item = ref<Wisata | null>(null)
const loading = ref(true)
const notFound = ref(false)
const errorMessage = ref<string | null>(null)
const brokenImages = ref(new Set<string>())
/** Indeks gambar yang sedang dibuka di lightbox; null = tertutup. */
const lightboxIndex = ref<number | null>(null)

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

const images = computed<WisataImage[]>(() =>
  [...(item.value?.images ?? [])].sort((a, b) => a.sortOrder - b.sortOrder).filter((image) => !brokenImages.value.has(image.id)),
)
const facilities = computed(() => [...(item.value?.fasilitas ?? [])].sort((a, b) => a.sortOrder - b.sortOrder))
const emptySlots = computed(() => Math.max(0, GALLERY_SLOTS - images.value.length))

/** Rute: Google Maps directions ke alamat (API belum memberi koordinat). */
const routeHref = computed(() => {
  if (!item.value) return '#'
  const destination = `${item.value.nama}, ${item.value.alamat}`
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`
})

/**
 * Pesan Tiket: langsung ke WhatsApp Admin Widewi dengan template pesanan.
 * Nomor admin dari VITE_WHATSAPP_ADMIN; bila kosong, pakai kontak WhatsApp destinasi.
 */
const whatsappHref = computed(() => {
  if (!item.value) return '#'
  const phone = WHATSAPP_ADMIN_NUMBER || item.value.kontakWa || item.value.kontakTelp
  const services = [...(item.value.services ?? [])].sort((a, b) => a.sortOrder - b.sortOrder).map((s) => s.serviceName)
  return whatsappLink(phone, buildTicketMessage({ namaWisata: item.value.nama, namaPemesan: auth.user?.username, services }))
})

function openLightbox(index: number) {
  lightboxIndex.value = index
}
function closeLightbox() {
  lightboxIndex.value = null
}
function stepLightbox(delta: number) {
  if (lightboxIndex.value === null || images.value.length === 0) return
  lightboxIndex.value = (lightboxIndex.value + delta + images.value.length) % images.value.length
}
function onKeydown(event: KeyboardEvent) {
  if (lightboxIndex.value === null) return
  if (event.key === 'Escape') closeLightbox()
  else if (event.key === 'ArrowRight') stepLightbox(1)
  else if (event.key === 'ArrowLeft') stepLightbox(-1)
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))
watch(id, () => void load(), { immediate: true })
</script>

<template>
  <div class="mx-auto flex w-full max-w-[1021px] flex-col items-center gap-4 px-4 pt-6 pb-8 lg:pt-[100px]" data-testid="public-detail-page">
    <!-- Breadcrumb (Figma 496:8370) -->
    <nav class="flex w-full flex-wrap items-center gap-1 px-2 text-xs text-black sm:px-8" aria-label="Breadcrumb" data-testid="public-detail-breadcrumb">
      <RouterLink :to="{ name: 'home' }" aria-label="Beranda" class="text-ink-900"><MaskIcon :src="iconHome" :size="16" /></RouterLink>
      <MaskIcon :src="iconChevronRight" :size="16" />
      <RouterLink :to="{ name: 'home' }" class="hover:underline">Beranda</RouterLink>
      <MaskIcon :src="iconChevronRight" :size="16" />
      <RouterLink :to="{ name: 'public-attractions' }" class="hover:underline">Destinasi Wisata</RouterLink>
      <MaskIcon :src="iconChevronRight" :size="16" />
      <span aria-current="page">Detail Destinasi Wisata</span>
    </nav>

    <!-- Title card (Figma 496:8379) -->
    <section class="w-full rounded-[20px] bg-white px-8 py-4">
      <h1 class="text-xl leading-[1.2] font-semibold tracking-[-0.6px] text-ink-900" data-testid="public-detail-title">Detail Destinasi Wisata</h1>
    </section>

    <!-- Content card (Figma 496:8382) -->
    <section class="flex w-full flex-col gap-6 rounded-[20px] bg-white p-4 sm:p-8">
      <p v-if="loading" class="text-xs text-ink-500" aria-live="polite" data-testid="public-detail-loading">Memuat…</p>

      <div v-else-if="notFound" class="flex flex-col items-start gap-3" data-testid="public-detail-not-found">
        <p role="alert" class="text-sm text-ink-900">Destinasi wisata tidak ditemukan.</p>
        <RouterLink :to="{ name: 'public-attractions' }" class="text-xs text-brand-500 underline">Kembali ke daftar destinasi</RouterLink>
      </div>

      <div v-else-if="errorMessage" role="alert" class="flex flex-wrap items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700" data-testid="public-detail-error">
        <span>{{ errorMessage }}</span>
        <button type="button" class="font-semibold underline" data-testid="public-detail-retry" @click="load">Coba lagi</button>
      </div>

      <template v-else-if="item">
        <h2 class="text-xl leading-[1.2] font-semibold tracking-[-0.6px] text-ink-900" data-testid="public-detail-nama">{{ item.nama }}</h2>

        <div class="flex flex-col gap-6">
          <dl class="flex flex-col" data-testid="public-detail">
            <div class="flex flex-col gap-1 py-[9px] sm:flex-row">
              <dt class="shrink-0 text-xs leading-[1.2] tracking-[-0.36px] text-black sm:w-[128px]">Jenis Wisata</dt>
              <dd data-testid="public-detail-jenis"><WisataTypeTag :jenis="item.jenis" /></dd>
            </div>

            <div class="flex flex-col gap-1 py-[9px] sm:flex-row">
              <dt class="shrink-0 text-xs leading-[1.2] tracking-[-0.36px] text-black sm:w-[128px]">Alamat</dt>
              <dd class="min-w-0 flex-1 text-xs leading-[1.4] whitespace-pre-line text-ink-900" data-testid="public-detail-alamat">
                {{ item.alamat }}, Kelurahan {{ item.kelurahan }}, Kecamatan {{ item.kecamatan }}, {{ item.provinsi }}
              </dd>
            </div>

            <!-- Peta (Figma 496:8397): gambar ilustrasi statis, tombol dan tautan memakai mapsLink asli -->
            <div class="flex flex-col gap-1 py-[9px] sm:flex-row">
              <dt class="shrink-0 text-xs leading-[1.2] tracking-[-0.36px] text-black sm:w-[128px]">Link Google Maps</dt>
              <dd class="w-full max-w-[300px] overflow-hidden rounded-lg border border-ink-200 bg-white" data-testid="public-detail-map">
                <div class="relative aspect-square w-full">
                  <img :src="mapPreviewUrl" alt="" class="size-full rounded-t-lg object-cover" width="600" height="600" loading="lazy" aria-hidden="true" />
                  <div class="absolute bottom-[7px] left-[6.5px] flex gap-2.5">
                    <a
                      :href="routeHref"
                      target="_blank"
                      rel="noopener"
                      class="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-3 py-2 text-xs leading-none font-medium text-canvas transition hover:bg-brand-600"
                      data-testid="public-detail-map-route"
                    >
                      <MaskIcon :src="iconCornerUpRight" :size="16" />
                      Rute
                    </a>
                    <a
                      :href="item.mapsLink"
                      target="_blank"
                      rel="noopener"
                      class="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-3 py-2 text-xs leading-none font-medium text-canvas transition hover:bg-brand-600"
                      data-testid="public-detail-map-open"
                    >
                      <MaskIcon :src="iconMap" :size="16" />
                      Buka di maps
                    </a>
                  </div>
                </div>
                <a
                  :href="item.mapsLink"
                  target="_blank"
                  rel="noopener"
                  class="block p-3 text-xs leading-[1.4] break-all text-[#166dba] underline"
                  data-testid="public-detail-map-link"
                >
                  {{ item.mapsLink }}
                </a>
              </dd>
            </div>

            <div class="flex flex-col gap-1 py-[9px] sm:flex-row">
              <dt class="shrink-0 text-xs leading-[1.2] tracking-[-0.36px] text-black sm:w-[128px]">Deskripsi</dt>
              <dd class="min-w-0 flex-1 text-xs leading-[1.4] whitespace-pre-line text-ink-900" data-testid="public-detail-deskripsi">{{ item.deskripsi || '-' }}</dd>
            </div>

            <div class="flex flex-col gap-1 py-[9px] sm:flex-row">
              <dt class="shrink-0 text-xs leading-[1.2] tracking-[-0.36px] text-black sm:w-[128px]">Fasilitas</dt>
              <dd class="min-w-0 flex-1 text-xs text-ink-900">
                <ul v-if="facilities.length" class="list-disc space-y-2.5 pl-4" data-testid="public-detail-fasilitas">
                  <li v-for="facility in facilities" :key="facility.id">{{ facility.facility }}</li>
                </ul>
                <span v-else class="text-ink-500">-</span>
              </dd>
            </div>

            <div class="flex flex-col gap-1 py-[9px] sm:flex-row">
              <dt class="shrink-0 text-xs leading-[1.2] tracking-[-0.36px] text-black sm:w-[128px]">Harga Tiket</dt>
              <dd class="min-w-0 flex-1 text-xs leading-none text-ink-900" data-testid="public-detail-harga">{{ formatRupiah(item.hargaTiket) }}</dd>
            </div>
          </dl>

          <!-- Pesan Tiket (Figma 496:8426): langsung ke WhatsApp -->
          <a
            :href="whatsappHref"
            target="_blank"
            rel="noopener"
            class="inline-flex w-fit items-center gap-1 rounded-lg border border-[#d6ffd0] bg-[#d6ffd0] px-2 py-1 text-xs leading-none font-medium text-[#019606] transition hover:brightness-95"
            data-testid="public-detail-order"
          >
            <img :src="iconWhatsapp" alt="" class="size-5" width="20" height="20" />
            Pesan Tiket
          </a>

          <!-- Galeri (Figma 496:8462) -->
          <div class="grid w-full grid-cols-2 gap-3 border border-ink-200 bg-white p-1 sm:grid-cols-3" data-testid="public-detail-gallery">
            <button
              v-for="(image, index) in images"
              :key="image.id"
              type="button"
              class="relative aspect-[344/208] overflow-hidden bg-[#e3e3e3] focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none"
              :aria-label="`Perbesar gambar ${index + 1}`"
              :data-testid="`public-detail-gallery-${image.id}`"
              @click="openLightbox(index)"
            >
              <img :src="wisataImageUrl(image)" :alt="`${item.nama} ${index + 1}`" class="size-full object-cover" loading="lazy" @error="brokenImages.add(image.id)" />
            </button>
            <div
              v-for="slot in emptySlots"
              :key="`empty-${slot}`"
              class="relative aspect-[344/208] bg-[#e3e3e3]"
              aria-hidden="true"
              data-testid="public-detail-gallery-empty"
            >
              <img :src="placeholderUrl" alt="" class="absolute inset-0 m-auto size-24 opacity-20" />
            </div>
          </div>
        </div>
      </template>
    </section>

    <!-- Lightbox -->
    <div
      v-if="item && lightboxIndex !== null && images[lightboxIndex]"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      role="dialog"
      aria-modal="true"
      :aria-label="`Gambar ${lightboxIndex + 1} dari ${images.length}`"
      data-testid="public-detail-lightbox"
      @click.self="closeLightbox"
    >
      <button
        type="button"
        class="absolute top-4 right-4 flex size-10 items-center justify-center rounded-full bg-white/90 text-ink-900 hover:bg-white"
        aria-label="Tutup"
        data-testid="public-detail-lightbox-close"
        @click="closeLightbox"
      >
        <MaskIcon :src="iconX" :size="20" />
      </button>
      <button
        v-if="images.length > 1"
        type="button"
        class="absolute top-1/2 left-4 flex size-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-ink-900 hover:bg-white"
        aria-label="Gambar sebelumnya"
        data-testid="public-detail-lightbox-prev"
        @click="stepLightbox(-1)"
      >
        <MaskIcon :src="iconArrowLeft" :size="20" />
      </button>
      <img
        :src="wisataImageUrl(images[lightboxIndex]!)"
        :alt="`${item.nama} ${lightboxIndex + 1}`"
        class="max-h-full max-w-full rounded-lg object-contain shadow-2xl"
        data-testid="public-detail-lightbox-image"
      />
      <button
        v-if="images.length > 1"
        type="button"
        class="absolute top-1/2 right-4 flex size-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-ink-900 hover:bg-white"
        aria-label="Gambar berikutnya"
        data-testid="public-detail-lightbox-next"
        @click="stepLightbox(1)"
      >
        <MaskIcon :src="iconArrowRight" :size="20" />
      </button>
    </div>
  </div>
</template>
