<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { ApiError } from '@/api/client'
import { errorMessageFor } from '@/api/errorMessages'
import { listWisata } from '@/api/wisata'
import { listDistricts } from '@/api/location'
import { REGION } from '@/config/region'
import type { LocationShortItem, PaginationMeta, Wisata } from '@/api/types'
import { formatDate } from '@/utils/format'
import { useFlashStore } from '@/stores/flash'
import AppAlertDialog from '@/components/AppAlertDialog.vue'
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
/** Batas API per panggilan saat mengambil semua halaman untuk pencarian di klien. */
const FETCH_ALL_LIMIT = 50
/** Pengaman agar pengambilan semua halaman tidak tak berhingga. */
const FETCH_ALL_MAX_PAGES = 40

/** Mode server: satu halaman dari API. */
const rows = ref<Wisata[]>([])
const meta = ref<PaginationMeta>({ page: 1, limit: PAGE_SIZE, total: 0, totalPages: 0 })
/** Mode cari: semua baris untuk filter kecamatan saat ini, disaring dan dipaginasi di klien. */
const allRows = ref<Wisata[]>([])
/** Cache hasil "ambil semua halaman", dikunci oleh filter kecamatan. */
let allRowsCacheKey: string | null = null
const loading = ref(true)
const errorMessage = ref<string | null>(null)

const page = ref(1)
/** Kode kecamatan (mis. "18.13.01"); server menyaring dengan `kecamatan_id`. */
const kecamatan = ref('')
const search = ref('')
/** Kecamatan di wilayah cakupan (API wilayah). */
const districts = ref<LocationShortItem[]>([])

let controller: AbortController | null = null

/** Pesan sukses dari halaman tambah, ditampilkan sebagai dialog (Figma 525:8249). */
const flash = useFlashStore()
const notice = ref<string | null>(flash.take())

/** API belum punya parameter cari; pencarian nama memaksa mode klien agar pagination mengikuti jumlah hasil. */
const searchTerm = computed(() => search.value.trim().toLowerCase())
const searchActive = computed(() => searchTerm.value !== '')

const searchMatches = computed(() => allRows.value.filter((row) => row.nama.toLowerCase().includes(searchTerm.value)))

const filteredRows = computed(() =>
  searchActive.value ? searchMatches.value.slice((page.value - 1) * PAGE_SIZE, page.value * PAGE_SIZE) : rows.value,
)

const pageMeta = computed(() =>
  searchActive.value
    ? { page: page.value, totalPages: Math.ceil(searchMatches.value.length / PAGE_SIZE) }
    : { page: meta.value.page, totalPages: meta.value.totalPages },
)

const hasAnyData = computed(() => (searchActive.value ? allRows.value.length > 0 : rows.value.length > 0))

async function load() {
  const cacheKey = kecamatan.value
  if (searchActive.value && allRowsCacheKey === cacheKey) return
  controller?.abort()
  const current = new AbortController()
  controller = current
  loading.value = true
  errorMessage.value = null
  try {
    if (searchActive.value) {
      const collected: Wisata[] = []
      let pageNo = 1
      let totalPages = 1
      do {
        const response = await listWisata(
          { page: pageNo, limit: FETCH_ALL_LIMIT, kecamatan_id: kecamatan.value || undefined },
          current.signal,
        )
        collected.push(...response.data)
        totalPages = response.meta.totalPages
        pageNo += 1
      } while (pageNo <= totalPages && pageNo <= FETCH_ALL_MAX_PAGES)
      allRows.value = collected
      allRowsCacheKey = cacheKey
    } else {
      const response = await listWisata(
        { page: page.value, limit: PAGE_SIZE, kecamatan_id: kecamatan.value || undefined },
        current.signal,
      )
      rows.value = response.data
      meta.value = response.meta
    }
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') return
    errorMessage.value = err instanceof ApiError ? errorMessageFor(err.code, err.message) : errorMessageFor('UNKNOWN_ERROR')
  } finally {
    // Permintaan yang sudah dibatalkan tidak boleh mematikan status memuat milik permintaan terbaru.
    if (controller === current) loading.value = false
  }
}

async function loadDistricts() {
  try {
    districts.value = (await listDistricts(REGION.regencyCode)).data
  } catch {
    // Dropdown kecamatan kosong; tabel tetap bisa dipakai tanpa filter.
  }
}

function onKecamatanChange() {
  page.value = 1
  allRowsCacheKey = null
  void load()
}

function onPageChange(next: number) {
  page.value = next
  if (!searchActive.value) void load()
}

// Kata kunci berubah: kembali ke halaman 1; pindah mode memuat sumber data yang sesuai.
watch([searchActive, searchTerm], ([active], [wasActive]) => {
  page.value = 1
  if (active !== wasActive) void load()
})


