<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { ApiError } from '@/api/client'
import { errorMessageFor } from '@/api/errorMessages'
import { toLandingWisata, type LandingWisata } from '@/api/landing'
import { listWisata, WISATA_TYPE_LABELS } from '@/api/wisata'
import { listDistricts, listVillages } from '@/api/location'
import { REGION } from '@/config/region'
import type { LocationShortItem, PaginationMeta, Wisata, WisataType } from '@/api/types'
import AppPagination from '@/components/AppPagination.vue'
import MaskIcon from '@/components/MaskIcon.vue'
import PublicWisataCard from '@/components/public/PublicWisataCard.vue'
import iconHome from '@/assets/icons/home.svg'
import iconChevronRight from '@/assets/icons/chevron-right.svg'
import iconSearch from '@/assets/icons/search.svg'
import iconChevronDown from '@/assets/icons/chevron-down.svg'

const PAGE_SIZE = 10
const ALL_TYPES = Object.keys(WISATA_TYPE_LABELS) as WisataType[]

/** Rentang budget (harga tiket); disaring di sisi klien karena API belum punya filter harga. */
const BUDGETS = [
  { value: '', label: '-- Pilih Budget --' },
  { value: 'gratis', label: 'Gratis' },
  { value: 'lt50', label: 'Di bawah Rp 50.000' },
  { value: '50to100', label: 'Rp 50.000 – Rp 100.000' },
  { value: 'gt100', label: 'Di atas Rp 100.000' },
] as const
type Budget = (typeof BUDGETS)[number]['value']

const route = useRoute()

const rows = ref<Wisata[]>([])
const meta = ref<PaginationMeta>({ page: 1, limit: PAGE_SIZE, total: 0, totalPages: 0 })
const loading = ref(true)
const errorMessage = ref<string | null>(null)

const page = ref(1)
const search = ref('')
const kecamatan = ref('')
const kelurahan = ref('')
const popularity = ref<'desc' | 'asc'>('desc')
const types = ref<WisataType[]>(initialTypes())
const budget = ref<Budget>('')

/** Kecamatan di wilayah cakupan (API wilayah), bukan dari data wisata. */
const districts = ref<LocationShortItem[]>([])
/** Kelurahan di kecamatan yang dipilih. */
const villages = ref<LocationShortItem[]>([])
const districtsError = ref<string | null>(null)
let controller: AbortController | null = null

function initialTypes(): WisataType[] {
  const fromQuery = route.query.jenis
  const value = typeof fromQuery === 'string' ? (fromQuery as WisataType) : null
  return value && ALL_TYPES.includes(value) ? [value] : [...ALL_TYPES]
}

/** API hanya menerima satu `jenis`; kalau tepat satu dipilih, saring di server. */
const serverJenis = computed(() => (types.value.length === 1 ? types.value[0] : undefined))

async function loadDistricts() {
  districtsError.value = null
  try {
    districts.value = (await listDistricts(REGION.regencyCode)).data
  } catch (err) {
    districtsError.value = err instanceof ApiError ? errorMessageFor(err.code, err.message) : errorMessageFor('UNKNOWN_ERROR')
  }
}

async function loadVillages(districtName: string) {
  villages.value = []
  const district = districts.value.find((d) => d.name === districtName)
  if (!district) return
  try {
    villages.value = (await listVillages(district.id)).data
  } catch {
    // Dropdown kelurahan tetap kosong; filter kecamatan masih berjalan.
  }
}

async function load() {
  controller?.abort()
  const current = new AbortController()
  controller = current
  loading.value = true
  errorMessage.value = null
  try {
    const response = await listWisata(
      {
        page: page.value,
        limit: PAGE_SIZE,
        jenis: serverJenis.value,
        kecamatan: kecamatan.value || undefined,
        kelurahan: kelurahan.value || undefined,
      },
      current.signal,
    )
    rows.value = response.data
    meta.value = response.meta
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') return
    errorMessage.value = err instanceof ApiError ? errorMessageFor(err.code, err.message) : errorMessageFor('UNKNOWN_ERROR')
  } finally {
    // Permintaan yang sudah dibatalkan tidak boleh mematikan status memuat milik permintaan terbaru.
    if (controller === current) loading.value = false
  }
}

function matchesBudget(price: number): boolean {
  switch (budget.value) {
    case 'gratis':
      return price === 0
    case 'lt50':
      return price > 0 && price < 50000
    case '50to100':
      return price >= 50000 && price <= 100000
    case 'gt100':
      return price > 100000
    default:
      return true
  }
}

const cards = computed<LandingWisata[]>(() => {
  const term = search.value.trim().toLowerCase()
  const filtered = rows.value.filter(
    (row) =>
      (!term || row.nama.toLowerCase().includes(term)) &&
      types.value.includes(row.jenis) &&
      matchesBudget(row.hargaTiket),
  )
  // MOCK: backend belum punya data "paling banyak diminati"; urutan API dianggap tinggi→rendah.
  const ordered = popularity.value === 'asc' ? [...filtered].reverse() : filtered
  return ordered.map(toLandingWisata)
})

function refetchFromFirstPage() {
  page.value = 1
  void load()
}

function onPageChange(next: number) {
  page.value = next
  void load()
}

