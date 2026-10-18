import { listWisata } from './wisata'
import type { Wisata, WisataType } from './types'
import imgCamping from '@/assets/landing/card-camping.jpg'
import imgSnorkling from '@/assets/landing/card-snorkling.jpg'
import imgAirTerjun from '@/assets/landing/card-airterjun.jpg'
import imgTidung from '@/assets/landing/card-tidung.jpg'

/** Kartu destinasi di situs publik (landing dan daftar). */
export interface LandingWisata {
  id: string
  nama: string
  jenis: WisataType
  kecamatan: string
  kelurahan: string
  hargaTiket: number
  imageUrl: string | null
  /** true = data contoh dari mock-up, bukan dari backend. */
  isMock: boolean
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
    imageUrl: first?.webdavUrl ?? null,
    isMock: false,
  }
}

/**
 * MOCK: backend belum punya penanda "destinasi unggulan" (rating/featured).
 * Isi diambil dari mock-up Figma 496:6496 dan diganti saat endpoint-nya tersedia.
 */
export const FEATURED_WISATA_MOCK: LandingWisata[] = [
  { id: 'mock-camping-limau-kunci', nama: 'Camping Limau Kunci', jenis: 'wisata_rekreasi', kecamatan: 'Kepulauan Seribu', kelurahan: 'Pulau Pari', hargaTiket: 200000, imageUrl: imgCamping, isMock: true },
  { id: 'mock-snorkling-kep-seribu', nama: 'Snorkling Kep. Seribu', jenis: 'wisata_bahari', kecamatan: 'Kepulauan Seribu', kelurahan: 'Pulau Pari', hargaTiket: 200000, imageUrl: imgSnorkling, isMock: true },
  { id: 'mock-air-terjun-way-detum', nama: 'Air Terjun Way Detum', jenis: 'wisata_alam', kecamatan: 'Kepulauan Seribu', kelurahan: 'Pulau Pari', hargaTiket: 200000, imageUrl: imgAirTerjun, isMock: true },
  { id: 'mock-pantai-pulau-tidung', nama: 'Pantai Pulau Tidung', jenis: 'wisata_bahari', kecamatan: 'Kepulauan Seribu', kelurahan: 'Pulau Tidung', hargaTiket: 0, imageUrl: imgTidung, isMock: true },
  { id: 'mock-gua-matu', nama: 'Gua Matu', jenis: 'wisata_budaya_dan_sejarah', kecamatan: 'Kepulauan Seribu', kelurahan: 'Pulau Harapan', hargaTiket: 15000, imageUrl: imgAirTerjun, isMock: true },
  { id: 'mock-snorkling-pahawang', nama: 'Snorkling Pahawang', jenis: 'wisata_bahari', kecamatan: 'Kepulauan Seribu', kelurahan: 'Pulau Kelapa', hargaTiket: 150000, imageUrl: imgSnorkling, isMock: true },
]

export async function getFeaturedWisata(): Promise<LandingWisata[]> {
  return FEATURED_WISATA_MOCK
}

/** Destinasi terbaru dari backend, diurutkan createdAt terbaru. */
export async function getNewestWisata(limit = 6): Promise<LandingWisata[]> {
  const { data } = await listWisata({ page: 1, limit: 50 })
  return [...data]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit)
    .map(toLandingWisata)
}
