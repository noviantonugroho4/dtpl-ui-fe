import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { ref } from 'vue'
import * as authApi from '@/api/auth'
import AdminLayout from './AdminLayout.vue'
import { makeUser } from '@/test/helpers'

const routerMocks = vi.hoisted(() => ({ replace: vi.fn().mockResolvedValue(undefined) }))

vi.mock('vue-router', async () => {
  const { defineComponent, h } = await import('vue')
  return {
    useRouter: () => ({ replace: routerMocks.replace }),
    useRoute: () => ref({ fullPath: '/dashboard', meta: { title: 'Dashboard' } }).value,
    RouterLink: defineComponent({ props: { to: null }, setup: (_, { slots }) => () => h('a', slots.default?.()) }),
    RouterView: defineComponent({ setup: () => () => h('div', 'page') }),
  }
})

vi.mock('@/api/auth', () => ({
  USE_MOCK_API: false,
  login: vi.fn(),
  logout: vi.fn(),
  me: vi.fn(),
  health: vi.fn(),
}))

const api = vi.mocked(authApi)

describe('AdminLayout', () => {
  beforeEach(() => {
    localStorage.setItem('dtpl.auth.token', 'jwt-1')
    localStorage.setItem('dtpl.auth.user', JSON.stringify(makeUser({ username: 'novi' })))
    setActivePinia(createPinia())
    routerMocks.replace.mockClear()
  })

  it('shows the app name, site title, and the sidebar menu', () => {
    const wrapper = mount(AdminLayout)
    expect(wrapper.text()).toContain('WiDeWi CMS')
    expect(wrapper.find('h1').text()).toBe('Website Destinasi Wisata')
    const labels = wrapper.findAll('[data-testid^="nav-"]').map((a) => a.text())
    expect(labels).toEqual([
      'Dashboard',
      'Daftar Destinasi Wisata',
      'Daftar Pembelian Tiket',
      'Daftar Penilaian Wisata',
    ])
  })

  it('signs out and navigates to the login page', async () => {
    api.logout.mockResolvedValue({ data: { logout: true } })
    const wrapper = mount(AdminLayout)

    const logoutButton = wrapper.find('[data-testid="layout-logout"]')
    expect(logoutButton.text()).toContain('Keluar')
    await logoutButton.trigger('click')
    await flushPromises()

    expect(api.logout).toHaveBeenCalledWith('jwt-1')
    expect(localStorage.getItem('dtpl.auth.token')).toBeNull()
    expect(routerMocks.replace).toHaveBeenCalledWith({ name: 'login' })
  })

  it('opens and closes the mobile sidebar', async () => {
    const wrapper = mount(AdminLayout)
    const aside = () => wrapper.find('aside')
    expect(aside().classes()).toContain('-translate-x-full')

    await wrapper.find('[data-testid="layout-menu-toggle"]').trigger('click')
    expect(aside().classes()).toContain('translate-x-0')

    await wrapper.find('[data-testid="layout-sidebar-close"]').trigger('click')
    expect(aside().classes()).toContain('-translate-x-full')
  })
})
