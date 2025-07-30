-- Create storage bucket for medical PDFs
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'medical-pdfs', 
  'medical-pdfs', 
  false, 
  10485760, -- 10MB limit
  ARRAY['application/pdf']
);

-- Create storage policies for the medical-pdfs bucket
CREATE POLICY "Users can upload their own medical PDFs" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'medical-pdfs' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own medical PDFs" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'medical-pdfs' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own medical PDFs" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'medical-pdfs' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own medical PDFs" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'medical-pdfs' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);