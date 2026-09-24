<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
</script>

<template>
  <div class="flex min-h-full flex-col items-center justify-center px-4 text-center">
    <p class="text-6xl font-bold text-indigo-600">404</p>
    <h1 class="mt-4 text-2xl font-semibold">{{ t('notFound.title') }}</h1>
    <p class="mt-2 max-w-md text-sm text-slate-500 dark:text-slate-400">{{ t('notFound.description') }}</p>
    <RouterLink
      :to="{ name: 'home' }"
      class="mt-6 inline-flex rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
    >
      {{ t('common.backHome') }}
    </RouterLink>
  </div>
</template>
