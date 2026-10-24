import { afterEach, describe, expect, it, vi } from 'vitest'
import { getLandingSections } from './landing'
import type { Wisata } from './types'
import { jsonResponse } from '@/test/helpers'

function makeWisata(id: string, nama: string, createdAt: string): Wisata {
  return {
    id, nama, jenis: 'wisata_alam', kontakTelp: '+62812', provinsi: 'Lampung', kecamatan: 'Krui', kelurahan: 'Pasar Krui',
    alamat: 'Jl.', mapsLink: 'https://maps.app.goo.gl/x', hargaTiket: 0, createdBy: 1, createdAt, updatedAt: createdAt,
    images: [], fasilitas: [], services: [],
  }
}

describe('getLandingSections', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('returns 5 newest by createdAt and 5 featured by longest name from one call', async () => {
    const rows = [
      makeWisata('a', 'A', '2026-10-01T00:00:00Z'),
      makeWisata('b', 'Bbbbbbbbbb', '2026-10-02T00:00:00Z'),
      makeWisata('c', 'Ccc', '2026-10-03T00:00:00Z'),
      makeWisata('d', 'Dddddddd', '2026-10-04T00:00:00Z'),
      makeWisata('e', 'Ee', '2026-10-05T00:00:00Z'),
      makeWisata('f', 'Ffffff', '2026-10-06T00:00:00Z'),
    ]
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ data: rows, meta: { page: 1, limit: 50, total: 6, totalPages: 1 } }))
    vi.stubGlobal('fetch', fetchMock)

    const { newest, featured } = await getLandingSections()

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(newest.map((w) => w.id)).toEqual(['f', 'e', 'd', 'c', 'b'])
    expect(featured.map((w) => w.id)).toEqual(['b', 'd', 'f', 'c', 'e'])
  })
})
