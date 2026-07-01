
-- 1) circle_members: replace permissive self-join with public-circle-only self-join
DROP POLICY IF EXISTS "users join self" ON public.circle_members;
CREATE POLICY "users join self public circles"
ON public.circle_members
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.circles c
    WHERE c.id = circle_members.circle_id AND c.is_private = false
  )
);

-- 2) notifications: remove client insert policy (server/trusted code only)
DROP POLICY IF EXISTS "users insert notifications for self" ON public.notifications;

-- 3) reactions: SELECT must mirror post visibility
DROP POLICY IF EXISTS "reactions visible" ON public.reactions;
CREATE POLICY "reactions visible if post visible"
ON public.reactions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.posts p
    WHERE p.id = reactions.post_id
      AND (
        p.circle_id IS NULL
        OR public.is_circle_member(auth.uid(), p.circle_id)
        OR public.has_role(auth.uid(), 'moderator'::app_role)
        OR public.has_role(auth.uid(), 'admin'::app_role)
      )
  )
);

-- 4) user_roles: explicitly revoke write privileges from regular roles.
-- Role rows are only written by SECURITY DEFINER functions (handle_new_user) or service_role.
REVOKE INSERT, UPDATE, DELETE ON public.user_roles FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.user_roles FROM anon;
GRANT ALL ON public.user_roles TO service_role;
