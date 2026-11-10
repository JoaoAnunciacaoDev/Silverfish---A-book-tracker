DROP INDEX IF EXISTS idx_user_books_in_collection;
ALTER TABLE user_books DROP COLUMN IF EXISTS in_collection;
