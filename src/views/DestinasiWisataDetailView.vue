<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { ApiError } from '@/api/client'
import { errorMessageFor } from '@/api/errorMessages'
import { getWisata } from '@/api/wisata'
import type { Wisata } from '@/api/types'
import { formatDateTime, formatRupiah } from '@/utils/format'
import MaskIcon from '@/components/MaskIcon.vue'
import WisataTypeTag from '@/components/WisataTypeTag.vue'
import iconCornerUpLeft from '@/assets/icons/corner-up-left.svg'
import iconEdit from '@/assets/icons/edit.svg'

const route = useRoute()

const item = ref<Wisata | null>(null)
const loading = ref(true)
const notFound = ref(false)
const errorMessage = ref<string | null>(null)
/** Image ids whose URL failed to load; shown as a placeholder instead. */
const brokenImages = ref(new Set<string>())

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

const images = computed(() => [...(item.value?.images ?? [])].sort((a, b) => a.sortOrder - b.sortOrder))
const facilities = computed(() => [...(item.value?.fasilitas ?? [])].sort((a, b) => a.sortOrder - b.sortOrder))
const services = computed(() => [...(item.value?.services ?? [])].sort((a, b) => a.sortOrder - b.sortOrder))

function phoneHref(value: string): string {
  return `tel:${value}`
}
function whatsappHref(value: string): string {
  return `https://wa.me/${value.replace(/\D/g, '')}`
}

watch(id, () => void load(), { immediate: true })
</script>

