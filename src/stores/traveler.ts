import { ref } from 'vue'
import { defineStore } from 'pinia'
import { ApiError } from '@/api/client'
import { getTravelerMe, logoutTraveler, type TravelerUser } from '@/api/googleAuth'

/**
 * Hanya token dan username yang disimpan di browser; profil pribadi (email, telepon,
 * tanggal lahir) tidak pernah ditulis ke localStorage.
 */
const TOKEN_KEY = 'dtpl.traveler.token'
const USER_KEY = 'dtpl.traveler.user'

export interface TravelerSessionUser {
  id?: number
  username: string
}

function read(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function write(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key)
    else localStorage.setItem(key, value)
  } catch {
    // Storage tidak tersedia; status di memori tetap berjalan.
  }
}

function readUser(): TravelerSessionUser | null {
  try {
    const parsed = JSON.parse(read(USER_KEY) ?? 'null') as Partial<TravelerSessionUser> | null
    return parsed && typeof parsed.username === 'string' ? { id: parsed.id, username: parsed.username } : null
  } catch {
    return null
  }
}

const toSessionUser = (user: TravelerUser): TravelerSessionUser => ({ id: user.id, username: user.username })

/** Sesi wisatawan situs publik (Bearer JWT dari login Google), terpisah dari sesi CMS. */
export const useTravelerStore = defineStore('traveler', () => {
  const token = ref<string | null>(read(TOKEN_KEY))
  const user = ref<TravelerSessionUser | null>(token.value ? readUser() : null)
  /** Akun Google baru/belum lengkap: token hanya di memori sampai form registrasi disimpan. */
  const pending = ref<{ token: string; user: TravelerUser } | null>(null)

  function setSession(nextToken: string | null, nextUser: TravelerUser | null) {
    token.value = nextToken
    user.value = nextUser ? toSessionUser(nextUser) : null
    write(TOKEN_KEY, nextToken)
    write(USER_KEY, user.value ? JSON.stringify(user.value) : null)
  }

  /** Hasil POST /api/auth/google: masuk langsung, atau tunda sampai profil lengkap. */
  function signIn(nextToken: string, nextUser: TravelerUser): 'signed_in' | 'needs_profile' {
    if (nextUser.profileComplete) {
      pending.value = null
      setSession(nextToken, nextUser)
      return 'signed_in'
    }
    pending.value = { token: nextToken, user: nextUser }
    return 'needs_profile'
  }

  function completeOnboarding(nextUser: TravelerUser) {
    if (!pending.value) return
    setSession(pending.value.token, nextUser)
    pending.value = null
  }

  /** Form registrasi ditutup sebelum disimpan: buang token sementara. */
  async function cancelOnboarding() {
    const current = pending.value
    pending.value = null
    if (!current) return
    try {
      await logoutTraveler(current.token)
    } catch {
      // Token sementara sudah dibuang dari klien.
    }
  }

  async function logout() {
    const current = token.value
    setSession(null, null)
    if (!current) return
    try {
      await logoutTraveler(current)
    } catch {
      // Status lokal sudah dibersihkan; kegagalan server tidak menghalangi keluar.
    }
  }

  /** Validasi token tersimpan saat aplikasi dibuka; 401 atau profil belum lengkap = keluar. */
  async function initialize() {
    if (!token.value) return
    try {
      const current = (await getTravelerMe(token.value)).data.user
      if (current.profileComplete) setSession(token.value, current)
      else setSession(null, null)
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) setSession(null, null)
      // Galat jaringan: pertahankan sesi tersimpan.
    }
  }

  return { token, user, pending, signIn, completeOnboarding, cancelOnboarding, logout, initialize }
})
