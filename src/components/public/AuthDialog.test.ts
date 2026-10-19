import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { ApiError } from '@/api/client'
import * as authApi from '@/api/auth'
import * as registerApi from '@/api/register'
import { useAuthStore } from '@/stores/auth'
import { useAuthDialogStore } from '@/stores/authDialog'
import AuthDialog from './AuthDialog.vue'
import { makeUser } from '@/test/helpers'

vi.mock('@/api/auth', () => ({ USE_MOCK_API: false, login: vi.fn(), logout: vi.fn(), me: vi.fn(), health: vi.fn() }))
vi.mock('@/api/register', async () => {
  const actual = await vi.importActual<typeof import('@/api/register')>('@/api/register')
  return { ...actual, registerUser: vi.fn() }
})

const api = vi.mocked(authApi)
const reg = vi.mocked(registerApi)

async function fillRegister(wrapper: ReturnType<typeof mount>) {
  await wrapper.find('[data-testid="auth-register-nama-depan"]').setValue('Lidya')
  await wrapper.find('[data-testid="auth-register-nama-belakang"]').setValue('Silitonga')
  await wrapper.find('[data-testid="auth-register-tempat-lahir"]').setValue('Medan')
  await wrapper.find('[data-testid="auth-register-tanggal-lahir"]').setValue('17-08-1999')
  await wrapper.find('[data-testid="auth-register-alamat"]').setValue('Jl. Mawar 1')
  await wrapper.find('[data-testid="auth-register-telepon"]').setValue('0812 3456 789')
  await wrapper.find('[data-testid="auth-register-username"]').setValue('lidya.s')
  await wrapper.find('[data-testid="auth-register-password"]').setValue('rahasia123')
}

describe('AuthDialog', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    api.login.mockReset()
    reg.registerUser.mockReset()
  })

  it('stays hidden until the store opens it, and closes on the close button', async () => {
    const wrapper = mount(AuthDialog)
    expect(wrapper.find('[data-testid="auth-dialog"]').exists()).toBe(false)

    useAuthDialogStore().open('login')
    await flushPromises()
    expect(wrapper.find('[data-testid="auth-dialog-login"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="auth-dialog-subtitle"]').text()).toBe('Silahkan login untuk masuk ke dalam website')

    await wrapper.find('[data-testid="auth-dialog-close"]').trigger('click')
    expect(wrapper.find('[data-testid="auth-dialog"]').exists()).toBe(false)
  })

  it('shows the design error banner for wrong credentials and keeps the dialog open', async () => {
    api.login.mockRejectedValue(new ApiError(401, 'INVALID_CREDENTIALS', 'Invalid username or password'))
    const wrapper = mount(AuthDialog)
    useAuthDialogStore().open('login')
    await flushPromises()

    await wrapper.find('[data-testid="auth-login-username"]').setValue('lidya')
    await wrapper.find('[data-testid="auth-login-password"]').setValue('salah')
    await wrapper.find('[data-testid="auth-login-form"]').trigger('submit')
    await flushPromises()

    expect(wrapper.find('[data-testid="auth-login-error"]').text()).toBe('Nama pengguna dan kata sandi yang anda masukkan salah')
    expect(wrapper.find('[data-testid="auth-dialog"]').exists()).toBe(true)
  })

  it('signs in through the shared auth store and closes on success', async () => {
    api.login.mockResolvedValue({ data: { token: 'jwt', user: makeUser({ username: 'lidya' }) } })
    const wrapper = mount(AuthDialog)
    useAuthDialogStore().open('login')
    await flushPromises()

    await wrapper.find('[data-testid="auth-login-username"]').setValue(' lidya ')
    await wrapper.find('[data-testid="auth-login-password"]').setValue('benar')
    await wrapper.find('[data-testid="auth-login-form"]').trigger('submit')
    await flushPromises()

    expect(api.login).toHaveBeenCalledWith({ username: 'lidya', password: 'benar' })
    expect(useAuthStore().user?.username).toBe('lidya')
    expect(wrapper.find('[data-testid="auth-dialog"]').exists()).toBe(false)
  })

  it('switches to register, validates every field, then mock-registers and returns to login', async () => {
    reg.registerUser.mockResolvedValue({ data: { username: 'lidya.s' } })
    const wrapper = mount(AuthDialog)
    useAuthDialogStore().open('login')
    await flushPromises()

    await wrapper.find('[data-testid="auth-switch-register"]').trigger('click')
    await flushPromises()
    expect(wrapper.find('[data-testid="auth-dialog-register"]').exists()).toBe(true)

    await wrapper.find('[data-testid="auth-register-form"]').trigger('submit')
    await flushPromises()
    expect(wrapper.findAll('[data-testid$="-error"]').length).toBeGreaterThanOrEqual(8)
    expect(reg.registerUser).not.toHaveBeenCalled()

    await fillRegister(wrapper)
    await wrapper.find('[data-testid="auth-register-tanggal-lahir"]').setValue('31-02-1999')
    await wrapper.find('[data-testid="auth-register-form"]').trigger('submit')
    await flushPromises()
    expect(wrapper.find('[data-testid="auth-register-tanggal-lahir-error"]').text()).toContain('DD-MM-YYYY')

    await wrapper.find('[data-testid="auth-register-tanggal-lahir"]').setValue('17-08-1999')
    await wrapper.find('[data-testid="auth-register-form"]').trigger('submit')
    await flushPromises()

    expect(reg.registerUser).toHaveBeenCalledWith({
      namaDepan: 'Lidya',
      namaBelakang: 'Silitonga',
      tempatLahir: 'Medan',
      tanggalLahir: '1999-08-17',
      alamat: 'Jl. Mawar 1',
      nomorTelepon: '+628123456789',
      username: 'lidya.s',
      password: 'rahasia123',
    })
    expect(wrapper.find('[data-testid="auth-dialog-login"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="auth-login-notice"]').text()).toContain('Registrasi berhasil')
    expect((wrapper.find('[data-testid="auth-login-username"]').element as HTMLInputElement).value).toBe('lidya.s')
  })
})
