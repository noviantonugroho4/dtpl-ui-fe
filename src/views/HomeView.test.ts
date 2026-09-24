import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { ApiError } from '@/api/client'
import * as authApi from '@/api/auth'
import HomeView from './HomeView.vue'
import { makeUser } from '@/test/helpers'

const routerMocks = vi.hoisted(() => ({ replace: vi.fn().mockResolvedValue(undefined) }))

vi.mock('vue-router', () => ({
  useRouter: () => ({ replace: routerMocks.replace }),
}))

vi.mock('@/api/auth', () => ({
  USE_MOCK_API: false,
  login: vi.fn(),
  logout: vi.fn(),
  me: vi.fn(),
  health: vi.fn(),
}))

const api = vi.mocked(authApi)

function seedSession(user = makeUser()) {
  localStorage.setItem('dtpl.auth.token', 'jwt-1')
  localStorage.setItem('dtpl.auth.user', JSON.stringify(user))
}

describe('HomeView', () => {
  beforeEach(() => {
    routerMocks.replace.mockClear()
  })

  it('greets the user and renders the profile card', () => {
    seedSession(makeUser({ username: 'novi' }))
    setActivePinia(createPinia())
    const wrapper = mount(HomeView)

    expect(wrapper.text()).toContain('Welcome back, novi')
    expect(wrapper.text()).toContain('Your profile')
    expect(wrapper.text()).toContain('admin@example.com')
  })

  it('refresh fetches the latest profile from the API', async () => {
    seedSession()
    setActivePinia(createPinia())
    api.me.mockResolvedValue({ data: { user: makeUser({ email: 'updated@example.com' }) } })
    const wrapper = mount(HomeView)

    await wrapper.find('button').trigger('click')
    await flushPromises()

    expect(api.me).toHaveBeenCalledWith('jwt-1')
    expect(wrapper.text()).toContain('updated@example.com')
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
  })

  it('redirects to login when the session is no longer valid', async () => {
    seedSession()
    setActivePinia(createPinia())
    api.me.mockRejectedValue(new ApiError(401, 'UNAUTHENTICATED', 'expired'))
    const wrapper = mount(HomeView)

    await wrapper.find('button').trigger('click')
    await flushPromises()

    expect(routerMocks.replace).toHaveBeenCalledWith({ name: 'login' })
  })

  it('shows an error message when the refresh fails for another reason', async () => {
    seedSession()
    setActivePinia(createPinia())
    api.me.mockRejectedValue(new ApiError(0, 'NETWORK_ERROR', 'offline'))
    const wrapper = mount(HomeView)

    await wrapper.find('button').trigger('click')
    await flushPromises()

    expect(wrapper.find('[role="alert"]').text()).toContain('Unable to reach the server')
    expect(routerMocks.replace).not.toHaveBeenCalled()
  })
})
