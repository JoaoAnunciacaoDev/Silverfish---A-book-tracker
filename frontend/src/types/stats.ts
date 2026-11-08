export interface MonthlyReadingStat {
  month: string
  pages: number
  sessions: number
}

export interface DayActivity {
  date: string
  pages: number
  sessions: number
}

export interface DashboardStats {
  books: {
    read: number
    reading: number
    in_collection: number
  }
  pages: {
    total: number
    this_year: number
    this_month: number
    last_7_days: number
    daily_average: number
    active_days: number
  }
  streaks: {
    current: number
    best: number
    goal_completion_rate: number
    total_days_tracked: number
    met_days_count: number
  }
  reviews_count: number
  monthly_overview: MonthlyReadingStat[]
}

export interface HeatmapResponse {
  start_date: string
  end_date: string
  activities: DayActivity[]
}
