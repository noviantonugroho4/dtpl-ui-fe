<script setup lang="ts">
import { watch } from 'vue'
import { useRoute } from 'vue-router'

const APP_NAME = 'WiDeWi CMS'
const route = useRoute()

watch(
  () => route.meta.title,
  (title) => {
    document.title = title ? `${title} · ${APP_NAME}` : APP_NAME
  },
  { immediate: true },
)
</script>

<template>
  <RouterView />
</template>
