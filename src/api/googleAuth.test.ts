import { afterEach, describe, expect, it, vi } from 'vitest'
import { authenticateWithGoogle, updateTravelerProfile } from './googleAuth'
import { jsonResponse } from '@/test/helpers'

describe('googleAuth api', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('posts only the id token to /api/auth/google', async () => {
    const fetchMock = vi.fn().mockImplementation(() => Promise.resolve(jsonResponse({ data: { outcome: 'registered', token: 't', user: { id: 1 } } })))
    vi.stubGlobal('fetch', fetchMock)

    await authenticateWithGoogle('tok-1')
    const [url, init] = fetchMock.mock.calls[0]!
    expect(url).toBe('/api/auth/google')
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body)).toEqual({ idToken: 'tok-1' })
  })

  it('saves the profile with PUT /api/auth/profile and the Bearer token', async () => {
    const fetchMock = vi.fn().mockImplementation(() => Promise.resolve(jsonResponse({ data: { user: { id: 1, profileComplete: true } } })))
    vi.stubGlobal('fetch', fetchMock)

    const profile = { namaDepan: 'A', namaBelakang: 'B', tempatLahir: 'C', tanggalLahir: '1999-08-17', nomorTelepon: '+628123456789' }
    await updateTravelerProfile('jwt-9', profile)
    const [url, init] = fetchMock.mock.calls[0]!
    expect(url).toBe('/api/auth/profile')
    expect(init.method).toBe('PUT')
    expect(init.headers.Authorization).toBe('Bearer jwt-9')
    expect(JSON.parse(init.body)).toEqual(profile)
  })
})
