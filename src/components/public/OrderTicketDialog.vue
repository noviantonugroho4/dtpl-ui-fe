<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import type { WisataService } from '@/api/types'
import { formatRupiah } from '@/utils/format'
import MaskIcon from '@/components/MaskIcon.vue'
import iconCalendar from '@/assets/icons/calendar.svg'

/**
 * Form "Pemesanan Tiket Wisata" (Figma 666:13008), dibuka dari "Pesan Sekarang".
 * Belum ada API pemesanan di BE: form hanya memvalidasi lalu mengirim `submit` berisi draf pesanan.
 */
export interface OrderDraft {
  namaDepan: string
  namaBelakang: string
  /** ISO date, yyyy-mm-dd. */
  tanggalKedatangan: string
  jumlahPengunjung: number
  services: { serviceId: string; jumlah: number }[]
  total: number
}

const props = defineProps<{
  open: boolean
  hargaTiket: number
  services: WisataService[]
  /** Isian awal dari profil wisatawan yang sedang masuk. */
  prefill?: { namaDepan?: string | null; namaBelakang?: string | null }
}>()
const emit = defineEmits<{ close: []; submit: [draft: OrderDraft] }>()

const MAX_QTY = 99

const form = reactive({ namaDepan: '', namaBelakang: '', tanggal: '', pengunjung: 1 })
/** Jumlah per service; 0 = tidak dipilih. */
const serviceQty = reactive<Record<string, number>>({})
const errors = reactive<Record<string, string | null>>({ namaDepan: null, namaBelakang: null, tanggal: null })
const panel = ref<HTMLElement | null>(null)
const datePicker = ref<HTMLInputElement | null>(null)

function todayIso(): string {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

/** "Sabtu, 17 Oktober 2026". */
const tanggalLabel = computed(() => {
  if (!form.tanggal) return ''
  const [y, m, d] = form.tanggal.split('-').map(Number)
  return new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(y!, m! - 1, d!))
})

const total = computed(
  () => props.hargaTiket * form.pengunjung + props.services.reduce((sum, s) => sum + s.price * (serviceQty[s.id] ?? 0), 0),
)

function reset() {
  form.namaDepan = props.prefill?.namaDepan ?? ''
  form.namaBelakang = props.prefill?.namaBelakang ?? ''
  form.tanggal = ''
  form.pengunjung = 1
  for (const key of Object.keys(serviceQty)) delete serviceQty[key]
  for (const s of props.services) serviceQty[s.id] = 0
  for (const key of Object.keys(errors)) errors[key] = null
}

function stepVisitors(delta: number) {
  form.pengunjung = Math.min(MAX_QTY, Math.max(1, form.pengunjung + delta))
}

function stepService(id: string, delta: number) {
  serviceQty[id] = Math.min(MAX_QTY, Math.max(0, (serviceQty[id] ?? 0) + delta))
}

/** Centang = minimal 1; lepas centang = 0. */
function toggleService(id: string, checked: boolean) {
  serviceQty[id] = checked ? Math.max(1, serviceQty[id] ?? 0) : 0
}

function openDatePicker() {
  const input = datePicker.value
  if (!input) return
  if (typeof input.showPicker === 'function') input.showPicker()
  else input.click()
}

function validate(): boolean {
  errors.namaDepan = form.namaDepan.trim() ? null : 'Wajib diisi.'
  errors.namaBelakang = form.namaBelakang.trim() ? null : 'Wajib diisi.'
  if (!form.tanggal) errors.tanggal = 'Pilih tanggal kedatangan.'
  else errors.tanggal = form.tanggal < todayIso() ? 'Tanggal kedatangan tidak boleh sebelum hari ini.' : null
  return Object.values(errors).every((v) => !v)
}

function onSubmit() {
  if (!validate()) return
  emit('submit', {
    namaDepan: form.namaDepan.trim(),
    namaBelakang: form.namaBelakang.trim(),
    tanggalKedatangan: form.tanggal,
    jumlahPengunjung: form.pengunjung,
    services: props.services.filter((s) => (serviceQty[s.id] ?? 0) > 0).map((s) => ({ serviceId: s.id, jumlah: serviceQty[s.id]! })),
    total: total.value,
  })
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && props.open) emit('close')
}

