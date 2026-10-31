CREATE TABLE public.ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol text NOT NULL,
  user_id uuid NOT NULL,
  stars smallint NOT NULL CHECK (stars BETWEEN 0 AND 5),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (symbol, user_id)
);
GRANT SELECT ON public.ratings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ratings TO authenticated;
GRANT ALL ON public.ratings TO service_role;
ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ratings readable" ON public.ratings FOR SELECT USING (true);
CREATE POLICY "rate own" ON public.ratings FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update own" ON public.ratings FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "delete own" ON public.ratings FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol text NOT NULL,
  user_id uuid NOT NULL,
  author_name text NOT NULL,
  parent_id uuid REFERENCES public.posts(id) ON DELETE CASCADE,
  content text NOT NULL CHECK (char_length(content) BETWEEN 1 AND 2000),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX posts_symbol_idx ON public.posts(symbol, created_at DESC);
GRANT SELECT ON public.posts TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.posts TO authenticated;
GRANT ALL ON public.posts TO service_role;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "posts readable" ON public.posts FOR SELECT USING (true);
CREATE POLICY "post own" ON public.posts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete own post" ON public.posts FOR DELETE TO authenticated USING (auth.uid() = user_id);