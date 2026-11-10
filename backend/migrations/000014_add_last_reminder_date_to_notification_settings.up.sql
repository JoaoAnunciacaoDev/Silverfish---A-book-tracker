ALTER TABLE notification_settings ADD COLUMN IF NOT EXISTS last_reminder_date TEXT NOT NULL DEFAULT '';
