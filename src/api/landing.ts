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

/** Destinasi dari backend, diurutkan createdAt terbaru. */
export async function getNewestWisata(limit = 6): Promise<LandingWisata[]> {
  const { data } = await listWisata({ page: 1, limit: 50 })
  return [...data]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit)
    .map(toLandingWisata)
}

/**
 * SEMENTARA: API belum punya penanda "unggulan", jadi carousel Destinasi Unggulan
 * memakai urutan yang sama dengan Destinasi Baru sampai ada penyesuaian di API.
 */
export const getFeaturedWisata = getNewestWisata
