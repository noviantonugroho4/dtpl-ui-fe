/**
 * Wilayah cakupan WIDEWI. Filter kecamatan/kelurahan diambil dari API wilayah
 * untuk kabupaten ini (GET /api/v1/location/districts/{regencyCode}).
 */
export const REGION = {
  regencyCode: '18.13',
  regencyName: 'Kabupaten Pesisir Barat',
  provinceName: 'Lampung',
} as const