void load()
void loadDistricts()

onBeforeUnmount(() => {
  controller?.abort()
})
</script>

<template>
  <div class="flex flex-col gap-4" data-testid="wisata-list-page">
    <AppAlertDialog :open="notice !== null" :title="notice ?? ''" testid="wisata-list-notice" @close="notice = null" />

    <!-- Title card (Figma 177:1369) -->
    <section data-testid="wisata-list-title-card" class="flex flex-wrap items-center gap-x-12 gap-y-3 rounded-[20px] bg-white p-4">
      <h2 data-testid="wisata-list-title" class="text-xl leading-[1.2] font-semibold tracking-[-0.6px] text-ink-900">Daftar Destinasi Wisata</h2>
      <RouterLink data-testid="wisata-list-add"
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
            <select data-testid="wisata-filter-kecamatan"
              id="filter-kecamatan"
              v-model="kecamatan"
              class="block w-full appearance-none rounded-lg border border-ink-200 bg-white py-1 pr-9 pl-4 text-xs leading-none font-light text-black focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 focus:outline-none"
              @change="onKecamatanChange"
            >
              <option value="">-- Pilih Kecamatan --</option>
              <option v-for="district in districts" :key="district.id" :value="district.id">{{ district.name }}</option>
            </select>
            <span class="pointer-events-none absolute inset-y-0 right-3 flex items-center text-ink-900">
              <MaskIcon :src="iconChevronDown" :size="16" />
            </span>
          </div>
        </div>

        <div class="flex w-full flex-col gap-1 sm:w-[337px]">
          <label for="filter-search" class="text-xs leading-none text-black">Cari</label>
          <div class="relative">
            <input data-testid="wisata-filter-search"
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
        <table data-testid="wisata-table" class="w-full min-w-[720px] table-fixed border-collapse text-left text-xs">
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
            <tr data-testid="wisata-table-loading" v-if="loading" class="border-b-[0.5px] border-[#c6c6c8]">
              <td colspan="5" class="p-3 text-ink-500" aria-live="polite">Memuat…</td>
            </tr>
            <tr data-testid="wisata-table-error" v-else-if="errorMessage" class="border-b-[0.5px] border-[#c6c6c8]">
              <td colspan="5" class="p-3">
                <div role="alert" class="flex flex-wrap items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-red-700">
                  <span>{{ errorMessage }}</span>
                  <button data-testid="wisata-table-retry" type="button" class="font-semibold underline" @click="load">Coba lagi</button>
                </div>
              </td>
            </tr>
            <tr data-testid="wisata-table-empty" v-else-if="filteredRows.length === 0" class="border-b-[0.5px] border-[#c6c6c8]">
              <td colspan="5" class="p-3 text-ink-500">
                {{ hasAnyData ? 'Data tidak ditemukan!' : 'Belum ada data yang ditambahkan.' }}
              </td>
            </tr>
            <tr :data-testid="`wisata-row-${row.id}`" v-for="row in filteredRows" v-else :key="row.id" class="border-b-[0.5px] border-[#c6c6c8]">
              <td :data-testid="`wisata-row-${row.id}-nama`" class="p-3 leading-none text-black/70 wrap-break-word">{{ row.nama }}</td>
              <td class="p-3" :data-testid="`wisata-row-${row.id}-jenis`">
                <WisataTypeTag :jenis="row.jenis" />
              </td>
              <td class="p-3 leading-none font-light text-black" :data-testid="`wisata-row-${row.id}-kecamatan`">{{ row.kecamatan }}</td>
              <td class="p-3 leading-none font-light text-black" :data-testid="`wisata-row-${row.id}-tanggal`">{{ formatDate(row.createdAt) }}</td>
              <td class="p-3">
                <div class="flex items-center gap-2.5 text-ink-900">
                  <RouterLink :data-testid="`wisata-row-${row.id}-view`"
                    :to="{ name: 'attractions-detail', params: { id: row.id } }"
                    class="rounded hover:text-brand-500"
                    :aria-label="`Lihat ${row.nama}`"
                  >
                    <MaskIcon :src="iconEye" :size="16" />
                  </RouterLink>
                  <RouterLink :data-testid="`wisata-row-${row.id}-edit`"
                    :to="{ name: 'attractions-edit', params: { id: row.id } }"
                    class="rounded hover:text-brand-500"
                    :aria-label="`Ubah ${row.nama}`"
                  >
                    <MaskIcon :src="iconEdit" :size="16" />
                  </RouterLink>
                  <RouterLink :data-testid="`wisata-row-${row.id}-delete`"
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
      <AppPagination v-if="pageMeta.totalPages > 0" :page="pageMeta.page" :total-pages="pageMeta.totalPages" @change="onPageChange" />
    </section>
  </div>
</template>
