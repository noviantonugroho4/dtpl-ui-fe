<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { ApiError } from '@/api/client'
import { errorMessageFor } from '@/api/errorMessages'
import { listDistricts, listProvinces, listRegencies, listVillages } from '@/api/location'
import {
  createWisata,
  uploadWisataImage,
  WISATA_DESCRIPTION_MAX,
  WISATA_IMAGE_MAX_BYTES,
  WISATA_IMAGE_MIMES,
  WISATA_MAX_FACILITIES,
  WISATA_MAX_IMAGES,
  WISATA_NAME_MAX,
  WISATA_TYPE_LABELS,
} from '@/api/wisata'
import type { CreateWisataRequest, LocationShortItem, WisataImageInput, WisataType } from '@/api/types'
import { useAuthStore } from '@/stores/auth'
import { useFlashStore } from '@/stores/flash'
import FormRow from '@/components/form/FormRow.vue'
import MaskIcon from '@/components/MaskIcon.vue'
import iconCornerUpLeft from '@/assets/icons/corner-up-left.svg'
import iconPlusSquare from '@/assets/icons/plus-square.svg'
import iconChevronDown from '@/assets/icons/chevron-down.svg'
import iconSave from '@/assets/icons/save.svg'
import iconX from '@/assets/icons/x.svg'

const router = useRouter()
const auth = useAuthStore()
const flash = useFlashStore()

// ---- form state ----------------------------------------------------------

interface ServiceRow {
  key: number
  name: string
  price: string
}

interface ImageItem {
  key: number
  file: File
  previewUrl: string | null
  status: 'uploading' | 'done' | 'failed'
  error: string | null
  uploaded: WisataImageInput | null
}

const form = reactive({
  nama: '',
  jenis: '' as WisataType | '',
  telp: '',
  wa: '',
  alamat: '',
  provinsi: '',
  kabupaten: '',
  kecamatan: '',
  kelurahan: '',
  kodePos: '',
  mapsLink: '',
  deskripsi: '',
  hargaTiket: '',
})
const fasilitas = ref<string[]>([''])
const services = ref<ServiceRow[]>([{ key: 0, name: '', price: '' }])
const images = ref<ImageItem[]>([])
let nextKey = 1

const errors = reactive<Record<string, string | null>>({})
const submitted = ref(false)
const submitting = ref(false)
const formError = ref<string | null>(null)

// ---- location chain ------------------------------------------------------

const provinces = ref<LocationShortItem[]>([])
const regencies = ref<LocationShortItem[]>([])
const districts = ref<LocationShortItem[]>([])
const villages = ref<LocationShortItem[]>([])
const locationError = ref<string | null>(null)

function nameOf(list: LocationShortItem[], id: string): string {
  return list.find((item) => item.id === id)?.name ?? ''
}

async function loadProvinces() {
  locationError.value = null
  try {
    provinces.value = (await listProvinces()).data
  } catch (err) {
    locationError.value = err instanceof ApiError ? errorMessageFor(err.code, err.message) : errorMessageFor('UNKNOWN_ERROR')
  }
}

async function onProvinceChange() {
  form.kabupaten = ''
  form.kecamatan = ''
  form.kelurahan = ''
  form.kodePos = ''
  regencies.value = []
  districts.value = []
  villages.value = []
  if (!form.provinsi) return
  try {
    regencies.value = (await listRegencies(form.provinsi)).data
  } catch (err) {
    errors.kabupaten = err instanceof ApiError ? errorMessageFor(err.code, err.message) : errorMessageFor('UNKNOWN_ERROR')
  }
}

async function onRegencyChange() {
  form.kecamatan = ''
  form.kelurahan = ''
  form.kodePos = ''
  districts.value = []
  villages.value = []
  if (!form.kabupaten) return
  try {
    districts.value = (await listDistricts(form.kabupaten)).data
  } catch (err) {
    errors.kecamatan = err instanceof ApiError ? errorMessageFor(err.code, err.message) : errorMessageFor('UNKNOWN_ERROR')
  }
}

async function onDistrictChange() {
  form.kelurahan = ''
  form.kodePos = ''
  villages.value = []
  if (!form.kecamatan) return
  try {
    villages.value = (await listVillages(form.kecamatan)).data
  } catch (err) {
    errors.kelurahan = err instanceof ApiError ? errorMessageFor(err.code, err.message) : errorMessageFor('UNKNOWN_ERROR')
  }
}

