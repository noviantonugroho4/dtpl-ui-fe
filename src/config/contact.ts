import { WHATSAPP_ADMIN_NUMBER } from '@/utils/whatsapp'

/**
 * Data kontak situs publik. Nilai di bawah adalah PLACEHOLDER untuk tugas kuliah;
 * ganti dengan kontak resmi WIDEWI. Nomor WhatsApp mengikuti VITE_WHATSAPP_ADMIN.
 */
export const CONTACT = {
  brand: 'WIDEWI',
  tagline: 'Eksplorasi & Pemesanan Tiket Wisata',
  whatsapp: WHATSAPP_ADMIN_NUMBER || '6281234567890',
  email: 'halo@widewi.id',
  address: ['Fakultas Ilmu Komputer, Universitas Indonesia', 'Kampus UI Depok, Jawa Barat 16424'],
  hours: ['Senin – Jumat: 08.00 – 17.00 WIB', 'Sabtu: 09.00 – 14.00 WIB', 'Minggu & hari libur: tutup'],
  social: [
    { key: 'instagram', label: 'Instagram', handle: '@widewi.id', href: '#' },
    { key: 'facebook', label: 'Facebook', handle: 'WIDEWI Indonesia', href: '#' },
    { key: 'youtube', label: 'YouTube', handle: 'WIDEWI Official', href: '#' },
  ],
} as const

/** Nomor WhatsApp dalam format tampilan: +62 812-3456-7890. */
export function formatPhoneDisplay(digits: string): string {
  const d = digits.replace(/\D/g, '')
  if (!d.startsWith('62')) return `+${d}`
  const rest = d.slice(2)
  const groups = [rest.slice(0, 3), rest.slice(3, 7), rest.slice(7)].filter(Boolean)
  return `+62 ${groups.join('-')}`
}
