import { apiClient } from '@/api/client'
import type { User, RegisterInput, LoginInput, AuthResponse } from '@/types/auth'

export const authApi = {
  register: (data: RegisterInput) => {
    // Detecta o fuso horário do navegador automaticamente caso não informado
    const timezone = data.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Sao_Paulo'
    return apiClient<AuthResponse>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ ...data, timezone }),
    })
  },

  login: (data: LoginInput) => {
    return apiClient<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  logout: () => {
    return apiClient<{ message: string }>('/api/auth/logout', {
      method: 'POST',
    })
  },

  getMe: (options?: RequestInit) => {
    return apiClient<{ user: User }>('/api/auth/me', {
      method: 'GET',
      ...options,
    })
  },
}
