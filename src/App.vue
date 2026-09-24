<script setup lang="ts">
import { watch } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'

const route = useRoute()
const { t, locale } = useI18n()

watch(
  () => [route.meta.titleKey, locale.value] as const,
  ([titleKey]) => {
    const appName = t('app.name')
    document.title = titleKey ? `${t(titleKey)} · ${appName}` : appName
  },
  { immediate: true },
)
</script>

<template>
  <RouterView />
</template>
