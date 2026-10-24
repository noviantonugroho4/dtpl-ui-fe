import { listWisata, wisataImageUrl } from './wisata'
import type { Wisata, WisataType } from './types'

/** Kartu destinasi di situs publik (landing dan daftar). */
export interface LandingWisata {
  id: string
  nama: string
  jenis: WisataType
  kecamatan: string
  kelurahan: string
  hargaTiket: number
  imageUrl: string | null
}

export function toLandingWisata(w: Wisata): LandingWisata {
  const first = [...(w.images ?? [])].sort((a, b) => a.sortOrder - b.sortOrder)[0]
  return {
    id: w.id,
    nama: w.nama,
    jenis: w.jenis,
    kecamatan: w.kecamatan,
    kelurahan: w.kelurahan,
    hargaTiket: w.hargaTiket,
    imageUrl: first ? wisataImageUrl(first) : null,
  }
}

/** Jumlah kartu per carousel beranda (PRD: 5 unggulan, 5 terbaru). */
export const LANDING_SECTION_SIZE = 5

export interface LandingSections {
  newest: LandingWisata[]
  featured: LandingWisata[]
}

function byNewest(a: Wisata, b: Wisata): number {
  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
}

/**
 * SEMENTARA: API belum mencatat jumlah peminat, jadi "unggulan" memakai judul
 * terpanjang (sesuai definisi sementara di PRD), seri dipecah dengan createdAt terbaru.
 */
function byFeatured(a: Wisata, b: Wisata): number {
  return b.nama.length - a.nama.length || byNewest(a, b)
}

/** Kedua carousel beranda dari satu panggilan API. */
export async function getLandingSections(limit = LANDING_SECTION_SIZE): Promise<LandingSections> {
  const { data } = await listWisata({ page: 1, limit: 50 })
  return {
    newest: [...data].sort(byNewest).slice(0, limit).map(toLandingWisata),
    featured: [...data].sort(byFeatured).slice(0, limit).map(toLandingWisata),
  }
}
