import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { ApiError } from '@/api/client'
import { useFlashStore } from '@/stores/flash'
import * as wisataApi from '@/api/wisata'
import type { Wisata } from '@/api/types'
import DestinasiWisataView from './DestinasiWisataView.vue'

vi.mock('vue-router', async () => {
  const { defineComponent, h } = await import('vue')
  return {
    RouterLink: defineComponent({
      props: { to: null },
      setup: (props, { slots, attrs }) => () => h('a', { ...attrs, 'data-to': JSON.stringify(props.to) }, slots.default?.()),
    }),
  }
})

vi.mock('@/api/wisata', async () => {
  const actual = await vi.importActual<typeof import('@/api/wisata')>('@/api/wisata')
  return { ...actual, listWisata: vi.fn() }
})

const api = vi.mocked(wisataApi)

function makeWisata(overrides: Partial<Wisata> = {}): Wisata {
  return {
    id: 'id-1',
    nama: 'Snorkling Kep. Seribu',
    jenis: 'wisata_bahari',
    kontakTelp: '+628123456789',
    provinsi: 'DKI Jakarta',
    kecamatan: 'Kepulauan Seribu',
    kelurahan: 'Pulau Harapan',
    alamat: 'Jl. Dermaga',
    mapsLink: 'https://maps.app.goo.gl/x',
    hargaTiket: 25000,
    createdBy: 1,
    createdAt: '2026-09-24T03:00:00Z',
    updatedAt: '2026-09-24T03:00:00Z',
    images: [],
    fasilitas: [],
    services: [],
    ...overrides,
  }
}

const listResponse = (data: Wisata[], meta = { page: 1, limit: 10, total: data.length, totalPages: 1 }) => ({ data, meta })

describe('DestinasiWisataView', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    api.listWisata.mockReset()
  })

  it('shows the success notice left by the create page once', async () => {
    api.listWisata.mockResolvedValue(listResponse([]))
    useFlashStore().show('Destinasi wisata berhasil ditambahkan.')
    const wrapper = mount(DestinasiWisataView)
    await flushPromises()
    expect(wrapper.find('[role="status"]').text()).toContain('berhasil ditambahkan')
    expect(useFlashStore().message).toBeNull()
  })

  it('renders rows with type tags, kecamatan and a dd-mm-yyyy date', async () => {
    api.listWisata.mockResolvedValue(
      listResponse([makeWisata(), makeWisata({ id: 'id-2', nama: 'Gua Matu', jenis: 'wisata_budaya_dan_sejarah', kecamatan: 'Senen' })]),
    )
    const wrapper = mount(DestinasiWisataView)
    await flushPromises()

    const cells = wrapper.findAll('tbody tr').map((tr) => tr.findAll('td').slice(0, 4).map((td) => td.text()))
    expect(cells).toEqual([
      ['Snorkling Kep. Seribu', 'Wisata Bahari', 'Kepulauan Seribu', '24-09-2026'],
      ['Gua Matu', 'Wisata Budaya dan Sejarah', 'Senen', '24-09-2026'],
    ])
    expect(wrapper.find('[data-testid="wisata-row-id-2-view"]').attributes('data-to')).toContain('"id":"id-2"')
    expect(wrapper.find('[data-testid="wisata-row-id-2-jenis"] [data-testid="wisata-type-tag"]').attributes('data-jenis')).toBe('wisata_budaya_dan_sejarah')
  })

  it('fills the kecamatan dropdown from the data and refetches with the filter', async () => {
    api.listWisata.mockResolvedValue(listResponse([makeWisata(), makeWisata({ id: 'id-2', kecamatan: 'Senen' })]))
    const wrapper = mount(DestinasiWisataView)
    await flushPromises()

    const options = wrapper.findAll('#filter-kecamatan option').map((o) => o.text())
    expect(options).toEqual(['-- Pilih Kecamatan --', 'Kepulauan Seribu', 'Senen'])

    api.listWisata.mockClear()
    await wrapper.find('#filter-kecamatan').setValue('Senen')
    await flushPromises()
    expect(api.listWisata).toHaveBeenCalledWith({ page: 1, limit: 10, kecamatan: 'Senen' }, expect.any(AbortSignal))
  })

  it('filters the loaded rows by name when searching', async () => {
    api.listWisata.mockResolvedValue(listResponse([makeWisata(), makeWisata({ id: 'id-2', nama: 'Gua Matu' })]))
    const wrapper = mount(DestinasiWisataView)
    await flushPromises()

    await wrapper.find('#filter-search').setValue('gua')
    expect(wrapper.findAll('tbody tr')).toHaveLength(1)
    expect(wrapper.find('tbody').text()).toContain('Gua Matu')

    await wrapper.find('#filter-search').setValue('zzz')
    expect(wrapper.find('tbody').text()).toContain('Data tidak ditemukan!')
  })

  it('requests the next page from the pagination control', async () => {
    api.listWisata.mockResolvedValue(listResponse([makeWisata()], { page: 1, limit: 10, total: 25, totalPages: 3 }))
    const wrapper = mount(DestinasiWisataView)
    await flushPromises()

    api.listWisata.mockClear()
    await wrapper.find('[data-testid="pagination-page-2"]').trigger('click')
    await flushPromises()
    expect(api.listWisata).toHaveBeenCalledWith({ page: 2, limit: 10, kecamatan: undefined }, expect.any(AbortSignal))
  })

  it('shows a translated error with a retry button when the request fails', async () => {
    api.listWisata.mockRejectedValueOnce(new ApiError(0, 'NETWORK_ERROR', 'offline'))
    api.listWisata.mockRejectedValueOnce(new ApiError(0, 'NETWORK_ERROR', 'offline'))
    api.listWisata.mockResolvedValue(listResponse([makeWisata()]))
    const wrapper = mount(DestinasiWisataView)
    await flushPromises()

    expect(wrapper.find('[role="alert"]').text()).toContain('Tidak dapat terhubung ke server')
    await wrapper.find('[role="alert"] button').trigger('click')
    await flushPromises()
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
    expect(wrapper.find('tbody').text()).toContain('Snorkling Kep. Seribu')
  })

  it('shows an empty state when the API returns no rows', async () => {
    api.listWisata.mockResolvedValue(listResponse([], { page: 1, limit: 10, total: 0, totalPages: 0 }))
    const wrapper = mount(DestinasiWisataView)
    await flushPromises()
    expect(wrapper.find('tbody').text()).toContain('Belum ada data yang ditambahkan.')
    expect(wrapper.find('nav[aria-label="Navigasi halaman"]').exists()).toBe(false)
  })
})
