<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { ApiError } from '@/api/client'
import { errorMessageFor } from '@/api/errorMessages'
import { listWisata } from '@/api/wisata'
import type { PaginationMeta, Wisata } from '@/api/types'
import { formatDate } from '@/utils/format'
import { useFlashStore } from '@/stores/flash'
import AppPagination from '@/components/AppPagination.vue'
import WisataTypeTag from '@/components/WisataTypeTag.vue'
import MaskIcon from '@/components/MaskIcon.vue'
import iconPlus from '@/assets/icons/plus.svg'
import iconSearch from '@/assets/icons/search.svg'
import iconChevronDown from '@/assets/icons/chevron-down.svg'
import iconEye from '@/assets/icons/eye-table.svg'
import iconEdit from '@/assets/icons/edit.svg'
import iconTrash from '@/assets/icons/trash-2.svg'

const PAGE_SIZE = 10
/** API maximum; used once to collect the kecamatan options. */
const OPTIONS_SAMPLE_LIMIT = 50

const rows = ref<Wisata[]>([])
const meta = ref<PaginationMeta>({ page: 1, limit: PAGE_SIZE, total: 0, totalPages: 0 })
const loading = ref(true)
const errorMessage = ref<string | null>(null)

const page = ref(1)
const kecamatan = ref('')
const search = ref('')
const kecamatanOptions = ref<string[]>([])

let controller: AbortController | null = null

/** Success notice handed over by the create page. */
const flash = useFlashStore()
const notice = ref<string | null>(flash.take())
let noticeTimer: ReturnType<typeof setTimeout> | null = null
if (notice.value) noticeTimer = setTimeout(() => (notice.value = null), 6000)

const filteredRows = computed(() => {
  const term = search.value.trim().toLowerCase()
  if (!term) return rows.value
  return rows.value.filter((row) => row.nama.toLowerCase().includes(term))
})

function mergeKecamatanOptions(items: Wisata[]) {
  const set = new Set(kecamatanOptions.value)
  for (const item of items) if (item.kecamatan) set.add(item.kecamatan)
  kecamatanOptions.value = [...set].sort((a, b) => a.localeCompare(b, 'id'))
}

async function load() {
  controller?.abort()
  controller = new AbortController()
  loading.value = true
  errorMessage.value = null
  try {
    const response = await listWisata(
      { page: page.value, limit: PAGE_SIZE, kecamatan: kecamatan.value || undefined },
      controller.signal,
    )
    rows.value = response.data
    meta.value = response.meta
    mergeKecamatanOptions(response.data)
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') return
    errorMessage.value = err instanceof ApiError ? errorMessageFor(err.code, err.message) : errorMessageFor('UNKNOWN_ERROR')
  } finally {
    loading.value = false
  }
}

/** Collect the distinct kecamatan values once so the dropdown is not limited to the current page. */
async function loadKecamatanOptions() {
  try {
    const response = await listWisata({ page: 1, limit: OPTIONS_SAMPLE_LIMIT })
    mergeKecamatanOptions(response.data)
  } catch {
    // The dropdown still fills from the pages the user visits.
  }
}

function onKecamatanChange() {
  page.value = 1
  void load()
}

function onPageChange(next: number) {
  page.value = next
  void load()
}


void load()
void loadKecamatanOptions()

onBeforeUnmount(() => {
  controller?.abort()
  if (noticeTimer) clearTimeout(noticeTimer)
})
</script>

