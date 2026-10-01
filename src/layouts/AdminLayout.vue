<script setup lang="ts">
import { ref, watch } from 'vue'
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import MaskIcon from '@/components/MaskIcon.vue'
import logoUrl from '@/assets/brand/widewi-logo-horizontal.png'
import iconStar from '@/assets/icons/star.svg'
import iconNavigation from '@/assets/icons/navigation.svg'
import iconTag from '@/assets/icons/tag.svg'
import iconMessageSquare from '@/assets/icons/message-square.svg'
import iconMenu from '@/assets/icons/menu.svg'
import iconLogOut from '@/assets/icons/log-out.svg'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()

/** Mobile drawer state (below the `lg` breakpoint). */
const sidebarOpen = ref(false)
/** Desktop collapse state (at or above the `lg` breakpoint). */
const sidebarCollapsed = ref(false)
const loggingOut = ref(false)

interface NavItem {
  name: string
  label: string
  icon: string
}

/** Menu sections mirror the Figma sidebar (177:828): separators sit between sections. */
const navSections: NavItem[][] = [
  [{ name: 'dashboard', label: 'Dashboard', icon: iconStar }],
  [{ name: 'attractions', label: 'Daftar Destinasi Wisata', icon: iconNavigation }],
  [
    { name: 'ticketBookings', label: 'Pemesanan Ticket Wisata', icon: iconTag },
    { name: 'reviews', label: 'Penilaian dan Komentar', icon: iconMessageSquare },
  ],
]

watch(() => route.fullPath, () => (sidebarOpen.value = false))

function isDesktop(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(min-width: 64rem)').matches
    : false
}

function toggleSidebar() {
  if (isDesktop()) sidebarCollapsed.value = !sidebarCollapsed.value
  else sidebarOpen.value = true
}

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
  <div class="flex min-h-full bg-canvas text-ink-900">
    <!-- Mobile backdrop -->
    <div
      v-if="sidebarOpen"
      class="fixed inset-0 z-30 bg-ink-900/50 lg:hidden"
      aria-hidden="true"
      @click="sidebarOpen = false"
    />

    <!-- Sidebar (Figma 177:828) -->
    <aside
      class="fixed inset-y-0 left-0 z-40 flex w-[259px] flex-col gap-12 border-r border-ink-300 bg-white px-3 pt-[7px] pb-3 transition-transform duration-200 lg:static lg:translate-x-0"
      :class="[sidebarOpen ? 'translate-x-0' : '-translate-x-full', sidebarCollapsed ? 'lg:hidden' : '']"
    >
      <div class="relative flex h-[127px] w-full items-center justify-center">
        <span class="sr-only">WiDeWi CMS</span>
        <img :src="logoUrl" alt="WIDEWI" class="h-[51px] w-auto max-w-full" width="468" height="102" decoding="async" />
        <button
          type="button"
          class="absolute top-2 right-0 rounded-md p-1.5 text-ink-500 hover:bg-canvas lg:hidden"
          aria-label="Tutup menu"
          @click="sidebarOpen = false"
        >
          <svg class="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>

      <nav class="flex w-full flex-col rounded-lg bg-white" aria-label="Menu">
        <template v-for="(section, index) in navSections" :key="index">
          <div v-if="index > 0" class="px-4 py-2" role="separator">
            <div class="h-px w-full bg-ink-200" />
          </div>
          <div class="flex flex-col overflow-clip rounded-lg">
            <RouterLink
              v-for="item in section"
              :key="item.name"
              :to="{ name: item.name }"
              class="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-xs leading-[1.4] text-ink-900 hover:bg-brand-50"
              active-class="bg-brand-500 text-sm text-canvas hover:bg-brand-500"
            >
              <MaskIcon :src="item.icon" />
              <span class="min-w-0 flex-1 wrap-break-word">{{ item.label }}</span>
            </RouterLink>
          </div>
        </template>
      </nav>
    </aside>

    <!-- Main column -->
    <div class="flex min-w-0 flex-1 flex-col">
      <!-- Header (Figma 177:857) -->
      <header class="sticky top-0 z-20 flex h-[70px] items-center gap-4 border-b border-ink-300 bg-white p-3">
        <button
          type="button"
          class="rounded-md text-ink-900 hover:bg-canvas"
          aria-label="Buka menu"
          :aria-expanded="isDesktop() ? !sidebarCollapsed : sidebarOpen"
          @click="toggleSidebar"
        >
          <MaskIcon :src="iconMenu" :size="28" />
        </button>

        <h1 class="min-w-0 flex-1 truncate text-xl leading-[1.2] font-semibold tracking-[-0.4px] text-ink-900">
          Website Destinasi Wisata
        </h1>

        <button
          type="button"
          :disabled="loggingOut"
          class="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-brand-500 p-3 text-sm leading-none font-medium text-canvas transition hover:bg-brand-600 focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60"
          @click="onLogout"
        >
          Log out
          <MaskIcon :src="iconLogOut" :size="16" />
        </button>
      </header>

      <main class="flex flex-1 flex-col gap-4 p-4">
        <RouterView />
      </main>
    </div>
  </div>
</template>
