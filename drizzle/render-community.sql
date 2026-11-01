CREATE INDEX posts_user_created_idx ON posts (user_id, created_at DESC);
CREATE INDEX posts_parent_idx ON posts (parent_id);
CREATE TABLE community_rate_limits (
  user_id text NOT NULL,
  window_start timestamptz NOT NULL,
  requests integer NOT NULL DEFAULT 1,
  PRIMARY KEY (user_id, window_start)
);
