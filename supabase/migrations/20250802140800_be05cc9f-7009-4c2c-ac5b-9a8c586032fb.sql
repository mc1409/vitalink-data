-- Schema Streamlining: Drop Non-Essential Columns
-- This migration removes columns identified as non-essential for the core clinical functionality

-- Phase 1: biomarker_activity - Drop 8 columns
ALTER TABLE biomarker_activity 
DROP COLUMN IF EXISTS workout_type,
DROP COLUMN IF EXISTS exercise_goal_minutes,
DROP COLUMN IF EXISTS move_goal_calories,
DROP COLUMN IF EXISTS move_goal_percentage,
DROP COLUMN IF EXISTS reference_range_min,
DROP COLUMN IF EXISTS reference_range_max,
DROP COLUMN IF EXISTS unit,
DROP COLUMN IF EXISTS raw_data;

-- Phase 2: biomarker_nutrition - Drop 10 columns
ALTER TABLE biomarker_nutrition
DROP COLUMN IF EXISTS breakfast_calories,
DROP COLUMN IF EXISTS lunch_calories,
DROP COLUMN IF EXISTS dinner_calories,
DROP COLUMN IF EXISTS snack_calories,
DROP COLUMN IF EXISTS eating_window_hours,
DROP COLUMN IF EXISTS meal_data,
DROP COLUMN IF EXISTS supplement_data,
DROP COLUMN IF EXISTS reference_range_min,
DROP COLUMN IF EXISTS reference_range_max,
DROP COLUMN IF EXISTS unit;

-- Phase 3: biomarker_heart - Drop 9 columns
ALTER TABLE biomarker_heart
DROP COLUMN IF EXISTS hr_zone_1_minutes,
DROP COLUMN IF EXISTS hr_zone_2_minutes,
DROP COLUMN IF EXISTS hr_zone_3_minutes,
DROP COLUMN IF EXISTS hr_zone_4_minutes,
DROP COLUMN IF EXISTS hr_zone_5_minutes,
DROP COLUMN IF EXISTS measurement_context,
DROP COLUMN IF EXISTS reference_range_min,
DROP COLUMN IF EXISTS reference_range_max,
DROP COLUMN IF EXISTS unit,
DROP COLUMN IF EXISTS raw_data;

-- Phase 4: biomarker_sleep - Drop 7 columns
ALTER TABLE biomarker_sleep
DROP COLUMN IF EXISTS room_temperature,
DROP COLUMN IF EXISTS ambient_light_level,
DROP COLUMN IF EXISTS noise_level,
DROP COLUMN IF EXISTS reference_range_min,
DROP COLUMN IF EXISTS reference_range_max,
DROP COLUMN IF EXISTS unit,
DROP COLUMN IF EXISTS raw_data;

-- Phase 5: biomarker_biological_genetic_microbiome - Drop 9 columns
ALTER TABLE biomarker_biological_genetic_microbiome
DROP COLUMN IF EXISTS sample_type,
DROP COLUMN IF EXISTS sample_collection_date,
DROP COLUMN IF EXISTS lab_processing_date,
DROP COLUMN IF EXISTS report_generated_date,
DROP COLUMN IF EXISTS reference_range_min,
DROP COLUMN IF EXISTS reference_range_max,
DROP COLUMN IF EXISTS unit,
DROP COLUMN IF EXISTS raw_data,
DROP COLUMN IF EXISTS recommendations;

-- Phase 6: clinical_diagnostic_cardiovascular - Drop 12 columns
ALTER TABLE clinical_diagnostic_cardiovascular
DROP COLUMN IF EXISTS blood_pressure_peak,
DROP COLUMN IF EXISTS rhythm,
DROP COLUMN IF EXISTS ecg_interpretation,
DROP COLUMN IF EXISTS stress_test_type,
DROP COLUMN IF EXISTS stress_test_result,
DROP COLUMN IF EXISTS findings,
DROP COLUMN IF EXISTS interpretation,
DROP COLUMN IF EXISTS performing_physician,
DROP COLUMN IF EXISTS performing_facility,
DROP COLUMN IF EXISTS reference_range_min,
DROP COLUMN IF EXISTS reference_range_max,
DROP COLUMN IF EXISTS unit,
DROP COLUMN IF EXISTS raw_data;

-- Phase 7: clinical_diagnostic_lab_tests - Drop 22 columns
ALTER TABLE clinical_diagnostic_lab_tests
DROP COLUMN IF EXISTS test_code,
DROP COLUMN IF EXISTS test_subcategory,
DROP COLUMN IF EXISTS standard_test_name,
DROP COLUMN IF EXISTS order_date,
DROP COLUMN IF EXISTS fasting_required,
DROP COLUMN IF EXISTS text_value,
DROP COLUMN IF EXISTS reference_range_text,
DROP COLUMN IF EXISTS abnormal_flag,
DROP COLUMN IF EXISTS result_status,
DROP COLUMN IF EXISTS interpretation,
DROP COLUMN IF EXISTS priority,
DROP COLUMN IF EXISTS test_status,
DROP COLUMN IF EXISTS ordering_physician,
DROP COLUMN IF EXISTS reviewing_physician,
DROP COLUMN IF EXISTS performing_lab,
DROP COLUMN IF EXISTS allergen,
DROP COLUMN IF EXISTS reaction,
DROP COLUMN IF EXISTS severity,
DROP COLUMN IF EXISTS onset_date,
DROP COLUMN IF EXISTS notes,
DROP COLUMN IF EXISTS raw_data;