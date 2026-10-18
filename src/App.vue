<script setup lang="ts">
import { watch } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()

watch(
  () => [route.meta.title, route.path] as const,
  ([title, path]) => {
    const appName = path.startsWith('/portal-admin') ? 'WiDeWi CMS' : 'WIDEWI'
    document.title = title ? `${title} · ${appName}` : appName
  },
  { immediate: true },
)
</script>

<template>
  <RouterView />
</template>
