import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { ApiError } from '@/api/client'
import * as landingApi from '@/api/landing'
import type { LandingWisata } from '@/api/landing'
import LandingView from './LandingView.vue'

vi.mock('vue-router', async () => {
  const { defineComponent, h } = await import('vue')
  return {
    RouterLink: defineComponent({
      props: { to: null },
      setup: (props, { slots, attrs }) => () => h('a', { ...attrs, 'data-to': JSON.stringify(props.to) }, slots.default?.()),
    }),
  }
})

vi.mock('@/api/landing', async () => {
  const actual = await vi.importActual<typeof import('@/api/landing')>('@/api/landing')
  return { ...actual, getNewestWisata: vi.fn() }
})

const api = vi.mocked(landingApi)

function card(id: string, nama: string): LandingWisata {
  return { id, nama, jenis: 'wisata_alam', kecamatan: 'Sumur', kelurahan: 'Cigorondong', hargaTiket: 0, imageUrl: null }
}

describe('LandingView', () => {
  beforeEach(() => {
    api.getNewestWisata.mockReset()
  })

  it('renders hero, categories, and fills both carousels from the newest API items with one call', async () => {
    api.getNewestWisata.mockResolvedValue([card('n1', 'Pantai Baru')])
    const wrapper = mount(LandingView)
    await flushPromises()

    expect(api.getNewestWisata).toHaveBeenCalledTimes(1)
    expect(wrapper.find('[data-testid="landing-hero-title"]').text()).toContain('Wisata Impian')
    expect(wrapper.findAll('[data-testid^="landing-category-"]')).toHaveLength(4)
    expect(wrapper.find('[data-testid="landing-category-wisata_bahari"]').attributes('data-to')).toContain('"jenis":"wisata_bahari"')

    const featured = wrapper.find('[data-testid="landing-featured"]')
    expect(featured.text()).toContain('Destinasi Unggulan')
    expect(featured.find('[data-testid="landing-featured-card-n1"]').attributes('data-to')).toContain('"id":"n1"')

    const newest = wrapper.find('[data-testid="landing-newest"]')
    expect(newest.text()).toContain('Pantai Baru')
    expect(newest.find('[data-testid="landing-newest-card-n1"]').attributes('data-to')).toContain('"id":"n1"')
  })

  it('shows the error inside both sections when the API fails, leaving hero and categories intact', async () => {
    api.getNewestWisata.mockRejectedValue(new ApiError(0, 'NETWORK_ERROR', 'offline'))
    const wrapper = mount(LandingView)
    await flushPromises()
    expect(wrapper.find('[data-testid="landing-newest-error"]').text()).toContain('Tidak dapat terhubung ke server')
    expect(wrapper.find('[data-testid="landing-featured-error"]').exists()).toBe(true)
    expect(wrapper.findAll('[data-testid^="landing-category-"]')).toHaveLength(4)
  })

  it('pages the carousel with the arrow buttons', async () => {
    api.getNewestWisata.mockResolvedValue([1, 2, 3, 4, 5].map((n) => card(`m${n}`, `Mock ${n}`)))
    const wrapper = mount(LandingView)
    await flushPromises()

    const featured = () => wrapper.find('[data-testid="landing-featured"]')
    expect(featured().findAll('[data-testid^="landing-featured-card-"]').map((c) => c.text())).toContain('Mock 1')
    expect(featured().find('[data-testid="landing-featured-prev"]').attributes('disabled')).toBeDefined()

    await featured().find('[data-testid="landing-featured-next"]').trigger('click')
    const names = featured().findAll('[data-testid$="-nama"]').map((c) => c.text())
    expect(names).toEqual(['Mock 3', 'Mock 4', 'Mock 5'])
    expect(featured().find('[data-testid="landing-featured-next"]').attributes('disabled')).toBeDefined()
  })
})
