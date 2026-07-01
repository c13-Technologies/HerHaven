-- Allow reactions to target comments (not just posts)

-- Make post_id nullable, add comment_id
ALTER TABLE public.reactions
  ALTER COLUMN post_id DROP NOT NULL,
  ADD COLUMN comment_id uuid REFERENCES public.comments(id) ON DELETE CASCADE;

-- Ensure exactly one target per reaction
ALTER TABLE public.reactions
  ADD CONSTRAINT reactions_target_check
    CHECK (
      (post_id IS NOT NULL AND comment_id IS NULL) OR
      (post_id IS NULL AND comment_id IS NOT NULL)
    );

-- Drop old unique constraint (post_id, user_id, type)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'reactions_post_id_user_id_type_key'
    AND conrelid = 'public.reactions'::regclass
  ) THEN
    ALTER TABLE public.reactions DROP CONSTRAINT reactions_post_id_user_id_type_key;
  END IF;
END $$;

-- Partial unique indexes — one per target type
DROP INDEX IF EXISTS reactions_post_user_type_idx;
CREATE UNIQUE INDEX reactions_post_user_type_idx
  ON public.reactions(post_id, user_id, type)
  WHERE post_id IS NOT NULL;

DROP INDEX IF EXISTS reactions_comment_user_type_idx;
CREATE UNIQUE INDEX reactions_comment_user_type_idx
  ON public.reactions(comment_id, user_id, type)
  WHERE comment_id IS NOT NULL;

-- Update SELECT policy: visible if reaction is on a visible post,
-- or on a comment whose parent post is visible
DROP POLICY IF EXISTS "reactions visible if post visible" ON public.reactions;
CREATE POLICY "reactions_visible"
ON public.reactions FOR SELECT
TO authenticated
USING (
  (
    post_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.posts p
      WHERE p.id = reactions.post_id
        AND (
          p.circle_id IS NULL
          OR public.is_circle_member(auth.uid(), p.circle_id)
          OR public.has_role(auth.uid(), 'moderator'::public.app_role)
          OR public.has_role(auth.uid(), 'admin'::public.app_role)
        )
    )
  )
  OR
  (
    comment_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.comments c
      JOIN public.posts p ON p.id = c.post_id
      WHERE c.id = reactions.comment_id
        AND (
          p.circle_id IS NULL
          OR public.is_circle_member(auth.uid(), p.circle_id)
          OR public.has_role(auth.uid(), 'moderator'::public.app_role)
          OR public.has_role(auth.uid(), 'admin'::public.app_role)
        )
    )
  )
);

-- INSERT policy: unchanged — users still insert their own reactions
-- (the existing "users add own reactions" policy still applies)
