-- Update patient ID across all tables from aab92d9e-4fbd-4ffd-adbe-10958eda66d5 to 6f62cad2-f00a-4cb4-8575-7f74b9e42e81

-- Update the main patients table
UPDATE public.patients 
SET id = '6f62cad2-f00a-4cb4-8575-7f74b9e42e81'
WHERE id = 'aab92d9e-4fbd-4ffd-adbe-10958eda66d5';

-- Update profiles table to reference the new patient ID
UPDATE public.profiles 
SET primary_patient_id = '6f62cad2-f00a-4cb4-8575-7f74b9e42e81'
WHERE primary_patient_id = 'aab92d9e-4fbd-4ffd-adbe-10958eda66d5';

-- Update biomarker tables
UPDATE public.biomarker_heart 
SET patient_id = '6f62cad2-f00a-4cb4-8575-7f74b9e42e81'
WHERE patient_id = 'aab92d9e-4fbd-4ffd-adbe-10958eda66d5';

UPDATE public.biomarker_sleep 
SET patient_id = '6f62cad2-f00a-4cb4-8575-7f74b9e42e81'
WHERE patient_id = 'aab92d9e-4fbd-4ffd-adbe-10958eda66d5';

UPDATE public.biomarker_activity 
SET patient_id = '6f62cad2-f00a-4cb4-8575-7f74b9e42e81'
WHERE patient_id = 'aab92d9e-4fbd-4ffd-adbe-10958eda66d5';

UPDATE public.biomarker_nutrition 
SET patient_id = '6f62cad2-f00a-4cb4-8575-7f74b9e42e81'
WHERE patient_id = 'aab92d9e-4fbd-4ffd-adbe-10958eda66d5';

UPDATE public.biomarker_biological_genetic_microbiome 
SET patient_id = '6f62cad2-f00a-4cb4-8575-7f74b9e42e81'
WHERE patient_id = 'aab92d9e-4fbd-4ffd-adbe-10958eda66d5';

-- Update clinical tables
UPDATE public.clinical_diagnostic_lab_tests 
SET patient_id = '6f62cad2-f00a-4cb4-8575-7f74b9e42e81'
WHERE patient_id = 'aab92d9e-4fbd-4ffd-adbe-10958eda66d5';

UPDATE public.clinical_diagnostic_cardiovascular 
SET patient_id = '6f62cad2-f00a-4cb4-8575-7f74b9e42e81'
WHERE patient_id = 'aab92d9e-4fbd-4ffd-adbe-10958eda66d5';

-- Update device integrations
UPDATE public.device_integrations 
SET patient_id = '6f62cad2-f00a-4cb4-8575-7f74b9e42e81'
WHERE patient_id = 'aab92d9e-4fbd-4ffd-adbe-10958eda66d5';

-- Update document processing logs
UPDATE public.document_processing_logs 
SET patient_id = '6f62cad2-f00a-4cb4-8575-7f74b9e42e81'
WHERE patient_id = 'aab92d9e-4fbd-4ffd-adbe-10958eda66d5';

-- Update health reports
UPDATE public.health_reports 
SET patient_id = '6f62cad2-f00a-4cb4-8575-7f74b9e42e81'
WHERE patient_id = 'aab92d9e-4fbd-4ffd-adbe-10958eda66d5';

-- Update user feedback
UPDATE public.user_feedback 
SET patient_id = '6f62cad2-f00a-4cb4-8575-7f74b9e42e81'
WHERE patient_id = 'aab92d9e-4fbd-4ffd-adbe-10958eda66d5';

-- Update AI insights cache
UPDATE public.ai_insights_cache 
SET patient_id = '6f62cad2-f00a-4cb4-8575-7f74b9e42e81'
WHERE patient_id = 'aab92d9e-4fbd-4ffd-adbe-10958eda66d5';