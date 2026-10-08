import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { ApiError } from '@/api/client'
import * as locationApi from '@/api/location'
import * as wisataApi from '@/api/wisata'
import { useFlashStore } from '@/stores/flash'
import DestinasiWisataCreateView from './DestinasiWisataCreateView.vue'

const routerMocks = vi.hoisted(() => ({ push: vi.fn().mockResolvedValue(undefined) }))

vi.mock('vue-router', async () => {
  const { defineComponent, h } = await import('vue')
  return {
    useRouter: () => ({ push: routerMocks.push }),
    RouterLink: defineComponent({ props: { to: null }, setup: (_, { slots }) => () => h('a', slots.default?.()) }),
  }
})

vi.mock('@/api/location', () => ({
  listProvinces: vi.fn(),
  listRegencies: vi.fn(),
  listDistricts: vi.fn(),
  listVillages: vi.fn(),
}))

vi.mock('@/api/wisata', async () => {
  const actual = await vi.importActual<typeof import('@/api/wisata')>('@/api/wisata')
  return { ...actual, uploadWisataImage: vi.fn(), createWisata: vi.fn() }
})

const location = vi.mocked(locationApi)
const wisata = vi.mocked(wisataApi)

const meta = { updated_at: '2026-09-04', level: 1 }
const UPLOADED = { webdavUrl: 'https://webdav/x.jpg', webdavKey: 'wisata/x.jpg', mime: 'image/jpeg', sizeBytes: 1000 }

function seedLocationApi() {
  location.listProvinces.mockResolvedValue({ data: [{ id: '31', name: 'DKI Jakarta' }], meta })
  location.listRegencies.mockResolvedValue({ data: [{ id: '31.01', name: 'Kabupaten Administrasi Kepulauan Seribu' }], meta })
  location.listDistricts.mockResolvedValue({ data: [{ id: '31.01.01', name: 'Kepulauan Seribu Utara' }], meta })
  location.listVillages.mockResolvedValue({ data: [{ id: '31.01.01.1001', name: 'Pulau Panggang', postal_code: '14530' }], meta })
}

async function pickLocationChain(wrapper: ReturnType<typeof mount>) {
  await wrapper.find('#f-provinsi').setValue('31')
  await flushPromises()
  await wrapper.find('#f-kabupaten').setValue('31.01')
  await flushPromises()
  await wrapper.find('#f-kecamatan').setValue('31.01.01')
  await flushPromises()
  await wrapper.find('#f-kelurahan').setValue('31.01.01.1001')
  await flushPromises()
}

async function addImage(wrapper: ReturnType<typeof mount>, file = new File(['x'], 'foto.jpg', { type: 'image/jpeg' })) {
  const input = wrapper.find('[data-testid="wisata-form-image-input"]')
  Object.defineProperty(input.element, 'files', { value: [file], configurable: true })
  await input.trigger('change')
  await flushPromises()
}

async function fillValidForm(wrapper: ReturnType<typeof mount>) {
  await wrapper.find('#f-nama').setValue('Pantai Tanjung Lesung')
  await addImage(wrapper)
  await wrapper.find('#f-jenis').setValue('wisata_alam')
  await wrapper.find('#f-telp').setValue('0812345678')
  await wrapper.find('#f-alamat').setValue('Jl. Pantai No. 1')
  await pickLocationChain(wrapper)
  await wrapper.find('#f-maps').setValue('https://maps.app.goo.gl/abc123')
  await wrapper.find('input[aria-label="Fasilitas 1"]').setValue('Parkir')
}

