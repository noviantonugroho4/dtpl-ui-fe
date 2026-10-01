/** Pesan kesalahan (Bahasa Indonesia) untuk kode error dari backend. */
export const ERROR_MESSAGES: Record<string, string> = {
  INVALID_CREDENTIALS: 'Nama pengguna atau kata sandi salah.',
  UNAUTHORIZED: 'Sesi Anda telah berakhir. Silakan masuk kembali.',
  UNAUTHENTICATED: 'Sesi Anda telah berakhir. Silakan masuk kembali.',
  INTERNAL_ERROR: 'Server mengalami kesalahan. Silakan coba lagi nanti.',
  VALIDATION_ERROR: 'Periksa kembali formulir lalu coba lagi.',
  NETWORK_ERROR: 'Tidak dapat terhubung ke server. Periksa koneksi Anda lalu coba lagi.',
  UNKNOWN_ERROR: 'Terjadi kesalahan. Silakan coba lagi.',
}

/** Returns the Indonesian message for a backend error code, else the server message, else a generic one. */
export function errorMessageFor(code: string, fallback?: string | null): string {
  return ERROR_MESSAGES[code] ?? fallback ?? ERROR_MESSAGES.UNKNOWN_ERROR!
}
