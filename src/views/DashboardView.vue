<script setup lang="ts">
import LineChart from '@/components/charts/LineChart.vue'
import HorizontalBarChart from '@/components/charts/HorizontalBarChart.vue'

// Angka contoh dari mock-up Figma (node 177:826).
// Ganti dengan data API setelah endpoint laporan tersedia.
const TICKET_BOOKINGS_BY_MONTH = [
  { label: 'Jan', value: 20 },
  { label: 'Feb', value: 30 },
  { label: 'Mar', value: 60 },
  { label: 'Apr', value: 12 },
  { label: 'Mei', value: 34 },
  { label: 'Jun', value: 24 },
]
const TOP_RATED_DESTINATIONS = [
  { label: 'Snorkling Kep. Seribu', value: 81 },
  { label: 'Pantai Mandiri', value: 78 },
  { label: 'Pantai Tanju Setia', value: 72 },
  { label: 'Danau Ranau', value: 42 },
  { label: 'Air terjun Way Detum', value: 32 },
  { label: 'Snorkling Pahawang', value: 10 },
]
</script>

<template>
  <div class="flex flex-col gap-4">
    <!-- Title card (Figma 177:862) -->
    <section class="rounded-[20px] bg-white p-4">
      <h2 class="text-xl leading-[1.2] font-semibold tracking-[-0.6px] text-ink-900">Dashboard</h2>
      <p class="mt-2 text-xs leading-[1.2] text-ink-500">Take a quick look at the overview</p>
    </section>

    <!-- Chart cards (Figma 177:864) -->
    <div class="grid gap-4 xl:grid-cols-2">
      <section class="min-w-0 rounded-[20px] bg-white p-3">
        <LineChart title="Jumlah Pemesanan Tiket Destinasi Wisata" :points="TICKET_BOOKINGS_BY_MONTH" />
      </section>
      <section class="min-w-0 rounded-[20px] bg-white p-3">
        <HorizontalBarChart
          title="Destinasi Wisata dengan Rating tertinggi"
          :bars="TOP_RATED_DESTINATIONS"
          :label-width="136"
        />
      </section>
    </div>
  </div>
</template>
