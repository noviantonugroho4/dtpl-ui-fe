import { afterEach, describe, expect, it, vi } from 'vitest'
import { listWisata, wisataTypeLabel } from './wisata'
import { jsonResponse } from '@/test/helpers'

describe('wisata api', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('builds the query string from the given filters only', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ data: [], meta: { page: 2, limit: 10, total: 0, totalPages: 0 } }))
    vi.stubGlobal('fetch', fetchMock)

    await listWisata({ page: 2, limit: 10, kecamatan: 'Kepulauan Seribu', jenis: undefined })

    const url = fetchMock.mock.calls[0]![0] as string
    expect(url).toBe('/api/v1/wisata?page=2&limit=10&kecamatan=Kepulauan+Seribu')
  })

  it('calls the bare endpoint when there are no filters', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ data: [], meta: { page: 1, limit: 10, total: 0, totalPages: 0 } }))
    vi.stubGlobal('fetch', fetchMock)
    await listWisata()
    expect(fetchMock.mock.calls[0]![0]).toBe('/api/v1/wisata')
  })

  it('maps jenis codes to display labels and falls back to the raw code', () => {
    expect(wisataTypeLabel('wisata_budaya_dan_sejarah')).toBe('Wisata Budaya dan Sejarah')
    expect(wisataTypeLabel('unknown_type')).toBe('unknown_type')
  })
})
