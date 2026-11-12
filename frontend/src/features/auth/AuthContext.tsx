import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import type { User, LoginInput, RegisterInput } from '@/types/auth'
import { authApi } from '@/api/auth'
import { ApiError } from '@/api/client'
import { queryClient } from '@/lib/queryClient'

const CACHED_USER_KEY = 'silverfish_cached_user_v1'
const SESSION_TIMEOUT_MS = 12000
const RETRY_DELAY_MS = 1200

function readCachedUser(): User | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(CACHED_USER_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<User>
    if (parsed && typeof parsed.id === 'string' && typeof parsed.username === 'string') {
      const { email: _legacyEmail, ...safeUser } = parsed
      return { ...safeUser, email: '' } as User
    }
    return null
  } catch {
    return null
  }
}

function writeCachedUser(user: User | null): void {
  if (typeof window === 'undefined') return
  try {
    if (user) {
      const { email: _email, ...safeUser } = user
      window.localStorage.setItem(CACHED_USER_KEY, JSON.stringify(safeUser))
    } else {
      window.localStorage.removeItem(CACHED_USER_KEY)
    }
  } catch {
    // Ignora erros de quota ou modo privado
  }
}

function isAuthRejectedError(err: unknown): boolean {
  return err instanceof ApiError && (err.status === 401 || err.status === 403)
}

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isReconnecting: boolean
  connectionError: string | null
  isAuthenticated: boolean
  login: (data: LoginInput) => Promise<void>
  register: (data: RegisterInput) => Promise<void>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
  dismissConnectionError: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => readCachedUser())
  // Se já existe cache local do usuário, libera a interface imediatamente e valida em background
  const [isLoading, setIsLoading] = useState<boolean>(() => !readCachedUser())
  const [isReconnecting, setIsReconnecting] = useState(false)
  const [connectionError, setConnectionError] = useState<string | null>(null)
  const userRef = useRef<User | null>(user)
  const requestSeqRef = useRef(0)

  useEffect(() => {
    userRef.current = user
  }, [user])

  const fetchMeWithTimeout = useCallback(async () => {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), SESSION_TIMEOUT_MS)
    try {
      return await authApi.getMe({ signal: controller.signal })
    } finally {
      clearTimeout(timer)
    }
  }, [])

  const refreshUser = useCallback(async () => {
    const requestId = ++requestSeqRef.current
    setConnectionError(null)
    if (userRef.current) {
      setIsReconnecting(true)
    } else {
      setIsLoading(true)
    }

    const maxAttempts = 2
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const res = await fetchMeWithTimeout()
        if (requestId !== requestSeqRef.current) return
        setUser(res.user)
        writeCachedUser(res.user)
        setConnectionError(null)
        setIsReconnecting(false)
        setIsLoading(false)
        return
      } catch (err) {
        if (requestId !== requestSeqRef.current) return
        if (isAuthRejectedError(err)) {
          // Apenas 401/403 invalida a sessão de fato
          setUser(null)
          writeCachedUser(null)
          queryClient.clear()
          setConnectionError(null)
          setIsReconnecting(false)
          setIsLoading(false)
          return
        }

        if (attempt < maxAttempts) {
          await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS))
          if (requestId !== requestSeqRef.current) return
          continue
        }

        // Timeout / rede / 5xx: mantém o usuário em cache (não desconecta por lentidão)
        setConnectionError(
          'O servidor demorou para responder (pode estar iniciando). Suas alterações continuam sendo sincronizadas.'
        )
        setIsReconnecting(false)
        setIsLoading(false)
      }
    }
  }, [fetchMeWithTimeout])

  // Ao carregar a página, valida a sessão segura via cookie HttpOnly
  useEffect(() => {
    refreshUser()
  }, [refreshUser])

  // Se alguma chamada subsequente receber 401 real, encerra a sessão local
  useEffect(() => {
    const handleUnauthorized = () => {
      setUser(null)
      writeCachedUser(null)
      queryClient.clear()
      setConnectionError(null)
      setIsReconnecting(false)
      setIsLoading(false)
    }

    window.addEventListener('silverfish:unauthorized', handleUnauthorized)
    return () => {
      window.removeEventListener('silverfish:unauthorized', handleUnauthorized)
    }
  }, [])

  const login = async (data: LoginInput) => {
    requestSeqRef.current++
    const res = await authApi.login(data)
    setUser(res.user)
    writeCachedUser(res.user)
    setConnectionError(null)
    setIsReconnecting(false)
    setIsLoading(false)
  }

  const register = async (data: RegisterInput) => {
    await authApi.register(data)
    await login({
      email_or_username: data.username,
      password: data.password,
    })
  }

  const logout = async () => {
    requestSeqRef.current++
    try {
      await authApi.logout()
    } finally {
      setUser(null)
      writeCachedUser(null)
      queryClient.clear()
      setConnectionError(null)
      setIsReconnecting(false)
    }
  }

  const dismissConnectionError = () => {
    setConnectionError(null)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isReconnecting,
        connectionError,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        refreshUser,
        dismissConnectionError,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider')
  }
  return context
}
