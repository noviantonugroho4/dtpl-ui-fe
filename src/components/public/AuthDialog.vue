<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { ApiError } from '@/api/client'
import { errorMessageFor } from '@/api/errorMessages'
import { registerUser, REGISTER_IS_MOCK } from '@/api/register'
import { useAuthStore } from '@/stores/auth'
import { useAuthDialogStore } from '@/stores/authDialog'
import MaskIcon from '@/components/MaskIcon.vue'
import iconEye from '@/assets/icons/eye.svg'
import iconEyeOff from '@/assets/icons/eye-off.svg'
import iconCalendar from '@/assets/icons/calendar.svg'
import iconX from '@/assets/icons/x.svg'

const auth = useAuthStore()
const dialog = useAuthDialogStore()

const panel = ref<HTMLElement | null>(null)

// ---- login (Figma 496:7096) ----
const login = reactive({ username: '', password: '' })
const showLoginPassword = ref(false)
const loginError = ref<string | null>(null)
const loginSubmitting = ref(false)

async function onLogin() {
  loginError.value = null
  if (!login.username.trim() || !login.password) {
    loginError.value = 'Nama pengguna dan kata sandi wajib diisi.'
    return
  }
  loginSubmitting.value = true
  try {
    await auth.login({ username: login.username.trim(), password: login.password })
    login.password = ''
    dialog.close()
  } catch (err) {
    if (err instanceof ApiError && err.code === 'INVALID_CREDENTIALS') {
      loginError.value = 'Nama pengguna dan kata sandi yang anda masukkan salah'
    } else {
      loginError.value = err instanceof ApiError ? errorMessageFor(err.code, err.message) : errorMessageFor('UNKNOWN_ERROR')
    }
  } finally {
    loginSubmitting.value = false
  }
}

// ---- register (Figma 496:7120) ----
const register = reactive({
  namaDepan: '',
  namaBelakang: '',
  tempatLahir: '',
  tanggalLahir: '',
  alamat: '',
  nomorTelepon: '',
  username: '',
  password: '',
})
const showRegisterPassword = ref(false)
const registerErrors = reactive<Record<string, string | null>>({})
const registerError = ref<string | null>(null)
const registerSubmitting = ref(false)
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
  if (!register.username.trim()) registerErrors.username = required
  else if (!/^[a-zA-Z0-9._]{4,30}$/.test(register.username.trim())) registerErrors.username = 'Nama pengguna 4–30 karakter: huruf, angka, titik, atau garis bawah.'
  if (!register.password) registerErrors.password = required
  else if (register.password.length < 8) registerErrors.password = 'Kata sandi minimal 8 karakter.'
  return Object.values(registerErrors).every((v) => !v)
}

