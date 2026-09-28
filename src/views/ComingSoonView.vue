<script setup lang="ts">
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const route = useRoute()
</script>

<template>
  <section class="rounded-[20px] bg-white p-4">
    <h2 class="text-xl leading-[1.2] font-semibold tracking-[-0.6px] text-ink-900">
      {{ route.meta.titleKey ? t(route.meta.titleKey) : t('comingSoon.title') }}
    </h2>
    <p class="mt-2 text-xs leading-[1.2] text-ink-500">{{ t('comingSoon.description') }}</p>
  </section>
</template>
