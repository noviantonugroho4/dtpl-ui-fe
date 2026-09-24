<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth'
import LanguageSwitcher from '@/components/LanguageSwitcher.vue'

const { t } = useI18n()
const router = useRouter()
const route = useRoute()
const auth = useAuthStore()

const sidebarOpen = ref(false)
const loggingOut = ref(false)

const navItems = [{ name: 'home', labelKey: 'nav.home' }]

watch(() => route.fullPath, () => (sidebarOpen.value = false))

async function onLogout() {
  loggingOut.value = true
  try {
    await auth.logout()
  } finally {
    loggingOut.value = false
    await router.replace({ name: 'login' })
  }
}
</script>

<template>
  <div class="flex min-h-full">
    <!-- Mobile backdrop -->
    <div
      v-if="sidebarOpen"
      class="fixed inset-0 z-30 bg-slate-900/50 lg:hidden"
      aria-hidden="true"
      @click="sidebarOpen = false"
    />

    <!-- Sidebar -->
    <aside
      class="fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-slate-200 bg-white transition-transform duration-200 lg:static lg:translate-x-0 dark:border-slate-800 dark:bg-slate-900"
      :class="sidebarOpen ? 'translate-x-0' : '-translate-x-full'"
    >
      <div class="flex h-16 items-center gap-2 px-5 font-semibold">
        <span class="flex size-8 items-center justify-center rounded-lg bg-indigo-600 text-sm text-white">W</span>
        <div class="leading-tight">
          <p>{{ t('app.name') }}</p>
          <p class="text-xs font-normal text-slate-500 dark:text-slate-400">{{ t('app.tagline') }}</p>
        </div>
        <button
          type="button"
          class="ml-auto rounded-md p-1.5 text-slate-500 hover:bg-slate-100 lg:hidden dark:hover:bg-slate-800"
          :aria-label="t('nav.closeMenu')"
          @click="sidebarOpen = false"
        >
          <svg class="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>

      <nav class="flex-1 space-y-1 px-3 py-4" :aria-label="t('nav.menu')">
        <RouterLink
          v-for="item in navItems"
          :key="item.name"
          :to="{ name: item.name }"
          class="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          exact-active-class="bg-indigo-50 text-indigo-700 hover:bg-indigo-50 dark:bg-indigo-500/15 dark:text-indigo-300"
        >
          <svg class="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
            <path d="M3 11.5 12 4l9 7.5M5 10v10h14V10" />
          </svg>
          {{ t(item.labelKey) }}
        </RouterLink>
      </nav>

      <div v-if="auth.user" class="border-t border-slate-200 p-4 dark:border-slate-800">
        <p class="text-xs text-slate-500 uppercase dark:text-slate-400">{{ t('nav.account') }}</p>
        <p class="mt-1 truncate text-sm font-medium">{{ auth.user.username }}</p>
        <p class="truncate text-xs text-slate-500 dark:text-slate-400">{{ auth.user.email }}</p>
      </div>
    </aside>

    <!-- Main column -->
    <div class="flex min-w-0 flex-1 flex-col">
      <header
        class="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/90 px-4 backdrop-blur sm:px-6 dark:border-slate-800 dark:bg-slate-900/90"
      >
        <button
          type="button"
          class="rounded-md p-2 text-slate-600 hover:bg-slate-100 lg:hidden dark:text-slate-300 dark:hover:bg-slate-800"
          :aria-label="t('nav.openMenu')"
          @click="sidebarOpen = true"
        >
          <svg class="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        </button>

        <h1 class="text-base font-semibold">
          {{ route.meta.titleKey ? t(route.meta.titleKey) : t('app.name') }}
        </h1>

        <div class="ml-auto flex items-center gap-3">
          <LanguageSwitcher />
          <button
            type="button"
            :disabled="loggingOut"
            class="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            @click="onLogout"
          >
            <svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path d="M15 4h4v16h-4M10 17l5-5-5-5M15 12H3" />
            </svg>
            {{ t('nav.logout') }}
          </button>
        </div>
      </header>

      <main class="flex-1 px-4 py-6 sm:px-6 lg:px-8">
        <RouterView />
      </main>
    </div>
  </div>
</template>
