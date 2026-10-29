import { request } from './client'

/**
 * Masuk/daftar wisatawan lewat Google (Figma 496:7113 → 496:7120), kontrak PBI-011 & PBI-012:
 *
 * 1. POST /api/auth/google { idToken } → 200 { outcome, token (Bearer JWT), user }
 *    - akun baru dibuat dari klaim Google; namaDepan/namaBelakang sudah terisi di user.profile
 *    - user.profileComplete=false → tampilkan form registrasi (berlaku juga untuk outcome logged_in)
 * 2. PUT /api/auth/profile (Bearer) → profileComplete=true
 *
 * Error POST google: 400 VALIDATION_FAILED, 401 GOOGLE_TOKEN_INVALID / GOOGLE_EMAIL_UNVERIFIED,
 * 403 GOOGLE_PROVIDER_CONFLICT, 409 ACCOUNT_EXISTS_PASSWORD, 429 RATE_LIMITED, 503.
 */

/** Client ID OAuth (publik, bukan rahasia). Client secret TIDAK dipakai di alur ini. */
export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? ''

export interface TravelerProfile {
  namaDepan: string | null
  namaBelakang: string | null
  tempatLahir: string | null
  /** ISO date, yyyy-mm-dd. */
  tanggalLahir: string | null
  alamat: string | null
  nomorTelepon: string | null
}

export interface TravelerUser {
  id: number
  /** Tidak selalu dikirim untuk akun Google (GET /api/auth/me hanya memuat id, email, profile). */
  username?: string
  email?: string
  role: string
  profileComplete: boolean
  profile?: TravelerProfile
}

export interface GoogleAuthResponse {
  data: {
    outcome: 'registered' | 'logged_in'
    token: string
    user: TravelerUser
  }
}

export interface TravelerUserResponse {
  data: { user: TravelerUser }
}

/** Body PUT /api/auth/profile; alamat opsional. */
export interface UpdateProfileInput {
  namaDepan: string
  namaBelakang: string
  tempatLahir: string
  /** ISO date, yyyy-mm-dd. */
  tanggalLahir: string
  alamat?: string
  /** 08… atau +62…; dinormalisasi server ke +62…. */
  nomorTelepon: string
}

export function authenticateWithGoogle(idToken: string): Promise<GoogleAuthResponse> {
  return request<GoogleAuthResponse>('/api/auth/google', { method: 'POST', body: { idToken } })
}

export function updateTravelerProfile(token: string, profile: UpdateProfileInput): Promise<TravelerUserResponse> {
  return request<TravelerUserResponse>('/api/auth/profile', { method: 'PUT', body: profile, token })
}

export function getTravelerMe(token: string): Promise<TravelerUserResponse> {
  return request<TravelerUserResponse>('/api/auth/me', { token })
}

export function logoutTraveler(token: string): Promise<unknown> {
  return request('/api/auth/logout', { method: 'POST', token })
}
