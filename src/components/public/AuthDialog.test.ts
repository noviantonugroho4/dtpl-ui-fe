import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { defineComponent, h } from 'vue'
import { ApiError } from '@/api/client'
import * as googleApi from '@/api/googleAuth'
import type { TravelerUser } from '@/api/googleAuth'
import { useAuthDialogStore } from '@/stores/authDialog'
import { useTravelerStore } from '@/stores/traveler'
import AuthDialog from './AuthDialog.vue'

vi.mock('@/api/googleAuth', async () => {
  const actual = await vi.importActual<typeof import('@/api/googleAuth')>('@/api/googleAuth')
  return { ...actual, authenticateWithGoogle: vi.fn(), updateTravelerProfile: vi.fn(), logoutTraveler: vi.fn().mockResolvedValue({}) }
})

const google = vi.mocked(googleApi)

/** Pengganti tombol GSI: klik = Google mengembalikan ID token. */
const GoogleAuthButtonStub = defineComponent({
  props: { testid: { type: String, default: '' }, text: String },
  emits: ['credential', 'unavailable'],
  setup: (props, { emit }) => () => h('button', { 'data-testid': props.testid, onClick: () => emit('credential', `token-for-${props.testid}`) }, 'Google'),
})

function mountDialog() {
  return mount(AuthDialog, { global: { stubs: { GoogleAuthButton: GoogleAuthButtonStub } } })
}

function makeTraveler(overrides: Partial<TravelerUser> = {}): TravelerUser {
  return {
    id: 7,
    username: 'lidya.s',
    role: 'user',
    profileComplete: true,
    profile: { namaDepan: 'Lidya', namaBelakang: 'Silitonga', tempatLahir: null, tanggalLahir: null, alamat: null, nomorTelepon: null },
    ...overrides,
  }
}

async function openAndClickGoogle(wrapper: ReturnType<typeof mount>) {
  useAuthDialogStore().open('login')
  await flushPromises()
  await wrapper.find('[data-testid="auth-login-google"]').trigger('click')
  await flushPromises()
}

async function fillRest(wrapper: ReturnType<typeof mount>) {
  await wrapper.find('[data-testid="auth-register-tempat-lahir"]').setValue('Medan')
  await wrapper.find('[data-testid="auth-register-tanggal-lahir"]').setValue('17-08-1999')
  await wrapper.find('[data-testid="auth-register-telepon"]').setValue('0812 3456 789')
}

