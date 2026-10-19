/**
 * Registrasi pengguna situs publik.
 *
 * MOCK: backend belum menyediakan endpoint registrasi. Fungsi ini memvalidasi
 * bentuk payload dan mengembalikan sukses tanpa mengirim apa pun. Saat endpoint
 * tersedia, ganti isinya dengan `request('/api/auth/register', { method: 'POST', body })`.
 */
export interface RegisterRequest {
  namaDepan: string
  namaBelakang: string
  tempatLahir: string
  /** ISO date, yyyy-mm-dd. */
  tanggalLahir: string
  alamat: string
  /** Format +62xxxxxxxxxx. */
  nomorTelepon: string
  username: string
  password: string
}

export interface RegisterResponse {
  data: { username: string }
}

export const REGISTER_IS_MOCK = true

export async function registerUser(payload: RegisterRequest): Promise<RegisterResponse> {
  await new Promise((resolve) => setTimeout(resolve, 300))
  return { data: { username: payload.username } }
}
