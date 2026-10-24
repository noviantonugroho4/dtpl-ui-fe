<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink } from 'vue-router'
import { ApiError } from '@/api/client'
import { errorMessageFor } from '@/api/errorMessages'
import { getLandingSections, type LandingWisata } from '@/api/landing'
import type { WisataType } from '@/api/types'
import MaskIcon from '@/components/MaskIcon.vue'
import WisataCarousel from '@/components/public/WisataCarousel.vue'
import heroUrl from '@/assets/landing/hero.jpg'
import catRekreasi from '@/assets/landing/cat-rekreasi.png'
import catBahari from '@/assets/landing/cat-bahari.png'
import catAlam from '@/assets/landing/cat-alam.png'
import catBudaya from '@/assets/landing/cat-budaya.png'
import iconArrowRight from '@/assets/icons/arrow-right.svg'

const CATEGORIES: { jenis: WisataType; lines: [string, string]; icon: string }[] = [
  { jenis: 'wisata_rekreasi', lines: ['Wisata', 'Rekreasi'], icon: catRekreasi },
  { jenis: 'wisata_bahari', lines: ['Wisata', 'Bahari'], icon: catBahari },
  { jenis: 'wisata_alam', lines: ['Wisata', 'Alam'], icon: catAlam },
  { jenis: 'wisata_budaya_dan_sejarah', lines: ['Wisata Budaya', 'dan Sejarah'], icon: catBudaya },
]

/** Destinasi Baru (createdAt terbaru) dan Unggulan (lihat src/api/landing.ts), 5 kartu masing-masing. */
const newest = ref<LandingWisata[]>([])
const featured = ref<LandingWisata[]>([])
const loading = ref(true)
const loadError = ref<string | null>(null)

async function load() {
  loading.value = true
  loadError.value = null
  try {
    const sections = await getLandingSections()
    newest.value = sections.newest
    featured.value = sections.featured
  } catch (err) {
    loadError.value = err instanceof ApiError ? errorMessageFor(err.code, err.message) : errorMessageFor('UNKNOWN_ERROR')
  } finally {
    loading.value = false
  }
}

void load()
</script>

<template>
  <div class="flex flex-col" data-testid="landing-page">
    <!-- Hero (Figma 496:6498 / 496:6501) -->
    <section class="relative" data-testid="landing-hero">
      <div class="relative aspect-[1280/565] min-h-[420px] w-full overflow-hidden rounded-b-[50px]">
        <img :src="heroUrl" alt="" class="absolute inset-0 size-full object-cover" width="1199" height="685" fetchpriority="high" />
        <div class="absolute inset-0 bg-gradient-to-r from-black/25 to-transparent" aria-hidden="true" />
        <div class="relative flex h-full flex-col justify-center gap-2.5 px-6 pt-10 pb-16 text-white sm:px-16 lg:px-[95px] lg:pt-[100px]">
          <h1 class="text-4xl leading-[1.15] font-bold tracking-tight uppercase sm:text-5xl lg:text-[64px]" data-testid="landing-hero-title">
            Destinasi<br />Wisata Impian
          </h1>
          <p class="max-w-md text-lg leading-[1.3] sm:text-2xl" data-testid="landing-hero-subtitle">Temukan wisata dengan pengalaman tak terlupakan</p>
          <RouterLink
            :to="{ name: 'public-attractions' }"
            class="mt-2 inline-flex w-fit items-center gap-2 rounded-full bg-accent-500 px-5 py-4 text-sm leading-none font-medium text-white transition hover:bg-accent-600"
            data-testid="landing-hero-cta"
          >
            Cari Wisata
            <MaskIcon :src="iconArrowRight" :size="16" />
          </RouterLink>
        </div>
      </div>

      <!-- Kategori (Figma 496:6505) -->
      <nav
        class="relative z-10 mx-4 -mt-10 flex flex-wrap items-center justify-center gap-x-2.5 gap-y-3 rounded-[30px] bg-white px-6 py-5 shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)] sm:mx-auto sm:w-fit sm:px-8"
        aria-label="Kategori wisata"
        data-testid="landing-categories"
      >
        <template v-for="(category, index) in CATEGORIES" :key="category.jenis">
          <span v-if="index > 0" class="hidden h-8 w-px bg-ink-200 sm:block" aria-hidden="true" />
          <RouterLink
            :to="{ name: 'public-attractions', query: { jenis: category.jenis } }"
            class="flex items-center gap-2.5 rounded-lg px-2 py-1 hover:bg-brand-50"
            :data-testid="`landing-category-${category.jenis}`"
          >
            <img :src="category.icon" alt="" class="size-[47px]" width="94" height="96" />
            <span class="text-sm leading-[1.4] text-black">{{ category.lines[0] }}<br />{{ category.lines[1] }}</span>
          </RouterLink>
        </template>
      </nav>
    </section>

    <!-- Destinasi Unggulan: sementara judul terpanjang (lihat src/api/landing.ts) -->
    <WisataCarousel
      title="Destinasi Unggulan"
      subtitle="Tempat pilihan terbaik untuk perjalananmu selanjutnya"
      :items="featured"
      :loading="loading"
      :error="loadError"
      empty-text="Belum ada destinasi unggulan."
      testid="landing-featured"
    />

    <!-- Destinasi Baru: dari backend, createdAt terbaru -->
    <WisataCarousel
      title="Destinasi Baru"
      subtitle="Eksplorasi spot-spot wisata terbaru yang wajib masuk daftar perjalananmu"
      :items="newest"
      :loading="loading"
      :error="loadError"
      empty-text="Belum ada destinasi baru."
      testid="landing-newest"
    />
  </div>
</template>
