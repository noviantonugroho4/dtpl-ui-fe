import { afterEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { CONTACT } from '@/config/contact'
import ContactView from './ContactView.vue'

vi.mock('vue-router', async () => {
  const { defineComponent, h } = await import('vue')
  return { RouterLink: defineComponent({ props: { to: null }, setup: (_, { slots }) => () => h('a', slots.default?.()) }) }
})

describe('ContactView', () => {
  afterEach(() => vi.restoreAllMocks())

  it('shows the contact channels from the config', () => {
    const wrapper = mount(ContactView)
    expect(wrapper.find('[data-testid="contact-whatsapp"]').attributes('href')).toContain(`wa.me/${CONTACT.whatsapp}`)
    expect(wrapper.find('[data-testid="contact-email"]').attributes('href')).toBe(`mailto:${CONTACT.email}`)
    expect(wrapper.find('[data-testid="contact-address"]').text()).toContain(CONTACT.address[0])
    expect(wrapper.find('[data-testid="contact-hours"]').text()).toContain(CONTACT.hours[0])
    expect(wrapper.findAll('[data-testid^="contact-social-"]')).toHaveLength(3)
  })

  it('validates the form and opens WhatsApp with the composed message', async () => {
    const open = vi.spyOn(window, 'open').mockImplementation(() => null)
    const wrapper = mount(ContactView)

    await wrapper.find('[data-testid="contact-form"]').trigger('submit')
    expect(wrapper.find('[data-testid="contact-nama-error"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="contact-pesan-error"]').exists()).toBe(true)
    expect(open).not.toHaveBeenCalled()

    await wrapper.find('[data-testid="contact-nama"]').setValue('Lidya')
    await wrapper.find('[data-testid="contact-email-input"]').setValue('bukan-email')
    await wrapper.find('[data-testid="contact-pesan"]').setValue('Apakah tiket bisa dibeli di lokasi?')
    await wrapper.find('[data-testid="contact-form"]').trigger('submit')
    expect(wrapper.find('[data-testid="contact-email-error"]').exists()).toBe(true)

    await wrapper.find('[data-testid="contact-email-input"]').setValue('lidya@contoh.id')
    await wrapper.find('[data-testid="contact-topik"]').setValue('Pemesanan tiket')
    await wrapper.find('[data-testid="contact-form"]').trigger('submit')

    expect(open).toHaveBeenCalledTimes(1)
    const text = decodeURIComponent(String(open.mock.calls[0]![0]).split('?text=')[1]!)
    expect(text).toContain('Topik: Pemesanan tiket')
    expect(text).toContain('Nama: Lidya')
    expect(text).toContain('Email: lidya@contoh.id')
    expect(text).toContain('Apakah tiket bisa dibeli di lokasi?')
    expect(wrapper.find('[data-testid="contact-sent"]').exists()).toBe(true)
  })
})
