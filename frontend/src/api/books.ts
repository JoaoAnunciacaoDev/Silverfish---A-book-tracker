import { apiClient } from './client'
import type {
  Book,
  BookListResponse,
  CreateBookInput,
  ImportBookInput,
  SearchExternalResponse,
} from '@/types/book'

export async function listBooks(params: {
  page?: number
  limit?: number
  q?: string
} = {}): Promise<BookListResponse> {
  const query = new URLSearchParams()
  if (params.page) query.set('page', params.page.toString())
  if (params.limit) query.set('limit', params.limit.toString())
  if (params.q) query.set('q', params.q)

  const queryString = query.toString()
  const endpoint = queryString ? `/api/books?${queryString}` : '/api/books'

  return apiClient<BookListResponse>(endpoint)
}

export async function showBook(id: string): Promise<{ book: Book }> {
  return apiClient<{ book: Book }>(`/api/books/${id}`)
}

export async function createBook(input: CreateBookInput): Promise<{ message: string; book: Book }> {
  return apiClient<{ message: string; book: Book }>('/api/books', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export async function searchExternalBooks(
  q: string,
  page = 1,
  limit = 15,
  provider: 'all' | 'google' | 'openlibrary' = 'all'
): Promise<SearchExternalResponse> {
  const query = new URLSearchParams({
    q,
    page: page.toString(),
    limit: limit.toString(),
    provider,
  })
  return apiClient<SearchExternalResponse>(`/api/books/search-external?${query.toString()}`)
}

export async function importBook(input: ImportBookInput): Promise<{ message: string; book: Book }> {
  return apiClient<{ message: string; book: Book }>('/api/books/import', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}
