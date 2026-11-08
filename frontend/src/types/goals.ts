export interface GoalData {
  daily_page_target: number
  today: {
    date: string
    pages_read: number
    target: number
    met: boolean
    percentage: number
  }
}

export interface StreakData {
  current_streak: number
  best_streak: number
  today_met: boolean
}

export interface GoalHistoryItem {
  id: string
  date: string
  pages_read: number
  target: number
  met: boolean
}