<template>
  <div class="flex flex-col gap-4">
    <p
      v-if="notice"
      role="status"
      class="flex items-center justify-between gap-3 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-800"
    >
      {{ notice }}
      <button type="button" class="font-semibold underline" aria-label="Tutup pemberitahuan" @click="notice = null">Tutup</button>
    </p>

    <!-- Title card (Figma 177:1369) -->
    <section class="flex flex-wrap items-center gap-x-12 gap-y-3 rounded-[20px] bg-white p-4">
      <h2 class="text-xl leading-[1.2] font-semibold tracking-[-0.6px] text-ink-900">Daftar Destinasi Wisata</h2>
      <RouterLink
        :to="{ name: 'attractions-create' }"
        class="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-3 py-2 text-xs leading-none font-medium text-canvas transition hover:bg-brand-600 focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:outline-none"
      >
        Tambah Wisata
        <MaskIcon :src="iconPlus" :size="16" />
      </RouterLink>
    </section>

    <!-- List card (Figma 177:1372) -->
    <section class="flex flex-col items-center gap-8 rounded-[20px] bg-white px-4 py-8">
      <!-- Filters (Figma 177:1373) -->
      <div class="flex w-full flex-wrap justify-end gap-2.5">
        <div class="flex w-full flex-col gap-1 sm:w-[300px]">
          <label for="filter-kecamatan" class="text-xs leading-[1.4] text-ink-900">Kecamatan</label>
          <div class="relative">
            <select
              id="filter-kecamatan"
              v-model="kecamatan"
              class="block w-full appearance-none rounded-lg border border-ink-200 bg-white py-1 pr-9 pl-4 text-xs leading-none font-light text-black focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 focus:outline-none"
              @change="onKecamatanChange"
            >
              <option value="">-- Pilih Kecamatan --</option>
              <option v-for="option in kecamatanOptions" :key="option" :value="option">{{ option }}</option>
            </select>
            <span class="pointer-events-none absolute inset-y-0 right-3 flex items-center text-ink-900">
              <MaskIcon :src="iconChevronDown" :size="16" />
            </span>
          </div>
        </div>

        <div class="flex w-full flex-col gap-1 sm:w-[337px]">
          <label for="filter-search" class="text-xs leading-none text-black">Cari</label>
          <div class="relative">
            <input
              id="filter-search"
              v-model="search"
              type="search"
              placeholder="Cari"
              class="block w-full rounded-lg border border-ink-200 bg-white py-1 pr-10 pl-4 text-xs leading-none text-ink-900 placeholder:text-ink-300 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 focus:outline-none"
            />
            <span class="pointer-events-none absolute inset-y-0 right-4 flex items-center text-ink-900">
              <MaskIcon :src="iconSearch" :size="16" />
            </span>
          </div>
        </div>
      </div>

      <!-- Table (Figma 177:1379) -->
      <div class="w-full overflow-x-auto">
        <table class="w-full min-w-[720px] table-fixed border-collapse text-left text-xs">
          <colgroup>
            <col />
            <col class="w-[173px]" />
            <col class="w-[153px]" />
            <col class="w-[141px]" />
            <col class="w-[116px]" />
          </colgroup>
          <thead>
            <tr class="border-b-[0.5px] border-[#c6c6c8] font-medium text-black">
              <th scope="col" class="p-3 leading-none font-medium">Nama Destinasi Wisata</th>
              <th scope="col" class="p-3 leading-none font-medium">Jenis Wisata</th>
              <th scope="col" class="p-3 leading-none font-medium">Kecamatan</th>
              <th scope="col" class="p-3 leading-none font-medium">Tanggal Dibuat</th>
              <th scope="col" class="p-3 leading-none font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading" class="border-b-[0.5px] border-[#c6c6c8]">
              <td colspan="5" class="p-3 text-ink-500" aria-live="polite">Memuat…</td>
            </tr>
            <tr v-else-if="errorMessage" class="border-b-[0.5px] border-[#c6c6c8]">
              <td colspan="5" class="p-3">
                <div role="alert" class="flex flex-wrap items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-red-700">
                  <span>{{ errorMessage }}</span>
                  <button type="button" class="font-semibold underline" @click="load">Coba lagi</button>
                </div>
              </td>
            </tr>
            <tr v-else-if="filteredRows.length === 0" class="border-b-[0.5px] border-[#c6c6c8]">
              <td colspan="5" class="p-3 text-ink-500">
                {{ rows.length === 0 ? 'Belum ada data yang ditambahkan.' : 'Data tidak ditemukan!' }}
              </td>
            </tr>
            <tr v-for="row in filteredRows" v-else :key="row.id" class="border-b-[0.5px] border-[#c6c6c8]">
              <td class="p-3 leading-none text-black/70 wrap-break-word">{{ row.nama }}</td>
              <td class="p-3">
                <WisataTypeTag :jenis="row.jenis" />
              </td>
              <td class="p-3 leading-none font-light text-black">{{ row.kecamatan }}</td>
              <td class="p-3 leading-none font-light text-black">{{ formatDate(row.createdAt) }}</td>
              <td class="p-3">
                <div class="flex items-center gap-2.5 text-ink-900">
                  <RouterLink
                    :to="{ name: 'attractions-detail', params: { id: row.id } }"
                    class="rounded hover:text-brand-500"
                    :aria-label="`Lihat ${row.nama}`"
                  >
                    <MaskIcon :src="iconEye" :size="16" />
                  </RouterLink>
                  <RouterLink
                    :to="{ name: 'attractions-edit', params: { id: row.id } }"
                    class="rounded hover:text-brand-500"
                    :aria-label="`Ubah ${row.nama}`"
                  >
                    <MaskIcon :src="iconEdit" :size="16" />
                  </RouterLink>
                  <RouterLink
                    :to="{ name: 'attractions-delete', params: { id: row.id } }"
                    class="rounded hover:text-red-600"
                    :aria-label="`Hapus ${row.nama}`"
                  >
                    <MaskIcon :src="iconTrash" :size="16" />
                  </RouterLink>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination (Figma 177:1453) -->
      <AppPagination v-if="meta.totalPages > 0" :page="meta.page" :total-pages="meta.totalPages" @change="onPageChange" />
    </section>
  </div>
</template>
