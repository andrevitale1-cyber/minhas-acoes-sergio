-- PostgreSQL independente de Supabase. Aplicar apenas em um banco novo.
CREATE TABLE posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  market text NOT NULL,
  symbol text NOT NULL,
  user_id text NOT NULL,
  author_name text NOT NULL CHECK (char_length(author_name) BETWEEN 1 AND 100),
  parent_id uuid REFERENCES posts(id) ON DELETE CASCADE,
  content text NOT NULL CHECK (char_length(trim(content)) BETWEEN 1 AND 2000),
  hidden_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX posts_asset_created_idx ON posts (market, symbol, created_at DESC);

CREATE TABLE ratings (
  market text NOT NULL,
  symbol text NOT NULL,
  user_id text NOT NULL,
  stars smallint NOT NULL CHECK (stars BETWEEN 1 AND 5),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (market, symbol, user_id)
);
