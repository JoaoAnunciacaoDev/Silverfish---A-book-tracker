import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minuto de cache fresco ao trocar de abas
      gcTime: 10 * 60 * 1000, // Mantém dados em memória por 10 minutos
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})
