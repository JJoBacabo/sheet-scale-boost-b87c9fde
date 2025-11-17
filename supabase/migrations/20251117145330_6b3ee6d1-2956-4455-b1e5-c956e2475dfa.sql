-- Create storage bucket for notes files
INSERT INTO storage.buckets (id, name, public)
VALUES ('notes-files', 'notes-files', true);

-- Create RLS policies for notes-files bucket
CREATE POLICY "Users can upload their own files"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'notes-files' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own files"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'notes-files' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own files"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'notes-files' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Public can view files"
ON storage.objects
FOR SELECT
USING (bucket_id = 'notes-files');