import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { ApiError } from '@/api/client'
import * as authApi from '@/api/auth'
import { useAuthStore } from '@/stores/auth'
import router from './index'
import { makeUser } from '@/test/helpers'

vi.mock('@/api/auth', () => ({
  USE_MOCK_API: false,
  login: vi.fn(),
  logout: vi.fn(),
  me: vi.fn(),
  health: vi.fn(),
}))

const api = vi.mocked(authApi)

describe('router guards', () => {
  beforeEach(async () => {
    setActivePinia(createPinia())
    await router.replace('/login')
    await router.isReady()
  })

  it('redirects unauthenticated users from a protected route to login with a redirect query', async () => {
    await router.push('/?tab=profile')
    expect(router.currentRoute.value.name).toBe('login')
    expect(router.currentRoute.value.query.redirect).toBe('/?tab=profile')
  })

  it('does not add a redirect query when the target is the home page', async () => {
    await router.push('/')
    expect(router.currentRoute.value.name).toBe('login')
    expect(router.currentRoute.value.query.redirect).toBeUndefined()
  })

  it('lets an authenticated user reach home and validates the token once', async () => {
    localStorage.setItem('dtpl.auth.token', 'jwt-1')
    api.me.mockResolvedValue({ data: { user: makeUser() } })
    setActivePinia(createPinia())

    await router.push('/')
    expect(router.currentRoute.value.name).toBe('home')
    expect(api.me).toHaveBeenCalledTimes(1)
    expect(useAuthStore().user?.username).toBe('admin')
  })

  it('renders the not-found page for unknown paths without requiring auth', async () => {
    await router.push('/does/not/exist')
    expect(router.currentRoute.value.name).toBe('not-found')
  })

  it('sends an authenticated user away from the login page', async () => {
    localStorage.setItem('dtpl.auth.token', 'jwt-1')
    api.me.mockResolvedValue({ data: { user: makeUser() } })
    setActivePinia(createPinia())

    await router.push('/')
    await router.push('/login')
    expect(router.currentRoute.value.name).toBe('home')
  })

  it('redirects to login when the stored token is rejected on startup', async () => {
    localStorage.setItem('dtpl.auth.token', 'expired')
    api.me.mockRejectedValue(new ApiError(401, 'UNAUTHENTICATED', 'expired'))
    setActivePinia(createPinia())

    await router.push('/')
    expect(router.currentRoute.value.name).toBe('login')
    expect(useAuthStore().isAuthenticated).toBe(false)
  })
})
