import { describe, expect, it, vi } from 'vitest'

describe('api/auth implementation switch', () => {
  it('uses the real HTTP client when VITE_USE_MOCK_API is not "true"', async () => {
    vi.stubEnv('VITE_USE_MOCK_API', 'false')
    vi.resetModules()
    const auth = await import('./auth')
    const real = await import('./auth.real')

    expect(auth.USE_MOCK_API).toBe(false)
    expect(auth.login).toBe(real.login)
    expect(auth.me).toBe(real.me)
  })

  it('uses the mock implementation when VITE_USE_MOCK_API is "true"', async () => {
    vi.stubEnv('VITE_USE_MOCK_API', 'true')
    vi.resetModules()
    const auth = await import('./auth')
    const mock = await import('./mock')

    expect(auth.USE_MOCK_API).toBe(true)
    expect(auth.login).toBe(mock.login)
    expect(auth.logout).toBe(mock.logout)
  })
})
