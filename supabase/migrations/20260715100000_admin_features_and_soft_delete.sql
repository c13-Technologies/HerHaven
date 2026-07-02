-- =====================================================================
-- 20260715100000_admin_features_and_soft_delete.sql
-- Stage 1 of the admin dashboard expansion.
--
-- Adds:
--   *   Soft-delete columns on posts + comments (hidden_at, hidden_by,
--       hidden_reason) so mods can hide content without losing the row,
--       with a corresponding RLS update so non-author / non-mod users
--       no longer see hidden rows.
--   *   Drops the now-unused categories.emoji column (replaced by the
--       `<CategoryIcon>` lucide-icon map in src/lib/category-icons.tsx).
--   *   admin_audit_logs table — mod/admin-SELECT, no client writes.
--   *   Four SECURITY DEFINER RPCs gated by has_role(), each writing
--       a matching row into admin_audit_logs inside the same
--       transaction:
--         - admin_set_user_role(target_user_id, role)
--         - admin_manage_category(action, slug, name?, description?, ord?)
--         - admin_hide_content(type, target_id, reason)
--         - admin_reinstate_content(type, target_id)
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Soft-delete columns
-- ---------------------------------------------------------------------
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS hidden_at   timestamptz,
  ADD COLUMN IF NOT EXISTS hidden_by   uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS hidden_reason text;

ALTER TABLE public.comments
  ADD COLUMN IF NOT EXISTS hidden_at   timestamptz,
  ADD COLUMN IF NOT EXISTS hidden_by   uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS hidden_reason text;

CREATE INDEX IF NOT EXISTS posts_hidden_idx
  ON public.posts(hidden_at) WHERE hidden_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS comments_hidden_idx
  ON public.comments(hidden_at) WHERE hidden_at IS NOT NULL;

-- ---------------------------------------------------------------------
-- 2. Drop the unused categories.emoji column
--    (UI now uses CategoryIcon in src/lib/category-icons.tsx)
-- ---------------------------------------------------------------------
ALTER TABLE public.categories DROP COLUMN IF EXISTS emoji;

-- ---------------------------------------------------------------------
-- 3. Admin audit log — admin/mods can SELECT, no direct client inserts
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id    uuid NOT NULL REFERENCES auth.users(id),
  action_type text NOT NULL,
  target_type text NOT NULL,
  target_id   text NOT NULL,
  metadata    jsonb,
  created_at  timestamptz NOT NULL DEFAULT now(),
  CHECK (target_type IN ('post', 'comment', 'user', 'category', 'report'))
);

CREATE INDEX IF NOT EXISTS admin_audit_logs_actor_idx
  ON public.admin_audit_logs(actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS admin_audit_logs_target_idx
  ON public.admin_audit_logs(target_type, target_id, created_at DESC);

ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.admin_audit_logs TO authenticated;
GRANT ALL    ON public.admin_audit_logs TO service_role;

DROP POLICY IF EXISTS "mods read all audit logs" ON public.admin_audit_logs;
CREATE POLICY "mods read all audit logs" ON public.admin_audit_logs
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(),'moderator')
    OR public.has_role(auth.uid(),'admin')
  );

-- ---------------------------------------------------------------------
-- 4. Update existing RLS SELECT policies to exclude soft-hidden content
--    from authors-without-override paths. Authors still see their own
--    (so they see the "Removed by moderator" banner in the UI), and
--    mods/admins always see.
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS "posts readable to signed in (non-circle or member)" ON public.posts;
DROP POLICY IF EXISTS "posts readable to signed in (non-hidden or author or mod)" ON public.posts;
CREATE POLICY "posts readable to signed in (non-hidden or author or mod)" ON public.posts
  FOR SELECT TO authenticated
  USING (
    (
      circle_id IS NULL
      OR public.is_circle_member(auth.uid(), circle_id)
      OR public.has_role(auth.uid(), 'moderator')
      OR public.has_role(auth.uid(), 'admin')
    )
    AND (
      hidden_at IS NULL
      OR auth.uid() = author_id
      OR public.has_role(auth.uid(), 'moderator')
      OR public.has_role(auth.uid(), 'admin')
    )
  );

DROP POLICY IF EXISTS "comments visible if post visible" ON public.comments;
DROP POLICY IF EXISTS "comments visible if post visible and not hidden (except author/mod)" ON public.comments;
CREATE POLICY "comments visible if post visible and not hidden (except author/mod)" ON public.comments
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.posts p
      WHERE p.id = post_id
        AND (
          p.circle_id IS NULL
          OR public.is_circle_member(auth.uid(), p.circle_id)
          OR public.has_role(auth.uid(),'moderator')
          OR public.has_role(auth.uid(),'admin')
        )
    )
    AND (
      hidden_at IS NULL
      OR auth.uid() = author_id
      OR public.has_role(auth.uid(),'moderator')
      OR public.has_role(auth.uid(),'admin')
    )
  );

-- ---------------------------------------------------------------------
-- 5. SECURITY DEFINER RPCs for admin actions
--    Each function:
--      a) Verifies the caller has the required role.
--      b) Performs the action inside the implicit transaction.
--      c) Writes an audit row to admin_audit_logs.
-- ---------------------------------------------------------------------

