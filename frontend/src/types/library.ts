import type { Book } from './book'

export type UserBookStatus = 'want_to_read' | 'reading' | 'read' | 'paused' | 'abandoned'

export interface UserBook {
  id: string
  user_id: string
  book_id: string
  status: UserBookStatus
  favorite: boolean
  in_collection: boolean
  current_page: number
  started_at?: string | null
  finished_at?: string | null
  created_at: string
  updated_at: string
  book: Book
}

export interface LibrarySummary {
  total: number
  reading: number
  want_to_read: number
  read: number
  paused: number
  abandoned: number
  in_collection: number
  favorites: number
}

export interface LibraryResponse {
  items: UserBook[]
  summary: LibrarySummary
  pagination: {
    page: number
    limit: number
    total_items: number
  }
}

export interface AddToLibraryInput {
  book_id: string
  status?: UserBookStatus
  current_page?: number
  favorite?: boolean
  in_collection?: boolean
  finished_at?: string | null
}

export interface UpdateLibraryBookInput {
  status?: UserBookStatus
  current_page?: number
  in_collection?: boolean
  finished_at?: string | null
}
