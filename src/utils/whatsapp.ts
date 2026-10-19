export interface TicketOrder {
  namaWisata: string
  /** Nama pemesan; kosong → placeholder template. */
  namaPemesan?: string
  /** Nama layanan destinasi; kosong → "Tidak ada". */
  services: string[]
}

/**
 * Template pesan pemesanan tiket ke Admin Widewi (sesuai permintaan produk).
 * Tanggal dan jumlah tiket tidak diketahui situs, jadi dibiarkan sebagai placeholder
 * yang diisi pemesan di WhatsApp. Tanpa emoji: beberapa perangkat menampilkannya sebagai "?".
 * Baris dipisah \n, yang menjadi %0A di tautan wa.me dan dirender sebagai enter oleh WhatsApp.
 */
export function buildTicketMessage(order: TicketOrder): string {
  const nama = order.namaPemesan?.trim() || '[Nama Depan] [Nama Belakang]'
  const services = order.services.length ? order.services.join(', ') : 'Tidak ada'
  return [
    'Halo, Bapak/Ibu Admin Widewi.',
    '',
    `Saya ingin melakukan pemesanan tiket ${order.namaWisata} melalui website Widewi dengan detail sebagai berikut:`,
    '',
    `Nama Pemesan: ${nama}`,
    'Tanggal Kedatangan: [Tanggal]',
    'Jumlah Tiket: [Jumlah Orang]',
    `Tambahan Service: ${services}`,
    '',
    'Mohon informasi mengenai ketersediaan tiket, harga, dan prosedur pemesanannya.',
    '',
    'Terima kasih atas bantuan Bapak/Ibu Admin Widewi.',
  ].join('\n')
}

/** Nomor hanya digit internasional (62…); tautan wa.me dengan teks ter-encode. */
export function whatsappLink(phone: string, text: string): string {
  return `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`
}

/** Nomor WhatsApp Admin Widewi dari env; kosong bila belum diatur. */
export const WHATSAPP_ADMIN_NUMBER = (import.meta.env.VITE_WHATSAPP_ADMIN ?? '').trim()
