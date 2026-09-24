import { request } from './client'
import type { HealthResponse, LoginRequest, LoginResponse, LogoutResponse, UserResponse } from './types'

export function login(credentials: LoginRequest): Promise<LoginResponse> {
  return request<LoginResponse>('/api/auth/login', { method: 'POST', body: credentials })
}

export function logout(token: string): Promise<LogoutResponse> {
  return request<LogoutResponse>('/api/auth/logout', { method: 'POST', token })
}

export function me(token: string): Promise<UserResponse> {
  return request<UserResponse>('/api/auth/me', { token })
}

export function health(): Promise<HealthResponse> {
  return request<HealthResponse>('/api/health')
}
