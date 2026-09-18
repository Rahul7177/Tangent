CREATE TABLE IF NOT EXISTS users (
  username VARCHAR(24) PRIMARY KEY CHECK (username ~ '^[a-z0-9._-]{3,24}$'),
  name VARCHAR(80) NOT NULL,
  phone VARCHAR(32) NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  chat_id TEXT NOT NULL,
  sender_username VARCHAR(24) NOT NULL REFERENCES users(username),
  recipient_username VARCHAR(24) NOT NULL,
  text VARCHAR(2000) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reply_to_id TEXT,
  CONSTRAINT messages_text_not_empty CHECK (length(trim(text)) > 0)
);

CREATE INDEX IF NOT EXISTS messages_recipient_created_idx
  ON messages (recipient_username, created_at);

CREATE INDEX IF NOT EXISTS messages_sender_created_idx
  ON messages (sender_username, created_at);