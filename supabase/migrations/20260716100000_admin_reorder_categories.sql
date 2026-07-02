-- =====================================================================
-- 20260716100000_admin_reorder_categories.sql
-- Stage 3 of the admin dashboard expansion.
--
-- Adds:
--   *   admin_reorder_categories(p_slugs text[]) RPC — accepts the
--       slug list in the new desired order, updates each row's
--       ord column to its 1-based position in one transaction.
--       Admin-gated and writes a single audit log row.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.admin_reorder_categories(p_slugs text[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count int;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'admin_reorder_categories: caller is not an admin';
  END IF;

  v_count := array_length(p_slugs, 1);
  IF v_count IS NULL OR v_count = 0 THEN
    RAISE EXCEPTION 'admin_reorder_categories: empty slugs array';
  END IF;

  FOR i IN 1..v_count LOOP
    UPDATE public.categories
       SET ord = i
     WHERE slug = p_slugs[i];
  END LOOP;

  INSERT INTO public.admin_audit_logs (actor_id, action_type, target_type, target_id, metadata)
  VALUES (
    auth.uid(),
    'reorder_categories',
    'category',
    'all',
    jsonb_build_object('count', v_count, 'slugs', to_jsonb(p_slugs))
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_reorder_categories(text[])
  TO authenticated;
