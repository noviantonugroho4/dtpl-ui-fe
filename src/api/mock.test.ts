import { describe, expect, it, vi } from 'vitest'
import { ApiError } from './client'
import * as mock from './mock'

describe('api/mock', () => {
  it('login succeeds with the configured credentials and returns a token + user', async () => {
    const res = await mock.login({ username: 'admin', password: 'admin123' })
    expect(res.data.token).toMatch(/^mock-jwt\./)
    expect(res.data.user).toMatchObject({ username: 'admin', role: 'admin' })
  })

  it('login rejects wrong credentials with 401 INVALID_CREDENTIALS', async () => {
    const err = await mock.login({ username: 'admin', password: 'nope' }).catch((e: unknown) => e)
    expect(err).toBeInstanceOf(ApiError)
    expect(err).toMatchObject({ status: 401, code: 'INVALID_CREDENTIALS' })
  })

  it('login rejects empty fields with 400 VALIDATION_ERROR', async () => {
    const err = await mock.login({ username: '', password: '' }).catch((e: unknown) => e)
    expect(err).toMatchObject({ status: 400, code: 'VALIDATION_ERROR' })
  })

  it('me returns the user for a mock token and 401 otherwise', async () => {
    const { data } = await mock.login({ username: 'admin', password: 'admin123' })
    await expect(mock.me(data.token)).resolves.toMatchObject({ data: { user: { username: 'admin' } } })

    const err = await mock.me('real-looking-but-invalid').catch((e: unknown) => e)
    expect(err).toMatchObject({ status: 401, code: 'UNAUTHENTICATED' })
  })

  it('logout and health respond', async () => {
    const { data } = await mock.login({ username: 'admin', password: 'admin123' })
    await expect(mock.logout(data.token)).resolves.toEqual({ data: { logout: true } })
    await expect(mock.health()).resolves.toEqual({ status: 'ok', db: 'mock' })
  })

  it('reads credentials from environment variables', async () => {
    vi.stubEnv('VITE_MOCK_USERNAME', 'budi')
    vi.stubEnv('VITE_MOCK_PASSWORD', 'rahasia')
    vi.stubEnv('VITE_MOCK_ROLE', 'editor')
    vi.resetModules()
    const fresh = await import('./mock')

    const res = await fresh.login({ username: 'budi', password: 'rahasia' })
    expect(res.data.user).toMatchObject({ username: 'budi', role: 'editor', email: 'budi@example.com' })
  })
})
