<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ApiError } from '@/api/client'
import { USE_MOCK_API } from '@/api/auth'
import { useAuthStore } from '@/stores/auth'
import LanguageSwitcher from '@/components/LanguageSwitcher.vue'

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
  <div class="flex min-h-full flex-col bg-slate-50 dark:bg-slate-950">
    <header class="flex items-center justify-between px-6 py-4">
      <div class="flex items-center gap-2 font-semibold">
        <span class="flex size-8 items-center justify-center rounded-lg bg-indigo-600 text-sm text-white">W</span>
        <span>{{ t('app.name') }}</span>
      </div>
      <LanguageSwitcher />
    </header>

    <main class="flex flex-1 items-center justify-center px-4 pb-16">
      <div class="w-full max-w-md">
        <div class="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h1 class="text-2xl font-semibold tracking-tight">{{ t('login.title') }}</h1>
          <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">{{ t('login.subtitle') }}</p>

          <p
            v-if="USE_MOCK_API"
            class="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300"
          >
            {{ t('login.mockNotice') }}
          </p>

          <form class="mt-8 space-y-5" novalidate @submit.prevent="onSubmit">
            <div>
              <label for="username" class="block text-sm font-medium">{{ t('login.username') }}</label>
              <input
                id="username"
                v-model="username"
                type="text"
                name="username"
                autocomplete="username"
                required
                :placeholder="t('login.usernamePlaceholder')"
                class="mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-xs placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 focus:outline-none dark:border-slate-700 dark:bg-slate-950"
              />
            </div>

            <div>
              <div class="flex items-center justify-between">
                <label for="password" class="block text-sm font-medium">{{ t('login.password') }}</label>
                <button
                  type="button"
                  class="text-xs font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
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
                class="mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-xs placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 focus:outline-none dark:border-slate-700 dark:bg-slate-950"
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
              class="inline-flex w-full items-center justify-center rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-xs transition hover:bg-indigo-500 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60 dark:focus-visible:ring-offset-slate-900"
            >
              <svg v-if="submitting" class="mr-2 size-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4z" />
              </svg>
              {{ submitting ? t('login.submitting') : t('login.submit') }}
            </button>
          </form>
        </div>
      </div>
    </main>
  </div>
</template>
