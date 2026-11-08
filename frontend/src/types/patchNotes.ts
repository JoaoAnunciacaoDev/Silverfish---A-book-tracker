import type { User } from './auth'

export interface PatchNoteChanges {
  features?: string[]
  improvements?: string[]
  fixes?: string[]
}

export interface PatchNote {
  id: string
  version: string
  title: string
  summary: string
  changes_json: string
  is_published: boolean
  published_at?: string | null
  created_by: string
  created_at: string
  updated_at: string
  author?: User
}

export interface CreatePatchNoteInput {
  version: string
  title: string
  summary: string
  changes?: PatchNoteChanges
  is_published?: boolean
}

export interface UpdatePatchNoteInput {
  title?: string
  summary?: string
  changes?: PatchNoteChanges
  is_published?: boolean
}