function onVillageChange() {
  form.kodePos = villages.value.find((v) => v.id === form.kelurahan)?.postal_code ?? ''
}

// ---- images --------------------------------------------------------------

const fileInput = ref<HTMLInputElement | null>(null)

function previewFor(file: File): string | null {
  return typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function' ? URL.createObjectURL(file) : null
}

function releasePreview(item: ImageItem) {
  if (item.previewUrl && typeof URL.revokeObjectURL === 'function') URL.revokeObjectURL(item.previewUrl)
}

function validateFile(file: File): string | null {
  if (!(WISATA_IMAGE_MIMES as readonly string[]).includes(file.type)) return 'Format harus JPG atau PNG.'
  if (file.size > WISATA_IMAGE_MAX_BYTES) return 'Ukuran gambar maksimal 150 KB.'
  return null
}

async function uploadItem(item: ImageItem) {
  item.status = 'uploading'
  item.error = null
  try {
    const { data } = await uploadWisataImage(item.file, auth.token ?? '')
    item.uploaded = {
      webdavUrl: data.webdavUrl,
      webdavKey: data.webdavKey,
      mime: data.mime as WisataImageInput['mime'],
      sizeBytes: data.sizeBytes,
    }
    item.status = 'done'
  } catch (err) {
    item.status = 'failed'
    item.error = err instanceof ApiError ? errorMessageFor(err.code, err.message) : 'Unggah gagal. Coba lagi.'
  }
}

function onFilesSelected(event: Event) {
  const input = event.target as HTMLInputElement
  const files = Array.from(input.files ?? [])
  input.value = ''
  errors.images = null
  for (const file of files) {
    if (images.value.length >= WISATA_MAX_IMAGES) {
      errors.images = `Maksimal ${WISATA_MAX_IMAGES} gambar.`
      break
    }
    const problem = validateFile(file)
    if (problem) {
      errors.images = problem
      continue
    }
    const item: ImageItem = reactive({
      key: nextKey++,
      file,
      previewUrl: previewFor(file),
      status: 'uploading',
      error: null,
      uploaded: null,
    })
    images.value.push(item)
    void uploadItem(item)
  }
}

function removeImage(item: ImageItem) {
  releasePreview(item)
  images.value = images.value.filter((i) => i.key !== item.key)
  if (images.value.length < WISATA_MAX_IMAGES && errors.images?.startsWith('Maksimal')) errors.images = null
}

onBeforeUnmount(() => images.value.forEach(releasePreview))

// ---- dynamic lists -------------------------------------------------------

function addFacility() {
  if (fasilitas.value.length < WISATA_MAX_FACILITIES) fasilitas.value.push('')
}
function removeFacility(index: number) {
  fasilitas.value.splice(index, 1)
  if (fasilitas.value.length === 0) fasilitas.value.push('')
}
function addService() {
  services.value.push({ key: nextKey++, name: '', price: '' })
}
function removeService(index: number) {
  services.value.splice(index, 1)
  if (services.value.length === 0) services.value.push({ key: nextKey++, name: '', price: '' })
}

// ---- validation ----------------------------------------------------------

const PHONE_DIGITS = /^[0-9]{8,13}$/
const MAPS_HOSTS = ['google.com/maps', 'google.co.id/maps', 'maps.app.goo.gl', 'goo.gl/maps', 'maps.google.']

function phoneDigits(raw: string): string {
  return raw.replace(/\D/g, '').replace(/^(62|0)+/, '')
}

function isMapsLink(value: string): boolean {
  try {
    const url = new URL(value)
    if (!['http:', 'https:'].includes(url.protocol)) return false
    return MAPS_HOSTS.some((host) => `${url.host}${url.pathname}`.includes(host))
  } catch {
    return false
  }
}

function parsePrice(raw: string): number | null {
  if (raw.trim() === '') return null
  const value = Number(raw.replace(/[^\d.]/g, ''))
  return Number.isFinite(value) && value >= 0 ? value : Number.NaN
}

const cleanFacilities = computed(() => fasilitas.value.map((f) => f.trim()).filter(Boolean))
const activeServices = computed(() => services.value.filter((s) => s.name.trim() || s.price.trim()))

