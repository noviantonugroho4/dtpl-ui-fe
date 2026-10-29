<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { ApiError } from '@/api/client'
import { errorMessageFor } from '@/api/errorMessages'
import { toLandingWisata, type LandingWisata } from '@/api/landing'
import { listWisata, WISATA_TYPE_LABELS, type ListWisataParams } from '@/api/wisata'
import { listDistricts, listVillages } from '@/api/location'
import { REGION } from '@/config/region'
import type { LocationShortItem, Wisata, WisataType } from '@/api/types'
import AppPagination from '@/components/AppPagination.vue'
import MaskIcon from '@/components/MaskIcon.vue'
import PublicWisataCard from '@/components/public/PublicWisataCard.vue'
import iconHome from '@/assets/icons/home.svg'
import iconChevronRight from '@/assets/icons/chevron-right.svg'
import iconSearch from '@/assets/icons/search.svg'
import iconChevronDown from '@/assets/icons/chevron-down.svg'
import iconFilter from '@/assets/icons/filter.svg'

const PAGE_SIZE = 10
/** Batas API per panggilan saat mengambil semua halaman untuk penyaringan di klien. */
const FETCH_ALL_LIMIT = 50
/** Pengaman agar pengambilan semua halaman tidak tak berhingga. */
const FETCH_ALL_MAX_PAGES = 40
const ALL_TYPES = Object.keys(WISATA_TYPE_LABELS) as WisataType[]
/** Urutan checkbox Jenis Wisata sesuai Figma 666:12139. */
const TYPE_ORDER: WisataType[] = ['wisata_bahari', 'wisata_alam', 'wisata_rekreasi', 'wisata_budaya_dan_sejarah']

/** Rentang harga tiket sesuai PRD; disaring di sisi klien karena API belum punya filter harga. */
const PRICE_RANGES = [
  { value: '', label: '-- Pilih Harga --', min: 0, max: Infinity },
  { value: 'lt50k', label: '< Rp 50.000', min: 0, max: 49999 },
  { value: '50k-200k', label: 'Rp 50.000 – Rp 200.000', min: 50000, max: 200000 },
  { value: '200k-500k', label: 'Rp 200.001 – Rp 500.000', min: 200001, max: 500000 },
  { value: '500k-1m', label: 'Rp 500.001 – Rp 1.000.000', min: 500001, max: 1000000 },
  { value: 'gt1m', label: '> Rp 1.000.000', min: 1000001, max: Infinity },
] as const
type PriceRange = (typeof PRICE_RANGES)[number]['value']

const route = useRoute()

/** Mode server: satu halaman dari API. */
const rows = ref<Wisata[]>([])
const serverTotalPages = ref(0)
/** Mode klien: semua baris yang cocok dengan filter server, disaring lagi di klien. */
const allRows = ref<Wisata[]>([])
const loading = ref(true)
const errorMessage = ref<string | null>(null)

const page = ref(1)
const search = ref('')
/** Teks yang diketik di kolom kecamatan/kelurahan; filter baru aktif bila cocok dengan nama di daftar. */
const kecamatanInput = ref('')
const kelurahanInput = ref('')
const popularity = ref<'desc' | 'asc'>('desc')
const types = ref<WisataType[]>(initialTypes())
const harga = ref<PriceRange>('')

/** Kecamatan di wilayah cakupan (API wilayah), bukan dari data wisata. */
const districts = ref<LocationShortItem[]>([])
/** Kelurahan di kecamatan yang dipilih. */
const villages = ref<LocationShortItem[]>([])
const districtsError = ref<string | null>(null)
let controller: AbortController | null = null
/** Cache hasil "ambil semua halaman", dikunci oleh filter server. */
let allRowsCacheKey: string | null = null

function initialTypes(): WisataType[] {
  const fromQuery = route.query.jenis
  const value = typeof fromQuery === 'string' ? (fromQuery as WisataType) : null
  return value && ALL_TYPES.includes(value) ? [value] : [...ALL_TYPES]
}

function matchName(list: LocationShortItem[], input: string): LocationShortItem | null {
  const term = input.trim().toLowerCase()
  return term ? (list.find((item) => item.name.toLowerCase() === term) ?? null) : null
}
/** Wilayah yang cocok dengan teks; server menyaring berdasarkan kodenya (`kecamatan_id`/`kelurahan_id`). */
const kecamatan = computed(() => matchName(districts.value, kecamatanInput.value))
const kelurahan = computed(() => matchName(villages.value, kelurahanInput.value))

/** Tidak ada jenis dicentang = semua jenis (bukan hasil kosong). */
const activeTypes = computed<WisataType[]>(() => (types.value.length === 0 ? ALL_TYPES : types.value))

