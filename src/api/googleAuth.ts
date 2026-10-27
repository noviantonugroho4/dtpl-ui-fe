import { request } from './client'

/**
 * Masuk/daftar wisatawan lewat Google (Figma 496:7113 → 496:7120).
 * Satu endpoint untuk registrasi dan login: POST /api/auth/google
 * (lihat "Google Identity Services - Integration Guide.md" §2–§4).
 *
 * - 200 → { data: { outcome: 'registered' | 'logged_in', user } } + cookie sesi
 * - 422 PROFILE_REQUIRED → akun Google baru; tampilkan form, tidak ada yang tersimpan
 * - 400 VALIDATION_FAILED → details per field profil
 * - 409 ACCOUNT_EXISTS_PASSWORD, 403, 429, 503, 401 → gagal
 */

/** Client ID OAuth (publik, bukan rahasia). Client secret TIDAK dipakai di alur ini. */
export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? ''

/**
 * ASSUMPTION: nama field mengikuti PRD §5 yang belum tersedia di repo;
 * disamakan dengan gaya payload wisata (camelCase bahasa Indonesia).
 */
export interface GoogleProfileInput {
  namaDepan: string
  namaBelakang: string
  tempatLahir: string
  /** ISO date, yyyy-mm-dd. */
  tanggalLahir: string
  alamat: string
  /** Format +62xxxxxxxxxx. */
  nomorTelepon: string
}

/** ASSUMPTION: bentuk `user` belum terdokumentasi; FE hanya memakai username untuk header. */
export interface TravelerUser {
  username: string
  role?: string
}

export interface GoogleAuthResponse {
  data: {
    outcome: 'registered' | 'logged_in'
    user: TravelerUser
  }
}

/** Panggilan 1 (tanpa profil) dan panggilan 2 (dengan profil, token Google baru). */
export function authenticateWithGoogle(idToken: string, profile?: GoogleProfileInput): Promise<GoogleAuthResponse> {
  return request<GoogleAuthResponse>('/api/auth/google', {
    method: 'POST',
    body: profile ? { idToken, profile } : { idToken },
    credentials: 'include',
  })
}

/** ASSUMPTION: sesi cookie wisatawan diakhiri lewat endpoint logout yang sama. */
export function logoutTraveler(): Promise<unknown> {
  return request('/api/auth/logout', { method: 'POST', credentials: 'include' })
}

export interface GooglePrefill {
  namaDepan: string
  namaBelakang: string
}

/** Klaim ID token untuk isian awal form SAJA; data yang divalidasi server selalu menang. */
export function decodeGooglePrefill(idToken: string): GooglePrefill {
  try {
    const part = idToken.split('.')[1] ?? ''
    const base64 = part.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(part.length / 4) * 4, '=')
    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))
    const claims = JSON.parse(new TextDecoder().decode(bytes)) as Record<string, unknown>
    return {
      namaDepan: typeof claims.given_name === 'string' ? claims.given_name : '',
      namaBelakang: typeof claims.family_name === 'string' ? claims.family_name : '',
    }
  } catch {
    return { namaDepan: '', namaBelakang: '' }
  }
}
