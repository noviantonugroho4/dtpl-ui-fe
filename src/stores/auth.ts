import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import * as authApi from '@/api/auth'
import { ApiError } from '@/api/client'
import type { LoginRequest, UserProfile } from '@/api/types'

const TOKEN_KEY = 'dtpl.auth.token'
const USER_KEY = 'dtpl.auth.user'

function readStorage<T>(key: string, parse: (raw: string) => T): T | null {
  try {
    const raw = localStorage.getItem(key)
    return raw === null ? null : parse(raw)
  } catch {
    return null
  }
}

function writeStorage(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key)
    else localStorage.setItem(key, value)
  } catch {
    // Storage may be unavailable (private mode, quota); the in-memory state still works.
  }
}

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(readStorage(TOKEN_KEY, (raw) => raw))
  const user = ref<UserProfile | null>(readStorage(USER_KEY, (raw) => JSON.parse(raw) as UserProfile))
  const initialized = ref(false)

  const isAuthenticated = computed(() => token.value !== null)

  function setSession(nextToken: string | null, nextUser: UserProfile | null) {
    token.value = nextToken
    user.value = nextUser
    writeStorage(TOKEN_KEY, nextToken)
    writeStorage(USER_KEY, nextUser ? JSON.stringify(nextUser) : null)
  }

  async function login(credentials: LoginRequest) {
    const response = await authApi.login(credentials)
    setSession(response.data.token, response.data.user)
    initialized.value = true
    return response.data.user
  }

  async function fetchMe() {
    if (!token.value) {
      user.value = null
      return null
    }
    try {
      const response = await authApi.me(token.value)
      setSession(token.value, response.data.user)
      return response.data.user
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setSession(null, null)
        return null
      }
      throw err
    }
  }

  /** Validate the persisted token once on app start. */
  async function initialize() {
    if (initialized.value) return
    try {
      await fetchMe()
    } catch {
      // Network error: keep the cached session so the user is not logged out offline.
    } finally {
      initialized.value = true
    }
  }

  async function logout() {
    const current = token.value
    setSession(null, null)
    if (current) {
      try {
        await authApi.logout(current)
      } catch {
        // The token is already discarded locally; a failed server call does not block logout.
      }
    }
  }

  return { token, user, initialized, isAuthenticated, login, logout, fetchMe, initialize }
})