/** Checkbox "Semua Jenis Wisata": tercentang bila semua jenis dicentang; klik = centang/lepas semua. */
const allTypesChecked = computed({
  get: () => types.value.length === ALL_TYPES.length,
  set: (checked: boolean) => {
    types.value = checked ? [...ALL_TYPES] : []
  },
})

function clearFilters() {
  search.value = ''
  kecamatanInput.value = ''
  kelurahanInput.value = ''
  popularity.value = 'desc'
  types.value = [...ALL_TYPES]
  harga.value = ''
}

/** API hanya menerima satu `jenis`; kalau tepat satu dipilih, saring di server. */
const serverJenis = computed(() => (activeTypes.value.length === 1 ? activeTypes.value[0] : undefined))
const serverParams = computed<ListWisataParams>(() => ({
  jenis: serverJenis.value,
  kecamatan_id: kecamatan.value?.id,
  kelurahan_id: kelurahan.value?.id,
}))
const serverKey = computed(() => JSON.stringify(serverParams.value))

/**
 * Filter yang tidak didukung API (cari, harga, beberapa jenis sekaligus) memaksa
 * mode klien: semua halaman diambil lalu disaring dan dipaginasi di sini, sehingga
 * nomor halaman selalu mencerminkan jumlah hasil.
 */
const clientFilterActive = computed(
  () =>
    search.value.trim() !== '' ||
    harga.value !== '' ||
    (activeTypes.value.length !== ALL_TYPES.length && activeTypes.value.length !== 1),
)

async function loadDistricts() {
  districtsError.value = null
  try {
    districts.value = (await listDistricts(REGION.regencyCode)).data
  } catch (err) {
    districtsError.value = err instanceof ApiError ? errorMessageFor(err.code, err.message) : errorMessageFor('UNKNOWN_ERROR')
  }
}

async function loadVillages(district: LocationShortItem | null) {
  villages.value = []
  if (!district) return
  try {
    villages.value = (await listVillages(district.id)).data
  } catch {
    // Dropdown kelurahan tetap kosong; filter kecamatan masih berjalan.
  }
}

function startRequest(): AbortController {
  controller?.abort()
  const current = new AbortController()
  controller = current
  loading.value = true
  errorMessage.value = null
  return current
}

function finishRequest(current: AbortController, err?: unknown) {
  if (err instanceof DOMException && err.name === 'AbortError') return
  if (err !== undefined) {
    errorMessage.value = err instanceof ApiError ? errorMessageFor(err.code, err.message) : errorMessageFor('UNKNOWN_ERROR')
  }
  // Permintaan yang sudah dibatalkan tidak boleh mematikan status memuat milik permintaan terbaru.
  if (controller === current) loading.value = false
}

/** Mode server: satu halaman. */
async function loadPage() {
  const current = startRequest()
  try {
    const response = await listWisata({ ...serverParams.value, page: page.value, limit: PAGE_SIZE }, current.signal)
    rows.value = response.data
    serverTotalPages.value = response.meta.totalPages
    finishRequest(current)
  } catch (err) {
    finishRequest(current, err)
  }
}

/** Mode klien: semua halaman untuk filter server saat ini (di-cache). */
async function loadAll() {
  if (allRowsCacheKey === serverKey.value) return
  const current = startRequest()
  try {
    const collected: Wisata[] = []
    let pageNo = 1
    let totalPages = 1
    do {
      const response = await listWisata({ ...serverParams.value, page: pageNo, limit: FETCH_ALL_LIMIT }, current.signal)
      collected.push(...response.data)
      totalPages = response.meta.totalPages
      pageNo += 1
    } while (pageNo <= totalPages && pageNo <= FETCH_ALL_MAX_PAGES)
    allRows.value = collected
    allRowsCacheKey = serverKey.value
    finishRequest(current)
  } catch (err) {
    finishRequest(current, err)
  }
}

function load() {
  return clientFilterActive.value ? loadAll() : loadPage()
}

function matchesPrice(price: number): boolean {
  const range = PRICE_RANGES.find((r) => r.value === harga.value) ?? PRICE_RANGES[0]
  return price >= range.min && price <= range.max
}

const filteredAll = computed(() => {
  const term = search.value.trim().toLowerCase()
  return allRows.value.filter(
    (row) => (!term || row.nama.toLowerCase().includes(term)) && activeTypes.value.includes(row.jenis) && matchesPrice(row.hargaTiket),
  )
})

/** Halaman yang ditampilkan: dari server, atau potongan hasil saringan klien. */
const pageMeta = computed(() =>
  clientFilterActive.value
    ? { page: page.value, totalPages: Math.ceil(filteredAll.value.length / PAGE_SIZE) }
    : { page: page.value, totalPages: serverTotalPages.value },
)

