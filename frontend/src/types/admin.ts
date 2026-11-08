export interface AdminOverview {
  total_users: number
  new_users_last_30_days: number
  active_users_this_month: number
  total_books: number
  total_sessions: number
  total_pages_read: number
  total_reviews: number
}

export interface AdminUserView {
  id: string
  email: string
  username: string
  display_name: string
  role: 'USER' | 'SUPERUSER'
  is_private: boolean
  total_pages_read: number
  total_books_read: number
  created_at: string
}

export interface AdminDashboardData {
  overview: AdminOverview
  top_streakers: Array<{
    id: string
    username: string
    display_name: string
    streak: number
  }>
}
