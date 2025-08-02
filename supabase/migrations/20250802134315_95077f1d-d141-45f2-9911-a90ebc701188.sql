-- Drop all remaining old tables that have been replaced by the new patient-centric schema

-- Drop old individual metrics tables
DROP TABLE IF EXISTS activity_metrics CASCADE;
DROP TABLE IF EXISTS heart_metrics CASCADE;
DROP TABLE IF EXISTS nutrition_metrics CASCADE;
DROP TABLE IF EXISTS microbiome_metrics CASCADE;
DROP TABLE IF EXISTS sleep_metrics CASCADE;
DROP TABLE IF EXISTS environmental_metrics CASCADE;
DROP TABLE IF EXISTS recovery_strain_metrics CASCADE;

-- Drop old clinical tables
DROP TABLE IF EXISTS cardiovascular_tests CASCADE;
DROP TABLE IF EXISTS lab_tests CASCADE;
DROP TABLE IF EXISTS lab_results CASCADE;
DROP TABLE IF EXISTS imaging_studies CASCADE;

-- Drop any remaining utility tables that are no longer needed
DROP TABLE IF EXISTS test_standardization_map CASCADE;