import { apiClient } from './client'
import type { AdminDashboardData, AdminUserView } from '@/types/admin'

export async function getAdminDashboardStats(): Promise<AdminDashboardData> {
  return apiClient('/api/admin/dashboard')
}

export async function listAdminUsers(
  page: number = 1,
  limit: number = 20,
  query?: string,
  role?: string
): Promise<{
  users: AdminUserView[]
  page: number
  limit: number
  total: number
}> {
  let url = `/api/admin/users?page=${page}&limit=${limit}`
  if (query) url += `&q=${encodeURIComponent(query)}`
  if (role) url += `&role=${encodeURIComponent(role)}`
  return apiClient(url)
}

export async function updateUserRole(
  userId: string,
  role: 'USER' | 'SUPERUSER'
): Promise<{ message: string; user_id: string; role: string }> {
  return apiClient(`/api/admin/users/${userId}/role`, {
    method: 'PUT',
    body: JSON.stringify({ role }),
  })
}
