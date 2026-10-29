<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useAuthDialogStore } from '@/stores/authDialog'
import { useTravelerStore } from '@/stores/traveler'
import MaskIcon from '@/components/MaskIcon.vue'
import logoUrl from '@/assets/brand/widewi-logo-horizontal.png'
import iconInstagram from '@/assets/icons/instagram.svg'
import iconFacebook from '@/assets/icons/facebook.svg'
import iconYoutube from '@/assets/icons/youtube.svg'
import iconChevronDown from '@/assets/icons/chevron-down.svg'

/** Tautan sosial: placeholder sampai URL resmi tersedia. */
const SOCIAL_LINKS = [
  { key: 'instagram', label: 'Instagram', icon: iconInstagram, href: '#' },
  { key: 'facebook', label: 'Facebook', icon: iconFacebook, href: '#' },
  { key: 'youtube', label: 'YouTube', icon: iconYoutube, href: '#' },
]

const PILL = 'rounded-lg border px-3 py-2 text-sm leading-none whitespace-nowrap transition hover:bg-brand-50'
const PILL_IDLE = 'border-transparent text-ink-900'
const PILL_ACTIVE = 'border-brand-500 text-brand-500'

const auth = useAuthStore()
const traveler = useTravelerStore()
const dialog = useAuthDialogStore()

/** Nama di header: sesi CMS atau sesi wisatawan Google (keduanya Bearer token). */
const displayName = computed(() => (auth.isAuthenticated && auth.user ? auth.user.username : traveler.user?.nama ?? null))
const router = useRouter()
const loggingOut = ref(false)
/** Menu pengguna (Figma 496:6768: header landing dengan nama pengguna menggantikan "Masuk"). */
const menuOpen = ref(false)
const menuRoot = ref<HTMLElement | null>(null)

async function onLogout() {
  menuOpen.value = false
  loggingOut.value = true
  try {
    if (auth.isAuthenticated) await auth.logout()
    if (traveler.user) await traveler.logout()
  } finally {
    loggingOut.value = false
    if (router.currentRoute.value.meta.requiresAuth) await router.replace({ name: 'home' })
  }
}

function onDocumentClick(event: MouseEvent) {
  if (menuOpen.value && menuRoot.value && !menuRoot.value.contains(event.target as Node)) menuOpen.value = false
}
function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') menuOpen.value = false
}
onMounted(() => {
  void traveler.initialize()
  document.addEventListener('click', onDocumentClick)
  document.addEventListener('keydown', onKeydown)
})
onBeforeUnmount(() => {
  document.removeEventListener('click', onDocumentClick)
  document.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <header
    class="relative z-30 mx-4 mt-3 flex flex-wrap items-center gap-2.5 rounded-[40px] bg-white px-5 py-3 drop-shadow-[0px_4px_2px_rgba(0,0,0,0.25)] sm:px-8 sm:py-4 lg:absolute lg:inset-x-14 lg:top-3 lg:mx-0 lg:mt-0 lg:rounded-[100px]"
    data-testid="public-header"
  >
    <RouterLink :to="{ name: 'home' }" class="mr-auto flex items-center" aria-label="WIDEWI beranda" data-testid="public-header-logo">
      <img :src="logoUrl" alt="WIDEWI" class="h-10 w-auto" width="468" height="102" decoding="async" />
    </RouterLink>

    <nav class="flex flex-wrap items-center gap-2.5" aria-label="Menu utama" data-testid="public-nav">
      <RouterLink :to="{ name: 'home' }" :class="[PILL, PILL_IDLE]" :exact-active-class="PILL_ACTIVE" data-testid="public-nav-home">Beranda</RouterLink>
      <RouterLink
        :to="{ name: 'public-attractions' }"
        :class="[PILL, PILL_IDLE]"
        :active-class="PILL_ACTIVE"
        data-testid="public-nav-attractions"
      >
        Destinasi Wisata
      </RouterLink>
      <RouterLink :to="{ name: 'contact' }" :class="[PILL, PILL_IDLE]" :active-class="PILL_ACTIVE" data-testid="public-nav-contact">Kontak Kami</RouterLink>
    </nav>

    <div class="flex items-center gap-2.5 text-ink-900" data-testid="public-social">
      <a
        v-for="link in SOCIAL_LINKS"
        :key="link.key"
        :href="link.href"
        :aria-label="link.label"
        class="rounded p-1 hover:text-brand-500"
        :data-testid="`public-social-${link.key}`"
      >
        <MaskIcon :src="link.icon" :size="16" />
      </a>
    </div>

    <div v-if="displayName" ref="menuRoot" class="relative sm:ml-7">
      <button
        type="button"
        class="flex items-center gap-2 rounded-lg bg-brand-500 px-3 py-2 text-sm leading-none whitespace-nowrap text-canvas transition hover:bg-brand-600"
        :aria-expanded="menuOpen"
        aria-haspopup="menu"
        data-testid="public-header-user"
        @click="menuOpen = !menuOpen"
      >
        <span class="max-w-[160px] truncate sm:max-w-[220px]" data-testid="public-header-user-name">{{ displayName }}</span>
        <MaskIcon :src="iconChevronDown" :size="14" />
      </button>
      <div
        v-if="menuOpen"
        role="menu"
        class="absolute right-0 z-40 mt-2 flex min-w-[180px] flex-col overflow-hidden rounded-lg border border-ink-200 bg-white py-1 text-sm text-ink-900 shadow-lg"
        data-testid="public-header-menu"
      >
        <RouterLink
          v-if="auth.isAuthenticated && (auth.user?.role === 'admin' || auth.user?.role === 'editor')"
          :to="{ name: 'dashboard' }"
          role="menuitem"
          class="px-4 py-2 text-left hover:bg-brand-50"
          data-testid="public-header-portal"
          @click="menuOpen = false"
        >
          Portal Admin
        </RouterLink>
        <button
          type="button"
          role="menuitem"
          :disabled="loggingOut"
          class="px-4 py-2 text-left hover:bg-brand-50 disabled:opacity-60"
          data-testid="public-header-logout"
          @click="onLogout"
        >
          Keluar
        </button>
      </div>
    </div>
    <button
      v-else
      type="button"
      class="rounded-lg bg-brand-500 px-3 py-2 text-sm leading-none whitespace-nowrap text-canvas transition hover:bg-brand-600 sm:ml-7"
      data-testid="public-header-login"
      @click="dialog.open('login')"
    >
      Masuk
    </button>
  </header>
</template>
