<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

/**
 * Dialog pemberitahuan satu tombol (Figma 525:8249 "dialog berhasil disimpan"):
 * kartu putih 466px, padding 32px, judul lalu tombol "Tutup" rata kanan.
 */
const props = withDefaults(defineProps<{ open: boolean; title: string; closeLabel?: string; testid?: string }>(), {
  closeLabel: 'Tutup',
  testid: 'alert-dialog',
})
const emit = defineEmits<{ close: [] }>()

const closeButton = ref<HTMLButtonElement | null>(null)

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && props.open) emit('close')
}

watch(
  () => props.open,
  async (open) => {
    if (!open) return
    await nextTick()
    closeButton.value?.focus()
  },
  { immediate: true },
)

onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))
</script>

<template>
  <div
    v-if="open"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    role="alertdialog"
    aria-modal="true"
    :aria-labelledby="`${testid}-title`"
    :data-testid="testid"
    @click.self="emit('close')"
  >
    <div
      class="flex w-full max-w-[466px] flex-col gap-6 rounded-lg border border-ink-200 bg-white p-8 shadow-[0_1px_4px_-1px_rgba(12,12,13,0.1),0_4px_16px_-1px_rgba(12,12,13,0.05)]"
    >
      <h2 :id="`${testid}-title`" class="text-base leading-[1.2] font-semibold tracking-[-0.32px] text-ink-900" :data-testid="`${testid}-title`">
        {{ title }}
      </h2>
      <div class="flex justify-end">
        <button
          ref="closeButton"
          type="button"
          class="rounded-lg border border-brand-700 bg-brand-500 p-3 text-base leading-none text-canvas transition hover:bg-brand-600 focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:outline-none"
          :data-testid="`${testid}-close`"
          @click="emit('close')"
        >
          {{ closeLabel }}
        </button>
      </div>
    </div>
  </div>
</template>
