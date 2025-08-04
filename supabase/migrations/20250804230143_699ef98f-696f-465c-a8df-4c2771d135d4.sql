-- Add source_document_id foreign key to clinical_diagnostic_lab_tests table
ALTER TABLE public.clinical_diagnostic_lab_tests 
ADD COLUMN source_document_id UUID REFERENCES public.document_processing_logs(id);

-- Create index for better performance on joins
CREATE INDEX idx_clinical_lab_tests_source_document ON public.clinical_diagnostic_lab_tests(source_document_id);

-- Add comment to document the relationship
COMMENT ON COLUMN public.clinical_diagnostic_lab_tests.source_document_id IS 'References the source document that contained this lab result';