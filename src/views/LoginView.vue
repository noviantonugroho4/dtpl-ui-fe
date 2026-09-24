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
  <div class="min-h-full bg-white p-3 sm:p-6 lg:p-9 dark:bg-slate-950">
    <div
      class="mx-auto grid min-h-[calc(100vh-1.5rem)] max-w-7xl overflow-hidden rounded-xl shadow-lg ring-1 ring-slate-200 sm:min-h-[calc(100vh-3rem)] lg:min-h-[calc(100vh-4.5rem)] lg:grid-cols-2 dark:ring-slate-800"
    >
      <!-- Brand panel -->
      <section
        class="relative flex flex-col items-center justify-between gap-8 bg-gradient-to-b from-brand-500 to-brand-700 px-6 py-8 text-white sm:px-10 lg:py-12"
        aria-labelledby="brand-heading"
      >
        <h2 id="brand-heading" class="sr-only">{{ t('app.name') }}</h2>

        <img
          :src="logoUrl"
          alt="WiDeWi"
          class="w-56 max-w-full drop-shadow-md sm:w-72 lg:mt-6 lg:w-[22rem]"
          width="900"
          height="610"
          decoding="async"
        />

        <div class="hidden w-full max-w-lg flex-col items-center gap-6 lg:flex">
          <img
            :src="servicesUrl"
            :alt="t('login.brandServices')"
            class="w-full"
            width="1200"
            height="286"
            loading="lazy"
            decoding="async"
          />
        </div>

        <p class="max-w-md text-center text-sm leading-relaxed text-white/85 sm:text-base">
          {{ t('login.brandTagline') }}
        </p>
      </section>

      <!-- Form panel -->
      <section class="relative flex flex-col bg-white px-6 py-8 sm:px-12 lg:px-16 lg:py-12 dark:bg-slate-900">
        <div class="flex justify-end">
          <LanguageSwitcher />
        </div>

        <div class="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-8">
          <h1 class="text-3xl font-extrabold tracking-tight text-brand-700 sm:text-4xl dark:text-brand-100">
            {{ t('login.welcome') }}
          </h1>
          <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">{{ t('login.subtitle') }}</p>

          <p
            v-if="USE_MOCK_API"
            class="mt-5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300"
          >
            {{ t('login.mockNotice') }}
          </p>

          <form class="mt-8 space-y-5" novalidate @submit.prevent="onSubmit">
            <div>
              <label for="username" class="block text-sm font-semibold text-slate-700 dark:text-slate-200">
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
                class="mt-2 block h-14 w-full rounded-lg border border-slate-300 bg-slate-50 px-4 text-base text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-500/30 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              />
            </div>

            <div>
              <div class="flex items-center justify-between">
                <label for="password" class="block text-sm font-semibold text-slate-700 dark:text-slate-200">
                  {{ t('login.password') }}
                </label>
                <button
                  type="button"
                  class="text-xs font-semibold text-brand-500 hover:text-brand-600 dark:text-brand-400"
                  @click="showPassword = !showPassword"
                >
                  {{ showPassword ? t('login.hidePassword') : t('login.showPassword') }}
                </button>
              </div>
              <input
                id="password"
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                name="password"
                autocomplete="current-password"
                required
                :placeholder="t('login.passwordPlaceholder')"
                class="mt-2 block h-14 w-full rounded-lg border border-slate-300 bg-slate-50 px-4 text-base text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-500/30 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              />
            </div>

            <p
              v-if="errorMessage"
              role="alert"
              class="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300"
            >
              {{ errorMessage }}
            </p>

            <button
              type="submit"
              :disabled="submitting"
              class="inline-flex h-13 w-full items-center justify-center rounded-lg bg-brand-500 px-4 text-base font-bold text-white shadow-sm transition hover:bg-brand-600 focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60 dark:focus-visible:ring-offset-slate-900"
            >
              <svg v-if="submitting" class="mr-2 size-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4z" />
              </svg>
              {{ submitting ? t('login.submitting') : t('login.submit') }}
            </button>
          </form>
        </div>

        <p class="text-center text-xs text-slate-400 dark:text-slate-500">
          © {{ new Date().getFullYear() }} {{ t('app.name') }}
        </p>
      </section>
    </div>
  </div>
</template>
