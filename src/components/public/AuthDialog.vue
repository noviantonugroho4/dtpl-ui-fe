<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { ApiError } from '@/api/client'
import { authenticateWithGoogle, decodeGooglePrefill, type GoogleAuthResponse, type GoogleProfileInput } from '@/api/googleAuth'
import { useAuthDialogStore } from '@/stores/authDialog'
import { useTravelerStore } from '@/stores/traveler'
import GoogleAuthButton from '@/components/public/GoogleAuthButton.vue'
import MaskIcon from '@/components/MaskIcon.vue'
import iconCalendar from '@/assets/icons/calendar.svg'
import iconX from '@/assets/icons/x.svg'

const dialog = useAuthDialogStore()
const traveler = useTravelerStore()

const panel = ref<HTMLElement | null>(null)

/** Satu pesan umum untuk semua kegagalan; alasan detail tidak ditampilkan (panduan §3.4). */
const GENERIC_FAILURE = 'Proses masuk gagal. Silakan coba lagi.'
const UNAVAILABLE = 'Masuk dengan Google tidak tersedia. Periksa koneksi atau pemblokir iklan, lalu muat ulang halaman.'

const busy = ref(false)
const authError = ref<string | null>(null)

function failureMessage(err: unknown): string {
  if (!(err instanceof ApiError)) return GENERIC_FAILURE
  if (err.status === 409) return 'Email Google ini sudah terdaftar dengan kata sandi. Hubungi admin untuk menautkan akun.'
  if (err.status === 429) return 'Terlalu banyak percobaan. Tunggu sebentar lalu coba lagi.'
  return GENERIC_FAILURE
}

function onAuthenticated(response: GoogleAuthResponse) {
  // `registered` dan `logged_in` ditangani sama persis.
  traveler.setUser(response.data.user)
  dialog.close()
}

function onUnavailable() {
  authError.value = UNAVAILABLE
}

// ---- panggilan 1: masuk dengan Google (Figma 496:7113) ----
async function onCredential(idToken: string) {
  authError.value = null
  busy.value = true
  try {
    onAuthenticated(await authenticateWithGoogle(idToken))
  } catch (err) {
    if (err instanceof ApiError && err.status === 422) {
      // Akun Google baru: klaim token hanya untuk isian awal, tidak ada yang tersimpan di server.
      const prefill = decodeGooglePrefill(idToken)
      register.namaDepan = register.namaDepan || prefill.namaDepan
      register.namaBelakang = register.namaBelakang || prefill.namaBelakang
      dialog.open('register')
      return
    }
    authError.value = failureMessage(err)
  } finally {
    busy.value = false
  }
}

// ---- panggilan 2: lengkapi profil (Figma 496:7120) ----
const register = reactive({
  namaDepan: '',
  namaBelakang: '',
  tempatLahir: '',
  tanggalLahir: '',
  alamat: '',
  nomorTelepon: '',
})
const registerErrors = reactive<Record<string, string | null>>({})
const datePicker = ref<HTMLInputElement | null>(null)

const DATE_RE = /^(\d{2})-(\d{2})-(\d{4})$/

/** dd-mm-yyyy → yyyy-mm-dd, null bila tidak valid. */
function parseDate(value: string): string | null {
  const match = DATE_RE.exec(value.trim())
  if (!match) return null
  const [, dd, mm, yyyy] = match
  const date = new Date(Number(yyyy), Number(mm) - 1, Number(dd))
  const valid = date.getFullYear() === Number(yyyy) && date.getMonth() === Number(mm) - 1 && date.getDate() === Number(dd)
  return valid && date <= new Date() ? `${yyyy}-${mm}-${dd}` : null
}

function onDatePicked(event: Event) {
  const value = (event.target as HTMLInputElement).value // yyyy-mm-dd
  if (!value) return
  const [yyyy, mm, dd] = value.split('-')
  register.tanggalLahir = `${dd}-${mm}-${yyyy}`
}

function openDatePicker() {
  const input = datePicker.value
  if (!input) return
  if (typeof input.showPicker === 'function') input.showPicker()
  else input.click()
}

function phoneDigits(raw: string): string {
  return raw.replace(/\D/g, '').replace(/^(62|0)+/, '')
}

function validateRegister(): boolean {
  for (const key of Object.keys(registerErrors)) registerErrors[key] = null
  const required = 'Wajib diisi.'
  if (!register.namaDepan.trim()) registerErrors.namaDepan = required
  if (!register.namaBelakang.trim()) registerErrors.namaBelakang = required
  if (!register.tempatLahir.trim()) registerErrors.tempatLahir = required
  if (!register.tanggalLahir.trim()) registerErrors.tanggalLahir = required
  else if (!parseDate(register.tanggalLahir)) registerErrors.tanggalLahir = 'Gunakan format DD-MM-YYYY dengan tanggal yang valid.'
  if (!register.alamat.trim()) registerErrors.alamat = required
  const phone = phoneDigits(register.nomorTelepon)
  if (!phone) registerErrors.nomorTelepon = required
  else if (!/^[0-9]{8,13}$/.test(phone)) registerErrors.nomorTelepon = 'Nomor telepon harus 8–13 digit (awali 08 atau +62).'
  return Object.values(registerErrors).every((v) => !v)
}

