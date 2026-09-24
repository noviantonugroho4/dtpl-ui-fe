<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ApiError } from '@/api/client'
import { useAuthStore } from '@/stores/auth'
import ProfileCard from '@/components/ProfileCard.vue'

const { t, te } = useI18n()
const router = useRouter()
const auth = useAuthStore()

const refreshing = ref(false)
const errorKey = ref<string | null>(null)

const errorMessage = computed(() => {
  if (!errorKey.value) return null
  return te(errorKey.value) ? t(errorKey.value) : t('home.loadError')
})

async function refresh() {
  refreshing.value = true
  errorKey.value = null
  try {
    const user = await auth.fetchMe()
    if (!user) {
      await router.replace({ name: 'login' })
    }
  } catch (err) {
    errorKey.value = err instanceof ApiError ? `errors.${err.code}` : 'errors.UNKNOWN_ERROR'
  } finally {
    refreshing.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-4xl space-y-8">
    <section>
      <h2 class="text-2xl font-semibold tracking-tight">
        {{ t('home.welcome', { name: auth.user?.username ?? '' }) }}
      </h2>
      <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">{{ t('home.intro') }}</p>
    </section>

    <section class="space-y-4">
      <div class="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 class="text-lg font-semibold">{{ t('home.profileTitle') }}</h3>
          <p class="text-sm text-slate-500 dark:text-slate-400">{{ t('home.profileHint') }}</p>
        </div>
        <button
          type="button"
          :disabled="refreshing"
          class="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          @click="refresh"
        >
          <svg class="size-4" :class="{ 'animate-spin': refreshing }" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path d="M20 12a8 8 0 1 1-2.34-5.66M20 4v5h-5" />
          </svg>
          {{ t('home.refresh') }}
        </button>
      </div>

      <p
        v-if="errorMessage"
        role="alert"
        class="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300"
      >
        {{ errorMessage }}
      </p>

      <ProfileCard v-if="auth.user" :user="auth.user" />
      <p v-else class="text-sm text-slate-500 dark:text-slate-400">{{ t('common.loading') }}</p>
    </section>
  </div>
</template>
