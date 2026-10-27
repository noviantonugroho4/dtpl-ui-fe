import { ref } from 'vue'
import { defineStore } from 'pinia'

export type AuthDialogMode = 'login' | 'register'

/** Modal masuk dengan Google dan registrasi situs publik (Figma 496:7113 dan 496:7120). */
export const useAuthDialogStore = defineStore('authDialog', () => {
  const mode = ref<AuthDialogMode | null>(null)
  /** Pesan sukses satu kali, mis. setelah registrasi. */
  const notice = ref<string | null>(null)

  function open(next: AuthDialogMode = 'login') {
    mode.value = next
  }
  function close() {
    mode.value = null
    notice.value = null
  }

  return { mode, notice, open, close }
})
