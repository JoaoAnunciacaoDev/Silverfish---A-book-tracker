import { apiClient } from './client'
import type {
  NotificationSettings,
  NotificationSettingsResponse,
} from '@/types/notifications'

export async function getVapidPublicKey(): Promise<{ vapid_public_key: string }> {
  return apiClient('/api/notifications/vapid-public-key')
}

export async function subscribePush(data: {
  endpoint: string
  keys: { p256dh: string; auth: string }
  user_agent?: string
}): Promise<{ message: string }> {
  return apiClient('/api/notifications/subscribe', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function unsubscribePush(endpoint: string): Promise<{ message: string }> {
  return apiClient('/api/notifications/unsubscribe', {
    method: 'POST',
    body: JSON.stringify({ endpoint }),
  })
}

export async function getNotificationSettings(): Promise<NotificationSettingsResponse> {
  return apiClient('/api/notifications/settings')
}

export async function updateNotificationSettings(
  data: Partial<NotificationSettings>
): Promise<{
  message: string
  settings: NotificationSettings
}> {
  return apiClient('/api/notifications/settings', {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export async function sendTestNotification(): Promise<{
  message: string
  payload: { title: string; body: string; icon: string }
}> {
  return apiClient('/api/notifications/test', {
    method: 'POST',
  })
}