function buildProfile(): GoogleProfileInput {
  return {
    namaDepan: register.namaDepan.trim(),
    namaBelakang: register.namaBelakang.trim(),
    tempatLahir: register.tempatLahir.trim(),
    tanggalLahir: parseDate(register.tanggalLahir)!,
    alamat: register.alamat.trim(),
    nomorTelepon: `+62${phoneDigits(register.nomorTelepon)}`,
  }
}

/** Token pertama sudah terpakai (anti-replay), jadi profil dikirim dengan token Google baru. */
async function onRegisterCredential(freshToken: string) {
  authError.value = null
  if (!validateRegister()) {
    authError.value = 'Periksa kembali bagian yang ditandai.'
    return
  }
  busy.value = true
  try {
    onAuthenticated(await authenticateWithGoogle(freshToken, buildProfile()))
  } catch (err) {
    if (err instanceof ApiError && err.status === 400 && Object.keys(err.details).length) {
      for (const [field, message] of Object.entries(err.details)) registerErrors[field] = message
      authError.value = 'Periksa kembali bagian yang ditandai.'
    } else {
      authError.value = failureMessage(err)
    }
  } finally {
    busy.value = false
  }
}

// ---- dialog chrome ----
const isOpen = computed(() => dialog.mode !== null)

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && isOpen.value) dialog.close()
}

watch(isOpen, async (open) => {
  if (typeof document === 'undefined') return
  document.body.style.overflow = open ? 'hidden' : ''
  if (open) {
    await nextTick()
    panel.value?.querySelector<HTMLElement>('input')?.focus()
  } else {
    authError.value = null
  }
})
watch(
  () => dialog.mode,
  () => (authError.value = null),
)

onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
  if (typeof document !== 'undefined') document.body.style.overflow = ''
})

const FIELD = 'cms-input h-auto w-full px-4 py-3 text-xs leading-[1.4] placeholder:italic'
</script>

