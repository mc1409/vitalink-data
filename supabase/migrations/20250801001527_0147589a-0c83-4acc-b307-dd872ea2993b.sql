-- Add test_date and result_date columns to lab_results table for proper date tracking
ALTER TABLE public.lab_results 
ADD COLUMN test_date DATE,
ADD COLUMN result_date DATE;

-- Add index on test_date for better timeline query performance
CREATE INDEX idx_lab_results_test_date ON public.lab_results(test_date);

-- Add comments for clarity
COMMENT ON COLUMN public.lab_results.test_date IS 'Date when the lab test was performed or sample was collected';
COMMENT ON COLUMN public.lab_results.result_date IS 'Date when the lab results were reported or made available';