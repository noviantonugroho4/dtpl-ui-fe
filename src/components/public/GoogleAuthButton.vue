<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { GOOGLE_CLIENT_ID } from '@/api/googleAuth'

/**
 * Tombol resmi Google Identity Services (alur tombol, bukan One Tap).
 * Script GSI dimuat di index.html; `credential` adalah ID token Google mentah.
 */
const props = withDefaults(
  defineProps<{ text?: 'continue_with' | 'signin_with' | 'signup_with'; width?: number; testid?: string }>(),
  { text: 'continue_with', width: 320, testid: 'google-auth-button' },
)
const emit = defineEmits<{ credential: [idToken: string]; unavailable: [reason: string] }>()

interface GsiId {
  initialize(config: Record<string, unknown>): void
  renderButton(parent: HTMLElement, options: Record<string, unknown>): void
}

const host = ref<HTMLElement | null>(null)

/** Tunggu global GSI tanpa polling selamanya. */
function whenGsiReady(timeoutMs = 8000): Promise<GsiId> {
  return new Promise((resolve, reject) => {
    const started = Date.now()
    const tick = () => {
      const gsi = (window as unknown as { google?: { accounts?: { id?: GsiId } } }).google?.accounts?.id
      if (gsi) return resolve(gsi)
      if (Date.now() - started > timeoutMs) return reject(new Error('GSI script did not load'))
      setTimeout(tick, 100)
    }
    tick()
  })
}

onMounted(async () => {
  if (!GOOGLE_CLIENT_ID) {
    emit('unavailable', 'VITE_GOOGLE_CLIENT_ID belum diatur')
    return
  }
  try {
    const gsi = await whenGsiReady()
    gsi.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: (res: { credential?: string }) => {
        if (res.credential) emit('credential', res.credential)
      },
      auto_select: false,
      cancel_on_tap_outside: true,
    })
    if (host.value) {
      gsi.renderButton(host.value, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        text: props.text,
        shape: 'rectangular',
        logo_alignment: 'left',
        width: props.width,
      })
    }
  } catch (err) {
    // Diblokir ekstensi, offline, atau CSP: jangan pernah memalsukan sukses.
    emit('unavailable', err instanceof Error ? err.message : 'Google sign-in unavailable')
  }
})
</script>

<template>
  <div ref="host" class="flex min-h-[44px] justify-center" :data-testid="testid" />
</template>
