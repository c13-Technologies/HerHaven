-- =====================================================================
-- 20260716110000_admin_manage_category_ord_auto.sql
-- Tighten the admin_manage_category UPSERT branch.
--
-- Goal: two admins adding a new category at the same time should NOT
-- produce two rows sharing the same ord (which would render order
-- ambiguously). The new INSERT path computes ord = MAX(ord) + 1 inside
-- the same SQL transaction, which is race-safe.
--
-- The UPDATE branch intentionally does NOT touch ord — open-ended
-- position edits still belong to the dedicated admin_reorder_categories
-- RPC. This keeps the UPSERT RPC purpose narrow: "create or rename".
-- =====================================================================

CREATE OR REPLACE FUNCTION public.admin_manage_category(
  p_action      text,               -- 'UPSERT' or 'DELETE'
  p_slug        text,
  p_name        text DEFAULT NULL,
  p_description text DEFAULT NULL,
  p_ord         int  DEFAULT NULL   -- accepted for back-compat but unused on UPSERT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_next_ord int;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'admin_manage_category: caller is not an admin';
  END IF;
  IF p_action NOT IN ('UPSERT','DELETE') THEN
    RAISE EXCEPTION 'admin_manage_category: invalid action %', p_action;
  END IF;

  IF p_action = 'DELETE' THEN
    IF EXISTS (
      SELECT 1 FROM public.posts WHERE category_slug = p_slug LIMIT 1
    ) THEN
      RAISE EXCEPTION 'admin_manage_category: cannot delete category % (still referenced by posts)', p_slug;
    END IF;
    DELETE FROM public.categories WHERE slug = p_slug;
  ELSE
    -- Race-safe next-ord for INSERT path. If the row already exists,
    -- ON CONFLICT DO UPDATE keeps the existing ord untouched.
    SELECT COALESCE(MAX(ord), 0) + 1
      INTO v_next_ord
      FROM public.categories;

    INSERT INTO public.categories (slug, name, description, ord)
      VALUES (p_slug, p_name, COALESCE(p_description, ''), v_next_ord)
      ON CONFLICT (slug) DO UPDATE
        SET name        = EXCLUDED.name,
            description = EXCLUDED.description;
    -- ord NOT updated on conflict so position stays put. Use
    -- admin_reorder_categories for drag-to-reorder.
  END IF;

  INSERT INTO public.admin_audit_logs (actor_id, action_type, target_type, target_id, metadata)
  VALUES (
    auth.uid(),
    'category_' || lower(p_action),
    'category',
    p_slug,
    jsonb_build_object('name', p_name)
  );
END;
$$;

-- No need to re-grant: GRANT EXECUTE was issued in the original migration
-- and remains in effect for the replacement function.
