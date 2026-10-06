import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { ApiError } from '@/api/client'
import * as wisataApi from '@/api/wisata'
import type { Wisata } from '@/api/types'
import DestinasiWisataDetailView from './DestinasiWisataDetailView.vue'

const routeMocks = vi.hoisted(() => ({ params: { id: 'id-1' } as Record<string, string> }))

vi.mock('vue-router', async () => {
  const { defineComponent, h, reactive } = await import('vue')
  const route = reactive({ params: routeMocks.params })
  return {
    useRoute: () => route,
    RouterLink: defineComponent({
      props: { to: null },
      setup: (props, { slots }) => () => h('a', { 'data-to': JSON.stringify(props.to) }, slots.default?.()),
    }),
  }
})

vi.mock('@/api/wisata', async () => {
  const actual = await vi.importActual<typeof import('@/api/wisata')>('@/api/wisata')
  return { ...actual, getWisata: vi.fn() }
})

const api = vi.mocked(wisataApi)

const wisata: Wisata = {
  id: 'id-1',
  nama: 'Pantai Tanjung Lesung',
  jenis: 'wisata_alam',
  kontakTelp: '+628123456789',
  kontakWa: '+628123456789',
  provinsi: 'Banten',
  kecamatan: 'Sumur',
  kelurahan: 'Cigorondong',
  alamat: 'Jl. Pantai Tanjung Lesung No. 1',
  mapsLink: 'https://maps.app.goo.gl/abc123xyz',
  deskripsi: 'Pantai pasir putih.',
  hargaTiket: 25000,
  createdBy: 1,
  createdAt: '2026-10-01T10:23:55Z',
  updatedAt: '2026-10-01T10:23:55Z',
  images: [
    { id: 'img-2', wisataId: 'id-1', webdavUrl: 'https://cdn/2.jpg', webdavKey: 'k2', mime: 'image/jpeg', sizeBytes: 1, sortOrder: 1, createdAt: '' },
    { id: 'img-1', wisataId: 'id-1', webdavUrl: 'https://cdn/1.jpg', webdavKey: 'k1', mime: 'image/jpeg', sizeBytes: 1, sortOrder: 0, createdAt: '' },
  ],
  fasilitas: [
    { id: 'f-1', facility: 'Parkir Area', sortOrder: 0 },
    { id: 'f-2', facility: 'Toilet', sortOrder: 1 },
  ],
  services: [{ id: 's-1', serviceName: 'Sewa Payung', price: 15000, sortOrder: 0 }],
}

describe('DestinasiWisataDetailView', () => {
  beforeEach(() => {
    api.getWisata.mockReset()
    routeMocks.params.id = 'id-1'
  })

  it('loads the entry by route id and renders every section', async () => {
    api.getWisata.mockResolvedValue({ data: wisata })
    const wrapper = mount(DestinasiWisataDetailView)
    await flushPromises()

    expect(api.getWisata).toHaveBeenCalledWith('id-1')
    const text = wrapper.text()
    expect(text).toContain('Pantai Tanjung Lesung')
    expect(text).toContain('Wisata Alam')
    expect(text).toContain('Kel. Cigorondong, Kec. Sumur, Banten')
    expect(text).toContain('Parkir Area')
    expect(text).toContain('Rp 25.000')
    expect(text).toContain('Sewa Payung')
    expect(text).toContain('Rp 15.000')
    expect(text).toContain('01-10-2026')

    const srcs = wrapper.findAll('img').map((img) => img.attributes('src'))
    expect(srcs).toEqual(['https://cdn/1.jpg', 'https://cdn/2.jpg'])
    expect(wrapper.find('a[href="https://wa.me/628123456789"]').exists()).toBe(true)
    expect(wrapper.find('a[data-to*="attractions-edit"]').attributes('data-to')).toContain('"id":"id-1"')
  })

  it('replaces an image that fails to load with a placeholder', async () => {
    api.getWisata.mockResolvedValue({ data: wisata })
    const wrapper = mount(DestinasiWisataDetailView)
    await flushPromises()

    await wrapper.find('img').trigger('error')
    expect(wrapper.findAll('img')).toHaveLength(1)
    expect(wrapper.text()).toContain('Gambar tidak dapat dimuat')
  })

  it('shows a not-found state for a 404', async () => {
    api.getWisata.mockRejectedValue(new ApiError(404, 'NOT_FOUND', 'Destinasi wisata entry not found'))
    const wrapper = mount(DestinasiWisataDetailView)
    await flushPromises()
    expect(wrapper.find('[role="alert"]').text()).toContain('Destinasi wisata tidak ditemukan.')
    expect(wrapper.text()).not.toContain('Ubah')
  })

  it('shows an error with retry for other failures', async () => {
    api.getWisata.mockRejectedValueOnce(new ApiError(0, 'NETWORK_ERROR', 'offline'))
    api.getWisata.mockResolvedValue({ data: wisata })
    const wrapper = mount(DestinasiWisataDetailView)
    await flushPromises()
    expect(wrapper.find('[role="alert"]').text()).toContain('Tidak dapat terhubung ke server')

    await wrapper.find('[role="alert"] button').trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('Pantai Tanjung Lesung')
  })

  it('shows "Gratis" for a zero ticket price and dashes for empty optional sections', async () => {
    api.getWisata.mockResolvedValue({ data: { ...wisata, hargaTiket: 0, deskripsi: undefined, services: [], fasilitas: [] } })
    const wrapper = mount(DestinasiWisataDetailView)
    await flushPromises()
    expect(wrapper.text()).toContain('Gratis')
    expect(wrapper.findAll('dd').filter((dd) => dd.text() === '-').length).toBeGreaterThanOrEqual(2)
  })
})
