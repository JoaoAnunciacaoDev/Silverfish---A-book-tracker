import { apiClient } from './client'
import type {
  PatchNote,
  CreatePatchNoteInput,
  UpdatePatchNoteInput,
} from '@/types/patchNotes'

export async function getPublishedPatchNotes(): Promise<{
  patch_notes: PatchNote[]
  total: number
}> {
  return apiClient('/api/patch-notes')
}

export async function getLatestPatchNote(): Promise<{ latest: PatchNote | null }> {
  return apiClient('/api/patch-notes/latest')
}

export async function getPatchNote(idOrVersion: string): Promise<{ patch_note: PatchNote }> {
  return apiClient(`/api/patch-notes/${encodeURIComponent(idOrVersion)}`)
}

export async function adminListAllPatchNotes(): Promise<{
  patch_notes: PatchNote[]
  total: number
}> {
  return apiClient('/api/admin/patch-notes')
}

export async function adminCreatePatchNote(data: CreatePatchNoteInput): Promise<{
  message: string
  patch_note: PatchNote
}> {
  return apiClient('/api/admin/patch-notes', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function adminUpdatePatchNote(
  id: string,
  data: UpdatePatchNoteInput
): Promise<{
  message: string
  patch_note: PatchNote
}> {
  return apiClient(`/api/admin/patch-notes/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export async function adminDeletePatchNote(id: string): Promise<{ message: string }> {
  return apiClient(`/api/admin/patch-notes/${id}`, {
    method: 'DELETE',
  })
}
