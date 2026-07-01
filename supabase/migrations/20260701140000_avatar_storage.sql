-- Create avatars storage bucket (public)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('avatars', 'avatars', true, 5242880, '{image/jpeg,image/png,image/webp,image/gif}')
ON CONFLICT (id) DO NOTHING;

-- Anyone can view avatars (public bucket)
CREATE POLICY "avatars_public_select"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'avatars');

-- Users can insert/update/delete files in their own folder
CREATE POLICY "avatars_own_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "avatars_own_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "avatars_own_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