function validate(): boolean {
  for (const key of Object.keys(errors)) errors[key] = null
  const required = 'Wajib diisi.'

  if (!form.nama.trim()) errors.nama = required
  else if (form.nama.trim().length > WISATA_NAME_MAX) errors.nama = `Nama wisata maksimal ${WISATA_NAME_MAX} karakter.`

  if (images.value.length === 0) errors.images = 'Unggah minimal 1 gambar.'
  else if (images.value.some((i) => i.status !== 'done')) errors.images = 'Tunggu hingga semua gambar selesai diunggah.'

  if (!form.jenis) errors.jenis = 'Pilih jenis wisata.'

  const telp = phoneDigits(form.telp)
  if (!telp) errors.telp = required
  else if (!PHONE_DIGITS.test(telp)) errors.telp = 'Nomor telepon harus 8–13 digit setelah +62.'
  const wa = phoneDigits(form.wa)
  if (wa && !PHONE_DIGITS.test(wa)) errors.wa = 'Nomor WhatsApp harus 8–13 digit setelah +62.'

  if (!form.alamat.trim()) errors.alamat = required
  if (!form.provinsi) errors.provinsi = 'Pilih provinsi.'
  if (!form.kabupaten) errors.kabupaten = 'Pilih kabupaten/kota.'
  if (!form.kecamatan) errors.kecamatan = 'Pilih kecamatan.'
  if (!form.kelurahan) errors.kelurahan = 'Pilih kelurahan.'
  if (!form.kodePos) errors.kodePos = 'Kode pos belum tersedia untuk kelurahan ini.'

  if (!form.mapsLink.trim()) errors.mapsLink = required
  else if (!isMapsLink(form.mapsLink.trim())) errors.mapsLink = 'Masukkan tautan Google Maps yang valid.'

  if (cleanFacilities.value.length === 0) errors.fasilitas = 'Isi minimal 1 fasilitas.'
  else if (cleanFacilities.value.length > WISATA_MAX_FACILITIES) errors.fasilitas = `Maksimal ${WISATA_MAX_FACILITIES} fasilitas.`

  if (form.deskripsi.length > WISATA_DESCRIPTION_MAX) errors.deskripsi = `Deskripsi maksimal ${WISATA_DESCRIPTION_MAX} karakter.`

  const harga = parsePrice(form.hargaTiket)
  if (harga !== null && Number.isNaN(harga)) errors.hargaTiket = 'Harga tiket harus berupa angka 0 atau lebih.'

  for (const service of activeServices.value) {
    const price = parsePrice(service.price)
    if (!service.name.trim() || price === null || Number.isNaN(price)) {
      errors.services = 'Nama layanan dan harga layanan harus diisi bersama, harga berupa angka 0 atau lebih.'
      break
    }
  }

  return Object.values(errors).every((value) => !value)
}

const hasRequiredInput = computed(
  () =>
    form.nama.trim() !== '' &&
    images.value.length > 0 &&
    form.jenis !== '' &&
    form.telp.trim() !== '' &&
    form.alamat.trim() !== '' &&
    form.kelurahan !== '' &&
    form.mapsLink.trim() !== '' &&
    cleanFacilities.value.length > 0,
)
const canSubmit = computed(() => hasRequiredInput.value && !submitting.value)

function buildPayload(): CreateWisataRequest {
  const wa = phoneDigits(form.wa)
  return {
    nama: form.nama.trim(),
    jenis: form.jenis as WisataType,
    kontakTelp: `+62${phoneDigits(form.telp)}`,
    ...(wa ? { kontakWa: `+62${wa}` } : {}),
    provinsi: nameOf(provinces.value, form.provinsi),
    kecamatan: nameOf(districts.value, form.kecamatan),
    kelurahan: nameOf(villages.value, form.kelurahan),
    alamat: form.alamat.trim(),
    mapsLink: form.mapsLink.trim(),
    ...(form.deskripsi.trim() ? { deskripsi: form.deskripsi.trim() } : {}),
    hargaTiket: parsePrice(form.hargaTiket) ?? 0,
    images: images.value.map((item, index) => ({ ...item.uploaded!, sortOrder: index })),
    fasilitas: cleanFacilities.value,
    services: activeServices.value.map((s) => ({ serviceName: s.name.trim(), price: parsePrice(s.price) ?? 0 })),
  }
}

