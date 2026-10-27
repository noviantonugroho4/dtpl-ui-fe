import { request } from './client'
import type { LocationPlacesResponse, LocationShortItem, LocationShortItemsResponse, LocationVillageDetailResponse } from './types'
import { REGION } from '@/config/region'

/** Wilayah Indonesia: provinsi → kabupaten/kota → kecamatan → kelurahan. */

export function listProvinces(): Promise<LocationPlacesResponse> {
  return request<LocationPlacesResponse>('/api/v1/location/provinces')
}

export function listRegencies(provinceCode: string): Promise<LocationShortItemsResponse> {
  return request<LocationShortItemsResponse>(`/api/v1/location/regencies/${encodeURIComponent(provinceCode)}`)
}

export function listDistricts(regencyCode: string): Promise<LocationShortItemsResponse> {
  return request<LocationShortItemsResponse>(`/api/v1/location/districts/${encodeURIComponent(regencyCode)}`)
}

export function listVillages(districtCode: string): Promise<LocationShortItemsResponse> {
  return request<LocationShortItemsResponse>(`/api/v1/location/villages/${encodeURIComponent(districtCode)}`)
}

export function getVillageDetail(villageCode: string): Promise<LocationVillageDetailResponse> {
  return request<LocationVillageDetailResponse>(`/api/v1/location/village-detail/${encodeURIComponent(villageCode)}`)
}

export interface ResolvedVillage {
  /** Contoh: "Kabupaten Pesisir Barat". */
  kabupaten: string
  kodePos: string
}

const normalize = (name: string) => name.trim().replace(/\s+/g, ' ').toLowerCase()
const byName = (list: LocationShortItem[], name: string) => list.filter((item) => normalize(item.name) === normalize(name))

/** Hasil per kombinasi nama selama sesi halaman; null = tidak bisa dipastikan. */
const resolveCache = new Map<string, Promise<ResolvedVillage | null>>()

/**
 * Data wisata hanya menyimpan NAMA provinsi/kecamatan/kelurahan (tanpa kode & kabupaten),
 * jadi kode kelurahan dicari dari nama: provinsi → kabupaten → kecamatan → kelurahan,
 * lalu kabupaten dan kode pos diambil dari village-detail.
 * Mengembalikan null bila nama tidak ditemukan atau ambigu (lebih dari satu kelurahan cocok);
 * tidak menebak.
 */
export function resolveVillageByName(place: { provinsi: string; kecamatan: string; kelurahan: string }): Promise<ResolvedVillage | null> {
  const key = [place.provinsi, place.kecamatan, place.kelurahan].map(normalize).join('|')
  let cached = resolveCache.get(key)
  if (!cached) {
    cached = lookupVillage(place).catch(() => {
      // Kegagalan jaringan tidak di-cache; kunjungan berikutnya boleh mencoba lagi.
      resolveCache.delete(key)
      return null
    })
    resolveCache.set(key, cached)
  }
  return cached
}

async function lookupVillage(place: { provinsi: string; kecamatan: string; kelurahan: string }): Promise<ResolvedVillage | null> {
  const [province] = byName((await listProvinces()).data, place.provinsi)
  if (!province) return null

  // Wilayah cakupan WIDEWI dicoba lebih dulu; sisanya hanya bila kecamatan tidak ada di sana.
  const regencies = (await listRegencies(province.id)).data
  const ordered = [...regencies].sort((a, b) => Number(b.id === REGION.regencyCode) - Number(a.id === REGION.regencyCode))
  let candidates: { regency: LocationShortItem; district: LocationShortItem }[] = []
  const home = ordered[0]?.id === REGION.regencyCode ? ordered[0] : undefined
  if (home) candidates = byName((await listDistricts(home.id)).data, place.kecamatan).map((district) => ({ regency: home, district }))
  if (candidates.length === 0) {
    const rest = ordered.filter((regency) => regency !== home)
    const lists = await Promise.all(rest.map((regency) => listDistricts(regency.id).then((r) => ({ regency, districts: r.data }))))
    candidates = lists.flatMap(({ regency, districts }) => byName(districts, place.kecamatan).map((district) => ({ regency, district })))
  }

  const matches = (
    await Promise.all(
      candidates.map(async ({ regency, district }) => byName((await listVillages(district.id)).data, place.kelurahan).map((village) => ({ regency, village }))),
    )
  ).flat()
  if (matches.length !== 1) return null
  const { regency, village } = matches[0]!

  try {
    const detail = (await getVillageDetail(village.id)).data
    return { kabupaten: detail.regency?.name ?? regency.name, kodePos: detail.postal_code ?? village.postal_code ?? '' }
  } catch {
    // village-detail kadang 502; daftar kelurahan sudah memuat kode pos.
    return { kabupaten: regency.name, kodePos: village.postal_code ?? '' }
  }
}

/** Hanya untuk test. */
export function clearVillageCache() {
  resolveCache.clear()
}
