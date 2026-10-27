import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearVillageCache, resolveVillageByName } from './location'
import { jsonResponse } from '@/test/helpers'

const meta = { updated_at: '2026-10-25', level: 1 }
const ROUTES: Record<string, unknown> = {
  '/api/v1/location/provinces': { data: [{ id: '18', name: 'Lampung' }], meta },
  '/api/v1/location/regencies/18': { data: [{ id: '18.01', name: 'Kabupaten Lampung Selatan' }, { id: '18.13', name: 'Kabupaten Pesisir Barat' }], meta },
  '/api/v1/location/districts/18.13': { data: [{ id: '18.13.01', name: 'Pesisir Tengah' }], meta },
  '/api/v1/location/districts/18.01': { data: [{ id: '18.01.10', name: 'Katibung' }], meta },
  '/api/v1/location/villages/18.13.01': { data: [{ id: '18.13.01.1005', name: 'Pasar Krui', postal_code: '34894' }], meta },
  '/api/v1/location/villages/18.01.10': { data: [{ id: '18.01.10.2001', name: 'Pardasuka', postal_code: '35452' }], meta },
  '/api/v1/location/village-detail/18.13.01.1005': {
    data: { id: '18.13.01.1005', name: 'Pasar Krui', postal_code: '34894', regency: { id: '18.13', name: 'Kabupaten Pesisir Barat' } },
    meta,
  },
}

function stubFetch(overrides: Record<string, Response> = {}) {
  const fetchMock = vi.fn().mockImplementation((url: string) => {
    if (overrides[url]) return Promise.resolve(overrides[url]!.clone())
    return Promise.resolve(url in ROUTES ? jsonResponse(ROUTES[url]) : new Response('{}', { status: 404 }))
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

describe('resolveVillageByName', () => {
  beforeEach(() => clearVillageCache())
  afterEach(() => vi.unstubAllGlobals())

  it('finds the village in the home regency first and reads kabupaten/kode pos from village-detail', async () => {
    const fetchMock = stubFetch()
    expect(await resolveVillageByName({ provinsi: 'lampung', kecamatan: ' Pesisir  Tengah', kelurahan: 'PASAR KRUI' })).toEqual({
      kabupaten: 'Kabupaten Pesisir Barat',
      kodePos: '34894',
    })
    const urls = fetchMock.mock.calls.map(([url]) => url)
    expect(urls).not.toContain('/api/v1/location/districts/18.01')
    expect(urls).toContain('/api/v1/location/village-detail/18.13.01.1005')

    // Hasil di-cache: kunjungan berikutnya tanpa panggilan baru.
    fetchMock.mockClear()
    await resolveVillageByName({ provinsi: 'Lampung', kecamatan: 'Pesisir Tengah', kelurahan: 'Pasar Krui' })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('searches other regencies and falls back to list data when village-detail fails', async () => {
    stubFetch({ '/api/v1/location/village-detail/18.01.10.2001': new Response('error code: 502', { status: 502 }) })
    expect(await resolveVillageByName({ provinsi: 'Lampung', kecamatan: 'Katibung', kelurahan: 'Pardasuka' })).toEqual({
      kabupaten: 'Kabupaten Lampung Selatan',
      kodePos: '35452',
    })
  })

  it('returns null instead of guessing when nothing matches', async () => {
    stubFetch()
    expect(await resolveVillageByName({ provinsi: 'Lampung', kecamatan: 'Tidak Ada', kelurahan: 'Pasar Krui' })).toBeNull()
    expect(await resolveVillageByName({ provinsi: 'Atlantis', kecamatan: 'Pesisir Tengah', kelurahan: 'Pasar Krui' })).toBeNull()
  })
})
