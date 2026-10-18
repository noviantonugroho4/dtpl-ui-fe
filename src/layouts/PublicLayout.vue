<script setup lang="ts">
import { RouterView } from 'vue-router'
import PublicHeader from '@/components/public/PublicHeader.vue'
</script>

<template>
  <div class="relative flex min-h-full flex-col bg-canvas text-ink-900" data-testid="public-layout">
    <PublicHeader />

    <main class="flex flex-1 flex-col" data-testid="public-main">
      <RouterView />
    </main>

    <footer
      id="kontak"
      class="flex flex-col items-center justify-center gap-2.5 border-t border-ink-300 bg-brand-500 px-4 py-4 text-center text-xs leading-[1.2] text-white"
      data-testid="public-footer"
    >
      <p>Copyright © 2026 DTPL - Kelompok 2. All rights reserved.</p>
    </footer>
  </div>
</template>