<template>
  <div class="flex flex-col gap-4">
    <!-- Title card -->
    <section class="flex flex-wrap items-center gap-x-12 gap-y-3 rounded-[20px] bg-white p-4">
      <h2 class="text-xl leading-[1.2] font-semibold tracking-[-0.6px] text-ink-900">Detail Destinasi Wisata</h2>
      <div class="ml-auto flex flex-wrap items-center gap-2.5">
        <RouterLink
          :to="{ name: 'attractions' }"
          class="inline-flex items-center gap-2 rounded-lg border border-brand-500 bg-white px-3 py-2 text-xs leading-none font-medium text-brand-500 transition hover:bg-brand-50 focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:outline-none"
        >
          <MaskIcon :src="iconCornerUpLeft" :size="16" />
          Kembali
        </RouterLink>
        <RouterLink
          v-if="item"
          :to="{ name: 'attractions-edit', params: { id: item.id } }"
          class="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-3 py-2 text-xs leading-none font-medium text-canvas transition hover:bg-brand-600 focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:outline-none"
        >
          Ubah
          <MaskIcon :src="iconEdit" :size="16" />
        </RouterLink>
      </div>
    </section>

    <!-- Detail card -->
    <section class="rounded-[20px] bg-white px-4 py-8">
      <p v-if="loading" class="text-xs text-ink-500" aria-live="polite">Memuat…</p>

      <div v-else-if="notFound" class="flex flex-col items-start gap-3">
        <p role="alert" class="text-sm text-ink-900">Destinasi wisata tidak ditemukan.</p>
        <p class="text-xs text-ink-500">Data mungkin sudah dihapus atau tautannya salah.</p>
      </div>

      <div v-else-if="errorMessage" role="alert" class="flex flex-wrap items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
        <span>{{ errorMessage }}</span>
        <button type="button" class="font-semibold underline" @click="load">Coba lagi</button>
      </div>

      <dl v-else-if="item" class="flex flex-col gap-4">
        <!-- Gambar -->
        <div class="flex flex-col gap-1 sm:flex-row sm:gap-2.5">
          <dt class="shrink-0 text-xs leading-[1.2] tracking-[-0.36px] text-black sm:w-[185px] sm:pt-1">Gambar</dt>
          <dd class="flex min-w-0 flex-1 flex-wrap gap-2.5">
            <template v-if="images.length">
              <figure
                v-for="image in images"
                :key="image.id"
                class="flex h-[94px] w-[111px] items-center justify-center overflow-hidden rounded-[10px] border border-ink-300 bg-canvas"
              >
                <img
                  v-if="!brokenImages.has(image.id)"
                  :src="image.webdavUrl"
                  :alt="`${item.nama} ${image.sortOrder + 1}`"
                  class="size-full object-cover"
                  loading="lazy"
                  @error="brokenImages.add(image.id)"
                />
                <figcaption v-else class="px-2 text-center text-[9px] leading-[1.3] text-ink-500">Gambar tidak dapat dimuat</figcaption>
              </figure>
            </template>
            <span v-else class="text-xs text-ink-500">Tidak ada gambar.</span>
          </dd>
        </div>

        <div class="flex flex-col gap-1 sm:flex-row sm:gap-2.5">
          <dt class="shrink-0 text-xs leading-[1.2] tracking-[-0.36px] text-black sm:w-[185px]">Nama Wisata</dt>
          <dd class="min-w-0 flex-1 text-sm font-semibold text-ink-900">{{ item.nama }}</dd>
        </div>

        <div class="flex flex-col gap-1 sm:flex-row sm:gap-2.5">
          <dt class="shrink-0 text-xs leading-[1.2] tracking-[-0.36px] text-black sm:w-[185px]">Jenis Wisata</dt>
          <dd class="min-w-0 flex-1"><WisataTypeTag :jenis="item.jenis" /></dd>
        </div>

        <div class="flex flex-col gap-1 sm:flex-row sm:gap-2.5">
          <dt class="shrink-0 text-xs leading-[1.2] tracking-[-0.36px] text-black sm:w-[185px]">Kontak</dt>
          <dd class="flex min-w-0 flex-1 flex-col gap-1 text-xs text-ink-900">
            <span>No. Telp: <a :href="phoneHref(item.kontakTelp)" class="text-brand-500 underline">{{ item.kontakTelp }}</a></span>
            <span v-if="item.kontakWa">
              No. Whatsapp:
              <a :href="whatsappHref(item.kontakWa)" target="_blank" rel="noopener" class="text-brand-500 underline">{{ item.kontakWa }}</a>
            </span>
          </dd>
        </div>

        <div class="flex flex-col gap-1 sm:flex-row sm:gap-2.5">
          <dt class="shrink-0 text-xs leading-[1.2] tracking-[-0.36px] text-black sm:w-[185px]">Alamat</dt>
          <dd class="flex min-w-0 flex-1 flex-col gap-1 text-xs text-ink-900">
            <span class="whitespace-pre-line">{{ item.alamat }}</span>
            <span class="text-ink-500">Kel. {{ item.kelurahan }}, Kec. {{ item.kecamatan }}, {{ item.provinsi }}</span>
          </dd>
        </div>

        <div class="flex flex-col gap-1 sm:flex-row sm:gap-2.5">
          <dt class="shrink-0 text-xs leading-[1.2] tracking-[-0.36px] text-black sm:w-[185px]">Link Google Maps</dt>
          <dd class="min-w-0 flex-1 text-xs">
            <a :href="item.mapsLink" target="_blank" rel="noopener" class="break-all text-brand-500 underline">{{ item.mapsLink }}</a>
          </dd>
        </div>

        <div class="flex flex-col gap-1 sm:flex-row sm:gap-2.5">
          <dt class="shrink-0 text-xs leading-[1.2] tracking-[-0.36px] text-black sm:w-[185px]">Fasilitas</dt>
          <dd class="min-w-0 flex-1 text-xs text-ink-900">
            <ul v-if="facilities.length" class="list-disc space-y-0.5 pl-4">
              <li v-for="facility in facilities" :key="facility.id">{{ facility.facility }}</li>
            </ul>
            <span v-else class="text-ink-500">-</span>
          </dd>
        </div>

        <div class="flex flex-col gap-1 sm:flex-row sm:gap-2.5">
          <dt class="shrink-0 text-xs leading-[1.2] tracking-[-0.36px] text-black sm:w-[185px]">Deskripsi</dt>
          <dd class="min-w-0 flex-1 text-xs whitespace-pre-line text-ink-900">{{ item.deskripsi || '-' }}</dd>
        </div>

        <div class="flex flex-col gap-1 sm:flex-row sm:gap-2.5">
          <dt class="shrink-0 text-xs leading-[1.2] tracking-[-0.36px] text-black sm:w-[185px]">Harga Tiket</dt>
          <dd class="min-w-0 flex-1 text-xs text-ink-900">{{ formatRupiah(item.hargaTiket) }}</dd>
        </div>

        <div class="flex flex-col gap-1 sm:flex-row sm:gap-2.5">
          <dt class="shrink-0 text-xs leading-[1.2] tracking-[-0.36px] text-black sm:w-[185px]">Service Objek Wisata</dt>
          <dd class="min-w-0 flex-1">
            <table v-if="services.length" class="w-full max-w-[420px] border-collapse text-left text-xs">
              <thead>
                <tr class="border-b-[0.5px] border-[#c6c6c8] font-medium text-black">
                  <th scope="col" class="py-2 pr-3 font-medium">Layanan</th>
                  <th scope="col" class="py-2 text-right font-medium">Harga</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="service in services" :key="service.id" class="border-b-[0.5px] border-[#c6c6c8]">
                  <td class="py-2 pr-3 text-ink-900">{{ service.serviceName }}</td>
                  <td class="py-2 text-right text-ink-900">{{ formatRupiah(service.price) }}</td>
                </tr>
              </tbody>
            </table>
            <span v-else class="text-xs text-ink-500">-</span>
          </dd>
        </div>

        <div class="flex flex-col gap-1 border-t-[0.5px] border-[#c6c6c8] pt-4 sm:flex-row sm:gap-2.5">
          <dt class="shrink-0 text-xs leading-[1.2] tracking-[-0.36px] text-black sm:w-[185px]">Riwayat</dt>
          <dd class="flex min-w-0 flex-1 flex-col gap-1 text-xs text-ink-500">
            <span>Dibuat: {{ formatDateTime(item.createdAt) }}</span>
            <span>Diperbarui: {{ formatDateTime(item.updatedAt) }}</span>
          </dd>
        </div>
      </dl>
    </section>
  </div>
</template>