/** Map backend field names (API payload keys) onto the form's error slots. */
const SERVER_FIELD_MAP: Record<string, string> = {
  nama: 'nama',
  jenis: 'jenis',
  kontakTelp: 'telp',
  kontakWa: 'wa',
  provinsi: 'provinsi',
  kecamatan: 'kecamatan',
  kelurahan: 'kelurahan',
  alamat: 'alamat',
  mapsLink: 'mapsLink',
  deskripsi: 'deskripsi',
  hargaTiket: 'hargaTiket',
  images: 'images',
  fasilitas: 'fasilitas',
  services: 'services',
}

async function onSubmit() {
  submitted.value = true
  formError.value = null
  if (!validate()) {
    formError.value = 'Periksa kembali bagian yang ditandai.'
    return
  }
  submitting.value = true
  try {
    await createWisata(buildPayload(), auth.token ?? '')
    flash.show('Destinasi wisata berhasil ditambahkan.')
    await router.push({ name: 'attractions' })
  } catch (err) {
    if (err instanceof ApiError) {
      for (const [field, message] of Object.entries(err.details)) {
        const slot = SERVER_FIELD_MAP[field]
        if (slot) errors[slot] = message
      }
      formError.value = errorMessageFor(err.code, err.message)
    } else {
      formError.value = errorMessageFor('UNKNOWN_ERROR')
    }
  } finally {
    submitting.value = false
  }
}

void loadProvinces()
</script>