async function onRegister() {
  registerError.value = null
  if (!validateRegister()) {
    registerError.value = 'Periksa kembali bagian yang ditandai.'
    return
  }
  registerSubmitting.value = true
  try {
    const { data } = await registerUser({
      namaDepan: register.namaDepan.trim(),
      namaBelakang: register.namaBelakang.trim(),
      tempatLahir: register.tempatLahir.trim(),
      tanggalLahir: parseDate(register.tanggalLahir)!,
      alamat: register.alamat.trim(),
      nomorTelepon: `+62${phoneDigits(register.nomorTelepon)}`,
      username: register.username.trim(),
      password: register.password,
    })
    login.username = data.username
    login.password = ''
    dialog.notice = 'Registrasi berhasil. Silakan masuk dengan akun Anda.'
    dialog.mode = 'login'
  } catch (err) {
    registerError.value = err instanceof ApiError ? errorMessageFor(err.code, err.message) : errorMessageFor('UNKNOWN_ERROR')
  } finally {
    registerSubmitting.value = false
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
    loginError.value = null
    registerError.value = null
    await nextTick()
    panel.value?.querySelector<HTMLElement>('input')?.focus()
  }
})

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

      <!-- ===== Login ===== -->
      <form v-if="dialog.mode === 'login'" class="flex w-full flex-col gap-9" novalidate data-testid="auth-login-form" @submit.prevent="onLogin">
        <p
          v-if="dialog.notice"
          role="status"
          class="w-full rounded-sm bg-green-50 p-1 text-center text-xs leading-[1.4] text-green-800 italic"
          data-testid="auth-login-notice"
        >
          {{ dialog.notice }}
        </p>
        <p
          v-if="loginError"
          role="alert"
          class="w-full bg-[#ffdede] p-1 text-center text-xs leading-[1.4] text-[#b50306] italic"
          data-testid="auth-login-error"
        >
          {{ loginError }}
        </p>

        <div class="flex flex-col gap-2">
          <label for="pub-login-username" class="text-base leading-[1.4] text-ink-900">Nama Pengguna</label>
          <input
            id="pub-login-username"
            v-model="login.username"
            type="text"
            name="username"
            autocomplete="username"
            placeholder="Nama Pengguna"
            class="block w-full rounded-lg border border-ink-500 bg-white px-4 py-3 text-base leading-[1.4] text-ink-900 placeholder:italic placeholder:text-ink-300 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 focus:outline-none"
            data-testid="auth-login-username"
          />
        </div>

        <div class="flex flex-col gap-2.5">
          <label for="pub-login-password" class="text-base leading-[1.4] text-black">Kata Sandi</label>
          <div class="relative">
            <input
              id="pub-login-password"
              v-model="login.password"
              :type="showLoginPassword ? 'text' : 'password'"
              name="password"
              autocomplete="current-password"
              placeholder="Kata Sandi"
              class="block w-full rounded-lg border border-[#727272] bg-white py-3 pr-12 pl-4 text-base leading-none text-ink-900 placeholder:italic placeholder:text-ink-300 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 focus:outline-none"
              data-testid="auth-login-password"
            />
            <button
              type="button"
              class="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-ink-900 hover:text-brand-500"
              :aria-label="showLoginPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'"
              :aria-pressed="showLoginPassword"
              data-testid="auth-login-password-toggle"
              @click="showLoginPassword = !showLoginPassword"
            >
              <MaskIcon :src="showLoginPassword ? iconEyeOff : iconEye" :size="16" />
            </button>
          </div>
        </div>

        <button
          type="submit"
          :disabled="loginSubmitting"
          class="inline-flex h-[52px] w-full items-center justify-center rounded-lg bg-brand-500 p-3 text-base leading-none font-extrabold text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
          data-testid="auth-login-submit"
        >
          {{ loginSubmitting ? 'Sedang masuk…' : 'Masuk' }}
        </button>

        <p class="flex items-center gap-2.5 text-base leading-[1.4] text-black">
          <span class="flex-1">Belum punya akun?</span>
          <button type="button" class="text-[#166dba] underline hover:text-brand-600" data-testid="auth-switch-register" @click="dialog.open('register')">
            Daftar sekarang
          </button>
        </p>
      </form>

      <!-- ===== Register ===== -->
      <form v-else class="flex w-full flex-col gap-9" novalidate data-testid="auth-register-form" @submit.prevent="onRegister">
        <p v-if="REGISTER_IS_MOCK" class="w-full rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800" data-testid="auth-register-mock-notice">
          Registrasi masih mode contoh: data tidak dikirim ke server sampai endpoint registrasi tersedia.
        </p>
        <p v-if="registerError" role="alert" class="w-full bg-[#ffdede] p-1 text-center text-xs leading-[1.4] text-[#b50306] italic" data-testid="auth-register-error">
          {{ registerError }}
        </p>

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
            <div class="flex flex-col gap-2.5">
              <label for="reg-username" class="text-xs leading-[1.4] text-black">Nama Pengguna</label>
              <input id="reg-username" v-model="register.username" type="text" autocomplete="username" placeholder="Nama Pengguna" :class="[FIELD, { 'cms-input--error': registerErrors.username }]" data-testid="auth-register-username" />
              <p v-if="registerErrors.username" class="text-[10px] text-[#ff383c]" role="alert" data-testid="auth-register-username-error">{{ registerErrors.username }}</p>
            </div>
            <div class="flex flex-col gap-2.5">
              <label for="reg-password" class="text-xs leading-[1.4] text-black">Kata Sandi</label>
              <div class="relative">
                <input
                  id="reg-password"
                  v-model="register.password"
                  :type="showRegisterPassword ? 'text' : 'password'"
                  autocomplete="new-password"
                  placeholder="Kata Sandi"
                  :class="[FIELD, 'pr-11', { 'cms-input--error': registerErrors.password }]"
                  data-testid="auth-register-password"
                />
                <button
                  type="button"
                  class="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-ink-900 hover:text-brand-500"
                  :aria-label="showRegisterPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'"
                  :aria-pressed="showRegisterPassword"
                  data-testid="auth-register-password-toggle"
                  @click="showRegisterPassword = !showRegisterPassword"
                >
                  <MaskIcon :src="showRegisterPassword ? iconEyeOff : iconEye" :size="16" />
                </button>
              </div>
              <p v-if="registerErrors.password" class="text-[10px] text-[#ff383c]" role="alert" data-testid="auth-register-password-error">{{ registerErrors.password }}</p>
            </div>
          </div>
        </div>

        <button
          type="submit"
          :disabled="registerSubmitting"
          class="inline-flex h-[52px] w-full items-center justify-center rounded-lg bg-brand-500 p-3 text-base leading-none font-extrabold text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
          data-testid="auth-register-submit"
        >
          {{ registerSubmitting ? 'Mendaftar…' : 'Daftar' }}
        </button>

        <p class="flex items-center gap-2.5 text-base leading-[1.4] text-black">
          <span class="flex-1">Sudah punya akun?</span>
          <button type="button" class="text-[#166dba] underline hover:text-brand-600" data-testid="auth-switch-login" @click="dialog.open('login')">Masuk</button>
        </p>
      </form>
    </div>
  </div>
</template>
