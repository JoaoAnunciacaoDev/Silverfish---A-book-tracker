import { apiClient } from './client'
import type { GoalData, GoalHistoryItem, StreakData } from '@/types/goals'

export async function getGoal(): Promise<GoalData> {
  return apiClient<GoalData>('/api/goals')
}

export async function updateGoal(
  dailyPageTarget: number
): Promise<{ message: string; daily_page_target: number }> {
  return apiClient<{ message: string; daily_page_target: number }>('/api/goals', {
    method: 'PUT',
    body: JSON.stringify({ daily_page_target: dailyPageTarget }),
  })
}

export async function getStreak(): Promise<StreakData> {
  return apiClient<StreakData>('/api/goals/streak')
}

export async function getGoalHistory(month?: string): Promise<{ history: GoalHistoryItem[] }> {
  const query = new URLSearchParams()
  if (month) query.set('month', month)

  const queryString = query.toString()
  const endpoint = queryString ? `/api/goals/history?${queryString}` : '/api/goals/history'

  return apiClient<{ history: GoalHistoryItem[] }>(endpoint)
}
