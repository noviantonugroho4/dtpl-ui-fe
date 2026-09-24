import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError, NETWORK_ERROR, UNKNOWN_ERROR, request } from './client'
import { jsonResponse } from '@/test/helpers'

describe('api/client request()', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('sends JSON body and Authorization header, and returns the parsed payload', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ data: { ok: true } }))
    vi.stubGlobal('fetch', fetchMock)

    const result = await request<{ data: { ok: boolean } }>('/api/thing', {
      method: 'POST',
      body: { a: 1 },
      token: 'tok',
    })

    expect(result).toEqual({ data: { ok: true } })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/api/thing')
    expect(init.method).toBe('POST')
    expect(init.body).toBe(JSON.stringify({ a: 1 }))
    const headers = init.headers as Record<string, string>
    expect(headers.Authorization).toBe('Bearer tok')
    expect(headers['Content-Type']).toBe('application/json')
  })

  it('omits Content-Type and Authorization when there is no body or token', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({}))
    vi.stubGlobal('fetch', fetchMock)

    await request('/api/health')

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(init.method).toBe('GET')
    expect(init.body).toBeUndefined()
    const headers = init.headers as Record<string, string>
    expect(headers.Authorization).toBeUndefined()
    expect(headers['Content-Type']).toBeUndefined()
  })

  it('maps a backend error envelope to ApiError with status, code and message', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse({ error: { code: 'INVALID_CREDENTIALS', message: 'Invalid username or password' } }, { status: 401 }),
      ),
    )

    const err = await request('/api/auth/login', { method: 'POST', body: {} }).catch((e: unknown) => e)

    expect(err).toBeInstanceOf(ApiError)
    expect(err).toMatchObject({ status: 401, code: 'INVALID_CREDENTIALS', message: 'Invalid username or password' })
  })

  it('uses UNKNOWN_ERROR when a failed response has no error envelope', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('Bad Gateway', { status: 502, statusText: 'Bad Gateway' })))

    const err = await request('/api/health').catch((e: unknown) => e)

    expect(err).toBeInstanceOf(ApiError)
    expect(err).toMatchObject({ status: 502, code: UNKNOWN_ERROR })
  })

  it('wraps fetch failures as a NETWORK_ERROR ApiError', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))

    const err = await request('/api/health').catch((e: unknown) => e)

    expect(err).toBeInstanceOf(ApiError)
    expect(err).toMatchObject({ status: 0, code: NETWORK_ERROR })
  })

  it('returns null for an empty 200 body', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 200 })))

    await expect(request('/api/empty')).resolves.toBeNull()
  })
})