<template>
  <div class="flex flex-col gap-4">
    <!-- Title card (Figma 330:5753) -->
    <section class="flex flex-wrap items-center gap-x-12 gap-y-3 rounded-[20px] bg-white p-4">
      <h2 class="text-xl leading-[1.2] font-semibold tracking-[-0.6px] text-ink-900">Menambahkan Data Destinasi Wisata</h2>
      <RouterLink
        :to="{ name: 'attractions' }"
        class="ml-auto inline-flex items-center gap-2 rounded-lg border border-brand-500 bg-white px-3 py-2 text-xs leading-none font-medium text-brand-500 transition hover:bg-brand-50 focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:outline-none"
      >
        <MaskIcon :src="iconCornerUpLeft" :size="16" />
        Kembali
      </RouterLink>
    </section>

    <!-- Form card (Figma 330:5756) -->
    <form class="flex flex-col gap-3 rounded-[20px] bg-white px-4 py-8" novalidate @submit.prevent="onSubmit">
      <p class="text-[10px] leading-[1.2] tracking-[-0.3px] text-[#ff383c]">Bagian yang memiliki tanda bintang (*) wajib diisi</p>

      <p
        v-if="formError"
        role="alert"
        class="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700"
      >
        {{ formError }}
      </p>

      <!-- Nama Wisata -->
      <FormRow label="Nama Wisata" for="f-nama" required :hint="`Maks. ${WISATA_NAME_MAX} karakter`" :error="errors.nama">
        <input
          id="f-nama"
          v-model="form.nama"
          type="text"
          placeholder="Nama Wisata"
          :maxlength="WISATA_NAME_MAX"
          class="cms-input w-full max-w-[420px]"
          :class="{ 'cms-input--error': errors.nama }"
        />
      </FormRow>

      <!-- Upload Gambar -->
      <FormRow
        label="Upload Gambar"
        required
        :hint="[`Maks. ${WISATA_MAX_IMAGES} gambar,`, 'ukuran maks 150 KB/gambar,', 'Format JPG dan PNG']"
        :error="errors.images"
      >
        <div class="flex flex-wrap gap-2.5">
          <div
            v-for="item in images"
            :key="item.key"
            class="relative h-[94px] w-[111px] overflow-hidden rounded-[10px] border border-ink-300 bg-canvas"
          >
            <img v-if="item.previewUrl" :src="item.previewUrl" :alt="item.file.name" class="size-full object-cover" />
            <div
              v-if="item.status !== 'done'"
              class="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-white/80 px-1 text-center text-[9px] leading-[1.3]"
              :class="item.status === 'failed' ? 'text-[#ff383c]' : 'text-ink-500'"
            >
              <span v-if="item.status === 'uploading'">Mengunggah…</span>
              <template v-else>
                <span>{{ item.error }}</span>
                <button type="button" class="font-semibold underline" @click="uploadItem(item)">Coba lagi</button>
              </template>
            </div>
            <button
              type="button"
              class="absolute top-1 right-1 flex size-5 items-center justify-center rounded-full bg-white/90 text-ink-900 shadow hover:text-red-600"
              :aria-label="`Hapus gambar ${item.file.name}`"
              @click="removeImage(item)"
            >
              <MaskIcon :src="iconX" :size="12" />
            </button>
          </div>

          <button
            v-if="images.length < WISATA_MAX_IMAGES"
            type="button"
            class="flex h-[94px] w-[111px] items-center justify-center rounded-[10px] border border-ink-300 text-ink-900 hover:border-brand-500 hover:text-brand-500 focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none"
            aria-label="Pilih gambar"
            @click="fileInput?.click()"
          >
            <MaskIcon :src="iconPlusSquare" :size="48" />
          </button>
          <input
            ref="fileInput"
            type="file"
            accept="image/jpeg,image/png"
            multiple
            class="sr-only"
            aria-label="Berkas gambar"
            data-testid="image-input"
            @change="onFilesSelected"
          />
        </div>
      </FormRow>

      <!-- Jenis Wisata -->
      <FormRow label="Jenis Wisata" for="f-jenis" required :error="errors.jenis">
        <div class="relative w-full max-w-[420px]">
          <select
            id="f-jenis"
            v-model="form.jenis"
            class="cms-input w-full appearance-none pr-9"
            :class="[{ 'cms-input--error': errors.jenis }, form.jenis ? 'text-black' : 'text-ink-300']"
          >
            <option value="" disabled>-- Pilih Jenis Wisata --</option>
            <option v-for="(label, value) in WISATA_TYPE_LABELS" :key="value" :value="value" class="text-black">{{ label }}</option>
          </select>
          <span class="pointer-events-none absolute inset-y-0 right-3 flex items-center text-ink-900">
            <MaskIcon :src="iconChevronDown" :size="16" />
          </span>
        </div>
      </FormRow>

      <!-- Kontak -->
      <FormRow label="Kontak" required :error="errors.telp ?? errors.wa">
        <div class="flex flex-wrap items-center gap-2.5">
          <label for="f-telp" class="text-xs tracking-[-0.36px] text-black">No. Telp</label>
          <div class="flex h-8 w-[183px] overflow-hidden rounded-lg border border-ink-200 bg-ink-200" :class="{ 'border-[#ff383c]': errors.telp }">
            <span class="flex items-center px-2 text-xs tracking-[-0.36px] text-black">+62</span>
            <input
              id="f-telp"
              v-model="form.telp"
              type="tel"
              inputmode="numeric"
              placeholder="No. Telp"
              class="min-w-0 flex-1 rounded-r-lg bg-white px-3 text-xs text-ink-900 placeholder:text-ink-300 focus:outline-none"
            />
          </div>
          <label for="f-wa" class="text-xs tracking-[-0.36px] text-black">No. Whatsapp</label>
          <div class="flex h-8 w-[183px] overflow-hidden rounded-lg border border-ink-200 bg-ink-200" :class="{ 'border-[#ff383c]': errors.wa }">
            <span class="flex items-center px-2 text-xs tracking-[-0.36px] text-black">+62</span>
            <input
              id="f-wa"
              v-model="form.wa"
              type="tel"
              inputmode="numeric"
              placeholder="No. Whatsapp"
              class="min-w-0 flex-1 rounded-r-lg bg-white px-3 text-xs text-ink-900 placeholder:text-ink-300 focus:outline-none"
            />
          </div>
        </div>
      </FormRow>

      <!-- Alamat + wilayah -->
      <FormRow label="Alamat" for="f-alamat" required>
        <div class="flex flex-col gap-2.5">
          <textarea
            id="f-alamat"
            v-model="form.alamat"
            placeholder="Alamat"
            rows="3"
            class="cms-input h-[75px] w-full max-w-[420px] resize-y py-2"
            :class="{ 'cms-input--error': errors.alamat }"
          />
          <p v-if="errors.alamat" class="text-[10px] leading-[1.2] tracking-[-0.3px] text-[#ff383c]" role="alert">{{ errors.alamat }}</p>
          <p v-if="locationError" role="alert" class="text-[10px] text-[#ff383c]">
            Daftar wilayah gagal dimuat: {{ locationError }}
            <button type="button" class="ml-1 font-semibold underline" @click="loadProvinces">Coba lagi</button>
          </p>

          <div v-for="field in ([
              { key: 'provinsi', label: 'Provinsi', placeholder: '-- Pilih Provinsi --', list: provinces, onChange: onProvinceChange },
              { key: 'kabupaten', label: 'Kabupaten/Kota', placeholder: '-- Pilih Kabupaten/Kota --', list: regencies, onChange: onRegencyChange },
              { key: 'kecamatan', label: 'Kecamatan', placeholder: '-- Pilih Kecamatan --', list: districts, onChange: onDistrictChange },
              { key: 'kelurahan', label: 'Kelurahan', placeholder: '-- Pilih Kelurahan --', list: villages, onChange: onVillageChange },
            ] as const)"
            :key="field.key"
            class="flex flex-col gap-1 sm:flex-row sm:items-start sm:gap-2.5"
          >
            <label :for="`f-${field.key}`" class="shrink-0 pt-2 text-xs tracking-[-0.36px] text-black sm:w-[111px]">
              {{ field.label }} <span class="text-[#ff383c]" aria-hidden="true">*</span>
            </label>
            <div class="flex w-full max-w-[216px] flex-col gap-1">
              <div class="relative">
                <select
                  :id="`f-${field.key}`"
                  v-model="form[field.key]"
                  class="cms-input w-full appearance-none pr-9"
                  :class="[{ 'cms-input--error': errors[field.key] }, form[field.key] ? 'text-black' : 'text-ink-300']"
                  :disabled="field.list.length === 0"
                  @change="field.onChange"
                >
                  <option value="" disabled>{{ field.placeholder }}</option>
                  <option v-for="item in field.list" :key="item.id" :value="item.id" class="text-black">{{ item.name }}</option>
                </select>
                <span class="pointer-events-none absolute inset-y-0 right-3 flex items-center text-ink-900">
                  <MaskIcon :src="iconChevronDown" :size="16" />
                </span>
              </div>
              <p v-if="errors[field.key]" class="text-[10px] leading-[1.2] text-[#ff383c]" role="alert">{{ errors[field.key] }}</p>
            </div>
          </div>

          <div class="flex flex-col gap-1 sm:flex-row sm:items-start sm:gap-2.5">
            <label for="f-kodepos" class="shrink-0 pt-2 text-xs tracking-[-0.36px] text-black sm:w-[111px]">
              Kode Pos <span class="text-[#ff383c]" aria-hidden="true">*</span>
            </label>
            <div class="flex w-full max-w-[216px] flex-col gap-1">
              <input
                id="f-kodepos"
                v-model="form.kodePos"
                type="text"
                placeholder="Kode Pos"
                readonly
                title="Terisi otomatis dari kelurahan yang dipilih"
                class="cms-input w-full bg-canvas"
                :class="{ 'cms-input--error': errors.kodePos }"
              />
              <p v-if="errors.kodePos" class="text-[10px] leading-[1.2] text-[#ff383c]" role="alert">{{ errors.kodePos }}</p>
            </div>
          </div>
        </div>
      </FormRow>

      <!-- Link Google Maps -->
      <FormRow label="Link Google Maps" for="f-maps" required :error="errors.mapsLink">
        <input
          id="f-maps"
          v-model="form.mapsLink"
          type="url"
          placeholder="Link Google Maps"
          class="cms-input w-full max-w-[420px]"
          :class="{ 'cms-input--error': errors.mapsLink }"
        />
      </FormRow>

      <!-- Fasilitas -->
      <FormRow label="Fasilitas" required :hint="`Maks. ${WISATA_MAX_FACILITIES} Poin`" :error="errors.fasilitas">
        <div class="flex flex-col gap-2.5">
          <div v-for="(_, index) in fasilitas" :key="index" class="flex w-full max-w-[420px] items-center gap-2.5">
            <input
              v-model="fasilitas[index]"
              type="text"
              placeholder="Fasilitas"
              :aria-label="`Fasilitas ${index + 1}`"
              class="cms-input min-w-0 flex-1"
            />
            <button
              v-if="fasilitas.length > 1"
              type="button"
              class="text-ink-500 hover:text-red-600"
              :aria-label="`Hapus fasilitas ${index + 1}`"
              @click="removeFacility(index)"
            >
              <MaskIcon :src="iconX" :size="16" />
            </button>
          </div>
          <button
            v-if="fasilitas.length < WISATA_MAX_FACILITIES"
            type="button"
            class="flex size-7 items-center justify-center rounded-lg bg-brand-500 text-canvas hover:bg-brand-600"
            aria-label="Tambah fasilitas"
            @click="addFacility"
          >
            <MaskIcon :src="iconPlusSquare" :size="16" />
          </button>
        </div>
      </FormRow>

      <!-- Deskripsi -->
      <FormRow label="Deskripsi" for="f-deskripsi" :hint="`Maks. ${WISATA_DESCRIPTION_MAX} karakter`" :error="errors.deskripsi">
        <textarea
          id="f-deskripsi"
          v-model="form.deskripsi"
          placeholder="Deskripsi"
          rows="3"
          class="cms-input h-[75px] w-full max-w-[420px] resize-y py-2"
          :class="{ 'cms-input--error': errors.deskripsi }"
        />
      </FormRow>

      <!-- Harga Tiket -->
      <FormRow label="Harga Tiket" for="f-harga" :error="errors.hargaTiket">
        <div class="flex h-8 w-[183px] overflow-hidden rounded-lg border border-ink-200 bg-ink-200" :class="{ 'border-[#ff383c]': errors.hargaTiket }">
          <span class="flex items-center px-2 text-xs tracking-[-0.36px] text-black">Rp.</span>
          <input
            id="f-harga"
            v-model="form.hargaTiket"
            type="text"
            inputmode="numeric"
            placeholder="Harga Tiket"
            class="min-w-0 flex-1 rounded-r-lg bg-white px-3 text-xs text-ink-900 placeholder:text-ink-300 focus:outline-none"
          />
        </div>
      </FormRow>

      <!-- Service Objek Wisata -->
      <FormRow label="Service Objek Wisata" :error="errors.services">
        <div class="flex flex-col gap-2.5">
          <div v-for="(service, index) in services" :key="service.key" class="flex flex-wrap items-center gap-2.5">
            <input
              v-model="service.name"
              type="text"
              placeholder="Service Objek Wisata"
              :aria-label="`Nama layanan ${index + 1}`"
              class="cms-input w-full sm:w-[274px]"
            />
            <label class="text-xs tracking-[-0.36px] text-black sm:w-[85px]">Harga Service</label>
            <div class="flex h-8 w-[183px] overflow-hidden rounded-lg border border-ink-200 bg-ink-200">
              <span class="flex w-[34px] items-center justify-center text-xs tracking-[-0.36px] text-black">Rp.</span>
              <input
                v-model="service.price"
                type="text"
                inputmode="numeric"
                placeholder="Harga Service"
                :aria-label="`Harga layanan ${index + 1}`"
                class="min-w-0 flex-1 rounded-r-lg bg-white px-3 text-xs text-ink-900 placeholder:text-ink-300 focus:outline-none"
              />
            </div>
            <button
              v-if="services.length > 1"
              type="button"
              class="text-ink-500 hover:text-red-600"
              :aria-label="`Hapus layanan ${index + 1}`"
              @click="removeService(index)"
            >
              <MaskIcon :src="iconX" :size="16" />
            </button>
          </div>
          <button
            type="button"
            class="flex size-7 items-center justify-center rounded-lg bg-brand-500 text-canvas hover:bg-brand-600"
            aria-label="Tambah layanan"
            @click="addService"
          >
            <MaskIcon :src="iconPlusSquare" :size="16" />
          </button>
        </div>
      </FormRow>

      <!-- Simpan -->
      <div class="pt-[18px]">
        <button
          type="submit"
          :disabled="!canSubmit"
          class="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-3 py-2 text-xs leading-none font-medium text-canvas transition hover:bg-brand-600 focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:bg-ink-200 disabled:text-ink-500"
        >
          {{ submitting ? 'Menyimpan…' : 'Simpan' }}
          <MaskIcon :src="iconSave" :size="16" />
        </button>
      </div>
    </form>
  </div>
</template>
