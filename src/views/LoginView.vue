<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ApiError } from '@/api/client'
import { USE_MOCK_API } from '@/api/auth'
import { errorMessageFor } from '@/api/errorMessages'
import { useAuthStore } from '@/stores/auth'
import MaskIcon from '@/components/MaskIcon.vue'
import logoUrl from '@/assets/brand/widewi-login-logo.png'
import servicesUrl from '@/assets/brand/widewi-login-services.png'
import iconEye from '@/assets/icons/eye.svg'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()

const username = ref('')
const password = ref('')
const showPassword = ref(false)
const submitting = ref(false)
const errorMessage = ref<string | null>(null)

function redirectTarget(): string {
  const redirect = route.query.redirect
  // Only allow same-app relative paths to avoid open redirects.
  return typeof redirect === 'string' && redirect.startsWith('/') && !redirect.startsWith('//')
    ? redirect
    : '/dashboard'
}

async function onSubmit() {
  errorMessage.value = null

  if (!username.value.trim() || !password.value) {
    errorMessage.value = 'Nama pengguna dan kata sandi wajib diisi.'
    return
  }

  submitting.value = true
  try {
    await auth.login({ username: username.value.trim(), password: password.value })
    password.value = ''
    await router.replace(redirectTarget())
  } catch (err) {
    errorMessage.value =
      err instanceof ApiError ? errorMessageFor(err.code, err.message) : errorMessageFor('UNKNOWN_ERROR')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="grid min-h-full grid-cols-[minmax(0,1fr)] bg-white lg:grid-cols-2">
    <!-- Brand panel (Figma 177:728) -->
    <section
      class="flex min-w-0 flex-col items-center justify-center gap-10 rounded-b-[50px] bg-[linear-gradient(221.63deg,var(--color-brand-500)_0%,var(--color-brand-700)_100%)] p-6 text-white sm:gap-[60px] lg:rounded-r-[50px] lg:rounded-bl-none"
      aria-labelledby="brand-heading"
    >
      <h2 id="brand-heading" class="sr-only">WiDeWi CMS</h2>

      <img
        :src="logoUrl"
        alt="WIDEWI — Eksplorasi & Pemesanan Tiket Wisata"
        class="w-72 max-w-full sm:w-[472px]"
        width="944"
        height="532"
        decoding="async"
      />

      <img
        :src="servicesUrl"
        alt="Layanan WIDEWI: wisata dan tiket"
        class="w-[222px] max-w-full"
        width="444"
        height="242"
        decoding="async"
      />

      <p class="w-full text-center text-xl leading-[1.2]">Satu Portal, Seribu Pengalaman Tak Terlupakan</p>
    </section>

    <!-- Form panel (Figma 177:716) -->
    <section class="flex min-w-0 flex-col items-center justify-center gap-9 p-6 sm:p-10">
      <div class="flex w-full max-w-[400px] flex-col gap-2 text-center">
        <h1 class="text-3xl leading-[1.2] font-semibold tracking-[-0.8px] text-ink-900 sm:text-[40px]">
          Selamat Datang
        </h1>
        <p class="text-base leading-[1.2] text-ink-500">Silahkan login untuk masuk ke dalam sistem</p>
      </div>

      <p
        v-if="USE_MOCK_API"
        class="w-full max-w-[400px] rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800"
      >
        Mode mock aktif. Backend tidak dihubungi; gunakan kredensial dari berkas .env Anda.
      </p>

      <form class="flex w-full max-w-[400px] flex-col gap-9" novalidate @submit.prevent="onSubmit">
        <div class="flex flex-col gap-2">
          <label for="username" class="text-base leading-[1.4] text-ink-900">Nama Pengguna</label>
          <input
            id="username"
            v-model="username"
            type="text"
            name="username"
            autocomplete="username"
            required
            placeholder="Nama Pengguna"
            class="block w-full rounded-lg border border-ink-500 bg-white px-4 py-3 text-base leading-[1.4] text-ink-900 placeholder:italic placeholder:text-ink-300 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 focus:outline-none"
          />
        </div>

        <div class="flex flex-col gap-2.5">
          <label for="password" class="text-base leading-[1.4] text-ink-900">Kata Sandi</label>
          <div class="relative">
            <input
              id="password"
              v-model="password"
              :type="showPassword ? 'text' : 'password'"
              name="password"
              autocomplete="current-password"
              required
              placeholder="Kata Sandi"
              class="block w-full rounded-lg border border-ink-500 bg-white py-3 pr-12 pl-4 text-base leading-[1.4] text-ink-900 placeholder:italic placeholder:text-ink-300 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 focus:outline-none"
            />
            <button
              type="button"
              class="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-ink-900 hover:text-brand-500 focus-visible:text-brand-500 focus-visible:outline-none"
              :class="{ 'text-brand-500': showPassword }"
              :aria-label="showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'"
              :aria-pressed="showPassword"
              @click="showPassword = !showPassword"
            >
              <MaskIcon :src="iconEye" :size="16" />
            </button>
          </div>
        </div>

        <p
          v-if="errorMessage"
          role="alert"
          class="-my-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {{ errorMessage }}
        </p>

        <button
          type="submit"
          :disabled="submitting"
          class="inline-flex h-[52px] w-full items-center justify-center gap-2 rounded-lg border border-brand-500 bg-brand-500 p-3 text-base leading-none font-extrabold text-white transition hover:bg-brand-600 focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60"
        >
          <svg v-if="submitting" class="size-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4z" />
          </svg>
          {{ submitting ? 'Sedang masuk…' : 'Masuk' }}
        </button>
      </form>
    </section>
  </div>
</template>