watch(
  () => props.open,
  async (open) => {
    if (typeof document !== 'undefined') document.body.style.overflow = open ? 'hidden' : ''
    if (!open) return
    reset()
    await nextTick()
    panel.value?.querySelector<HTMLElement>('input')?.focus()
  },
  { immediate: true },
)
// Profil bisa datang setelah form terbuka; jangan menimpa isian yang sudah diketik.
watch(
  () => props.prefill,
  (next) => {
    if (!props.open) return
    if (!form.namaDepan) form.namaDepan = next?.namaDepan ?? ''
    if (!form.namaBelakang) form.namaBelakang = next?.namaBelakang ?? ''
  },
)

onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
  if (typeof document !== 'undefined') document.body.style.overflow = ''
})

const FIELD = 'h-11 w-full rounded-lg border bg-white px-3.5 text-[13px] text-ink-900 placeholder:text-[#b3b3b3] focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 focus:outline-none'
const QTY_BUTTON =
  'flex size-8 items-center justify-center rounded-lg border border-ink-200 bg-white text-lg leading-none text-brand-500 transition hover:bg-canvas disabled:cursor-not-allowed disabled:opacity-40'
</script>

<template>
  <div
    v-if="open"
    class="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4"
    role="dialog"
    aria-modal="true"
    aria-labelledby="order-title"
    data-testid="order-dialog"
    @click.self="emit('close')"
  >
    <form
      ref="panel"
      class="my-auto flex w-full max-w-[430px] flex-col gap-6 rounded-lg border border-ink-200 bg-white p-6"
      novalidate
      data-testid="order-form"
      @submit.prevent="onSubmit"
    >
      <h2 id="order-title" class="text-center text-xl leading-[1.2] font-semibold tracking-[-0.4px] text-ink-900">Pemesanan Tiket Wisata</h2>
      <p class="text-[11px] text-[#667579]">* Wajib diisi</p>

      <div class="flex flex-col gap-2">
        <label for="order-nama-depan" class="text-xs font-medium text-ink-900">Nama Depan <span class="text-[red]">*</span></label>
        <input
          id="order-nama-depan"
          v-model="form.namaDepan"
          type="text"
          autocomplete="given-name"
          placeholder="Nama Depan"
          :class="[FIELD, errors.namaDepan ? 'border-[#ff383c]' : 'border-[#dde4e6]']"
          data-testid="order-nama-depan"
        />
        <p v-if="errors.namaDepan" class="text-[10px] text-[#ff383c]" role="alert" data-testid="order-nama-depan-error">{{ errors.namaDepan }}</p>
      </div>

      <div class="flex flex-col gap-2">
        <label for="order-nama-belakang" class="text-xs font-medium text-ink-900">Nama Belakang <span class="text-[red]">*</span></label>
        <input
          id="order-nama-belakang"
          v-model="form.namaBelakang"
          type="text"
          autocomplete="family-name"
          placeholder="Nama Belakang"
          :class="[FIELD, errors.namaBelakang ? 'border-[#ff383c]' : 'border-[#dde4e6]']"
          data-testid="order-nama-belakang"
        />
        <p v-if="errors.namaBelakang" class="text-[10px] text-[#ff383c]" role="alert" data-testid="order-nama-belakang-error">{{ errors.namaBelakang }}</p>
      </div>

      <div class="flex flex-col gap-2">
        <span id="order-tanggal-label" class="text-xs font-medium text-ink-900">Tanggal Kedatangan <span class="text-[red]">*</span></span>
        <div class="relative">
          <button
            type="button"
            :class="[FIELD, 'flex items-center gap-2.5 text-left', errors.tanggal ? 'border-[#ff383c]' : 'border-[#dde4e6]']"
            aria-labelledby="order-tanggal-label"
            data-testid="order-tanggal"
            @click="openDatePicker"
          >
            <span class="flex-1" :class="tanggalLabel ? '' : 'text-[#b3b3b3]'">{{ tanggalLabel || 'Pilih tanggal' }}</span>
            <MaskIcon :src="iconCalendar" :size="16" class="text-brand-500" />
          </button>
          <input
            ref="datePicker"
            v-model="form.tanggal"
            type="date"
            :min="todayIso()"
            class="sr-only"
            tabindex="-1"
            aria-hidden="true"
            data-testid="order-tanggal-native"
          />
        </div>
        <p v-if="errors.tanggal" class="text-[10px] text-[#ff383c]" role="alert" data-testid="order-tanggal-error">{{ errors.tanggal }}</p>
      </div>

      <div class="flex items-center gap-4">
        <div class="flex min-w-0 flex-1 flex-col gap-1 text-xs">
          <p class="font-medium text-black">Jumlah pengunjung yang akan datang</p>
          <p class="flex text-ink-900">
            <span class="w-[160px] shrink-0">Harga tiket *</span>
            <span data-testid="order-harga-tiket">{{ formatRupiah(hargaTiket) }}</span>
          </p>
        </div>
        <div class="flex shrink-0 items-center gap-3.5">
          <button type="button" :class="QTY_BUTTON" :disabled="form.pengunjung <= 1" aria-label="Kurangi pengunjung" data-testid="order-pengunjung-minus" @click="stepVisitors(-1)">−</button>
          <span class="w-[35px] text-center text-sm text-ink-900" aria-live="polite" data-testid="order-pengunjung">{{ form.pengunjung }}</span>
          <button type="button" :class="QTY_BUTTON" :disabled="form.pengunjung >= MAX_QTY" aria-label="Tambah pengunjung" data-testid="order-pengunjung-plus" @click="stepVisitors(1)">+</button>
        </div>
      </div>

      <fieldset v-if="services.length" class="flex flex-col gap-2" data-testid="order-services">
        <legend class="mb-2 w-full border-b border-black/12 pb-0.5 text-xs leading-[1.4] font-medium text-ink-900">Tambahan Service</legend>
        <div v-for="service in services" :key="service.id" class="flex items-center gap-2.5" :data-testid="`order-service-${service.id}`">
          <label class="flex min-w-0 flex-1 items-center gap-2 text-xs text-ink-900">
            <input
              type="checkbox"
              class="size-4 accent-brand-500"
              :checked="(serviceQty[service.id] ?? 0) > 0"
              :data-testid="`order-service-${service.id}-check`"
              @change="toggleService(service.id, ($event.target as HTMLInputElement).checked)"
            />
            <span class="w-[120px] shrink-0 truncate sm:w-[140px]">{{ service.serviceName }}</span>
            <span>{{ formatRupiah(service.price) }}</span>
          </label>
          <div class="flex shrink-0 items-center gap-3.5">
            <button
              type="button"
              :class="QTY_BUTTON"
              :disabled="(serviceQty[service.id] ?? 0) <= 0"
              :aria-label="`Kurangi ${service.serviceName}`"
              :data-testid="`order-service-${service.id}-minus`"
              @click="stepService(service.id, -1)"
            >
              −
            </button>
            <span class="w-[35px] text-center text-sm text-ink-900" :data-testid="`order-service-${service.id}-qty`">{{ serviceQty[service.id] ?? 0 }}</span>
            <button
              type="button"
              :class="QTY_BUTTON"
              :disabled="(serviceQty[service.id] ?? 0) >= MAX_QTY"
              :aria-label="`Tambah ${service.serviceName}`"
              :data-testid="`order-service-${service.id}-plus`"
              @click="stepService(service.id, 1)"
            >
              +
            </button>
          </div>
        </div>
      </fieldset>

      <div class="flex flex-col items-end gap-1 text-right">
        <p class="text-base leading-[1.2] font-semibold tracking-[-0.32px] text-ink-900">Total Pemesanan</p>
        <p class="text-xl leading-[1.4] text-ink-900" data-testid="order-total">{{ formatRupiah(total) }}</p>
      </div>

      <div class="flex gap-6">
        <button
          type="submit"
          class="h-11 flex-1 rounded-lg border border-brand-700 bg-brand-500 text-base text-white transition hover:bg-brand-600 focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:outline-none"
          data-testid="order-submit"
        >
          Pesan
        </button>
        <button
          type="button"
          class="h-11 flex-1 rounded-lg border border-brand-500 bg-white text-base text-brand-500 transition hover:bg-canvas focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:outline-none"
          data-testid="order-cancel"
          @click="emit('close')"
        >
          Batal
        </button>
      </div>
    </form>
  </div>
</template>
