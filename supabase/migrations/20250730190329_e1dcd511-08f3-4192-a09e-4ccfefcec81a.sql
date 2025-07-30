-- Create the missing document_processing_logs table for PDF upload tracking
CREATE TABLE public.document_processing_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  filename TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  storage_path TEXT,
  upload_status TEXT NOT NULL DEFAULT 'pending',
  processing_status TEXT NOT NULL DEFAULT 'pending',
  ai_analysis_status TEXT NOT NULL DEFAULT 'pending',
  extracted_text_preview TEXT,
  ai_structured_data JSONB,
  confidence_score NUMERIC,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.document_processing_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can manage their own document processing logs" 
ON public.document_processing_logs 
FOR ALL 
USING (auth.uid() = user_id);

-- Add update trigger
CREATE TRIGGER update_document_processing_logs_updated_at
BEFORE UPDATE ON public.document_processing_logs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();