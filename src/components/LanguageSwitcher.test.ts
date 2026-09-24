import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import LanguageSwitcher from './LanguageSwitcher.vue'
import { i18n } from '@/i18n'

describe('LanguageSwitcher', () => {
  it('lists both locales and reflects the active one', () => {
    const wrapper = mount(LanguageSwitcher)
    const options = wrapper.findAll('option').map((o) => o.text())
    expect(options).toEqual(['English', 'Bahasa Indonesia'])
    expect((wrapper.find('select').element as HTMLSelectElement).value).toBe('en')
  })

  it('changes the global locale, the html lang and persists the choice', async () => {
    const wrapper = mount(LanguageSwitcher)
    await wrapper.find('select').setValue('id')

    expect(i18n.global.locale.value).toBe('id')
    expect(document.documentElement.lang).toBe('id')
    expect(localStorage.getItem('dtpl.locale')).toBe('id')
  })
})
