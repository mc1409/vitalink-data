-- Clean up all user/patient data for fresh start
-- This will remove all existing data but preserve table structures

-- Clean up all biomarker data
DELETE FROM biomarker_activity;
DELETE FROM biomarker_heart;
DELETE FROM biomarker_sleep;
DELETE FROM biomarker_nutrition;
DELETE FROM biomarker_biological_genetic_microbiome;

-- Clean up all clinical data
DELETE FROM clinical_diagnostic_lab_tests;
DELETE FROM clinical_diagnostic_cardiovascular;

-- Clean up AI insights and caches
DELETE FROM ai_insights_cache;
DELETE FROM ai_sleep_insights;

-- Clean up device integrations
DELETE FROM device_integrations;

-- Clean up document processing logs
DELETE FROM document_processing_logs;

-- Clean up health reports
DELETE FROM health_reports;

-- Clean up user feedback
DELETE FROM user_feedback;

-- Finally, clean up all patient data (this is our new consolidated table)
DELETE FROM user_patients;

-- Reset any sequences if needed (PostgreSQL auto-generates these)
-- Note: UUID primary keys don't use sequences, so this is mainly informational