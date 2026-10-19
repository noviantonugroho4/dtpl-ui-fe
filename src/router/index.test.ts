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

function seedAuthenticated() {
  localStorage.setItem('dtpl.auth.token', 'jwt-1')
  api.me.mockResolvedValue({ data: { user: makeUser() } })
  setActivePinia(createPinia())
}

describe('router', () => {
  beforeEach(async () => {
    setActivePinia(createPinia())
    await router.replace('/portal-admin/login')
    await router.isReady()
  })

  it('serves the public landing and destination pages without authentication', async () => {
    await router.push('/')
    expect(router.currentRoute.value.name).toBe('home')
    await router.push('/destinasi-wisata')
    expect(router.currentRoute.value.name).toBe('public-attractions')
    await router.push('/kontak')
    expect(router.currentRoute.value.name).toBe('contact')
    await router.push('/destinasi-wisata/abc')
    expect(router.currentRoute.value.name).toBe('public-attraction-detail')
    expect(router.currentRoute.value.params.id).toBe('abc')
  })

  it('redirects unauthenticated users from the CMS to its login with a redirect query', async () => {
    await router.push('/portal-admin/destinasi-wisata?page=2')
    expect(router.currentRoute.value.name).toBe('login')
    expect(router.currentRoute.value.path).toBe('/portal-admin/login')
    expect(router.currentRoute.value.query.redirect).toBe('/portal-admin/destinasi-wisata?page=2')
  })

  it('does not add a redirect query when the target is the CMS home', async () => {
    await router.push('/portal-admin')
    expect(router.currentRoute.value.name).toBe('login')
    expect(router.currentRoute.value.query.redirect).toBeUndefined()
  })

  it('lets an authenticated user reach the dashboard and validates the token once', async () => {
    seedAuthenticated()
    await router.push('/portal-admin')
    expect(router.currentRoute.value.name).toBe('dashboard')
    expect(router.currentRoute.value.path).toBe('/portal-admin/dashboard')
    expect(api.me).toHaveBeenCalledTimes(1)
    expect(useAuthStore().user?.username).toBe('admin')
  })

  it('redirects the old CMS urls to the /portal-admin prefix, keeping the query', async () => {
    await router.push('/login?redirect=%2Fportal-admin%2Fdashboard')
    expect(router.currentRoute.value.path).toBe('/portal-admin/login')
    expect(router.currentRoute.value.query.redirect).toBe('/portal-admin/dashboard')

    seedAuthenticated()
    await router.push('/dashboard')
    expect(router.currentRoute.value.path).toBe('/portal-admin/dashboard')
  })

  it('renders the not-found page for unknown paths without requiring auth', async () => {
    await router.push('/does/not/exist')
    expect(router.currentRoute.value.name).toBe('not-found')
  })

  it('sends an authenticated user away from the login page', async () => {
    seedAuthenticated()
    await router.push('/portal-admin')
    await router.push('/portal-admin/login')
    expect(router.currentRoute.value.name).toBe('dashboard')
  })

  it('redirects to login when the stored token is rejected on startup', async () => {
    localStorage.setItem('dtpl.auth.token', 'expired')
    api.me.mockRejectedValue(new ApiError(401, 'UNAUTHENTICATED', 'expired'))
    setActivePinia(createPinia())

    await router.push('/portal-admin')
    expect(router.currentRoute.value.name).toBe('login')
    expect(useAuthStore().isAuthenticated).toBe(false)
  })
})
