import { afterEach, beforeEach } from 'vitest'
import { config } from '@vue/test-utils'
import { i18n, setLocale } from '@/i18n'

// Every mounted component gets the real i18n plugin with English active.
config.global.plugins = [i18n]

beforeEach(() => {
  localStorage.clear()
  setLocale('en')
})

afterEach(() => {
  localStorage.clear()
})
