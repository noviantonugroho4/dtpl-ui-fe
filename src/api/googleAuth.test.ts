import { afterEach, describe, expect, it, vi } from 'vitest'
import { authenticateWithGoogle, decodeGooglePrefill } from './googleAuth'
import { jsonResponse } from '@/test/helpers'

function token(claims: Record<string, unknown>): string {
  const bytes = new TextEncoder().encode(JSON.stringify(claims))
  const payload = btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  return `h.${payload}.s`
}

describe('googleAuth api', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('posts the id token with cookies included, and adds the profile only on the second call', async () => {
    const fetchMock = vi.fn().mockImplementation(() => Promise.resolve(jsonResponse({ data: { outcome: 'logged_in', user: { username: 'a' } } })))
    vi.stubGlobal('fetch', fetchMock)

    await authenticateWithGoogle('tok-1')
    const [url, init] = fetchMock.mock.calls[0]!
    expect(url).toBe('/api/auth/google')
    expect(init.credentials).toBe('include')
    expect(JSON.parse(init.body)).toEqual({ idToken: 'tok-1' })

    const profile = { namaDepan: 'A', namaBelakang: 'B', tempatLahir: 'C', tanggalLahir: '1999-08-17', alamat: 'D', nomorTelepon: '+628123456789' }
    await authenticateWithGoogle('tok-2', profile)
    expect(JSON.parse(fetchMock.mock.calls[1]![1].body)).toEqual({ idToken: 'tok-2', profile })
  })

  it('decodes name claims for prefill, including non-ASCII, and tolerates garbage', () => {
    expect(decodeGooglePrefill(token({ given_name: 'Rézа', family_name: 'Azizah' }))).toEqual({ namaDepan: 'Rézа', namaBelakang: 'Azizah' })
    expect(decodeGooglePrefill('not-a-jwt')).toEqual({ namaDepan: '', namaBelakang: '' })
  })
})
