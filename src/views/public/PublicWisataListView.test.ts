import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import * as wisataApi from '@/api/wisata'
import * as locationApi from '@/api/location'
import type { Wisata } from '@/api/types'
import PublicWisataListView from './PublicWisataListView.vue'

const routeMocks = vi.hoisted(() => ({ query: {} as Record<string, string> }))

vi.mock('vue-router', async () => {
  const { defineComponent, h } = await import('vue')
  return {
    useRoute: () => ({ query: routeMocks.query, params: {} }),
    RouterLink: defineComponent({
      props: { to: null },
      setup: (props, { slots, attrs }) => () => h('a', { ...attrs, 'data-to': JSON.stringify(props.to) }, slots.default?.()),
    }),
  }
})

vi.mock('@/api/location', () => ({
  listDistricts: vi.fn(),
  listVillages: vi.fn(),
  listProvinces: vi.fn(),
  listRegencies: vi.fn(),
}))

vi.mock('@/api/wisata', async () => {
  const actual = await vi.importActual<typeof import('@/api/wisata')>('@/api/wisata')
  return { ...actual, listWisata: vi.fn() }
})

const api = vi.mocked(wisataApi)
const location = vi.mocked(locationApi)
const meta = { updated_at: '2026-09-04', level: 3 }

function makeWisata(overrides: Partial<Wisata> = {}): Wisata {
  return {
    id: 'id-1', nama: 'Snorkling Kep. Seribu', jenis: 'wisata_bahari', kontakTelp: '+628123456789',
    provinsi: 'DKI Jakarta', kecamatan: 'Kepulauan Seribu', kelurahan: 'Pulau Pari', alamat: 'Jl.', mapsLink: 'https://maps.app.goo.gl/x',
    hargaTiket: 200000, createdBy: 1, createdAt: '2026-09-24T03:00:00Z', updatedAt: '2026-09-24T03:00:00Z', images: [], fasilitas: [], services: [],
    ...overrides,
  }
}
const resp = (data: Wisata[], meta = { page: 1, limit: 10, total: data.length, totalPages: 1 }) => ({ data, meta })

