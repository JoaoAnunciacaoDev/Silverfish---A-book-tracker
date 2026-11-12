export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
    this.name = 'ApiError'
  }
}

const RAW_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) || ''
const BASE_URL = RAW_BASE_URL.replace(/\/$/, '')

export async function apiClient<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const config: RequestInit = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    // Envia e recebe cookies HttpOnly de sessão automaticamente
    credentials: 'include',
  }

  const url = endpoint.startsWith('http://') || endpoint.startsWith('https://')
    ? endpoint
    : `${BASE_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`

  const response = await fetch(url, config)

  if (!response.ok) {
    let errorMessage = `Erro HTTP: ${response.status}`
    try {
      const errorData = await response.json()
      if (errorData.error) {
        errorMessage = errorData.error
      }
    } catch {
      // Caso a resposta não seja JSON
    }
    if (
      response.status === 401 &&
      typeof window !== 'undefined' &&
      !endpoint.startsWith('/api/auth/login') &&
      !endpoint.startsWith('/api/auth/register') &&
      !endpoint.startsWith('/api/auth/me')
    ) {
      window.dispatchEvent(new CustomEvent('silverfish:unauthorized'))
    }

    throw new ApiError(response.status, errorMessage)
  }

  return response.json()
}
