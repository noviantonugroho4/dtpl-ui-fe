<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ApiError } from '@/api/client'
import { USE_MOCK_API } from '@/api/auth'
import { useAuthStore } from '@/stores/auth'
import LanguageSwitcher from '@/components/LanguageSwitcher.vue'
import logoUrl from '@/assets/brand/widewi-logo.webp'
import servicesUrl from '@/assets/brand/widewi-services.webp'

const { t, te } = useI18n()
const router = useRouter()
const route = useRoute()
const auth = useAuthStore()

const username = ref('')
const password = ref('')
const showPassword = ref(false)
const submitting = ref(false)
const errorKey = ref<string | null>(null)
const errorFallback = ref<string | null>(null)

const errorMessage = computed(() => {
  if (!errorKey.value) return null
  return te(errorKey.value) ? t(errorKey.value) : (errorFallback.value ?? t('errors.UNKNOWN_ERROR'))
})

function redirectTarget(): string {
  const redirect = route.query.redirect
  // Only allow same-app relative paths to avoid open redirects.
  return typeof redirect === 'string' && redirect.startsWith('/') && !redirect.startsWith('//') ? redirect : '/'
}

async function onSubmit() {
  errorKey.value = null
  errorFallback.value = null

  if (!username.value.trim() || !password.value) {
    errorKey.value = 'login.required'
    return
  }

  submitting.value = true
  try {
    await auth.login({ username: username.value.trim(), password: password.value })
    password.value = ''
    await router.replace(redirectTarget())
  } catch (err) {
    if (err instanceof ApiError) {
      errorKey.value = `errors.${err.code}`
      errorFallback.value = err.message
    } else {
      errorKey.value = 'errors.UNKNOWN_ERROR'
    }
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="grid min-h-full grid-cols-[minmax(0,1fr)] bg-white lg:grid-cols-2">
    <!-- Brand panel (Figma 28:1404) -->
    <section
      class="flex min-w-0 flex-col items-center justify-center gap-8 bg-[linear-gradient(221.63deg,var(--color-brand-500)_0%,var(--color-brand-700)_100%)] p-6 text-white sm:gap-12"
      aria-labelledby="brand-heading"
    >
      <h2 id="brand-heading" class="sr-only">{{ t('app.name') }}</h2>

      <img
        :src="logoUrl"
        alt="WIDEWI"
        class="w-64 max-w-full sm:w-[360px]"
        width="900"
        height="610"
        decoding="async"
      />

      <img
        :src="servicesUrl"
        :alt="t('login.brandServices')"
        class="w-full max-w-[440px]"
        width="1200"
        height="286"
        decoding="async"
      />

      <p class="w-full max-w-[30rem] text-center text-2xl leading-[1.2] sm:text-[32px]">
        <span class="font-bold">WIDEWI</span>: {{ t('login.brandTagline') }}
      </p>
    </section>

    <!-- Form panel (Figma 26:1215) -->
    <section class="relative flex min-w-0 flex-col items-center justify-center gap-9 p-6 sm:p-10">
      <div class="flex w-full justify-end lg:absolute lg:top-6 lg:right-6 lg:w-auto">
        <LanguageSwitcher />
      </div>

      <div class="flex w-full max-w-[400px] flex-col gap-2 text-center">
        <h1 class="text-3xl leading-[1.2] font-semibold tracking-[-0.8px] text-ink-900 sm:text-[40px]">
          {{ t('login.welcome') }}
        </h1>
        <p class="text-base leading-[1.2] text-ink-500">{{ t('login.subtitle') }}</p>
      </div>

      <p
        v-if="USE_MOCK_API"
        class="w-full max-w-[400px] rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800"
      >
        {{ t('login.mockNotice') }}
      </p>

      <form class="flex w-full max-w-[400px] flex-col gap-9" novalidate @submit.prevent="onSubmit">
        <div class="flex flex-col gap-2">
          <label for="username" class="text-base leading-[1.4] text-ink-900">
            {{ t('login.username') }}
          </label>
          <input
            id="username"
            v-model="username"
            type="text"
            name="username"
            autocomplete="username"
            required
            :placeholder="t('login.usernamePlaceholder')"
            class="block w-full rounded-lg border border-ink-500 bg-white px-4 py-3 text-base leading-none text-ink-900 placeholder:italic placeholder:text-ink-300 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 focus:outline-none"
          />
        </div>

        <div class="flex flex-col gap-2">
          <label for="password" class="text-base leading-[1.4] text-ink-900">
            {{ t('login.password') }}
          </label>
          <div class="relative">
            <input
              id="password"
              v-model="password"
              :type="showPassword ? 'text' : 'password'"
              name="password"
              autocomplete="current-password"
              required
              :placeholder="t('login.passwordPlaceholder')"
              class="block w-full rounded-lg border border-ink-500 bg-white py-3 pr-12 pl-4 text-base leading-none text-ink-900 placeholder:italic placeholder:text-ink-300 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 focus:outline-none"
            />
            <button
              type="button"
              class="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-ink-500 hover:text-brand-500 focus-visible:text-brand-500 focus-visible:outline-none"
              :aria-label="showPassword ? t('login.hidePassword') : t('login.showPassword')"
              :aria-pressed="showPassword"
              @click="showPassword = !showPassword"
            >
              <svg
                v-if="showPassword"
                class="size-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <path d="M3 3l18 18" />
                <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
                <path d="M9.9 5.1A10.4 10.4 0 0 1 12 5c5 0 9 4.5 10 7-.5 1.2-1.5 2.7-3 4" />
                <path d="M6.6 6.6C4.3 8 2.7 10.2 2 12c1 2.5 5 7 10 7 1.5 0 2.9-.4 4.1-1" />
              </svg>
              <svg
                v-else
                class="size-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <path d="M2 12c1-2.5 5-7 10-7s9 4.5 10 7c-1 2.5-5 7-10 7S3 14.5 2 12z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
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
          {{ submitting ? t('login.submitting') : t('login.submit') }}
        </button>
      </form>
    </section>
  </div>
</template>