watch(kecamatan, (next) => {
  kelurahan.value = ''
  void loadVillages(next)
})
watch([kecamatan, kelurahan, serverJenis], refetchFromFirstPage)

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
      <!-- Filter menu (Figma 496:7815) -->
      <aside class="flex w-full shrink-0 flex-col gap-6 rounded-lg border border-ink-200 bg-white p-4 md:w-[240px]" aria-label="Filter" data-testid="public-list-filters">
        <div class="flex flex-col gap-1">
          <label for="pf-search" class="text-xs leading-none text-black">Cari</label>
          <div class="relative">
            <input
              id="pf-search"
              v-model="search"
              type="search"
              placeholder="Cari"
              class="cms-input w-full pr-9"
              data-testid="public-list-search"
            />
            <span class="pointer-events-none absolute inset-y-0 right-3 flex items-center text-ink-900"><MaskIcon :src="iconSearch" :size="16" /></span>
          </div>
        </div>

        <div class="flex flex-col gap-1">
          <label for="pf-kecamatan" class="text-xs leading-[1.4] text-ink-900">Kecamatan</label>
          <div class="relative">
            <select id="pf-kecamatan" v-model="kecamatan" class="cms-input w-full appearance-none pr-9 font-light" data-testid="public-list-kecamatan">
              <option value="">-- Pilih Kecamatan --</option>
              <option v-for="district in districts" :key="district.id" :value="district.name">{{ district.name }}</option>
            </select>
            <span class="pointer-events-none absolute inset-y-0 right-3 flex items-center text-ink-900"><MaskIcon :src="iconChevronDown" :size="16" /></span>
          </div>
          <p v-if="districtsError" class="text-[10px] text-[#ff383c]" role="alert" data-testid="public-list-kecamatan-error">
            Daftar kecamatan gagal dimuat. <button type="button" class="underline" @click="loadDistricts">Coba lagi</button>
          </p>
        </div>

        <div class="flex flex-col gap-1">
          <label for="pf-kelurahan" class="text-xs leading-[1.4] text-ink-900">Kelurahan</label>
          <div class="relative">
            <select id="pf-kelurahan" v-model="kelurahan" class="cms-input w-full appearance-none pr-9 font-light" :disabled="!kecamatan || villages.length === 0" data-testid="public-list-kelurahan">
              <option value="">-- Pilih Kelurahan --</option>
              <option v-for="village in villages" :key="village.id" :value="village.name">{{ village.name }}</option>
            </select>
            <span class="pointer-events-none absolute inset-y-0 right-3 flex items-center text-ink-900"><MaskIcon :src="iconChevronDown" :size="16" /></span>
          </div>
        </div>

        <fieldset class="flex flex-col gap-3" data-testid="public-list-popularity">
          <legend class="mb-3 text-sm font-semibold text-ink-900">Paling Banyak Diminati</legend>
          <label class="flex items-center gap-2 text-xs text-ink-900">
            <input v-model="popularity" type="radio" value="desc" class="accent-brand-500" data-testid="public-list-popularity-desc" />
            Tinggi ke rendah
          </label>
          <label class="flex items-center gap-2 text-xs text-ink-900">
            <input v-model="popularity" type="radio" value="asc" class="accent-brand-500" data-testid="public-list-popularity-asc" />
            Rendah ke tinggi
          </label>
        </fieldset>

        <fieldset class="flex flex-col gap-3" data-testid="public-list-types">
          <legend class="mb-3 text-sm font-semibold text-ink-900">Jenis Wisata</legend>
          <label v-for="(label, value) in WISATA_TYPE_LABELS" :key="value" class="flex items-center gap-2 text-xs text-ink-900">
            <input v-model="types" type="checkbox" :value="value" class="accent-brand-500" :data-testid="`public-list-type-${value}`" />
            {{ label }}
          </label>
        </fieldset>

        <div class="flex flex-col gap-1">
          <label for="pf-budget" class="text-xs leading-[1.4] text-ink-900">Budget</label>
          <div class="relative">
            <select id="pf-budget" v-model="budget" class="cms-input w-full appearance-none pr-9 font-light" data-testid="public-list-budget">
              <option v-for="option in BUDGETS" :key="option.value" :value="option.value">{{ option.label }}</option>
            </select>
            <span class="pointer-events-none absolute inset-y-0 right-3 flex items-center text-ink-900"><MaskIcon :src="iconChevronDown" :size="16" /></span>
          </div>
        </div>
      </aside>

      <!-- Grid (Figma 496:7851) -->
      <div class="flex min-w-0 flex-1 flex-col items-center gap-12">
        <p v-if="loading" class="py-10 text-xs text-ink-500" aria-live="polite" data-testid="public-list-loading">Memuat…</p>
        <div v-else-if="errorMessage" role="alert" class="flex flex-wrap items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700" data-testid="public-list-error">
          <span>{{ errorMessage }}</span>
          <button type="button" class="font-semibold underline" data-testid="public-list-retry" @click="load">Coba lagi</button>
        </div>
        <p v-else-if="cards.length === 0" class="py-10 text-xs text-ink-500" data-testid="public-list-empty">
          {{ rows.length === 0 ? 'Belum ada data yang ditambahkan.' : 'Data tidak ditemukan!' }}
        </p>
        <div v-else class="grid w-full grid-cols-1 gap-6 sm:grid-cols-2" data-testid="public-list-grid">
          <PublicWisataCard v-for="card in cards" :key="card.id" :item="card" variant="grid" :testid="`public-list-card-${card.id}`" />
        </div>

        <AppPagination v-if="meta.totalPages > 0" :page="meta.page" :total-pages="meta.totalPages" @change="onPageChange" />
      </div>
    </section>
  </div>
</template>
