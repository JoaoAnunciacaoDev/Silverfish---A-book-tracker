CREATE TABLE IF NOT EXISTS reading_sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    user_book_id TEXT NOT NULL,
    start_page INTEGER NOT NULL,
    end_page INTEGER NOT NULL,
    pages_read INTEGER NOT NULL,
    read_at DATE NOT NULL,
    comprehension INTEGER,
    feeling TEXT,
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (user_book_id) REFERENCES user_books(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_reading_sessions_user_id ON reading_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_reading_sessions_user_book ON reading_sessions(user_book_id);
CREATE INDEX IF NOT EXISTS idx_reading_sessions_read_at ON reading_sessions(user_id, read_at);
