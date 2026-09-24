import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { ApiError } from '@/api/client'
import * as authApi from '@/api/auth'
import { useAuthStore } from './auth'
import { makeUser } from '@/test/helpers'

vi.mock('@/api/auth', () => ({
  USE_MOCK_API: false,
  login: vi.fn(),
  logout: vi.fn(),
  me: vi.fn(),
  health: vi.fn(),
}))

const api = vi.mocked(authApi)

describe('stores/auth', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('starts logged out when storage is empty', () => {
    const store = useAuthStore()
    expect(store.token).toBeNull()
    expect(store.user).toBeNull()
    expect(store.isAuthenticated).toBe(false)
  })

  it('hydrates token and user from localStorage', () => {
    const user = makeUser()
    localStorage.setItem('dtpl.auth.token', 'saved-token')
    localStorage.setItem('dtpl.auth.user', JSON.stringify(user))

    const store = useAuthStore()
    expect(store.token).toBe('saved-token')
    expect(store.user).toEqual(user)
    expect(store.isAuthenticated).toBe(true)
  })

  it('login stores the session and persists it', async () => {
    const user = makeUser()
    api.login.mockResolvedValue({ data: { token: 'jwt-1', user } })

    const store = useAuthStore()
    const result = await store.login({ username: 'admin', password: 'pw' })

    expect(result).toEqual(user)
    expect(api.login).toHaveBeenCalledWith({ username: 'admin', password: 'pw' })
    expect(store.token).toBe('jwt-1')
    expect(store.isAuthenticated).toBe(true)
    expect(store.initialized).toBe(true)
    expect(localStorage.getItem('dtpl.auth.token')).toBe('jwt-1')
    expect(JSON.parse(localStorage.getItem('dtpl.auth.user') ?? 'null')).toEqual(user)
  })

  it('login failure leaves the store logged out', async () => {
    api.login.mockRejectedValue(new ApiError(401, 'INVALID_CREDENTIALS', 'nope'))

    const store = useAuthStore()
    await expect(store.login({ username: 'a', password: 'b' })).rejects.toBeInstanceOf(ApiError)
    expect(store.isAuthenticated).toBe(false)
    expect(localStorage.getItem('dtpl.auth.token')).toBeNull()
  })

  it('fetchMe refreshes the user and clears the session on 401', async () => {
    localStorage.setItem('dtpl.auth.token', 'jwt-1')
    const store = useAuthStore()

    const updated = makeUser({ email: 'new@example.com' })
    api.me.mockResolvedValueOnce({ data: { user: updated } })
    await expect(store.fetchMe()).resolves.toEqual(updated)
    expect(api.me).toHaveBeenCalledWith('jwt-1')
    expect(store.user).toEqual(updated)

    api.me.mockRejectedValueOnce(new ApiError(401, 'UNAUTHENTICATED', 'expired'))
    await expect(store.fetchMe()).resolves.toBeNull()
    expect(store.token).toBeNull()
    expect(store.user).toBeNull()
    expect(localStorage.getItem('dtpl.auth.token')).toBeNull()
  })

  it('fetchMe rethrows non-401 errors and keeps the session', async () => {
    localStorage.setItem('dtpl.auth.token', 'jwt-1')
    const store = useAuthStore()
    api.me.mockRejectedValueOnce(new ApiError(0, 'NETWORK_ERROR', 'offline'))

    await expect(store.fetchMe()).rejects.toMatchObject({ code: 'NETWORK_ERROR' })
    expect(store.token).toBe('jwt-1')
  })

  it('fetchMe without a token resolves null without calling the API', async () => {
    const store = useAuthStore()
    await expect(store.fetchMe()).resolves.toBeNull()
    expect(api.me).not.toHaveBeenCalled()
  })

  it('initialize validates once and swallows network errors', async () => {
    localStorage.setItem('dtpl.auth.token', 'jwt-1')
    const store = useAuthStore()
    api.me.mockRejectedValue(new ApiError(0, 'NETWORK_ERROR', 'offline'))

    await store.initialize()
    await store.initialize()

    expect(api.me).toHaveBeenCalledTimes(1)
    expect(store.initialized).toBe(true)
    expect(store.token).toBe('jwt-1')
  })

  it('logout clears the session first, then notifies the server', async () => {
    localStorage.setItem('dtpl.auth.token', 'jwt-1')
    const store = useAuthStore()
    api.logout.mockRejectedValue(new ApiError(500, 'INTERNAL_ERROR', 'boom'))

    await expect(store.logout()).resolves.toBeUndefined()

    expect(api.logout).toHaveBeenCalledWith('jwt-1')
    expect(store.token).toBeNull()
    expect(store.user).toBeNull()
    expect(localStorage.getItem('dtpl.auth.token')).toBeNull()
  })
})