describe('PublicWisataListView', () => {
  beforeEach(() => {
    routeMocks.query = {}
    location.listDistricts.mockReset().mockResolvedValue({ data: [{ id: '18.13.01', name: 'Pesisir Tengah' }, { id: '18.13.02', name: 'Pesisir Selatan' }], meta })
    location.listVillages.mockReset().mockResolvedValue({ data: [{ id: '18.13.01.1001', name: 'Pasar Krui' }], meta })
    api.listWisata.mockReset().mockResolvedValue(
      resp([makeWisata(), makeWisata({ id: 'id-2', nama: 'Pantai Pulau Tidung', hargaTiket: 0, kelurahan: 'Pulau Tidung' }), makeWisata({ id: 'id-3', nama: 'Gua Matu', jenis: 'wisata_budaya_dan_sejarah', hargaTiket: 15000 })]),
    )
  })

  it('renders grid cards with price, kecamatan and kelurahan, linking to the public detail', async () => {
    const wrapper = mount(PublicWisataListView)
    await flushPromises()
    const card = wrapper.find('[data-testid="public-list-card-id-2"]')
    expect(card.attributes('data-to')).toContain('"id":"id-2"')
    expect(card.find('[data-testid="public-list-card-id-2-harga"]').text()).toBe('Gratis')
    expect(card.find('[data-testid="public-list-card-id-2-kelurahan"]').text()).toBe('Kelurahan Pulau Tidung')
    expect(wrapper.find('[data-testid="public-list-card-id-1-harga"]').text()).toBe('Rp 200.000')
  })

  it('pre-selects the jenis from the query and sends it to the API', async () => {
    routeMocks.query = { jenis: 'wisata_bahari' }
    mount(PublicWisataListView)
    await flushPromises()
    expect(api.listWisata).toHaveBeenCalledWith(expect.objectContaining({ jenis: 'wisata_bahari', page: 1, limit: 10 }), expect.any(AbortSignal))
  })

  it('fetches every page once for client-side filters (budget, search) and narrows jenis to one server-side', async () => {
    const wrapper = mount(PublicWisataListView)
    await flushPromises()
    expect(wrapper.findAll('[data-testid^="public-list-card-"][data-testid$="-nama"]')).toHaveLength(3)

    api.listWisata.mockClear()
    await wrapper.find('[data-testid="public-list-budget"]').setValue('gratis')
    await flushPromises()
    expect(api.listWisata).toHaveBeenCalledTimes(1)
    expect(api.listWisata).toHaveBeenCalledWith(expect.objectContaining({ page: 1, limit: 50 }), expect.any(AbortSignal))
    expect(wrapper.findAll('[data-testid$="-nama"]').map((c) => c.text())).toEqual(['Pantai Pulau Tidung'])

    await wrapper.find('[data-testid="public-list-budget"]').setValue('')
    await wrapper.find('[data-testid="public-list-search"]').setValue('gua')
    await flushPromises()
    expect(api.listWisata).toHaveBeenCalledTimes(2) // kembali ke mode server, lalu mode klien memakai cache
    expect(wrapper.findAll('[data-testid$="-nama"]').map((c) => c.text())).toEqual(['Gua Matu'])

    await wrapper.find('[data-testid="public-list-search"]').setValue('')
    await flushPromises()
    api.listWisata.mockClear()
    for (const type of ['wisata_alam', 'wisata_rekreasi', 'wisata_budaya_dan_sejarah']) {
      await wrapper.find(`[data-testid="public-list-type-${type}"]`).setValue(false)
    }
    await flushPromises()
    expect(api.listWisata).toHaveBeenLastCalledWith(expect.objectContaining({ jenis: 'wisata_bahari', limit: 10 }), expect.any(AbortSignal))
  })

  it('hides pagination and shows "Data tidak ditemukan!" when a search matches nothing across all pages', async () => {
    api.listWisata
      .mockResolvedValueOnce(resp([makeWisata()], { page: 1, limit: 10, total: 35, totalPages: 4 }))
      .mockResolvedValueOnce(resp([makeWisata()], { page: 1, limit: 50, total: 35, totalPages: 1 }))
    const wrapper = mount(PublicWisataListView)
    await flushPromises()
    expect(wrapper.findAll('[data-testid^="pagination-page-"]')).toHaveLength(4)

    await wrapper.find('[data-testid="public-list-search"]').setValue('tidak ada di mana pun')
    await flushPromises()
    expect(wrapper.find('[data-testid="public-list-empty"]').text()).toBe('Data tidak ditemukan!')
    expect(wrapper.find('[data-testid="pagination"]').exists()).toBe(false)
  })

  it('paginates client-side results and walks every API page when filtering', async () => {
    const many = Array.from({ length: 12 }, (_, i) => makeWisata({ id: `m-${i}`, nama: `Pantai ${i}`, hargaTiket: 0 }))
    api.listWisata
      .mockResolvedValueOnce(resp(many.slice(0, 10), { page: 1, limit: 10, total: 12, totalPages: 2 }))
      .mockResolvedValueOnce(resp(many.slice(0, 50), { page: 1, limit: 50, total: 60, totalPages: 2 }))
      .mockResolvedValueOnce(resp([makeWisata({ id: 'p2', nama: 'Pantai Halaman Dua', hargaTiket: 0 })], { page: 2, limit: 50, total: 60, totalPages: 2 }))
    const wrapper = mount(PublicWisataListView)
    await flushPromises()

    await wrapper.find('[data-testid="public-list-search"]').setValue('pantai')
    await flushPromises()
    expect(api.listWisata).toHaveBeenCalledTimes(3)
    expect(wrapper.findAll('[data-testid$="-nama"]')).toHaveLength(10)
    expect(wrapper.findAll('[data-testid^="pagination-page-"]')).toHaveLength(2)

    await wrapper.find('[data-testid="pagination-page-2"]').trigger('click')
    expect(wrapper.findAll('[data-testid$="-nama"]').map((c) => c.text())).toEqual(['Pantai 10', 'Pantai 11', 'Pantai Halaman Dua'])
    expect(api.listWisata).toHaveBeenCalledTimes(3) // halaman klien tidak memanggil API lagi
  })

  it('fills Kecamatan from the regency districts and Kelurahan from the chosen district, then filters by name', async () => {
    const wrapper = mount(PublicWisataListView)
    await flushPromises()

    expect(location.listDistricts).toHaveBeenCalledWith('18.13')
    expect(wrapper.findAll('[data-testid="public-list-kecamatan"] option').map((o) => o.text())).toEqual(['-- Pilih Kecamatan --', 'Pesisir Tengah', 'Pesisir Selatan'])
    expect((wrapper.find('[data-testid="public-list-kelurahan"]').element as HTMLSelectElement).disabled).toBe(true)

    api.listWisata.mockClear()
    await wrapper.find('[data-testid="public-list-kecamatan"]').setValue('Pesisir Tengah')
    await flushPromises()
    expect(location.listVillages).toHaveBeenCalledWith('18.13.01')
    expect(api.listWisata).toHaveBeenLastCalledWith(expect.objectContaining({ kecamatan: 'Pesisir Tengah', page: 1 }), expect.any(AbortSignal))
    expect(wrapper.findAll('[data-testid="public-list-kelurahan"] option').map((o) => o.text())).toEqual(['-- Pilih Kelurahan --', 'Pasar Krui'])

    await wrapper.find('[data-testid="public-list-kelurahan"]').setValue('Pasar Krui')
    await flushPromises()
    expect(api.listWisata).toHaveBeenLastCalledWith(expect.objectContaining({ kecamatan: 'Pesisir Tengah', kelurahan: 'Pasar Krui' }), expect.any(AbortSignal))
  })
})

describe('PublicWisataListView loading race', () => {
  it('keeps showing the loading state when an earlier request is aborted by a newer filter', async () => {
    routeMocks.query = {}
    location.listDistricts.mockResolvedValue({ data: [{ id: '18.13.01', name: 'Pesisir Tengah' }], meta })
    location.listVillages.mockResolvedValue({ data: [], meta })
    let resolveSecond!: (value: ReturnType<typeof resp>) => void
    api.listWisata.mockReset()
    api.listWisata
      .mockImplementationOnce((_params, signal) => new Promise((_resolve, reject) => signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')))))
      .mockImplementationOnce(() => new Promise((resolve) => (resolveSecond = resolve)))
    const wrapper = mount(PublicWisataListView)
    await flushPromises()
    expect(wrapper.find('[data-testid="public-list-loading"]').exists()).toBe(true)

    await wrapper.find('[data-testid="public-list-kecamatan"]').setValue('Pesisir Tengah')
    await flushPromises()
    expect(wrapper.find('[data-testid="public-list-loading"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="public-list-empty"]').exists()).toBe(false)

    resolveSecond(resp([makeWisata({ id: 'id-9', nama: 'Repong Damar', kecamatan: 'Pesisir Tengah' })]))
    await flushPromises()
    expect(wrapper.find('[data-testid="public-list-loading"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('Repong Damar')
  })
})
