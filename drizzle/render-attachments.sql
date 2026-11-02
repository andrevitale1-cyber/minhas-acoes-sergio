CREATE TABLE comment_attachments (
  id uuid PRIMARY KEY,
  owner_id text NOT NULL,
  post_id uuid REFERENCES posts(id) ON DELETE CASCADE,
  pathname text NOT NULL UNIQUE,
  file_name text NOT NULL CHECK (char_length(file_name) BETWEEN 1 AND 180),
  content_type text NOT NULL,
  size integer NOT NULL CHECK (size BETWEEN 1 AND 3145728),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX comment_attachments_post_idx ON comment_attachments(post_id);
CREATE INDEX comment_attachments_owner_idx ON comment_attachments(owner_id, created_at) WHERE post_id IS NULL;
ALTER TABLE posts DROP CONSTRAINT IF EXISTS posts_content_check;
ALTER TABLE posts ADD CONSTRAINT posts_content_check CHECK (char_length(trim(content)) BETWEEN 0 AND 2000);
