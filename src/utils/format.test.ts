import { describe, expect, it } from 'vitest'
import { formatDate, formatDateTime, formatRupiah } from './format'

describe('format helpers', () => {
  it('formats dates as dd-mm-yyyy and leaves garbage untouched', () => {
    expect(formatDate('2026-09-24T03:00:00Z')).toBe('24-09-2026')
    expect(formatDate('not-a-date')).toBe('not-a-date')
    expect(formatDateTime('2026-09-24T03:04:00')).toBe('24-09-2026 03:04')
  })

  it('formats rupiah with thousands separators and a free label for zero', () => {
    expect(formatRupiah(25000)).toBe('Rp 25.000')
    expect(formatRupiah(0)).toBe('Gratis')
    expect(formatRupiah(Number.NaN)).toBe('-')
  })
})
