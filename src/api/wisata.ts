import { API_BASE_URL, request } from './client'
import type { CreateWisataRequest, ImageUploadResponse, WisataImage, WisataListResponse, WisataResponse, WisataType } from './types'

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

/** Maximum image size accepted by the upload endpoint, in bytes (150 KB). */
export const WISATA_IMAGE_MAX_BYTES = 153600
export const WISATA_IMAGE_MIMES = ['image/jpeg', 'image/png'] as const
export const WISATA_MAX_IMAGES = 6
export const WISATA_MAX_FACILITIES = 15
export const WISATA_NAME_MAX = 30
export const WISATA_DESCRIPTION_MAX = 500

export function uploadWisataImage(file: File, token: string): Promise<ImageUploadResponse> {
  const formData = new FormData()
  formData.append('image', file)
  return request<ImageUploadResponse>('/api/v1/wisata/upload', { method: 'POST', formData, token })
}

export function createWisata(payload: CreateWisataRequest, token: string): Promise<WisataResponse> {
  return request<WisataResponse>('/api/v1/wisata', { method: 'POST', body: payload, token })
}

/**
 * URL gambar destinasi lewat endpoint publik GET /api/v1/wisata/images/{key},
 * dibangun dari webdavKey agar satu origin dengan panggilan API lain
 * (lewat proxy Vite / rewrite Vercel) dan tidak bergantung pada host di webdavUrl.
 */
export function wisataImageUrl(image: Pick<WisataImage, 'webdavKey' | 'webdavUrl'>): string {
  const key = image.webdavKey?.replace(/^\/+/, '')
  if (!key) return image.webdavUrl
  return `${API_BASE_URL}/api/v1/wisata/images/${key.split('/').map(encodeURIComponent).join('/')}`
}
