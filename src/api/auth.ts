import * as real from './auth.real'
import * as mock from './mock'

export const USE_MOCK_API = import.meta.env.VITE_USE_MOCK_API === 'true'

if (USE_MOCK_API && import.meta.env.DEV) {
  console.info('[api] Mock API enabled (VITE_USE_MOCK_API=true). No requests reach the backend.')
}

const impl = USE_MOCK_API ? mock : real

export const login = impl.login
export const logout = impl.logout
export const me = impl.me
export const health = impl.health
