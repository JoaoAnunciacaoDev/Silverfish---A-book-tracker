import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { User, LoginInput, RegisterInput } from '@/types/auth'
import { authApi } from '@/api/auth'

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (data: LoginInput) => Promise<void>
  register: (data: RegisterInput) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Ao carregar a página, verifica se há uma sessão ativa
  useEffect(() => {
    authApi
      .getMe()
      .then((res) => setUser(res.user))
      .catch(() => setUser(null))
      .finally(() => setIsLoading(false))
  }, [])

  const login = async (data: LoginInput) => {
    const res = await authApi.login(data)
    setUser(res.user)
  }

  const register = async (data: RegisterInput) => {
    await authApi.register(data)
    // Faz o login automático logo após registrar
    await login({
      email_or_username: data.username,
      password: data.password,
    })
  }

  const logout = async () => {
    try {
      await authApi.logout()
    } finally {
      setUser(null)
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
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