<template>
  <div
    v-if="isOpen"
    class="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4"
    role="dialog"
    aria-modal="true"
    :aria-label="dialog.mode === 'login' ? 'Masuk' : 'Registrasi'"
    data-testid="auth-dialog"
    @click.self="dialog.close()"
  >
    <div
      ref="panel"
      class="relative my-auto flex w-full flex-col items-center gap-9 rounded-lg bg-white p-6 sm:p-10"
      :class="dialog.mode === 'login' ? 'max-w-[486px]' : 'max-w-[932px]'"
      :data-testid="`auth-dialog-${dialog.mode}`"
    >
      <button
        type="button"
        class="absolute top-3 right-3 flex size-9 items-center justify-center rounded-full text-ink-500 hover:bg-canvas hover:text-ink-900"
        aria-label="Tutup"
        data-testid="auth-dialog-close"
        @click="dialog.close()"
      >
        <MaskIcon :src="iconX" :size="18" />
      </button>

      <div class="flex w-full flex-col items-center gap-2 text-center">
        <h2 class="text-3xl leading-[1.2] font-semibold tracking-[-0.8px] text-ink-900 sm:text-[40px]" data-testid="auth-dialog-title">Selamat Datang</h2>
        <p class="text-base leading-[1.2] text-ink-500" data-testid="auth-dialog-subtitle">
          {{ dialog.mode === 'login' ? 'Silahkan login untuk masuk ke dalam website' : 'Silahkan Registrasi untuk masuk ke dalam website' }}
        </p>
      </div>

      <p
        v-if="authError"
        role="alert"
        class="w-full bg-[#ffdede] p-1 text-center text-xs leading-[1.4] text-[#b50306] italic"
        data-testid="auth-error"
      >
        {{ authError }}
      </p>
      <p v-if="busy" class="text-xs text-ink-500" aria-live="polite" data-testid="auth-busy">Memproses…</p>

      <!-- ===== Masuk dengan Google (Figma 496:7113) ===== -->
      <div v-if="dialog.mode === 'login'" class="flex w-full flex-col items-center gap-9" data-testid="auth-login-form">
        <GoogleAuthButton text="continue_with" testid="auth-login-google" @credential="onCredential" @unavailable="onUnavailable" />
      </div>

      <!-- ===== Register ===== -->
      <form v-else class="flex w-full flex-col gap-9" novalidate data-testid="auth-register-form" @submit.prevent>

        <div class="grid w-full gap-x-9 gap-y-3 sm:grid-cols-2">
          <!-- kolom kiri -->
          <div class="flex flex-col gap-3">
            <div class="flex flex-col gap-2.5">
              <label for="reg-nama-depan" class="text-xs leading-[1.4] text-black">Nama Depan</label>
              <input id="reg-nama-depan" v-model="register.namaDepan" type="text" autocomplete="given-name" placeholder="Nama Depan" :class="[FIELD, { 'cms-input--error': registerErrors.namaDepan }]" data-testid="auth-register-nama-depan" />
              <p v-if="registerErrors.namaDepan" class="text-[10px] text-[#ff383c]" role="alert" data-testid="auth-register-nama-depan-error">{{ registerErrors.namaDepan }}</p>
            </div>
            <div class="flex flex-col gap-2.5">
              <label for="reg-nama-belakang" class="text-xs leading-[1.4] text-black">Nama Belakang</label>
              <input id="reg-nama-belakang" v-model="register.namaBelakang" type="text" autocomplete="family-name" placeholder="Nama Belakang" :class="[FIELD, { 'cms-input--error': registerErrors.namaBelakang }]" data-testid="auth-register-nama-belakang" />
              <p v-if="registerErrors.namaBelakang" class="text-[10px] text-[#ff383c]" role="alert" data-testid="auth-register-nama-belakang-error">{{ registerErrors.namaBelakang }}</p>
            </div>
            <div class="flex flex-col gap-2.5">
              <label for="reg-tempat-lahir" class="text-xs leading-[1.4] text-black">Tempat Lahir</label>
              <input id="reg-tempat-lahir" v-model="register.tempatLahir" type="text" placeholder="Tempat Lahir" :class="[FIELD, { 'cms-input--error': registerErrors.tempatLahir }]" data-testid="auth-register-tempat-lahir" />
              <p v-if="registerErrors.tempatLahir" class="text-[10px] text-[#ff383c]" role="alert" data-testid="auth-register-tempat-lahir-error">{{ registerErrors.tempatLahir }}</p>
            </div>
            <div class="flex flex-col gap-2.5">
              <label for="reg-tanggal-lahir" class="text-xs leading-[1.4] text-ink-900">Tanggal Lahir</label>
              <div class="relative">
                <input
                  id="reg-tanggal-lahir"
                  v-model="register.tanggalLahir"
                  type="text"
                  inputmode="numeric"
                  autocomplete="bday"
                  placeholder="Tanggal Lahir (DD-MM-YYYY)"
                  :class="[FIELD, 'pr-11', { 'cms-input--error': registerErrors.tanggalLahir }]"
                  data-testid="auth-register-tanggal-lahir"
                />
                <button type="button" class="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-ink-900 hover:text-brand-500" aria-label="Pilih tanggal" data-testid="auth-register-tanggal-lahir-picker" @click="openDatePicker">
                  <MaskIcon :src="iconCalendar" :size="16" />
                </button>
                <input ref="datePicker" type="date" class="sr-only" tabindex="-1" aria-hidden="true" data-testid="auth-register-tanggal-lahir-native" @change="onDatePicked" />
              </div>
              <p v-if="registerErrors.tanggalLahir" class="text-[10px] text-[#ff383c]" role="alert" data-testid="auth-register-tanggal-lahir-error">{{ registerErrors.tanggalLahir }}</p>
            </div>
          </div>

          <!-- kolom kanan -->
          <div class="flex flex-col gap-3">
            <div class="flex flex-col gap-2.5">
              <label for="reg-alamat" class="text-xs leading-[1.4] text-black">Alamat Tempat Tinggal</label>
              <input id="reg-alamat" v-model="register.alamat" type="text" autocomplete="street-address" placeholder="Alamat Tempat Tinggal" :class="[FIELD, { 'cms-input--error': registerErrors.alamat }]" data-testid="auth-register-alamat" />
              <p v-if="registerErrors.alamat" class="text-[10px] text-[#ff383c]" role="alert" data-testid="auth-register-alamat-error">{{ registerErrors.alamat }}</p>
            </div>
            <div class="flex flex-col gap-2.5">
              <label for="reg-telepon" class="text-xs leading-[1.4] text-black">Nomor Telepon</label>
              <input id="reg-telepon" v-model="register.nomorTelepon" type="tel" autocomplete="tel" placeholder="Nomor Telepon" :class="[FIELD, { 'cms-input--error': registerErrors.nomorTelepon }]" data-testid="auth-register-telepon" />
              <p v-if="registerErrors.nomorTelepon" class="text-[10px] text-[#ff383c]" role="alert" data-testid="auth-register-telepon-error">{{ registerErrors.nomorTelepon }}</p>
            </div>
          </div>
        </div>

        <div class="flex flex-col items-center gap-2">
          <p class="text-center text-xs leading-[1.4] text-ink-500">Konfirmasi akun Google Anda untuk menyelesaikan registrasi.</p>
          <GoogleAuthButton text="signup_with" testid="auth-register-google" @credential="onRegisterCredential" @unavailable="onUnavailable" />
        </div>

        <p class="flex items-center gap-2.5 text-base leading-[1.4] text-black">
          <span class="flex-1">Sudah punya akun?</span>
          <button type="button" class="text-[#166dba] underline hover:text-brand-600" data-testid="auth-switch-login" @click="dialog.open('login')">Masuk dengan Google</button>
        </p>
      </form>
    </div>
  </div>
</template>
