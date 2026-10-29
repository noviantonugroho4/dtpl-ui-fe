import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { ApiError } from '@/api/client'
import * as wisataApi from '@/api/wisata'
import * as locationApi from '@/api/location'
import type { Wisata } from '@/api/types'
import * as googleApi from '@/api/googleAuth'
import type { TravelerUser } from '@/api/googleAuth'
import { useAuthDialogStore } from '@/stores/authDialog'
import { useTravelerStore } from '@/stores/traveler'
import { formatRupiah } from '@/utils/format'
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

vi.mock('@/api/location', () => ({ getVillageDetail: vi.fn() }))

const api = vi.mocked(wisataApi)
const location = vi.mocked(locationApi)

vi.mock('@/api/googleAuth', async () => {
  const actual = await vi.importActual<typeof import('@/api/googleAuth')>('@/api/googleAuth')
  return { ...actual, getTravelerMe: vi.fn(), logoutTraveler: vi.fn().mockResolvedValue({}) }
})
const google = vi.mocked(googleApi)
const emptyProfile = { namaDepan: null, namaBelakang: null, tempatLahir: null, tanggalLahir: null, alamat: null, nomorTelepon: null }
const traveler: TravelerUser = { id: 7, username: 'lidya.s', role: 'user', profileComplete: true, profile: emptyProfile }

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
    localStorage.clear()
    setActivePinia(createPinia())
    google.getTravelerMe.mockReset()
    api.getWisata.mockReset().mockResolvedValue({ data: wisata })
    location.getVillageDetail.mockReset().mockRejectedValue(new ApiError(502, 'UNKNOWN_ERROR', 'Bad Gateway'))
  })

  it('renders the design rows, map links and a six-slot gallery', async () => {
    const wrapper = mount(PublicWisataDetailView)
    await flushPromises()

    expect(wrapper.find('[data-testid="public-detail-nama"]').text()).toBe('Snorkling Kep. Seribu')
    expect(wrapper.find('[data-testid="public-detail-alamat"]').text()).toContain('Kelurahan Pulau Pari, Kecamatan Kepulauan Seribu Selatan, DKI Jakarta')
    expect(wrapper.find('[data-testid="public-detail-harga"]').text()).toBe('Gratis')
    expect(wrapper.find('[data-testid="public-detail-fasilitas"]').findAll('li').map((li) => li.text())).toEqual(['Mushola 1', 'Mushola 2'])
    const service = wrapper.find('[data-testid="public-detail-service-s-1"]')
    expect(service.text()).toContain('Sewa Payung')
    expect(service.text()).toContain('15.000')

    expect(wrapper.find('[data-testid="public-detail-map-open"]').attributes('href')).toBe(wisata.mapsLink)
    expect(wrapper.find('[data-testid="public-detail-map-link"]').text()).toBe(wisata.mapsLink)
    expect(wrapper.find('[data-testid="public-detail-map-route"]').attributes('href')).toContain('google.com/maps/dir/?api=1&destination=Snorkling%20Kep.%20Seribu')

    const gallery = wrapper.find('[data-testid="public-detail-gallery"]')
    expect(gallery.findAll('button')).toHaveLength(2)
    expect(gallery.findAll('[data-testid="public-detail-gallery-empty"]')).toHaveLength(4)
    expect(gallery.findAll('button img').map((img) => img.attributes('src'))).toEqual(['/api/v1/wisata/images/k1', '/api/v1/wisata/images/k2'])
  })

  it('asks a signed-out visitor to sign in first, then opens the order form', async () => {
    const wrapper = mount(PublicWisataDetailView)
    await flushPromises()

    await wrapper.find('[data-testid="public-detail-order"]').trigger('click')
    expect(useAuthDialogStore().mode).toBe('login')
    expect(wrapper.find('[data-testid="order-dialog"]').exists()).toBe(false)

    google.getTravelerMe.mockResolvedValue({ data: { user: { ...traveler, profile: { ...emptyProfile, namaDepan: 'Lidya', namaBelakang: 'Silitonga' } } } })
    useTravelerStore().signIn('jwt-t', traveler)
    useAuthDialogStore().close()
    await flushPromises()
    expect(wrapper.find('[data-testid="order-dialog"]').exists()).toBe(true)
    expect((wrapper.find('[data-testid="order-nama-depan"]').element as HTMLInputElement).value).toBe('Lidya')
    expect(google.getTravelerMe).toHaveBeenCalledWith('jwt-t')
  })

  it('drops the order intent when the sign-in dialog is closed without signing in', async () => {
    const wrapper = mount(PublicWisataDetailView)
    await flushPromises()
    await wrapper.find('[data-testid="public-detail-order"]').trigger('click')
    useAuthDialogStore().close()
    await flushPromises()
    useTravelerStore().signIn('jwt-t', traveler)
    await flushPromises()
    expect(wrapper.find('[data-testid="order-dialog"]').exists()).toBe(false)
  })

  it('totals tickets and services, validates, and reports that online ordering is not available yet', async () => {
    api.getWisata.mockResolvedValue({ data: { ...wisata, hargaTiket: 100000 } })
    useTravelerStore().signIn('jwt-t', traveler)
    google.getTravelerMe.mockRejectedValue(new ApiError(0, 'NETWORK_ERROR', 'x'))
    const wrapper = mount(PublicWisataDetailView)
    await flushPromises()
    await wrapper.find('[data-testid="public-detail-order"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-testid="order-total"]').text()).toBe(formatRupiah(100000))
    await wrapper.find('[data-testid="order-pengunjung-plus"]').trigger('click')
    await wrapper.find('[data-testid="order-service-s-1-check"]').setValue(true)
    await wrapper.find('[data-testid="order-service-s-1-plus"]').trigger('click')
    expect(wrapper.find('[data-testid="order-service-s-1-qty"]').text()).toBe('2')
    expect(wrapper.find('[data-testid="order-total"]').text()).toBe(formatRupiah(2 * 100000 + 2 * 15000))
    await wrapper.find('[data-testid="order-pengunjung-minus"]').trigger('click')
    await wrapper.find('[data-testid="order-pengunjung-minus"]').trigger('click')
    expect(wrapper.find('[data-testid="order-pengunjung"]').text()).toBe('1')

    await wrapper.find('[data-testid="order-form"]').trigger('submit')
    expect(wrapper.find('[data-testid="order-nama-depan-error"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="order-tanggal-error"]').exists()).toBe(true)

    await wrapper.find('[data-testid="order-nama-depan"]').setValue('Lidya')
    await wrapper.find('[data-testid="order-nama-belakang"]').setValue('Silitonga')
    await wrapper.find('[data-testid="order-tanggal-native"]').setValue('2999-10-17')
    expect(wrapper.find('[data-testid="order-tanggal"]').text()).toContain('17 Oktober 2999')
    await wrapper.find('[data-testid="order-form"]').trigger('submit')
    await flushPromises()
    expect(wrapper.find('[data-testid="order-dialog"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="public-detail-order-notice-title"]').text()).toBe('Pemesanan online belum tersedia. Silakan coba lagi nanti.')
  })

  it('closes the order form with "Batal"', async () => {
    useTravelerStore().signIn('jwt-t', traveler)
    google.getTravelerMe.mockRejectedValue(new ApiError(0, 'NETWORK_ERROR', 'x'))
    const wrapper = mount(PublicWisataDetailView)
    await flushPromises()
    await wrapper.find('[data-testid="public-detail-order"]').trigger('click')
    await wrapper.find('[data-testid="order-cancel"]').trigger('click')
    expect(wrapper.find('[data-testid="order-dialog"]').exists()).toBe(false)
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

  it('shows the Kontak number and copies it with "Salin"', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
    const wrapper = mount(PublicWisataDetailView)
    await flushPromises()

    expect(wrapper.find('[data-testid="public-detail-kontak"]').text()).toBe(wisata.kontakTelp)
    const copy = wrapper.find('[data-testid="public-detail-kontak-copy"]')
    expect(copy.text()).toBe('Salin')
    await copy.trigger('click')
    await flushPromises()
    expect(writeText).toHaveBeenCalledWith(wisata.kontakTelp)
    expect(copy.text()).toBe('Tersalin')
    expect(wrapper.find('[data-testid="public-detail-order"]').text()).toBe('Pesan Sekarang')
  })

  it('shows kabupatenKota from the API and the kode pos from village-detail in Alamat', async () => {
    api.getWisata.mockResolvedValue({ data: { ...wisata, kelurahanId: '31.01.02.1001', kabupatenKota: 'Kabupaten Administrasi Kepulauan Seribu' } })
    location.getVillageDetail.mockResolvedValue({ data: { id: '31.01.02.1001', name: 'Pulau Pari', postal_code: '14520' }, meta: { updated_at: '2026-10-25', level: 4 } })
    const wrapper = mount(PublicWisataDetailView)
    await flushPromises()
    expect(location.getVillageDetail).toHaveBeenCalledWith('31.01.02.1001')
    expect(wrapper.find('[data-testid="public-detail-alamat"]').text()).toBe(
      'Jl. Pantai Selatan Pulau Pari, Kelurahan Pulau Pari, Kecamatan Kepulauan Seribu Selatan, Kabupaten Administrasi Kepulauan Seribu, DKI Jakarta 14520',
    )
  })

  it('still shows the address with kabupaten when village-detail fails', async () => {
    api.getWisata.mockResolvedValue({ data: { ...wisata, kelurahanId: '31.01.02.1001', kabupatenKota: 'Kabupaten Administrasi Kepulauan Seribu' } })
    const wrapper = mount(PublicWisataDetailView)
    await flushPromises()
    expect(wrapper.find('[data-testid="public-detail-alamat"]').text()).toMatch(/Kabupaten Administrasi Kepulauan Seribu, DKI Jakarta$/)
  })
})
