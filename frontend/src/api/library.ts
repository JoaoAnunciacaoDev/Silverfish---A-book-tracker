import { apiClient } from './client'
import type {
  AddToLibraryInput,
  LibraryResponse,
  UpdateLibraryBookInput,
  UserBook,
} from '@/types/library'

export async function listLibrary(params: {
  status?: string
  favorite?: boolean
  in_collection?: boolean
  q?: string
  page?: number
  limit?: number
} = {}): Promise<LibraryResponse> {
  const query = new URLSearchParams()
  if (params.status) query.set('status', params.status)
  if (params.favorite) query.set('favorite', 'true')
  if (params.in_collection) query.set('in_collection', 'true')
  if (params.q) query.set('q', params.q)
  if (params.page) query.set('page', params.page.toString())
  if (params.limit) query.set('limit', params.limit.toString())

  const queryString = query.toString()
  const endpoint = queryString ? `/api/library?${queryString}` : '/api/library'

  return apiClient<LibraryResponse>(endpoint)
}

export async function addToLibrary(input: AddToLibraryInput): Promise<{ message: string; item: UserBook }> {
  return apiClient<{ message: string; item: UserBook }>('/api/library', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export async function updateLibraryBook(
  id: string,
  input: UpdateLibraryBookInput
): Promise<{ message: string; item: UserBook }> {
  return apiClient<{ message: string; item: UserBook }>(`/api/library/${id}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  })
}

export async function deleteLibraryBook(id: string): Promise<{ message: string }> {
  return apiClient<{ message: string }>(`/api/library/${id}`, {
    method: 'DELETE',
  })
}

export async function toggleFavorite(id: string): Promise<{ message: string; favorite: boolean }> {
  return apiClient<{ message: string; favorite: boolean }>(`/api/library/${id}/favorite`, {
    method: 'PATCH',
  })
}

export async function toggleInCollection(id: string): Promise<{ message: string; in_collection: boolean }> {
  return apiClient<{ message: string; in_collection: boolean }>(`/api/library/${id}/collection`, {
    method: 'PATCH',
  })
}
