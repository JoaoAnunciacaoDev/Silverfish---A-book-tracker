import { apiClient } from './client'
import type {
  ActivityItem,
  ActivityComment,
  ActivityLiker,
  LeaderboardEntry,
  UserProfile,
  UserPrivacySettings,
  UserSearchResult,
} from '@/types/social'
import type { User } from '@/types/auth'

export async function getSocialFeed(page: number = 1, limit: number = 20): Promise<{
  activities: ActivityItem[]
  page: number
  limit: number
  total: number
}> {
  return apiClient(`/api/social/feed?page=${page}&limit=${limit}`)
}

export async function getLeaderboard(
  criterion: 'pages' | 'books' | 'streak',
  year?: string,
  month?: string
): Promise<{
  criterion: string
  year?: string
  month?: string
  leaderboard: LeaderboardEntry[]
  total: number
}> {
  const params = new URLSearchParams()
  params.set('criterion', criterion)
  if (year) params.set('year', year)
  if (month) params.set('month', month)

  return apiClient(`/api/social/rankings?${params.toString()}`)
}

export async function toggleActivityLike(activityId: string): Promise<{
  liked: boolean
  likes_count: number
}> {
  return apiClient(`/api/social/activities/${activityId}/like`, {
    method: 'POST',
  })
}

export async function getActivityLikes(activityId: string): Promise<{
  likes: ActivityLiker[]
  total: number
}> {
  return apiClient(`/api/social/activities/${activityId}/likes`)
}

export async function getActivityComments(activityId: string): Promise<{
  comments: ActivityComment[]
  total: number
}> {
  return apiClient(`/api/social/activities/${activityId}/comments`)
}

export async function createActivityComment(
  activityId: string,
  content: string
): Promise<{
  message: string
  comment: ActivityComment
}> {
  return apiClient(`/api/social/activities/${activityId}/comments`, {
    method: 'POST',
    body: JSON.stringify({ content }),
  })
}

export async function deleteActivityComment(commentId: string): Promise<{ message: string }> {
  return apiClient(`/api/social/comments/${commentId}`, {
    method: 'DELETE',
  })
}

export async function getUserProfile(username: string): Promise<UserProfile> {
  return apiClient(`/api/users/profile/${encodeURIComponent(username)}`)
}

export async function updateUserProfile(data: {
  display_name?: string
  bio?: string
  avatar_url?: string
  timezone?: string
  is_private?: boolean
}): Promise<{ message: string; user: User }> {
  return apiClient('/api/users/me/profile', {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export async function getPrivacySettings(): Promise<{
  privacy: UserPrivacySettings
  is_private: boolean
}> {
  return apiClient('/api/users/me/privacy')
}

export async function updatePrivacySettings(data: {
  profile_visibility?: 'public' | 'followers' | 'private'
  library_visibility?: 'public' | 'followers' | 'private'
  stats_visibility?: 'public' | 'followers' | 'private'
  journal_visibility?: 'public' | 'followers' | 'private'
  is_private?: boolean
}): Promise<{
  message: string
  privacy: UserPrivacySettings
  is_private: boolean
}> {
  return apiClient('/api/users/me/privacy', {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export async function searchUsers(query: string): Promise<{ users: UserSearchResult[]; total: number }> {
  return apiClient(`/api/users/search?q=${encodeURIComponent(query)}`)
}

export async function followUser(username: string): Promise<{
  message: string
  status: 'accepted' | 'pending'
}> {
  return apiClient(`/api/users/${encodeURIComponent(username)}/follow`, {
    method: 'POST',
  })
}

export async function unfollowUser(username: string): Promise<{ message: string }> {
  return apiClient(`/api/users/${encodeURIComponent(username)}/follow`, {
    method: 'DELETE',
  })
}

export async function getFollowers(username: string): Promise<{
  username: string
  followers: UserSearchResult[]
  total: number
}> {
  return apiClient(`/api/users/${encodeURIComponent(username)}/followers`)
}

export async function getFollowing(username: string): Promise<{
  username: string
  following: UserSearchResult[]
  total: number
}> {
  return apiClient(`/api/users/${encodeURIComponent(username)}/following`)
}

export async function getPendingFollows(): Promise<{
  pending_requests: Array<{
    id: string
    follower: User
    created_at: string
  }>
  total: number
}> {
  return apiClient('/api/users/me/pending-follows')
}

export async function respondFollowRequest(
  followId: string,
  action: 'accept' | 'reject'
): Promise<{ message: string }> {
  return apiClient(`/api/users/follows/${followId}/respond`, {
    method: 'POST',
    body: JSON.stringify({ action }),
  })
}
