CREATE TABLE IF NOT EXISTS activity_likes (
    id TEXT PRIMARY KEY,
    activity_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(activity_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_activity_likes_activity ON activity_likes(activity_id);
CREATE INDEX IF NOT EXISTS idx_activity_likes_user ON activity_likes(user_id);

CREATE TABLE IF NOT EXISTS activity_comments (
    id TEXT PRIMARY KEY,
    activity_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_activity_comments_activity ON activity_comments(activity_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_activity_comments_user ON activity_comments(user_id);
