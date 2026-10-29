import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import * as authApi from '@/api/auth'
import { ApiError } from '@/api/client'
import * as googleApi from '@/api/googleAuth'
import { useAuthDialogStore } from '@/stores/authDialog'
import PublicHeader from './PublicHeader.vue'
import { makeUser } from '@/test/helpers'

const routerMocks = vi.hoisted(() => ({ replace: vi.fn().mockResolvedValue(undefined), meta: {} as Record<string, unknown> }))

vi.mock('vue-router', async () => {
  const { defineComponent, h } = await import('vue')
  return {
    useRouter: () => ({ replace: routerMocks.replace, currentRoute: { value: { meta: routerMocks.meta } } }),
    RouterLink: defineComponent({
      props: { to: null },
      setup: (props, { slots, attrs }) => () => h('a', { ...attrs, 'data-to': JSON.stringify(props.to) }, slots.default?.()),
    }),
  }
})

vi.mock('@/api/auth', () => ({ USE_MOCK_API: false, login: vi.fn(), logout: vi.fn(), me: vi.fn(), health: vi.fn() }))
vi.mock('@/api/googleAuth', async () => {
  const actual = await vi.importActual<typeof import('@/api/googleAuth')>('@/api/googleAuth')
  return { ...actual, logoutTraveler: vi.fn().mockResolvedValue({}), getTravelerMe: vi.fn() }
})
const api = vi.mocked(authApi)
const google = vi.mocked(googleApi)

function seed(role: 'admin' | 'user' = 'user') {
  localStorage.setItem('dtpl.auth.token', 'jwt-1')
  localStorage.setItem('dtpl.auth.user', JSON.stringify(makeUser({ username: 'lidya', role })))
}

describe('PublicHeader', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
    api.logout.mockReset().mockResolvedValue({ data: { logout: true } })
  })

  it('shows Masuk when signed out and opens the login dialog', async () => {
    setActivePinia(createPinia())
    const wrapper = mount(PublicHeader)
    expect(wrapper.find('[data-testid="public-header-user"]').exists()).toBe(false)
    await wrapper.find('[data-testid="public-header-login"]').trigger('click')
    expect(useAuthDialogStore().mode).toBe('login')
  })

  it('replaces Masuk with the username and offers Keluar in a menu', async () => {
    seed('user')
    setActivePinia(createPinia())
    const wrapper = mount(PublicHeader)

    expect(wrapper.find('[data-testid="public-header-login"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="public-header-user"]').text()).toBe('lidya')
    expect(wrapper.find('[data-testid="public-header-menu"]').exists()).toBe(false)

    await wrapper.find('[data-testid="public-header-user"]').trigger('click')
    expect(wrapper.find('[data-testid="public-header-portal"]').exists()).toBe(false)

    await wrapper.find('[data-testid="public-header-logout"]').trigger('click')
    await flushPromises()
    expect(api.logout).toHaveBeenCalledWith('jwt-1')
    expect(wrapper.find('[data-testid="public-header-login"]').exists()).toBe(true)
  })

  it('adds a Portal Admin entry for admins', async () => {
    seed('admin')
    setActivePinia(createPinia())
    const wrapper = mount(PublicHeader)
    await wrapper.find('[data-testid="public-header-user"]').trigger('click')
    expect(wrapper.find('[data-testid="public-header-portal"]').attributes('data-to')).toContain('dashboard')
  })

  it('shows a Google traveller by username without Portal Admin, and logs the Bearer session out', async () => {
    localStorage.setItem('dtpl.traveler.token', 'traveler-jwt')
    localStorage.setItem('dtpl.traveler.user', JSON.stringify({ id: 7, nama: 'Wisata Wan' }))
    // Bentuk respons /api/auth/me untuk akun Google: tanpa username, nama ada di profile.
    google.getTravelerMe.mockResolvedValue({
      data: {
        user: {
          id: 7,
          role: 'user',
          profileComplete: true,
          profile: { namaDepan: 'Andi', namaBelakang: 'Pratama', tempatLahir: 'x', tanggalLahir: '1998-08-17', alamat: null, nomorTelepon: '+620000000000' },
        },
      },
    })
    setActivePinia(createPinia())
    const wrapper = mount(PublicHeader)
    await flushPromises()
    expect(google.getTravelerMe).toHaveBeenCalledWith('traveler-jwt')

    // Nama dari server menggantikan nama tersimpan.
    expect(wrapper.find('[data-testid="public-header-user"]').text()).toBe('Andi Pratama')
    expect(localStorage.getItem('dtpl.traveler.user')).toBe(JSON.stringify({ id: 7, nama: 'Andi Pratama' }))
    await wrapper.find('[data-testid="public-header-user"]').trigger('click')
    expect(wrapper.find('[data-testid="public-header-portal"]').exists()).toBe(false)

    await wrapper.find('[data-testid="public-header-logout"]').trigger('click')
    await flushPromises()
    expect(google.logoutTraveler).toHaveBeenCalledWith('traveler-jwt')
    expect(api.logout).not.toHaveBeenCalled()
    expect(localStorage.getItem('dtpl.traveler.user')).toBeNull()
    expect(localStorage.getItem('dtpl.traveler.token')).toBeNull()
    expect(wrapper.find('[data-testid="public-header-login"]').exists()).toBe(true)
  })

  it('drops a stored traveller session that the server rejects', async () => {
    localStorage.setItem('dtpl.traveler.token', 'expired-jwt')
    localStorage.setItem('dtpl.traveler.user', JSON.stringify({ id: 7, nama: 'Wisata Wan' }))
    google.getTravelerMe.mockRejectedValue(new ApiError(401, 'UNAUTHENTICATED', 'x'))
    setActivePinia(createPinia())
    const wrapper = mount(PublicHeader)
    await flushPromises()
    expect(wrapper.find('[data-testid="public-header-login"]').exists()).toBe(true)
    expect(localStorage.getItem('dtpl.traveler.token')).toBeNull()
  })
})
