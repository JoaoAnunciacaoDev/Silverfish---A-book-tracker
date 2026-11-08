import type { UserBook } from './library'

export interface ReadingSession {
  id: string
  user_id: string
  user_book_id: string
  start_page: number
  end_page: number
  pages_read: number
  read_at: string
  comprehension?: number | null
  feeling?: string | null
  notes?: string | null
  created_at: string
  user_book: UserBook
}

export interface CreateReadingSessionInput {
  user_book_id: string
  start_page: number
  end_page: number
  read_at?: string
  comprehension?: number
  feeling?: string
  notes?: string
}

export interface TodayReadingSummary {
  date: string
  total_pages_read: number
  sessions_count: number
  sessions: ReadingSession[]
}
