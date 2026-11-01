ALTER TABLE posts ADD COLUMN pinned_at timestamptz;
CREATE INDEX posts_pinned_idx ON posts (market, symbol, parent_id) WHERE pinned_at IS NOT NULL AND hidden_at IS NULL;
