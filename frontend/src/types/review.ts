import type { Book } from './book'
import type { User } from './auth'

export interface BookReview {
  id: string
  user_id: string
  book_id: string
  rating: number // 0 a 10
  comment: string
  created_at: string
  updated_at: string
  user?: User
  book?: Book
}

export interface CreateReviewPayload {
  rating: number
  comment?: string
}

export interface UpdateReviewPayload {
  rating?: number
  comment?: string
}

export interface BookReviewsResponse {
  reviews: BookReview[]
  count: number
  average: number
}
