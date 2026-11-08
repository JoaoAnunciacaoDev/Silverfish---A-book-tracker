import type { User } from './auth'
import type { Book } from './book'
import type { UserBook } from './library'
import type { AchievementView } from './achievements'

export type ActivityType =
  | 'BOOK_STARTED'
  | 'BOOK_FINISHED'
  | 'GOAL_MET'
  | 'STREAK_MILESTONE'
  | 'READING_SESSION'
  | 'REVIEW_POSTED'
  | 'ACHIEVEMENT_UNLOCKED'

export interface ActivityItem {
  id: string
  user_id: string
  type: ActivityType
  book_id?: string
  metadata?: string
  created_at: string
  user: User
  book?: Book
}

export interface ActivityMetadata {
  pages_read?: number
  start_page?: number
  end_page?: number
  book_title?: string
  date?: string
  target?: number
  streak?: number
  rating?: number
  comment?: string
  code?: string
  title?: string
  description?: string
  icon?: string
}

export interface LeaderboardEntry {
  rank: number
  user: User
  score: number
  score_label: string
  is_current_user: boolean
  badge?: 'gold' | 'silver' | 'bronze'
}

export interface UserProfile {
  id: string
  username: string
  display_name: string
  bio?: string
  avatar_url?: string
  is_private: boolean
  is_self: boolean
  is_following: boolean
  is_pending: boolean
  is_followed_by: boolean
  followers_count: number
  following_count: number
  can_view_full: boolean
  created_at: string
  stats?: {
    total_pages_read: number
    total_books_read: number
    current_streak: number
    best_streak: number
  }
  achievements?: Array<{
    id: string
    achievement_code: string
    unlocked_at: string
    achievement: AchievementView
  }>
  library?: UserBook[]
}

export interface UserPrivacySettings {
  id: string
  user_id: string
  profile_visibility: 'public' | 'followers' | 'private'
  library_visibility: 'public' | 'followers' | 'private'
  stats_visibility: 'public' | 'followers' | 'private'
  journal_visibility: 'public' | 'followers' | 'private'
  created_at: string
  updated_at: string
}

export interface UserSearchResult {
  id: string
  username: string
  display_name: string
  bio?: string
  avatar_url?: string
  is_private: boolean
  is_following: boolean
}
