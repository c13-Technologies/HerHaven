
drop policy if exists "system inserts notifications" on public.notifications;
create policy "users insert notifications for self" on public.notifications for insert with check (auth.uid() = user_id);
