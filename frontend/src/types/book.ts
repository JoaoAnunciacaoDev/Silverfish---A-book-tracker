export interface Book {
  id: string
  title: string
  author: string
  description?: string
  cover_url?: string
  page_count: number
  genre?: string
  isbn?: string
  open_library_key?: string | null
  created_by?: string | null
  created_at: string
  updated_at: string
}

export interface PaginationMeta {
  page: number
  limit: number
  total_items: number
  total_pages: number
  has_next: boolean
  has_prev: boolean
}

export interface BookListResponse {
  books: Book[]
  pagination: PaginationMeta
}

export interface ExternalBookItem {
  open_library_key: string
  title: string
  author: string
  cover_url: string
  page_count: number
  year: number
  isbn: string
  in_catalog: boolean
  local_book_id?: string
}

export interface SearchExternalResponse {
  results: ExternalBookItem[]
  pagination: PaginationMeta
}

export interface CreateBookInput {
  title: string
  author: string
  description?: string
  cover_url?: string
  page_count: number
  genre?: string
  isbn?: string
  add_to_shelf?: boolean
  shelf_status?: string
}

export interface ImportBookInput {
  open_library_key: string
  title: string
  author: string
  description?: string
  cover_url?: string
  page_count: number
  genre?: string
  isbn?: string
}
