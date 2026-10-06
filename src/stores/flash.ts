import { ref } from 'vue'
import { defineStore } from 'pinia'

/** One-shot success notice carried across a navigation (e.g. "berhasil ditambahkan"). */
export const useFlashStore = defineStore('flash', () => {
  const message = ref<string | null>(null)

  function show(next: string) {
    message.value = next
  }

  /** Returns the pending message and clears it. */
  function take(): string | null {
    const current = message.value
    message.value = null
    return current
  }

  return { message, show, take }
})
