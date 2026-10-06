/** Tanggal dd-mm-yyyy; nilai yang tidak bisa diparse dikembalikan apa adanya. */
export function formatDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  const dd = String(date.getDate()).padStart(2, '0')
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  return `${dd}-${mm}-${date.getFullYear()}`
}

/** Tanggal dan jam, mis. 01-10-2026 17:23. */
export function formatDateTime(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  const hh = String(date.getHours()).padStart(2, '0')
  const mi = String(date.getMinutes()).padStart(2, '0')
  return `${formatDate(value)} ${hh}:${mi}`
}

const rupiah = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 })

/** Harga dalam rupiah; 0 ditampilkan sebagai "Gratis". */
export function formatRupiah(value: number): string {
  if (!Number.isFinite(value)) return '-'
  if (value === 0) return 'Gratis'
  return rupiah.format(value).replace(/ /g, ' ')
}
