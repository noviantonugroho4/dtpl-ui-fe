import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { ApiError } from '@/api/client'
import * as authApi from '@/api/auth'
import LoginView from './LoginView.vue'
import { makeUser } from '@/test/helpers'

const routerMocks = vi.hoisted(() => ({
  replace: vi.fn().mockResolvedValue(undefined),
  query: {} as Record<string, string>,
}))

vi.mock('vue-router', () => ({
  useRouter: () => ({ replace: routerMocks.replace }),
  useRoute: () => ({ query: routerMocks.query }),
}))

vi.mock('@/api/auth', () => ({
  USE_MOCK_API: false,
  login: vi.fn(),
  logout: vi.fn(),
  me: vi.fn(),
  health: vi.fn(),
}))

const api = vi.mocked(authApi)

async function fillAndSubmit(wrapper: ReturnType<typeof mount>, username: string, password: string) {
  await wrapper.find('#username').setValue(username)
  await wrapper.find('#password').setValue(password)
  await wrapper.find('form').trigger('submit')
  await flushPromises()
}

describe('LoginView', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    routerMocks.query = {}
    routerMocks.replace.mockClear()
  })

  it('shows a validation message and does not call the API when fields are empty', async () => {
    const wrapper = mount(LoginView)
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(wrapper.find('[role="alert"]').text()).toBe('Username and password are required.')
    expect(api.login).not.toHaveBeenCalled()
  })

  it('submits trimmed credentials and redirects home on success', async () => {
    api.login.mockResolvedValue({ data: { token: 'jwt', user: makeUser() } })
    const wrapper = mount(LoginView)

    await fillAndSubmit(wrapper, '  admin ', 'secret')

    expect(api.login).toHaveBeenCalledWith({ username: 'admin', password: 'secret' })
    expect(routerMocks.replace).toHaveBeenCalledWith('/')
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
  })

  it('honours a safe redirect query and ignores external ones', async () => {
    api.login.mockResolvedValue({ data: { token: 'jwt', user: makeUser() } })

    routerMocks.query = { redirect: '/settings' }
    await fillAndSubmit(mount(LoginView), 'admin', 'pw')
    expect(routerMocks.replace).toHaveBeenLastCalledWith('/settings')

    routerMocks.query = { redirect: '//evil.example' }
    await fillAndSubmit(mount(LoginView), 'admin', 'pw')
    expect(routerMocks.replace).toHaveBeenLastCalledWith('/')
  })

  it('shows a translated message for a known API error code', async () => {
    api.login.mockRejectedValue(new ApiError(401, 'INVALID_CREDENTIALS', 'Invalid username or password'))
    const wrapper = mount(LoginView)

    await fillAndSubmit(wrapper, 'admin', 'wrong')

    expect(wrapper.find('[role="alert"]').text()).toBe('Invalid username or password.')
    expect(routerMocks.replace).not.toHaveBeenCalled()
  })

  it('falls back to the server message for an unknown error code', async () => {
    api.login.mockRejectedValue(new ApiError(503, 'MAINTENANCE', 'Down for maintenance'))
    const wrapper = mount(LoginView)

    await fillAndSubmit(wrapper, 'admin', 'pw')

    expect(wrapper.find('[role="alert"]').text()).toBe('Down for maintenance')
  })

  it('disables the submit button while the request is pending', async () => {
    let resolveLogin!: (value: Awaited<ReturnType<typeof api.login>>) => void
    api.login.mockReturnValue(new Promise((resolve) => (resolveLogin = resolve)))
    const wrapper = mount(LoginView)

    await wrapper.find('#username').setValue('admin')
    await wrapper.find('#password').setValue('pw')
    await wrapper.find('form').trigger('submit')

    const button = wrapper.find('button[type="submit"]')
    expect(button.attributes('disabled')).toBeDefined()
    expect(button.text()).toBe('Signing in…')

    resolveLogin({ data: { token: 'jwt', user: makeUser() } })
    await flushPromises()
    expect(wrapper.find('button[type="submit"]').attributes('disabled')).toBeUndefined()
  })

  it('toggles password visibility', async () => {
    const wrapper = mount(LoginView)
    expect(wrapper.find('#password').attributes('type')).toBe('password')
    await wrapper.find('button[type="button"]').trigger('click')
    expect(wrapper.find('#password').attributes('type')).toBe('text')
  })

  it('does not show the mock notice when mock mode is off', () => {
    const wrapper = mount(LoginView)
    expect(wrapper.text()).not.toContain('Mock mode is on')
  })
})
