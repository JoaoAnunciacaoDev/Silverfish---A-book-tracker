import { apiClient } from './client'
import type { AchievementsResponse } from '@/types/achievements'

export async function listAchievements(): Promise<AchievementsResponse> {
  return apiClient<AchievementsResponse>('/api/achievements')
}
