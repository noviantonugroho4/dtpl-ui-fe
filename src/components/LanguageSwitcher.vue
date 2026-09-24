<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { LOCALE_LABELS, SUPPORTED_LOCALES, setLocale, type Locale } from '@/i18n'

const { t, locale } = useI18n()

const current = computed<Locale>({
  get: () => locale.value as Locale,
  set: (value) => setLocale(value),
})
</script>

<template>
  <label class="inline-flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
    <span class="sr-only">{{ t('common.language') }}</span>
    <svg class="size-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
    </svg>
    <select
      v-model="current"
      class="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm text-slate-800 shadow-xs focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
    >
      <option v-for="code in SUPPORTED_LOCALES" :key="code" :value="code">
        {{ LOCALE_LABELS[code] }}
      </option>
    </select>
  </label>
</template>