const cards = computed<LandingWisata[]>(() => {
  const source = clientFilterActive.value ? filteredAll.value.slice((page.value - 1) * PAGE_SIZE, page.value * PAGE_SIZE) : rows.value
  // MOCK: backend belum punya data "paling banyak diminati"; urutan API dianggap tinggi→rendah.
  const ordered = popularity.value === 'asc' ? [...source].reverse() : source
  return ordered.map(toLandingWisata)
})

const hasAnyData = computed(() => (clientFilterActive.value ? allRows.value.length > 0 : rows.value.length > 0))

function onPageChange(next: number) {
  page.value = next
  if (!clientFilterActive.value) void loadPage()
}

watch(kecamatan, (next) => {
  kelurahanInput.value = ''
  void loadVillages(next)
})
// Filter server berubah: mulai dari halaman 1 dan muat ulang sesuai mode.
watch(serverKey, () => {
  page.value = 1
  void load()
})
// Filter klien berubah: kembali ke halaman 1; pindah mode memuat sumber data yang sesuai.
watch([clientFilterActive, search, harga, () => activeTypes.value.join(',')], ([active], [wasActive]) => {
  page.value = 1
  if (active !== wasActive) void load()
})

void load()
void loadDistricts()
onBeforeUnmount(() => controller?.abort())
</script>

