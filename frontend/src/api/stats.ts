import { apiClient } from './client'
import type { DashboardStats, HeatmapResponse } from '@/types/stats'

export async function getDashboardStats(): Promise<DashboardStats> {
  return apiClient<DashboardStats>('/api/stats/dashboard')
}

export async function getHeatmapData(): Promise<HeatmapResponse> {
  return apiClient<HeatmapResponse>('/api/stats/heatmap')
}
