<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import LineChart from '@/components/charts/LineChart.vue'
import HorizontalBarChart from '@/components/charts/HorizontalBarChart.vue'

const { t, locale } = useI18n()

// Sample figures taken from the Figma dashboard mock-up (node 29:1471).
// Replace with API data once the reporting endpoints exist.
const TICKET_BOOKINGS_BY_MONTH = [20, 30, 60, 12, 34, 24]
const VILLAGE_VISITS = [
  { label: 'Kep. Seribu', value: 81 },
  { label: 'Senen', value: 78 },
  { label: 'Cikini', value: 72 },
  { label: 'Sudirman', value: 42 },
  { label: 'Kebon Sirih', value: 32 },
  { label: 'Johar Baru', value: 10 },
]

const ticketBookings = computed(() => {
  const monthFormatter = new Intl.DateTimeFormat(locale.value, { month: 'short' })
  return TICKET_BOOKINGS_BY_MONTH.map((value, month) => ({
    label: monthFormatter.format(new Date(2026, month, 1)),
    value,
  }))
})
</script>

<template>
  <div class="flex flex-col gap-4">
    <!-- Title card (Figma 39:679) -->
    <section class="rounded-[20px] bg-white p-4">
      <h2 class="text-xl leading-[1.2] font-semibold tracking-[-0.6px] text-ink-900">{{ t('dashboard.title') }}</h2>
      <p class="mt-2 text-xs leading-[1.2] text-ink-500">{{ t('dashboard.subtitle') }}</p>
    </section>

    <!-- Chart cards (Figma 39:680) -->
    <div class="grid gap-4 xl:grid-cols-2">
      <section class="min-w-0 rounded-[20px] bg-white p-3">
        <LineChart :title="t('dashboard.ticketChart')" :points="ticketBookings" />
      </section>
      <section class="min-w-0 rounded-[20px] bg-white p-3">
        <HorizontalBarChart :title="t('dashboard.villageChart')" :bars="VILLAGE_VISITS" />
      </section>
    </div>
  </div>
</template>
