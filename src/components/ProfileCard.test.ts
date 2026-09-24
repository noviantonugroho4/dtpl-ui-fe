import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import ProfileCard from './ProfileCard.vue'
import { setLocale } from '@/i18n'
import { makeUser } from '@/test/helpers'

describe('ProfileCard', () => {
  it('renders the user fields and translated role', () => {
    const wrapper = mount(ProfileCard, { props: { user: makeUser() } })
    const text = wrapper.text()

    expect(text).toContain('admin')
    expect(text).toContain('admin@example.com')
    expect(text).toContain('Administrator')
    expect(text).toContain('User ID')
    expect(text).toContain('1')
  })

  it('falls back to the raw role when no translation exists', () => {
    const wrapper = mount(ProfileCard, {
      props: { user: makeUser({ role: 'superuser' as 'admin' }) },
    })
    expect(wrapper.text()).toContain('superuser')
  })

  it('switches labels when the locale changes', () => {
    setLocale('id')
    const wrapper = mount(ProfileCard, { props: { user: makeUser({ role: 'user' }) } })
    expect(wrapper.text()).toContain('Nama pengguna')
    expect(wrapper.text()).toContain('Pengguna')
  })

  it('shows the raw value for an unparseable date', () => {
    const wrapper = mount(ProfileCard, { props: { user: makeUser({ createdAt: 'not-a-date' }) } })
    expect(wrapper.text()).toContain('not-a-date')
  })
})
