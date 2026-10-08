<script setup lang="ts">
import { useRoute } from 'vue-router'

const route = useRoute()
</script>

<template>
  <section data-testid="coming-soon-page" class="rounded-[20px] bg-white p-4">
    <h2 data-testid="coming-soon-title" class="text-xl leading-[1.2] font-semibold tracking-[-0.6px] text-ink-900">
      {{ route.meta.title ?? 'Segera hadir' }}
    </h2>
    <p class="mt-2 text-xs leading-[1.2] text-ink-500">Halaman ini belum tersedia.</p>
  </section>
</template>
