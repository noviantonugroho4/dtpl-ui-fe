<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { UserProfile } from '@/api/types'

const props = defineProps<{ user: UserProfile }>()
const { t, d, te } = useI18n()

const roleLabel = computed(() => {
  const key = `roles.${props.user.role}`
  return te(key) ? t(key) : props.user.role
})

const roleClass = computed(() => {
  switch (props.user.role) {
    case 'admin':
      return 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300'
    case 'editor':
      return 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300'
    default:
      return 'bg-slate-100 text-slate-700 dark:bg-slate-700/40 dark:text-slate-200'
  }
})

function formatDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : d(date, 'long')
}

const rows = computed(() => [
  { label: t('profile.id'), value: String(props.user.id) },
  { label: t('profile.username'), value: props.user.username },
  { label: t('profile.email'), value: props.user.email },
  { label: t('profile.createdAt'), value: formatDate(props.user.createdAt) },
  { label: t('profile.updatedAt'), value: formatDate(props.user.updatedAt) },
])
</script>

<template>
  <div class="rounded-xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
    <div class="flex items-center gap-4 border-b border-slate-200 px-6 py-5 dark:border-slate-800">
      <div
        class="flex size-12 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-lg font-semibold text-white uppercase"
        aria-hidden="true"
      >
        {{ user.username.slice(0, 2) }}
      </div>
      <div class="min-w-0">
        <p class="truncate text-base font-semibold">{{ user.username }}</p>
        <p class="truncate text-sm text-slate-500 dark:text-slate-400">{{ user.email }}</p>
      </div>
      <span class="ml-auto rounded-full px-3 py-1 text-xs font-medium" :class="roleClass">
        {{ roleLabel }}
      </span>
    </div>
    <dl class="divide-y divide-slate-100 dark:divide-slate-800">
      <div v-for="row in rows" :key="row.label" class="grid grid-cols-1 gap-1 px-6 py-3 sm:grid-cols-3 sm:gap-4">
        <dt class="text-sm text-slate-500 dark:text-slate-400">{{ row.label }}</dt>
        <dd class="text-sm font-medium break-all sm:col-span-2">{{ row.value }}</dd>
      </div>
    </dl>
  </div>
</template>
