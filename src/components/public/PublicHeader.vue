<script setup lang="ts">
import { RouterLink } from 'vue-router'
import MaskIcon from '@/components/MaskIcon.vue'
import logoUrl from '@/assets/brand/widewi-logo-horizontal.png'
import iconInstagram from '@/assets/icons/instagram.svg'
import iconFacebook from '@/assets/icons/facebook.svg'
import iconYoutube from '@/assets/icons/youtube.svg'

/** Tautan sosial: placeholder sampai URL resmi tersedia. */
const SOCIAL_LINKS = [
  { key: 'instagram', label: 'Instagram', icon: iconInstagram, href: '#' },
  { key: 'facebook', label: 'Facebook', icon: iconFacebook, href: '#' },
  { key: 'youtube', label: 'YouTube', icon: iconYoutube, href: '#' },
]

const PILL = 'rounded-lg border px-3 py-2 text-sm leading-none whitespace-nowrap transition hover:bg-brand-50'
const PILL_IDLE = 'border-transparent text-ink-900'
const PILL_ACTIVE = 'border-brand-500 text-brand-500'
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
      <a href="#kontak" :class="[PILL, PILL_IDLE]" data-testid="public-nav-contact">Kontak Kami</a>
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

    <RouterLink
      :to="{ name: 'login' }"
      class="rounded-lg bg-brand-500 px-3 py-2 text-sm leading-none whitespace-nowrap text-canvas transition hover:bg-brand-600 sm:ml-7"
      data-testid="public-header-login"
    >
      Masuk
    </RouterLink>
  </header>
</template>
