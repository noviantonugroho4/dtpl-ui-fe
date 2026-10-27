import { ref } from 'vue'
import { defineStore } from 'pinia'
import { logoutTraveler, type TravelerUser } from '@/api/googleAuth'

/** Hanya username yang disimpan di browser; sesi sebenarnya ada di cookie dari server. */
const USER_KEY = 'dtpl.traveler.user'

function readUser(): TravelerUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<TravelerUser>
    return typeof parsed.username === 'string' ? { username: parsed.username } : null
  } catch {
    return null
  }
}

function writeUser(user: TravelerUser | null) {
  try {
    if (user) localStorage.setItem(USER_KEY, JSON.stringify({ username: user.username }))
    else localStorage.removeItem(USER_KEY)
  } catch {
    // Storage tidak tersedia; status di memori tetap berjalan.
  }
}

/** Sesi wisatawan situs publik (masuk dengan Google), terpisah dari sesi token CMS. */
export const useTravelerStore = defineStore('traveler', () => {
  const user = ref<TravelerUser | null>(readUser())

  function setUser(next: TravelerUser) {
    user.value = { username: next.username }
    writeUser(user.value)
  }

  async function logout() {
    user.value = null
    writeUser(null)
    try {
      await logoutTraveler()
    } catch {
      // Status lokal sudah dibersihkan; kegagalan server tidak menghalangi keluar.
    }
  }

  return { user, setUser, logout }
})
