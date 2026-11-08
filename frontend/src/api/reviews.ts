import { apiClient } from './client'
import type {
  BookReview,
  BookReviewsResponse,
  CreateReviewPayload,
  UpdateReviewPayload,
} from '@/types/review'

export async function listBookReviews(bookId: string): Promise<BookReviewsResponse> {
  return apiClient<BookReviewsResponse>(`/api/books/${bookId}/reviews`)
}

export async function createBookReview(
  bookId: string,
  payload: CreateReviewPayload
): Promise<{ message: string; review: BookReview }> {
  return apiClient<{ message: string; review: BookReview }>(`/api/books/${bookId}/reviews`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function updateReview(
  reviewId: string,
  payload: UpdateReviewPayload
): Promise<{ message: string; review: BookReview }> {
  return apiClient<{ message: string; review: BookReview }>(`/api/reviews/${reviewId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export async function deleteReview(reviewId: string): Promise<{ message: string }> {
  return apiClient<{ message: string }>(`/api/reviews/${reviewId}`, {
    method: 'DELETE',
  })
}

export async function listMyReviews(): Promise<{ reviews: BookReview[]; count: number }> {
  return apiClient<{ reviews: BookReview[]; count: number }>('/api/reviews/me')
}
