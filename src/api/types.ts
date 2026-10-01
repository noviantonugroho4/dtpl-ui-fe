export type UserRole = 'admin' | 'user' | 'editor'

export interface UserProfile {
  id: number
  username: string
  email: string
  role: UserRole
  createdAt: string
  updatedAt: string
}

export interface LoginRequest {
  username: string
  password: string
}

export interface LoginResponse {
  data: {
    token: string
    user: UserProfile
  }
}

export interface UserResponse {
  data: {
    user: UserProfile
  }
}

export interface LogoutResponse {
  data: {
    logout: boolean
  }
}

export interface HealthResponse {
  status: string
  db: string
}

export interface ErrorDetail {
  code: string
  message: string
}

export interface ErrorResponse {
  error: ErrorDetail
}

// ---- Destinasi wisata (GET /api/v1/wisata) ----

export type WisataType = 'wisata_rekreasi' | 'wisata_alam' | 'wisata_bahari' | 'wisata_budaya_dan_sejarah'

export interface WisataImage {
  id: string
  wisataId: string
  webdavUrl: string
  webdavKey: string
  mime: string
  sizeBytes: number
  sortOrder: number
  createdAt: string
}

export interface WisataFacility {
  id: string
  facility: string
  sortOrder: number
}

export interface WisataService {
  id: string
  serviceName: string
  price: number
  sortOrder: number
}

export interface Wisata {
  id: string
  nama: string
  jenis: WisataType
  kontakTelp: string
  kontakWa?: string
  provinsi: string
  kecamatan: string
  kelurahan: string
  alamat: string
  mapsLink: string
  deskripsi?: string
  hargaTiket: number
  createdBy: number
  createdAt: string
  updatedAt: string
  images: WisataImage[]
  fasilitas: WisataFacility[]
  services: WisataService[]
}

export interface PaginationMeta {
  page: number
  limit: number
  total: number
  totalPages: number
}

export interface WisataListResponse {
  data: Wisata[]
  meta: PaginationMeta
}

export interface WisataResponse {
  data: Wisata
}
