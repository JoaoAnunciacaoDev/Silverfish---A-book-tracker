import { apiClient } from './client'
import type {
  CreateReadingSessionInput,
  ReadingSession,
  TodayReadingSummary,
} from '@/types/reading'

export async function createReadingSession(
  input: CreateReadingSessionInput
): Promise<{ message: string; session: ReadingSession }> {
  return apiClient<{ message: string; session: ReadingSession }>('/api/reading-sessions', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export async function listReadingSessions(params: {
  date?: string
  user_book_id?: string
  page?: number
  limit?: number
} = {}): Promise<{ sessions: ReadingSession[]; pagination: { page: number; limit: number; total_items: number } }> {
  const query = new URLSearchParams()
  if (params.date) query.set('date', params.date)
  if (params.user_book_id) query.set('user_book_id', params.user_book_id)
  if (params.page) query.set('page', params.page.toString())
  if (params.limit) query.set('limit', params.limit.toString())

  const queryString = query.toString()
  const endpoint = queryString ? `/api/reading-sessions?${queryString}` : '/api/reading-sessions'

  return apiClient(endpoint)
}

export async function getTodayReadingSummary(): Promise<TodayReadingSummary> {
  return apiClient<TodayReadingSummary>('/api/reading-sessions/today')
}

export async function deleteReadingSession(id: string): Promise<{ message: string }> {
  return apiClient<{ message: string }>(`/api/reading-sessions/${id}`, {
    method: 'DELETE',
  })
}
