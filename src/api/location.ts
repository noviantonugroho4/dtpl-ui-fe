import { request } from './client'
import type { LocationPlacesResponse, LocationShortItemsResponse } from './types'

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
