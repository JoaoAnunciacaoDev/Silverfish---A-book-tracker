export interface NotificationSettings {
  user_id?: string
  daily_reminder_enabled: boolean
  reminder_time: string
  streak_alert_enabled: boolean
  social_notifications_enabled: boolean
  updated_at?: string
}

export interface NotificationSettingsResponse {
  settings: NotificationSettings
  active_devices_count: number
}
