-- Repoint posts.author_id and comments.author_id from auth.users to
-- public.profiles so PostgREST can resolve `profiles:author_id(...)` embeds
-- used by /feed, /post/$id, /u/$username, etc.
--
-- profiles.id itself references auth.users(id) ON DELETE CASCADE, so the
-- delete cascade behaviour is preserved.

-- ============== posts.author_id ==============
DO $$
DECLARE
  cn text;
BEGIN
  -- Find any existing FK constraint on posts.author_id (typically the
  -- auto-generated `posts_author_id_fkey` pointing at auth.users(id))
  SELECT conname INTO cn
  FROM pg_constraint
  WHERE conrelid = 'public.posts'::regclass
    AND contype = 'f'
    AND pg_get_constraintdef(oid) ILIKE '%author_id%';

  IF cn IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.posts DROP CONSTRAINT %I', cn);
  END IF;
END $$;

ALTER TABLE public.posts
  ADD CONSTRAINT posts_author_id_fkey
  FOREIGN KEY (author_id) REFERENCES public.profiles(id)
  ON DELETE CASCADE;

-- ============== comments.author_id ==============
DO $$
DECLARE
  cn text;
BEGIN
  SELECT conname INTO cn
  FROM pg_constraint
  WHERE conrelid = 'public.comments'::regclass
    AND contype = 'f'
    AND pg_get_constraintdef(oid) ILIKE '%author_id%';

  IF cn IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.comments DROP CONSTRAINT %I', cn);
  END IF;
END $$;

ALTER TABLE public.comments
  ADD CONSTRAINT comments_author_id_fkey
  FOREIGN KEY (author_id) REFERENCES public.profiles(id)
  ON DELETE CASCADE;
