export type UserRole = 'admin' | 'user' | 'editor'

export interface UserProfile {
  id: number
  username: string
  email: string
  role: UserRole
  createdAt: string
  updatedAt: string
}

export interface LoginRequest {
  username: string
  password: string
}

export interface LoginResponse {
  data: {
    token: string
    user: UserProfile
  }
}

export interface UserResponse {
  data: {
    user: UserProfile
  }
}

export interface LogoutResponse {
  data: {
    logout: boolean
  }
}

export interface HealthResponse {
  status: string
  db: string
}

export interface ErrorDetail {
  code: string
  message: string
}

export interface ErrorResponse {
  error: ErrorDetail
}