-- 5a. Promote / demote a user. ADMIN-only.
CREATE OR REPLACE FUNCTION public.admin_set_user_role(
  p_target_user_id uuid,
  p_role public.app_role
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existed boolean;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'admin_set_user_role: caller is not an admin';
  END IF;

  -- 'user' = implicit (handle_new_user inserted that row at signup).
  -- Demoting a moderator or admin back to plain user means deleting
  -- their explicit role rows. We never delete the 'user' row itself.
  IF p_role = 'user' THEN
    DELETE FROM public.user_roles
      WHERE user_id = p_target_user_id
        AND role IN ('moderator', 'admin');
  ELSE
    INSERT INTO public.user_roles (user_id, role)
      VALUES (p_target_user_id, p_role)
      ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  INSERT INTO public.admin_audit_logs (actor_id, action_type, target_type, target_id, metadata)
  VALUES (
    auth.uid(),
    'change_role',
    'user',
    p_target_user_id::text,
    jsonb_build_object('new_role', p_role)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_set_user_role(uuid, public.app_role)
  TO authenticated;

-- 5b. Create / update / delete a category. ADMIN-only.
CREATE OR REPLACE FUNCTION public.admin_manage_category(
  p_action      text,               -- 'UPSERT' or 'DELETE'
  p_slug        text,
  p_name        text DEFAULT NULL,
  p_description text DEFAULT NULL,
  p_ord         int  DEFAULT 0
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'admin_manage_category: caller is not an admin';
  END IF;
  IF p_action NOT IN ('UPSERT','DELETE') THEN
    RAISE EXCEPTION 'admin_manage_category: invalid action %', p_action;
  END IF;

  IF p_action = 'DELETE' THEN
    -- Posts reference categories by slug; only delete categories
    -- with no dependent posts to preserve referential integrity.
    IF EXISTS (
      SELECT 1 FROM public.posts WHERE category_slug = p_slug LIMIT 1
    ) THEN
      RAISE EXCEPTION 'admin_manage_category: cannot delete category % (still referenced by posts)', p_slug;
    END IF;
    DELETE FROM public.categories WHERE slug = p_slug;
  ELSE
    INSERT INTO public.categories (slug, name, description, ord)
      VALUES (p_slug, p_name, COALESCE(p_description, ''), COALESCE(p_ord, 0))
      ON CONFLICT (slug) DO UPDATE
        SET name        = EXCLUDED.name,
            description = EXCLUDED.description,
            ord         = EXCLUDED.ord;
  END IF;

  INSERT INTO public.admin_audit_logs (actor_id, action_type, target_type, target_id, metadata)
  VALUES (
    auth.uid(),
    'category_' || lower(p_action),
    'category',
    p_slug,
    jsonb_build_object('name', p_name, 'ord', p_ord)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_manage_category(text, text, text, text, int)
  TO authenticated;

-- 5c. Hide a post or comment. Mod or admin.
--    Auto-resolves any pending reports against the same target so the
--    reports queue stays in sync without a second write.
CREATE OR REPLACE FUNCTION public.admin_hide_content(
  p_type      text,                 -- 'post' or 'comment'
  p_target_id uuid,
  p_reason    text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (
    public.has_role(auth.uid(),'moderator')
    OR public.has_role(auth.uid(),'admin')
  ) THEN
    RAISE EXCEPTION 'admin_hide_content: caller is not a mod/admin';
  END IF;
  IF p_type NOT IN ('post','comment') THEN
    RAISE EXCEPTION 'admin_hide_content: invalid type %', p_type;
  END IF;
  IF p_reason IS NULL OR length(trim(p_reason)) = 0 THEN
    RAISE EXCEPTION 'admin_hide_content: reason is required';
  END IF;

  IF p_type = 'post' THEN
    UPDATE public.posts
       SET hidden_at     = now(),
           hidden_by     = auth.uid(),
           hidden_reason = p_reason
     WHERE id = p_target_id
       AND hidden_at IS NULL;
  ELSE
    UPDATE public.comments
       SET hidden_at     = now(),
           hidden_by     = auth.uid(),
           hidden_reason = p_reason
     WHERE id = p_target_id
       AND hidden_at IS NULL;
  END IF;

  -- Auto-resolve any matching pending reports
  UPDATE public.reports
     SET status = 'actioned'
   WHERE target_type = p_type
     AND target_id   = p_target_id
     AND status      = 'pending';

  INSERT INTO public.admin_audit_logs (actor_id, action_type, target_type, target_id, metadata)
  VALUES (
    auth.uid(),
    'hide_content',
    p_type,
    p_target_id::text,
    jsonb_build_object('reason', p_reason)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_hide_content(text, uuid, text)
  TO authenticated;

-- 5d. Reinstate previously-hidden content. Mod or admin.
CREATE OR REPLACE FUNCTION public.admin_reinstate_content(
  p_type      text,
  p_target_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (
    public.has_role(auth.uid(),'moderator')
    OR public.has_role(auth.uid(),'admin')
  ) THEN
    RAISE EXCEPTION 'admin_reinstate_content: caller is not a mod/admin';
  END IF;
  IF p_type NOT IN ('post','comment') THEN
    RAISE EXCEPTION 'admin_reinstate_content: invalid type %', p_type;
  END IF;

  IF p_type = 'post' THEN
    UPDATE public.posts
       SET hidden_at = NULL,
           hidden_by = NULL,
           hidden_reason = NULL
     WHERE id = p_target_id
       AND hidden_at IS NOT NULL;
  ELSE
    UPDATE public.comments
       SET hidden_at = NULL,
           hidden_by = NULL,
           hidden_reason = NULL
     WHERE id = p_target_id
       AND hidden_at IS NOT NULL;
  END IF;

  INSERT INTO public.admin_audit_logs (actor_id, action_type, target_type, target_id, metadata)
  VALUES (
    auth.uid(),
    'reinstate_content',
    p_type,
    p_target_id::text,
    NULL
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_reinstate_content(text, uuid)
  TO authenticated;
