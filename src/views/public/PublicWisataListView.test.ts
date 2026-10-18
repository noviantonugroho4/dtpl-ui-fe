import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import * as wisataApi from '@/api/wisata'
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

vi.mock('@/api/wisata', async () => {
  const actual = await vi.importActual<typeof import('@/api/wisata')>('@/api/wisata')
  return { ...actual, listWisata: vi.fn() }
})

const api = vi.mocked(wisataApi)

function makeWisata(overrides: Partial<Wisata> = {}): Wisata {
  return {
    id: 'id-1', nama: 'Snorkling Kep. Seribu', jenis: 'wisata_bahari', kontakTelp: '+628123456789',
    provinsi: 'DKI Jakarta', kecamatan: 'Kepulauan Seribu', kelurahan: 'Pulau Pari', alamat: 'Jl.', mapsLink: 'https://maps.app.goo.gl/x',
    hargaTiket: 200000, createdBy: 1, createdAt: '2026-09-24T03:00:00Z', updatedAt: '2026-09-24T03:00:00Z', images: [], fasilitas: [], services: [],
    ...overrides,
  }
}
const resp = (data: Wisata[]) => ({ data, meta: { page: 1, limit: 10, total: data.length, totalPages: 1 } })

describe('PublicWisataListView', () => {
  beforeEach(() => {
    routeMocks.query = {}
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

  it('filters by budget and search on the client and narrows jenis to one server-side', async () => {
    const wrapper = mount(PublicWisataListView)
    await flushPromises()
    expect(wrapper.findAll('[data-testid^="public-list-card-"][data-testid$="-nama"]')).toHaveLength(3)

    await wrapper.find('[data-testid="public-list-budget"]').setValue('gratis')
    expect(wrapper.findAll('[data-testid$="-nama"]').map((c) => c.text())).toEqual(['Pantai Pulau Tidung'])

    await wrapper.find('[data-testid="public-list-budget"]').setValue('')
    await wrapper.find('[data-testid="public-list-search"]').setValue('gua')
    expect(wrapper.findAll('[data-testid$="-nama"]').map((c) => c.text())).toEqual(['Gua Matu'])

    await wrapper.find('[data-testid="public-list-search"]').setValue('')
    api.listWisata.mockClear()
    for (const type of ['wisata_alam', 'wisata_rekreasi', 'wisata_budaya_dan_sejarah']) {
      await wrapper.find(`[data-testid="public-list-type-${type}"]`).setValue(false)
    }
    await flushPromises()
    expect(api.listWisata).toHaveBeenLastCalledWith(expect.objectContaining({ jenis: 'wisata_bahari' }), expect.any(AbortSignal))
  })
})
