import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { defineComponent, h } from 'vue'
import { ApiError } from '@/api/client'
import * as googleApi from '@/api/googleAuth'
import { useAuthDialogStore } from '@/stores/authDialog'
import { useTravelerStore } from '@/stores/traveler'
import AuthDialog from './AuthDialog.vue'

vi.mock('@/api/googleAuth', async () => {
  const actual = await vi.importActual<typeof import('@/api/googleAuth')>('@/api/googleAuth')
  return { ...actual, authenticateWithGoogle: vi.fn(), logoutTraveler: vi.fn() }
})

const google = vi.mocked(googleApi)

/** Pengganti tombol GSI: klik = Google mengembalikan ID token. */
const GoogleAuthButtonStub = defineComponent({
  props: { testid: { type: String, default: '' }, text: String },
  emits: ['credential', 'unavailable'],
  setup: (props, { emit }) => () => h('button', { 'data-testid': props.testid, onClick: () => emit('credential', `token-for-${props.testid}`) }, 'Google'),
})

/** ID token palsu dengan klaim nama (hanya payload yang dibaca untuk isian awal). */
function fakeIdToken(claims: Record<string, unknown>): string {
  const payload = btoa(JSON.stringify(claims)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  return `header.${payload}.signature`
}

function mountDialog() {
  return mount(AuthDialog, { global: { stubs: { GoogleAuthButton: GoogleAuthButtonStub } } })
}

async function fillRegister(wrapper: ReturnType<typeof mount>) {
  await wrapper.find('[data-testid="auth-register-nama-depan"]').setValue('Lidya')
  await wrapper.find('[data-testid="auth-register-nama-belakang"]').setValue('Silitonga')
  await wrapper.find('[data-testid="auth-register-tempat-lahir"]').setValue('Medan')
  await wrapper.find('[data-testid="auth-register-tanggal-lahir"]').setValue('17-08-1999')
  await wrapper.find('[data-testid="auth-register-alamat"]').setValue('Jl. Mawar 1')
  await wrapper.find('[data-testid="auth-register-telepon"]').setValue('0812 3456 789')
}

const OK = { data: { outcome: 'logged_in' as const, user: { username: 'lidya.s' } } }

describe('AuthDialog', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
    google.authenticateWithGoogle.mockReset()
  })

  it('opens with only the Google button and closes on the close button', async () => {
    const wrapper = mountDialog()
    expect(wrapper.find('[data-testid="auth-dialog"]').exists()).toBe(false)

    useAuthDialogStore().open('login')
    await flushPromises()
    expect(wrapper.find('[data-testid="auth-dialog-subtitle"]').text()).toBe('Silahkan login untuk masuk ke dalam website')
    expect(wrapper.find('[data-testid="auth-login-google"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="auth-dialog-login"] input').exists()).toBe(false)

    await wrapper.find('[data-testid="auth-dialog-close"]').trigger('click')
    expect(wrapper.find('[data-testid="auth-dialog"]').exists()).toBe(false)
  })

  it('logs a returning traveller in with one call and no form', async () => {
    google.authenticateWithGoogle.mockResolvedValue(OK)
    const wrapper = mountDialog()
    useAuthDialogStore().open('login')
    await flushPromises()

    await wrapper.find('[data-testid="auth-login-google"]').trigger('click')
    await flushPromises()
    expect(google.authenticateWithGoogle).toHaveBeenCalledWith('token-for-auth-login-google')
    expect(useTravelerStore().user).toEqual({ username: 'lidya.s' })
    expect(wrapper.find('[data-testid="auth-dialog"]').exists()).toBe(false)
  })

  it.each([
    [new ApiError(401, 'GOOGLE_TOKEN_INVALID', 'x'), 'Proses masuk gagal. Silakan coba lagi.'],
    [new ApiError(503, 'DATABASE_UNAVAILABLE', 'x'), 'Proses masuk gagal. Silakan coba lagi.'],
    [new ApiError(0, 'NETWORK_ERROR', 'x'), 'Proses masuk gagal. Silakan coba lagi.'],
    [new ApiError(429, 'RATE_LIMITED', 'x'), 'Terlalu banyak percobaan. Tunggu sebentar lalu coba lagi.'],
    [new ApiError(409, 'ACCOUNT_EXISTS_PASSWORD', 'x'), 'Email Google ini sudah terdaftar dengan kata sandi. Hubungi admin untuk menautkan akun.'],
  ])('shows a non-revealing message and stays signed out on %s', async (error, message) => {
    google.authenticateWithGoogle.mockRejectedValue(error)
    const wrapper = mountDialog()
    useAuthDialogStore().open('login')
    await flushPromises()

    await wrapper.find('[data-testid="auth-login-google"]').trigger('click')
    await flushPromises()
    expect(wrapper.find('[data-testid="auth-error"]').text()).toBe(message)
    expect(useTravelerStore().user).toBeNull()
  })

  it('reports when the Google button cannot load instead of faking success', async () => {
    const UnavailableStub = defineComponent({
      emits: ['credential', 'unavailable'],
      setup: (_, { emit }) => {
        emit('unavailable', 'GSI script did not load')
        return () => h('div')
      },
    })
    const wrapper = mount(AuthDialog, { global: { stubs: { GoogleAuthButton: UnavailableStub } } })
    useAuthDialogStore().open('login')
    await flushPromises()
    expect(wrapper.find('[data-testid="auth-error"]').text()).toContain('tidak tersedia')
    expect(google.authenticateWithGoogle).not.toHaveBeenCalled()
  })

  it('on 422 shows the prefilled form, then completes with a fresh token and the profile', async () => {
    const firstToken = fakeIdToken({ given_name: 'Lidya', family_name: 'Silitonga' })
    google.authenticateWithGoogle.mockRejectedValueOnce(new ApiError(422, 'PROFILE_REQUIRED', 'x')).mockResolvedValueOnce({
      data: { outcome: 'registered', user: { username: 'lidya.s' } },
    })
    const LoginStub = defineComponent({
      props: { testid: { type: String, default: '' } },
      emits: ['credential', 'unavailable'],
      setup: (props, { emit }) => () =>
        h('button', { 'data-testid': props.testid, onClick: () => emit('credential', props.testid === 'auth-login-google' ? firstToken : 'fresh-token') }),
    })
    const wrapper = mount(AuthDialog, { global: { stubs: { GoogleAuthButton: LoginStub } } })
    useAuthDialogStore().open('login')
    await flushPromises()

    await wrapper.find('[data-testid="auth-login-google"]').trigger('click')
    await flushPromises()
    expect(wrapper.find('[data-testid="auth-dialog-register"]').exists()).toBe(true)
    expect((wrapper.find('[data-testid="auth-register-nama-depan"]').element as HTMLInputElement).value).toBe('Lidya')
    expect(wrapper.find('[data-testid="auth-register-username"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="auth-register-password"]').exists()).toBe(false)

    // Profil tidak lengkap: token baru tidak dikirim ke server.
    await wrapper.find('[data-testid="auth-register-google"]').trigger('click')
    await flushPromises()
    expect(wrapper.find('[data-testid="auth-register-tempat-lahir-error"]').exists()).toBe(true)
    expect(google.authenticateWithGoogle).toHaveBeenCalledTimes(1)

    await fillRegister(wrapper)
    await wrapper.find('[data-testid="auth-register-google"]').trigger('click')
    await flushPromises()

    expect(google.authenticateWithGoogle).toHaveBeenLastCalledWith('fresh-token', {
      namaDepan: 'Lidya',
      namaBelakang: 'Silitonga',
      tempatLahir: 'Medan',
      tanggalLahir: '1999-08-17',
      alamat: 'Jl. Mawar 1',
      nomorTelepon: '+628123456789',
    })
    expect(useTravelerStore().user).toEqual({ username: 'lidya.s' })
    expect(wrapper.find('[data-testid="auth-dialog"]').exists()).toBe(false)
  })

  it('maps 400 field details from the server onto the form', async () => {
    google.authenticateWithGoogle.mockRejectedValue(new ApiError(400, 'VALIDATION_FAILED', 'x', { nomorTelepon: 'Nomor telepon sudah dipakai.' }))
    const wrapper = mountDialog()
    useAuthDialogStore().open('register')
    await flushPromises()

    await fillRegister(wrapper)
    await wrapper.find('[data-testid="auth-register-google"]').trigger('click')
    await flushPromises()
    expect(wrapper.find('[data-testid="auth-register-telepon-error"]').text()).toBe('Nomor telepon sudah dipakai.')
    expect(wrapper.find('[data-testid="auth-dialog"]').exists()).toBe(true)
  })
})
