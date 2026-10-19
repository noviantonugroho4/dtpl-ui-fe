import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { ApiError } from '@/api/client'
import * as wisataApi from '@/api/wisata'
import type { Wisata } from '@/api/types'
import PublicWisataDetailView from './PublicWisataDetailView.vue'

vi.mock('vue-router', async () => {
  const { defineComponent, h, reactive } = await import('vue')
  const route = reactive({ params: { id: 'id-1' } })
  return {
    useRoute: () => route,
    RouterLink: defineComponent({ props: { to: null }, setup: (_, { slots }) => () => h('a', slots.default?.()) }),
  }
})

vi.mock('@/api/wisata', async () => {
  const actual = await vi.importActual<typeof import('@/api/wisata')>('@/api/wisata')
  return { ...actual, getWisata: vi.fn() }
})

const api = vi.mocked(wisataApi)

const wisata: Wisata = {
  id: 'id-1', nama: 'Snorkling Kep. Seribu', jenis: 'wisata_bahari', kontakTelp: '+628111111111', kontakWa: '+628222222222',
  provinsi: 'DKI Jakarta', kecamatan: 'Kepulauan Seribu Selatan', kelurahan: 'Pulau Pari', alamat: 'Jl. Pantai Selatan Pulau Pari',
  mapsLink: 'https://maps.app.goo.gl/KoFSBpEzYmHEdLx76', deskripsi: 'Lorem ipsum.', hargaTiket: 0, createdBy: 1,
  createdAt: '2026-10-01T00:00:00Z', updatedAt: '2026-10-01T00:00:00Z',
  images: [
    { id: 'img-2', wisataId: 'id-1', webdavUrl: 'https://cdn/2.jpg', webdavKey: 'k2', mime: 'image/jpeg', sizeBytes: 1, sortOrder: 1, createdAt: '' },
    { id: 'img-1', wisataId: 'id-1', webdavUrl: 'https://cdn/1.jpg', webdavKey: 'k1', mime: 'image/jpeg', sizeBytes: 1, sortOrder: 0, createdAt: '' },
  ],
  fasilitas: [{ id: 'f-1', facility: 'Mushola 1', sortOrder: 0 }, { id: 'f-2', facility: 'Mushola 2', sortOrder: 1 }],
  services: [{ id: 's-1', serviceName: 'Sewa Payung', price: 15000, sortOrder: 0 }],
}

describe('PublicWisataDetailView', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    api.getWisata.mockReset().mockResolvedValue({ data: wisata })
  })

  it('renders the design rows, map links, WhatsApp order link and a six-slot gallery', async () => {
    const wrapper = mount(PublicWisataDetailView)
    await flushPromises()

    expect(wrapper.find('[data-testid="public-detail-nama"]').text()).toBe('Snorkling Kep. Seribu')
    expect(wrapper.find('[data-testid="public-detail-alamat"]').text()).toContain('Kelurahan Pulau Pari, Kecamatan Kepulauan Seribu Selatan, DKI Jakarta')
    expect(wrapper.find('[data-testid="public-detail-harga"]').text()).toBe('Gratis')
    expect(wrapper.find('[data-testid="public-detail-fasilitas"]').findAll('li').map((li) => li.text())).toEqual(['Mushola 1', 'Mushola 2'])
    expect(wrapper.text()).not.toContain('Sewa Payung')

    expect(wrapper.find('[data-testid="public-detail-map-open"]').attributes('href')).toBe(wisata.mapsLink)
    expect(wrapper.find('[data-testid="public-detail-map-link"]').text()).toBe(wisata.mapsLink)
    expect(wrapper.find('[data-testid="public-detail-map-route"]').attributes('href')).toContain('google.com/maps/dir/?api=1&destination=Snorkling%20Kep.%20Seribu')

    const order = wrapper.find('[data-testid="public-detail-order"]')
    expect(order.attributes('href')!.startsWith('https://wa.me/628222222222?text=')).toBe(true)
    const text = decodeURIComponent(order.attributes('href')!.split('?text=')[1]!)
    expect(text).toContain('Halo, Bapak/Ibu Admin Widewi.')
    expect(text).toContain('pemesanan tiket Snorkling Kep. Seribu melalui website Widewi')
    expect(text).toContain('Nama Pemesan: [Nama Depan] [Nama Belakang]')
    expect(text).toContain('Tanggal Kedatangan: [Tanggal]')
    expect(text).toContain('Jumlah Tiket: [Jumlah Orang]')
    expect(text).toContain('Tambahan Service: Sewa Payung')

    const gallery = wrapper.find('[data-testid="public-detail-gallery"]')
    expect(gallery.findAll('button')).toHaveLength(2)
    expect(gallery.findAll('[data-testid="public-detail-gallery-empty"]')).toHaveLength(4)
    expect(gallery.findAll('button img').map((img) => img.attributes('src'))).toEqual(['/api/v1/wisata/images/k1', '/api/v1/wisata/images/k2'])
  })

  it('uses the signed-in username as the orderer and the phone number when kontakWa is missing', async () => {
    localStorage.setItem('dtpl.auth.token', 'jwt-1')
    localStorage.setItem('dtpl.auth.user', JSON.stringify({ id: 1, username: 'lidya', role: 'user', createdAt: '', updatedAt: '' }))
    setActivePinia(createPinia())
    api.getWisata.mockResolvedValue({ data: { ...wisata, kontakWa: undefined } })
    const wrapper = mount(PublicWisataDetailView)
    await flushPromises()
    const href = wrapper.find('[data-testid="public-detail-order"]').attributes('href')!
    expect(href.startsWith('https://wa.me/628111111111?text=')).toBe(true)
    expect(decodeURIComponent(href)).toContain('Nama Pemesan: lidya')
  })

  it('opens the lightbox on a gallery image, steps with the arrows and closes', async () => {
    const wrapper = mount(PublicWisataDetailView)
    await flushPromises()
    expect(wrapper.find('[data-testid="public-detail-lightbox"]').exists()).toBe(false)

    await wrapper.find('[data-testid="public-detail-gallery-img-1"]').trigger('click')
    expect(wrapper.find('[data-testid="public-detail-lightbox-image"]').attributes('src')).toBe('/api/v1/wisata/images/k1')

    await wrapper.find('[data-testid="public-detail-lightbox-next"]').trigger('click')
    expect(wrapper.find('[data-testid="public-detail-lightbox-image"]').attributes('src')).toBe('/api/v1/wisata/images/k2')
    await wrapper.find('[data-testid="public-detail-lightbox-next"]').trigger('click')
    expect(wrapper.find('[data-testid="public-detail-lightbox-image"]').attributes('src')).toBe('/api/v1/wisata/images/k1')

    await wrapper.find('[data-testid="public-detail-lightbox-close"]').trigger('click')
    expect(wrapper.find('[data-testid="public-detail-lightbox"]').exists()).toBe(false)
  })

  it('shows the not-found state for a 404', async () => {
    api.getWisata.mockRejectedValue(new ApiError(404, 'NOT_FOUND', 'missing'))
    const wrapper = mount(PublicWisataDetailView)
    await flushPromises()
    expect(wrapper.find('[data-testid="public-detail-not-found"]').text()).toContain('Destinasi wisata tidak ditemukan.')
  })
})
