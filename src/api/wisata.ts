import { request } from './client'
import type { WisataListResponse, WisataResponse, WisataType } from './types'

export interface ListWisataParams {
  page?: number
  /** 1–50 per the API. */
  limit?: number
  jenis?: WisataType
  provinsi?: string
  kecamatan?: string
  kelurahan?: string
}

/** Label tampilan untuk setiap jenis wisata. */
export const WISATA_TYPE_LABELS: Record<WisataType, string> = {
  wisata_rekreasi: 'Wisata Rekreasi',
  wisata_alam: 'Wisata Alam',
  wisata_bahari: 'Wisata Bahari',
  wisata_budaya_dan_sejarah: 'Wisata Budaya dan Sejarah',
}

export function wisataTypeLabel(jenis: string): string {
  return WISATA_TYPE_LABELS[jenis as WisataType] ?? jenis
}

export function listWisata(params: ListWisataParams = {}, signal?: AbortSignal): Promise<WisataListResponse> {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') query.set(key, String(value))
  }
  const qs = query.toString()
  return request<WisataListResponse>(`/api/v1/wisata${qs ? `?${qs}` : ''}`, { signal })
}

export function getWisata(id: string): Promise<WisataResponse> {
  return request<WisataResponse>(`/api/v1/wisata/${encodeURIComponent(id)}`)
}
