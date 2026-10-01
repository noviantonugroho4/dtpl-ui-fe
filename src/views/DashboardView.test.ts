import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import DashboardView from './DashboardView.vue'

describe('DashboardView', () => {
  it('renders the title card and both charts with their data tables', () => {
    const wrapper = mount(DashboardView)

    expect(wrapper.find('h2').text()).toBe('Dashboard')
    expect(wrapper.text()).toContain('Take a quick look at the overview')

    const captions = wrapper.findAll('table caption').map((c) => c.text())
    expect(captions).toEqual(['Jumlah Pemesanan Tiket Destinasi Wisata', 'Destinasi Wisata dengan Rating tertinggi'])

    const rows = wrapper.findAll('table tr').map((r) => r.findAll('th, td').map((c) => c.text()).join(' '))
    expect(rows).toContain('Jan 20')
    expect(rows).toContain('Mar 60')
    expect(rows).toContain('Snorkling Kep. Seribu 81')
    expect(rows).toContain('Snorkling Pahawang 10')
  })

  it('shows a tooltip when a bar receives focus', async () => {
    const wrapper = mount(DashboardView)
    const hit = wrapper.find('rect[aria-label="Pantai Mandiri: 78"]')
    expect(hit.exists()).toBe(true)

    await hit.trigger('focus')
    expect(wrapper.find('[role="status"]').text()).toContain('78')

    await hit.trigger('blur')
    expect(wrapper.find('[role="status"]').exists()).toBe(false)
  })
})
