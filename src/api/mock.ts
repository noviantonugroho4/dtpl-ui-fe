import { ApiError } from './client'
import type {
  HealthResponse,
  LoginRequest,
  LoginResponse,
  LogoutResponse,
  UserProfile,
  UserResponse,
  UserRole,
} from './types'

/**
 * In-browser stand-in for the backend, used while the real API is offline.
 * Enabled with VITE_USE_MOCK_API=true; credentials come from VITE_MOCK_USERNAME / VITE_MOCK_PASSWORD.
 */

const MOCK_USERNAME = import.meta.env.VITE_MOCK_USERNAME ?? 'admin'
const MOCK_PASSWORD = import.meta.env.VITE_MOCK_PASSWORD ?? 'admin123'
const MOCK_ROLE = (import.meta.env.VITE_MOCK_ROLE ?? 'admin') as UserRole
const TOKEN_PREFIX = 'mock-jwt.'
const LATENCY_MS = 400

const createdAt = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

const mockUser: UserProfile = {
  id: 1,
  username: MOCK_USERNAME,
  email: `${MOCK_USERNAME}@example.com`,
  role: MOCK_ROLE,
  createdAt,
  updatedAt: new Date().toISOString(),
}

const delay = (ms = LATENCY_MS) => new Promise<void>((resolve) => setTimeout(resolve, ms))

function issueToken(): string {
  const payload = btoa(JSON.stringify({ sub: mockUser.id, username: mockUser.username, iat: Date.now() }))
  return `${TOKEN_PREFIX}${payload}`
}

function assertToken(token: string | undefined) {
  if (!token || !token.startsWith(TOKEN_PREFIX)) {
    throw new ApiError(401, 'UNAUTHENTICATED', 'Missing or invalid authorization header')
  }
}

export async function login(credentials: LoginRequest): Promise<LoginResponse> {
  await delay()
  if (!credentials.username || !credentials.password) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Username and password are required')
  }
  if (credentials.username !== MOCK_USERNAME || credentials.password !== MOCK_PASSWORD) {
    throw new ApiError(401, 'INVALID_CREDENTIALS', 'Invalid username or password')
  }
  return { data: { token: issueToken(), user: { ...mockUser } } }
}

export async function logout(token: string): Promise<LogoutResponse> {
  await delay(150)
  assertToken(token)
  return { data: { logout: true } }
}

export async function me(token: string): Promise<UserResponse> {
  await delay(200)
  assertToken(token)
  return { data: { user: { ...mockUser } } }
}

export async function health(): Promise<HealthResponse> {
  await delay(100)
  return { status: 'ok', db: 'mock' }
}