describe('DestinasiWisataCreateView', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.setItem('dtpl.auth.token', 'jwt-1')
    routerMocks.push.mockClear()
    vi.mocked(wisata.uploadWisataImage).mockReset().mockResolvedValue({ data: UPLOADED })
    vi.mocked(wisata.createWisata).mockReset()
    seedLocationApi()
  })

  it('loads provinces on mount and walks the location chain, auto-filling the postal code', async () => {
    const wrapper = mount(DestinasiWisataCreateView)
    await flushPromises()
    expect(location.listProvinces).toHaveBeenCalledTimes(1)
    expect((wrapper.find('#f-kabupaten').element as HTMLSelectElement).disabled).toBe(true)

    await pickLocationChain(wrapper)

    expect(location.listRegencies).toHaveBeenCalledWith('31')
    expect(location.listDistricts).toHaveBeenCalledWith('31.01')
    expect(location.listVillages).toHaveBeenCalledWith('31.01.01')
    expect((wrapper.find('#f-kodepos').element as HTMLInputElement).value).toBe('14530')
  })

  it('keeps Simpan disabled until the required fields have input', async () => {
    const wrapper = mount(DestinasiWisataCreateView)
    await flushPromises()
    expect(wrapper.find('[data-testid="wisata-form-submit"]').attributes('disabled')).toBeDefined()
    await fillValidForm(wrapper)
    expect(wrapper.find('[data-testid="wisata-form-submit"]').attributes('disabled')).toBeUndefined()
  })

  it('shows inline validation messages and does not submit invalid input', async () => {
    const wrapper = mount(DestinasiWisataCreateView)
    await flushPromises()
    await fillValidForm(wrapper)
    await wrapper.find('#f-telp').setValue('12')
    await wrapper.find('#f-maps').setValue('https://example.com/not-maps')
    await wrapper.find('#f-deskripsi').setValue('x'.repeat(501))

    await wrapper.find('form').trigger('submit')
    await flushPromises()

    const text = wrapper.text()
    expect(wrapper.find('[data-testid="wisata-form-kontak-error"]').text()).toBe('Nomor telepon harus 8–13 digit setelah +62.')
    expect(wrapper.find('[data-testid="wisata-form-maps-error"]').exists()).toBe(true)
    expect(text).toContain('Nomor telepon harus 8–13 digit setelah +62.')
    expect(text).toContain('Masukkan tautan Google Maps yang valid.')
    expect(text).toContain('Deskripsi maksimal 500 karakter.')
    expect(wisata.createWisata).not.toHaveBeenCalled()
  })

  it('rejects images that are too large or the wrong format', async () => {
    const wrapper = mount(DestinasiWisataCreateView)
    await flushPromises()
    await addImage(wrapper, new File(['x'], 'doc.gif', { type: 'image/gif' }))
    expect(wrapper.text()).toContain('Format harus JPG atau PNG.')
    await addImage(wrapper, new File([new Uint8Array(153601)], 'big.png', { type: 'image/png' }))
    expect(wrapper.text()).toContain('Ukuran gambar maksimal 150 KB.')
    expect(wisata.uploadWisataImage).not.toHaveBeenCalled()
  })

  it('uploads the image, posts the normalised payload, sets the notice and returns to the list', async () => {
    vi.mocked(wisata.createWisata).mockResolvedValue({ data: { id: 'new' } as never })
    const wrapper = mount(DestinasiWisataCreateView)
    await flushPromises()
    await fillValidForm(wrapper)
    await wrapper.find('#f-wa').setValue('812 999 8888')
    await wrapper.find('#f-harga').setValue('25000')
    await wrapper.find('input[aria-label="Nama layanan 1"]').setValue('Sewa Payung')
    await wrapper.find('input[aria-label="Harga layanan 1"]').setValue('15000')

    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(wisata.uploadWisataImage).toHaveBeenCalledWith(expect.any(File), 'jwt-1')
    expect(wisata.createWisata).toHaveBeenCalledWith(
      {
        nama: 'Pantai Tanjung Lesung',
        jenis: 'wisata_alam',
        kontakTelp: '+62812345678',
        kontakWa: '+628129998888',
        provinsi: 'DKI Jakarta',
        kecamatan: 'Kepulauan Seribu Utara',
        kelurahan: 'Pulau Panggang',
        alamat: 'Jl. Pantai No. 1',
        mapsLink: 'https://maps.app.goo.gl/abc123',
        hargaTiket: 25000,
        images: [{ ...UPLOADED, sortOrder: 0 }],
        fasilitas: ['Parkir'],
        services: [{ serviceName: 'Sewa Payung', price: 15000 }],
      },
      'jwt-1',
    )
    expect(useFlashStore().message).toBe('Destinasi wisata berhasil ditambahkan.')
    expect(routerMocks.push).toHaveBeenCalledWith({ name: 'attractions' })
  })

  it('maps backend field details onto the form', async () => {
    vi.mocked(wisata.createWisata).mockRejectedValue(
      new ApiError(400, 'VALIDATION_ERROR', 'Invalid input parameters', { nama: 'nama sudah digunakan' }),
    )
    const wrapper = mount(DestinasiWisataCreateView)
    await flushPromises()
    await fillValidForm(wrapper)
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(wrapper.text()).toContain('nama sudah digunakan')
    expect(wrapper.text()).toContain('Periksa kembali formulir lalu coba lagi.')
    expect(routerMocks.push).not.toHaveBeenCalled()
  })
})
