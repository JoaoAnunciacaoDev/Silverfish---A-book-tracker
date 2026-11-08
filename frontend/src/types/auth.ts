export interface User {
  id: string
  email: string
  username: string
  display_name: string
  role: 'USER' | 'SUPERUSER'
  timezone: string
  bio?: string
  avatar_url?: string
  is_private?: boolean
  created_at: string
  updated_at: string
}

export interface RegisterInput {
  email: string
  username: string
  password: string
  display_name: string
  timezone?: string
}

export interface LoginInput {
  email_or_username: string
  password: string
}

export interface AuthResponse {
  message: string
  user: User
}
