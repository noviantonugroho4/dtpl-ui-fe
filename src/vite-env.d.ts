/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string
  readonly VITE_API_PROXY_TARGET?: string
  readonly VITE_USE_MOCK_API?: string
  readonly VITE_MOCK_USERNAME?: string
  readonly VITE_MOCK_PASSWORD?: string
  readonly VITE_MOCK_ROLE?: string
  /** Nomor WhatsApp Admin Widewi tujuan pemesanan tiket, digit internasional (mis. 6281234567890). */
  readonly VITE_WHATSAPP_ADMIN?: string
}
