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
  return { ...actual, getLandingSections: vi.fn() }
})

const api = vi.mocked(landingApi)

function card(id: string, nama: string): LandingWisata {
  return { id, nama, jenis: 'wisata_alam', kecamatan: 'Sumur', kelurahan: 'Cigorondong', hargaTiket: 0, imageUrl: null }
}

describe('LandingView', () => {
  beforeEach(() => {
    api.getLandingSections.mockReset()
  })

  it('renders hero, categories, and fills each carousel from its own section with one call', async () => {
    api.getLandingSections.mockResolvedValue({ newest: [card('n1', 'Pantai Baru')], featured: [card('f1', 'Pantai Unggulan')] })
    const wrapper = mount(LandingView)
    await flushPromises()

    expect(api.getLandingSections).toHaveBeenCalledTimes(1)
    expect(wrapper.find('[data-testid="landing-hero-title"]').text()).toContain('Wisata Impian')
    expect(wrapper.findAll('[data-testid^="landing-category-"]')).toHaveLength(4)
    expect(wrapper.find('[data-testid="landing-category-wisata_bahari"]').attributes('data-to')).toContain('"jenis":"wisata_bahari"')

    const featured = wrapper.find('[data-testid="landing-featured"]')
    expect(featured.text()).toContain('Destinasi Unggulan')
    expect(featured.find('[data-testid="landing-featured-card-f1"]').attributes('data-to')).toContain('"id":"f1"')
    expect(featured.text()).not.toContain('Pantai Baru')

    const newest = wrapper.find('[data-testid="landing-newest"]')
    expect(newest.text()).toContain('Pantai Baru')
    expect(newest.text()).not.toContain('Pantai Unggulan')
    expect(newest.find('[data-testid="landing-newest-card-n1"]').attributes('data-to')).toContain('"id":"n1"')
  })

  it('shows the error inside both sections when the API fails, leaving hero and categories intact', async () => {
    api.getLandingSections.mockRejectedValue(new ApiError(0, 'NETWORK_ERROR', 'offline'))
    const wrapper = mount(LandingView)
    await flushPromises()
    expect(wrapper.find('[data-testid="landing-newest-error"]').text()).toContain('Tidak dapat terhubung ke server')
    expect(wrapper.find('[data-testid="landing-featured-error"]').exists()).toBe(true)
    expect(wrapper.findAll('[data-testid^="landing-category-"]')).toHaveLength(4)
  })

  it('pages the carousel with the arrow buttons', async () => {
    const items = [1, 2, 3, 4, 5].map((n) => card(`m${n}`, `Mock ${n}`))
    api.getLandingSections.mockResolvedValue({ newest: items, featured: items })
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