describe('AuthDialog', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
    google.authenticateWithGoogle.mockReset()
    google.updateTravelerProfile.mockReset()
    google.logoutTraveler.mockClear()
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

  it('signs a traveller with a complete profile straight in and stores the Bearer token', async () => {
    google.authenticateWithGoogle.mockResolvedValue({ data: { outcome: 'logged_in', token: 'jwt-ok', user: makeTraveler() } })
    const wrapper = mountDialog()
    await openAndClickGoogle(wrapper)

    expect(google.authenticateWithGoogle).toHaveBeenCalledWith('token-for-auth-login-google')
    expect(useTravelerStore().user).toEqual({ id: 7, nama: 'Lidya Silitonga' })
    expect(localStorage.getItem('dtpl.traveler.token')).toBe('jwt-ok')
    expect(wrapper.find('[data-testid="auth-dialog"]').exists()).toBe(false)
  })

  it('shows the registration form for an incomplete profile, prefilled from the server, and saves it with PUT', async () => {
    google.authenticateWithGoogle.mockResolvedValue({ data: { outcome: 'registered', token: 'jwt-new', user: makeTraveler({ profileComplete: false }) } })
    google.updateTravelerProfile.mockResolvedValue({ data: { user: makeTraveler() } })
    const wrapper = mountDialog()
    await openAndClickGoogle(wrapper)

    // Belum masuk: token hanya di memori sampai profil disimpan.
    expect(wrapper.find('[data-testid="auth-dialog-register"]').exists()).toBe(true)
    expect(useTravelerStore().user).toBeNull()
    expect(localStorage.getItem('dtpl.traveler.token')).toBeNull()
    expect((wrapper.find('[data-testid="auth-register-nama-depan"]').element as HTMLInputElement).value).toBe('Lidya')
    expect((wrapper.find('[data-testid="auth-register-nama-belakang"]').element as HTMLInputElement).value).toBe('Silitonga')

    // Wajib diisi dulu; tidak ada panggilan ke server.
    await wrapper.find('[data-testid="auth-register-form"]').trigger('submit')
    await flushPromises()
    expect(wrapper.find('[data-testid="auth-register-tempat-lahir-error"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="auth-register-alamat-error"]').exists()).toBe(false)
    expect(google.updateTravelerProfile).not.toHaveBeenCalled()

    await fillRest(wrapper)
    await wrapper.find('[data-testid="auth-register-form"]').trigger('submit')
    await flushPromises()

    expect(google.updateTravelerProfile).toHaveBeenCalledWith('jwt-new', {
      namaDepan: 'Lidya',
      namaBelakang: 'Silitonga',
      tempatLahir: 'Medan',
      tanggalLahir: '1999-08-17',
      nomorTelepon: '+628123456789',
    })
    expect(useTravelerStore().user).toEqual({ id: 7, nama: 'Lidya Silitonga' })
    expect(localStorage.getItem('dtpl.traveler.token')).toBe('jwt-new')
    expect(wrapper.find('[data-testid="auth-dialog"]').exists()).toBe(false)
  })

  it('lays the form out as in Figma 496:7120, with a +62 prefix and a full-width "Masuk" button', async () => {
    google.authenticateWithGoogle.mockResolvedValue({
      data: {
        outcome: 'logged_in',
        token: 'jwt-old',
        user: makeTraveler({ profileComplete: false, profile: { namaDepan: 'A', namaBelakang: 'B', tempatLahir: null, tanggalLahir: '1998-08-17', alamat: null, nomorTelepon: '+628123456789' } }),
      },
    })
    const wrapper = mountDialog()
    await openAndClickGoogle(wrapper)

    const labels = wrapper.findAll('[data-testid="auth-register-form"] label').map((l) => l.text())
    expect(labels).toEqual(['Nama Depan *', 'Nama Belakang *', 'Nomor Telepon *', 'Alamat Tempat Tinggal', 'Tanggal Lahir *', 'Tempat Lahir *'])
    expect((wrapper.find('[data-testid="auth-register-telepon"]').element as HTMLInputElement).value).toBe('8123456789')
    expect((wrapper.find('[data-testid="auth-register-tanggal-lahir"]').element as HTMLInputElement).value).toBe('17-08-1998')
    expect(wrapper.find('[data-testid="auth-register-submit"]').text()).toBe('Masuk')
    expect(wrapper.find('[data-testid="auth-switch-login"]').exists()).toBe(false)
  })

  it('treats a returning account with an incomplete profile the same as a new one', async () => {
    google.authenticateWithGoogle.mockResolvedValue({ data: { outcome: 'logged_in', token: 'jwt-old', user: makeTraveler({ profileComplete: false }) } })
    const wrapper = mountDialog()
    await openAndClickGoogle(wrapper)
    expect(wrapper.find('[data-testid="auth-dialog-register"]').exists()).toBe(true)
  })

  it('discards the temporary session when the form is closed before saving', async () => {
    google.authenticateWithGoogle.mockResolvedValue({ data: { outcome: 'registered', token: 'jwt-tmp', user: makeTraveler({ profileComplete: false }) } })
    const wrapper = mountDialog()
    await openAndClickGoogle(wrapper)

    await wrapper.find('[data-testid="auth-dialog-close"]').trigger('click')
    await flushPromises()
    expect(google.logoutTraveler).toHaveBeenCalledWith('jwt-tmp')
    expect(useTravelerStore().pending).toBeNull()
    expect(useTravelerStore().user).toBeNull()
  })

  it.each([
    [new ApiError(401, 'GOOGLE_TOKEN_INVALID', 'x'), 'Proses masuk gagal. Silakan coba lagi.'],
    [new ApiError(403, 'GOOGLE_PROVIDER_CONFLICT', 'x'), 'Proses masuk gagal. Silakan coba lagi.'],
    [new ApiError(503, 'DATABASE_UNAVAILABLE', 'x'), 'Proses masuk gagal. Silakan coba lagi.'],
    [new ApiError(0, 'NETWORK_ERROR', 'x'), 'Proses masuk gagal. Silakan coba lagi.'],
    [new ApiError(429, 'RATE_LIMITED', 'x'), 'Terlalu banyak percobaan. Tunggu sebentar lalu coba lagi.'],
    [new ApiError(409, 'ACCOUNT_EXISTS_PASSWORD', 'x'), 'Email Google ini sudah terdaftar dengan kata sandi. Hubungi admin untuk menautkan akun.'],
  ])('shows a non-revealing message and stays signed out on %s', async (error, message) => {
    google.authenticateWithGoogle.mockRejectedValue(error)
    const wrapper = mountDialog()
    await openAndClickGoogle(wrapper)
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

  it('maps 400 field details from PUT /api/auth/profile onto the form', async () => {
    google.authenticateWithGoogle.mockResolvedValue({ data: { outcome: 'registered', token: 'jwt-new', user: makeTraveler({ profileComplete: false }) } })
    google.updateTravelerProfile.mockRejectedValue(new ApiError(400, 'VALIDATION_FAILED', 'x', { nomorTelepon: 'Nomor telepon tidak valid.' }))
    const wrapper = mountDialog()
    await openAndClickGoogle(wrapper)
    await fillRest(wrapper)
    await wrapper.find('[data-testid="auth-register-form"]').trigger('submit')
    await flushPromises()
    expect(wrapper.find('[data-testid="auth-register-telepon-error"]').text()).toBe('Nomor telepon tidak valid.')
    expect(wrapper.find('[data-testid="auth-dialog-register"]').exists()).toBe(true)
  })

  it('returns to the Google step when the temporary token has expired', async () => {
    google.authenticateWithGoogle.mockResolvedValue({ data: { outcome: 'registered', token: 'jwt-new', user: makeTraveler({ profileComplete: false }) } })
    google.updateTravelerProfile.mockRejectedValue(new ApiError(401, 'UNAUTHENTICATED', 'x'))
    const wrapper = mountDialog()
    await openAndClickGoogle(wrapper)
    await fillRest(wrapper)
    await wrapper.find('[data-testid="auth-register-form"]').trigger('submit')
    await flushPromises()
    expect(wrapper.find('[data-testid="auth-dialog-login"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="auth-error"]').text()).toBe('Sesi pendaftaran berakhir. Silakan masuk dengan Google lagi.')
  })
})
