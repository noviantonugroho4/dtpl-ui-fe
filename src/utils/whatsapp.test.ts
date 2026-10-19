import { describe, expect, it } from 'vitest'
import { buildTicketMessage, whatsappLink } from './whatsapp'

describe('whatsapp helpers', () => {
  it('fills the product template, keeping unknown fields as placeholders', () => {
    const text = buildTicketMessage({ namaWisata: 'Snorkling Kep. Seribu', namaPemesan: ' Lidya Silitonga ', services: ['Sewa Payung', 'Sewa Snorkel'] })
    expect(text).toBe(
      [
        'Halo, Bapak/Ibu Admin Widewi.',
        '',
        'Saya ingin melakukan pemesanan tiket Snorkling Kep. Seribu melalui website Widewi dengan detail sebagai berikut:',
        '',
        'Nama Pemesan: Lidya Silitonga',
        'Tanggal Kedatangan: [Tanggal]',
        'Jumlah Tiket: [Jumlah Orang]',
        'Tambahan Service: Sewa Payung, Sewa Snorkel',
        '',
        'Mohon informasi mengenai ketersediaan tiket, harga, dan prosedur pemesanannya.',
        '',
        'Terima kasih atas bantuan Bapak/Ibu Admin Widewi.',
      ].join('\n'),
    )
    const anonymous = buildTicketMessage({ namaWisata: 'X', services: [] })
    expect(anonymous).toContain('Nama Pemesan: [Nama Depan] [Nama Belakang]')
    expect(anonymous).toContain('Tambahan Service: Tidak ada')
  })

  it('strips non-digits from the phone and url-encodes the text, keeping line breaks as %0A', () => {
    expect(whatsappLink('+62 812-3456', 'a b\nc')).toBe('https://wa.me/628123456?text=a%20b%0Ac')
    const link = whatsappLink('62', buildTicketMessage({ namaWisata: 'X', services: [] }))
    expect(link).not.toMatch(/%F0%9F/) // tanpa emoji
    expect(link.split('%0A').length).toBe(12)
  })
})
