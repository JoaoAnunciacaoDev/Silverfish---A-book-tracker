ALTER TABLE user_books ADD COLUMN IF NOT EXISTS in_collection BOOLEAN NOT NULL DEFAULT FALSE;
CREATE INDEX IF NOT EXISTS idx_user_books_in_collection ON user_books(in_collection);