<template>
  <div class="mx-auto flex w-full max-w-[1021px] flex-col items-center gap-4 px-4 pt-6 pb-8 lg:pt-[100px]" data-testid="public-list-page">
    <!-- Breadcrumb (Figma 496:7803) -->
    <nav class="flex w-full items-center gap-1 px-2 text-xs text-black sm:px-8" aria-label="Breadcrumb" data-testid="public-list-breadcrumb">
      <RouterLink :to="{ name: 'home' }" aria-label="Beranda" class="text-ink-900"><MaskIcon :src="iconHome" :size="16" /></RouterLink>
      <MaskIcon :src="iconChevronRight" :size="16" />
      <RouterLink :to="{ name: 'home' }" class="hover:underline">Beranda</RouterLink>
      <MaskIcon :src="iconChevronRight" :size="16" />
      <span aria-current="page">Destinasi Wisata</span>
    </nav>

    <!-- Title card (Figma 496:7810) -->
    <section class="w-full rounded-[20px] bg-white px-8 py-4">
      <h1 class="text-xl leading-[1.2] font-semibold tracking-[-0.6px] text-ink-900" data-testid="public-list-title">Daftar Destinasi Wisata</h1>
    </section>

    <!-- Results (Figma 496:7814) -->
    <section class="flex w-full flex-col gap-6 rounded-[20px] bg-white p-4 sm:p-8 md:flex-row md:items-start">
      <!-- Filter menu (Figma 666:12139) -->
      <aside class="flex w-full shrink-0 flex-col gap-6 rounded-lg border border-ink-200 bg-white p-5 md:w-[260px]" aria-label="Filter" data-testid="public-list-filters">
        <div class="flex flex-col gap-2">
          <label for="pf-search" class="text-sm leading-[1.4] text-ink-900">Cari</label>
          <div class="relative">
            <input
              id="pf-search"
              v-model="search"
              type="search"
              placeholder="Cari"
              class="cms-input h-9 w-full rounded-xl pr-10 text-sm"
              data-testid="public-list-search"
            />
            <span class="pointer-events-none absolute inset-y-0 right-3 flex items-center text-ink-900"><MaskIcon :src="iconSearch" :size="18" /></span>
          </div>
        </div>

        <div class="flex flex-col gap-2">
          <label for="pf-kecamatan" class="text-sm leading-[1.4] text-ink-900">Kecamatan</label>
          <div class="relative">
            <input
              id="pf-kecamatan"
              v-model="kecamatanInput"
              type="text"
              list="pf-kecamatan-options"
              autocomplete="off"
              placeholder="-- Pilih Kecamatan --"
              class="cms-input h-9 w-full rounded-xl pr-10 text-sm placeholder:text-ink-900"
              data-testid="public-list-kecamatan"
            />
            <datalist id="pf-kecamatan-options" data-testid="public-list-kecamatan-options">
              <option v-for="district in districts" :key="district.id" :value="district.name" />
            </datalist>
            <span class="pointer-events-none absolute inset-y-0 right-3 flex items-center text-ink-900"><MaskIcon :src="iconChevronDown" :size="18" /></span>
          </div>
          <p v-if="districtsError" class="text-[10px] text-[#ff383c]" role="alert" data-testid="public-list-kecamatan-error">
            Daftar kecamatan gagal dimuat. <button type="button" class="underline" @click="loadDistricts">Coba lagi</button>
          </p>
        </div>

        <div class="flex flex-col gap-2">
          <label for="pf-kelurahan" class="text-sm leading-[1.4] text-ink-900">Kelurahan</label>
          <div class="relative">
            <input
              id="pf-kelurahan"
              v-model="kelurahanInput"
              type="text"
              list="pf-kelurahan-options"
              autocomplete="off"
              placeholder="-- Pilih Kelurahan --"
              class="cms-input h-9 w-full rounded-xl pr-10 text-sm placeholder:text-ink-900"
              :disabled="!kecamatan || villages.length === 0"
              data-testid="public-list-kelurahan"
            />
            <datalist id="pf-kelurahan-options" data-testid="public-list-kelurahan-options">
              <option v-for="village in villages" :key="village.id" :value="village.name" />
            </datalist>
            <span class="pointer-events-none absolute inset-y-0 right-3 flex items-center text-ink-900"><MaskIcon :src="iconChevronDown" :size="18" /></span>
          </div>
        </div>

        <fieldset class="flex flex-col gap-3" data-testid="public-list-popularity">
          <legend class="mb-3 text-sm leading-[1.4] text-ink-900">Paling Banyak Diminati</legend>
          <label class="flex items-center gap-3 text-sm text-ink-900">
            <input v-model="popularity" type="radio" value="desc" class="size-4 accent-ink-900" data-testid="public-list-popularity-desc" />
            Tinggi ke rendah
          </label>
          <label class="flex items-center gap-3 text-sm text-ink-900">
            <input v-model="popularity" type="radio" value="asc" class="size-4 accent-ink-900" data-testid="public-list-popularity-asc" />
            Rendah ke tinggi
          </label>
        </fieldset>

        <fieldset class="flex flex-col gap-3" data-testid="public-list-types">
          <legend class="mb-3 text-sm leading-[1.4] text-ink-900">Jenis Wisata</legend>
          <label class="flex items-center gap-3 text-sm text-ink-900">
            <input v-model="allTypesChecked" type="checkbox" class="size-4 accent-ink-900" data-testid="public-list-type-all" />
            Semua Jenis Wisata
          </label>
          <label v-for="value in TYPE_ORDER" :key="value" class="flex items-center gap-3 text-sm text-ink-900">
            <input v-model="types" type="checkbox" :value="value" class="size-4 accent-ink-900" :data-testid="`public-list-type-${value}`" />
            {{ WISATA_TYPE_LABELS[value] }}
          </label>
        </fieldset>

        <div class="flex flex-col gap-2">
          <label for="pf-harga" class="text-sm leading-[1.4] text-ink-900">Harga</label>
          <div class="relative">
            <select id="pf-harga" v-model="harga" class="cms-input h-9 w-full appearance-none rounded-xl pr-10 text-sm" data-testid="public-list-harga">
              <option v-for="option in PRICE_RANGES" :key="option.value" :value="option.value">{{ option.label }}</option>
            </select>
            <span class="pointer-events-none absolute inset-y-0 right-3 flex items-center text-ink-900"><MaskIcon :src="iconChevronDown" :size="18" /></span>
          </div>
        </div>

        <button
          type="button"
          class="flex w-fit items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:outline-none"
          data-testid="public-list-clear"
          @click="clearFilters"
        >
          <MaskIcon :src="iconFilter" :size="18" />
          Bersihkan Filter
        </button>
      </aside>

      <!-- Grid (Figma 496:7851) -->
      <div class="flex min-w-0 flex-1 flex-col items-center gap-12">
        <p v-if="loading" class="py-10 text-xs text-ink-500" aria-live="polite" data-testid="public-list-loading">Memuat…</p>
        <div v-else-if="errorMessage" role="alert" class="flex flex-wrap items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700" data-testid="public-list-error">
          <span>{{ errorMessage }}</span>
          <button type="button" class="font-semibold underline" data-testid="public-list-retry" @click="load">Coba lagi</button>
        </div>
        <p v-else-if="cards.length === 0" class="py-10 text-xs text-ink-500" data-testid="public-list-empty">
          {{ hasAnyData ? 'Data tidak ditemukan!' : 'Belum ada data yang ditambahkan.' }}
        </p>
        <div v-else class="grid w-full grid-cols-1 gap-6 sm:grid-cols-2" data-testid="public-list-grid">
          <PublicWisataCard v-for="card in cards" :key="card.id" :item="card" variant="grid" :testid="`public-list-card-${card.id}`" />
        </div>

        <AppPagination v-if="pageMeta.totalPages > 1" :page="pageMeta.page" :total-pages="pageMeta.totalPages" @change="onPageChange" />
      </div>
    </section>
  </div>
</template>
