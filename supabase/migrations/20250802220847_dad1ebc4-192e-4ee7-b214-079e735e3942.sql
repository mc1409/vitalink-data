-- Add unique constraints to biomarker tables to support upsert operations

-- Unique constraint for biomarker_activity table
-- Prevents duplicate activity records for the same patient on the same date from the same source
ALTER TABLE biomarker_activity 
ADD CONSTRAINT biomarker_activity_unique_patient_date_source 
UNIQUE (patient_id, measurement_date, data_source);

-- Unique constraint for biomarker_heart table  
-- Prevents duplicate heart records for the same patient at the same time from the same source
ALTER TABLE biomarker_heart 
ADD CONSTRAINT biomarker_heart_unique_patient_time_source 
UNIQUE (patient_id, measurement_time, data_source);

-- Unique constraint for biomarker_sleep table
-- Prevents duplicate sleep records for the same patient on the same sleep date from the same source  
ALTER TABLE biomarker_sleep 
ADD CONSTRAINT biomarker_sleep_unique_patient_date_source 
UNIQUE (patient_id, sleep_date, data_source);