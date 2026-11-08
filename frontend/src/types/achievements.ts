export interface AchievementView {
  code: string
  title: string
  description: string
  icon: string
  category: 'pages' | 'books' | 'streak' | 'reading' | 'shelf' | 'reviews' | string
  target_value: number
  current_value: number
  progress_percent: number
  unlocked: boolean
  unlocked_at?: string | null
}

export interface AchievementsResponse {
  achievements: AchievementView[]
  total_count: number
  unlocked_count: number
  newly_unlocked: string[]
}
