-- Phase 4: Data Migration Strategy - Transfer existing data to new patient-centric tables

-- First, ensure all patients have profile_id set
UPDATE public.patients 
SET profile_id = (
  SELECT id FROM public.profiles 
  WHERE user_id = patients.user_id 
  LIMIT 1
)
WHERE profile_id IS NULL;

-- Migrate heart_metrics to biomarker_heart
INSERT INTO public.biomarker_heart (
  patient_id, measurement_time, data_source, device_type,
  resting_heart_rate, walking_heart_rate, workout_heart_rate, recovery_heart_rate,
  max_heart_rate, min_heart_rate, average_heart_rate,
  hrv_rmssd, hrv_sdnn, hrv_score, vo2_max,
  systolic_bp, diastolic_bp, afib_detected, irregular_rhythm_detected,
  ecg_rhythm_classification, cardio_fitness_level,
  hr_zone_1_minutes, hr_zone_2_minutes, hr_zone_3_minutes, hr_zone_4_minutes, hr_zone_5_minutes,
  measurement_context, raw_data, created_at, updated_at
)
SELECT 
  p.id as patient_id,
  h.measurement_timestamp as measurement_time,
  h.data_source,
  h.device_type,
  h.resting_heart_rate, h.walking_heart_rate, h.workout_heart_rate, h.recovery_heart_rate,
  h.max_heart_rate, h.min_heart_rate, h.average_heart_rate,
  h.hrv_rmssd, h.hrv_sdnn, h.hrv_score, h.vo2_max,
  h.systolic_bp, h.diastolic_bp, h.afib_detected, h.irregular_rhythm_detected,
  h.ecg_rhythm_classification, h.cardio_fitness_level,
  h.hr_zone_1_minutes, h.hr_zone_2_minutes, h.hr_zone_3_minutes, h.hr_zone_4_minutes, h.hr_zone_5_minutes,
  h.measurement_context, h.raw_data, h.created_at, h.updated_at
FROM public.heart_metrics h
JOIN public.patients p ON p.user_id = h.user_id
ON CONFLICT DO NOTHING;

-- Migrate sleep_metrics to biomarker_sleep
INSERT INTO public.biomarker_sleep (
  patient_id, measurement_time, sleep_date, data_source, device_type,
  bedtime, sleep_start, sleep_end, wake_time,
  total_sleep_time, time_in_bed, rem_sleep_minutes, deep_sleep_minutes, light_sleep_minutes, awake_minutes,
  sleep_efficiency, sleep_latency, sleep_score, sleep_debt, sleep_disturbances, restfulness_score,
  avg_heart_rate, min_heart_rate, max_heart_rate, avg_hrv, avg_respiratory_rate,
  avg_spo2, min_spo2, avg_body_temperature, temperature_deviation,
  room_temperature, ambient_light_level, noise_level, raw_data, created_at, updated_at
)
SELECT 
  p.id as patient_id,
  s.sleep_start as measurement_time,
  s.sleep_date,
  s.data_source,
  s.device_type,
  s.bedtime, s.sleep_start, s.sleep_end, s.wake_time,
  s.total_sleep_time, s.time_in_bed, s.rem_sleep_minutes, s.deep_sleep_minutes, s.light_sleep_minutes, s.awake_minutes,
  s.sleep_efficiency, s.sleep_latency, s.sleep_score, s.sleep_debt, s.sleep_disturbances, s.restfulness_score,
  s.avg_heart_rate, s.min_heart_rate, s.max_heart_rate, s.avg_hrv, s.avg_respiratory_rate,
  s.avg_spo2, s.min_spo2, s.avg_body_temperature, s.temperature_deviation,
  s.room_temperature, s.ambient_light_level, s.noise_level, s.raw_data, s.created_at, s.updated_at
FROM public.sleep_metrics s
JOIN public.patients p ON p.user_id = s.user_id
ON CONFLICT DO NOTHING;

-- Migrate activity_metrics to biomarker_activity
INSERT INTO public.biomarker_activity (
  patient_id, measurement_time, measurement_date, data_source, device_type,
  steps_count, distance_walked_meters, distance_ran_meters, distance_cycled_meters, flights_climbed,
  total_calories, active_calories, basal_calories, workout_calories,
  exercise_minutes, exercise_goal_minutes, vigorous_activity_minutes, moderate_activity_minutes, sedentary_minutes,
  stand_hours, stand_goal_hours, move_goal_calories, move_goal_percentage,
  workout_type, workout_duration_minutes, workout_distance_meters, workout_avg_heart_rate, workout_max_heart_rate,
  raw_data, created_at, updated_at
)
SELECT 
  p.id as patient_id,
  a.measurement_timestamp as measurement_time,
  a.measurement_date,
  a.data_source,
  a.device_type,
  a.steps_count, a.distance_walked_meters, a.distance_ran_meters, a.distance_cycled_meters, a.flights_climbed,
  a.total_calories, a.active_calories, a.basal_calories, a.workout_calories,
  a.exercise_minutes, a.exercise_goal_minutes, a.vigorous_activity_minutes, a.moderate_activity_minutes, a.sedentary_minutes,
  a.stand_hours, a.stand_goal_hours, a.move_goal_calories, a.move_goal_percentage,
  a.workout_type, a.workout_duration_minutes, a.workout_distance_meters, a.workout_avg_heart_rate, a.workout_max_heart_rate,
  a.raw_data, a.created_at, a.updated_at
FROM public.activity_metrics a
JOIN public.patients p ON p.user_id = a.user_id
ON CONFLICT DO NOTHING;

-- Migrate nutrition_metrics to biomarker_nutrition
INSERT INTO public.biomarker_nutrition (
  patient_id, measurement_time, measurement_date, data_source,
  total_calories, carbohydrates_grams, protein_grams, fat_grams, fiber_grams, sugar_grams, added_sugar_grams,
  sodium_mg, potassium_mg, calcium_mg, magnesium_mg, iron_mg, zinc_mg, phosphorus_mg,
  vitamin_a_iu, vitamin_c_mg, vitamin_d_iu, vitamin_e_mg, vitamin_k_mcg,
  thiamine_mg, riboflavin_mg, niacin_mg, vitamin_b6_mg, folate_mcg, vitamin_b12_mcg, biotin_mcg, pantothenic_acid_mg,
  water_intake_ml, caffeine_mg, alcohol_grams,
  breakfast_calories, lunch_calories, dinner_calories, snack_calories, eating_window_hours,
  meal_data, supplement_data, created_at, updated_at
)
SELECT 
  p.id as patient_id,
  COALESCE(n.measurement_date::timestamp, n.created_at) as measurement_time,
  n.measurement_date,
  n.data_source,
  n.total_calories, n.carbohydrates_grams, n.protein_grams, n.fat_grams, n.fiber_grams, n.sugar_grams, n.added_sugar_grams,
  n.sodium_mg, n.potassium_mg, n.calcium_mg, n.magnesium_mg, n.iron_mg, n.zinc_mg, n.phosphorus_mg,
  n.vitamin_a_iu, n.vitamin_c_mg, n.vitamin_d_iu, n.vitamin_e_mg, n.vitamin_k_mcg,
  n.thiamine_mg, n.riboflavin_mg, n.niacin_mg, n.vitamin_b6_mg, n.folate_mcg, n.vitamin_b12_mcg, n.biotin_mcg, n.pantothenic_acid_mg,
  n.water_intake_ml, n.caffeine_mg, n.alcohol_grams,
  n.breakfast_calories, n.lunch_calories, n.dinner_calories, n.snack_calories, n.eating_window_hours,
  n.meal_data, n.supplement_data, n.created_at, n.updated_at
FROM public.nutrition_metrics n
JOIN public.patients p ON p.user_id = n.user_id
ON CONFLICT DO NOTHING;

-- Migrate microbiome_metrics + recovery_strain_metrics to biomarker_biological_genetic_microbiome
INSERT INTO public.biomarker_biological_genetic_microbiome (
  patient_id, measurement_time, test_date, data_source, test_provider,
  microbiome_age, alpha_diversity, beta_diversity, species_richness, microbial_diversity_shannon,
  dysbiosis_index, firmicutes_bacteroidetes_ratio, beneficial_bacteria_score, pathogenic_bacteria_score,
  bifidobacterium_level, lactobacillus_level, akkermansia_level, proteobacteria_level, candida_level,
  butyrate_production, acetate_production, propionate_production,
  vitamin_b_production, vitamin_k_production, folate_production,
  fiber_utilization_score, fat_utilization_score, carb_utilization_score, protein_utilization_score,
  immune_function_score, mitochondrial_health_score, oxidative_stress_score, inflammatory_pathways_score,
  recovery_score, strain_score, hrv_score, resting_hr_score, sleep_performance_score, stress_score,
  cardiovascular_load, skin_temperature, skin_temperature_deviation, hydration_level,
  caffeine_intake_mg, alcohol_consumption_units,
  raw_data, recommendations, created_at, updated_at
)
-- First from microbiome_metrics
SELECT 
  p.id as patient_id,
  COALESCE(m.test_date::timestamp, m.created_at) as measurement_time,
  m.test_date,
  'Microbiome Test' as data_source,
  m.test_provider,
  m.microbiome_age, m.alpha_diversity, m.beta_diversity, m.species_richness, m.microbial_diversity_shannon,
  m.dysbiosis_index, m.firmicutes_bacteroidetes_ratio, m.beneficial_bacteria_score, m.pathogenic_bacteria_score,
  m.bifidobacterium_level, m.lactobacillus_level, m.akkermansia_level, m.proteobacteria_level, m.candida_level,
  m.butyrate_production, m.acetate_production, m.propionate_production,
  m.vitamin_b_production, m.vitamin_k_production, m.folate_production,
  m.fiber_utilization_score, m.fat_utilization_score, m.carb_utilization_score, m.protein_utilization_score,
  m.immune_function_score, m.mitochondrial_health_score, m.oxidative_stress_score, m.inflammatory_pathways_score,
  null, null, null, null, null, null, -- recovery metrics (null for microbiome records)
  null, null, null, null,
  null, null,
  m.raw_data, m.recommendations, m.created_at, m.updated_at
FROM public.microbiome_metrics m
JOIN public.patients p ON p.user_id = m.user_id
ON CONFLICT DO NOTHING;

-- Then add recovery/strain data
INSERT INTO public.biomarker_biological_genetic_microbiome (
  patient_id, measurement_time, test_date, data_source, test_provider,
  recovery_score, strain_score, hrv_score, resting_hr_score, sleep_performance_score, stress_score,
  cardiovascular_load, skin_temperature, skin_temperature_deviation, hydration_level,
  caffeine_intake_mg, alcohol_consumption_units,
  raw_data, created_at, updated_at
)
SELECT 
  p.id as patient_id,
  COALESCE(r.measurement_date::timestamp, r.created_at) as measurement_time,
  r.measurement_date as test_date,
  r.data_source,
  'Recovery Device' as test_provider,
  r.recovery_score, r.strain_score, r.hrv_score, r.resting_hr_score, r.sleep_performance_score, r.stress_score,
  r.cardiovascular_load, r.skin_temperature, r.skin_temperature_deviation, r.hydration_level,
  r.caffeine_intake_mg, r.alcohol_consumption_units,
  r.raw_data, r.created_at, r.updated_at
FROM public.recovery_strain_metrics r
JOIN public.patients p ON p.user_id = r.user_id
ON CONFLICT DO NOTHING;

-- Migrate lab_results + lab_tests + allergies to clinical_diagnostic_lab_tests
INSERT INTO public.clinical_diagnostic_lab_tests (
  patient_id, measurement_time, data_source,
  test_name, test_type, test_category, test_code, test_subcategory,
  sample_type, collection_date, order_date, result_date, fasting_required,
  result_value, numeric_value, text_value, unit,
  reference_range_min, reference_range_max, reference_range_text,
  is_out_of_range, abnormal_flag, result_status, interpretation,
  priority, test_status, ordering_physician, reviewing_physician, performing_lab,
  notes, created_at, updated_at
)
SELECT 
  lt.patient_id,
  COALESCE(lr.result_date::timestamp, lt.created_at) as measurement_time,
  'Laboratory' as data_source,
  COALESCE(lr.result_name, lt.test_name) as test_name,
  'standard' as test_type,
  lt.test_category,
  lt.test_code,
  lt.test_subcategory,
  lt.specimen_type as sample_type,
  lt.collection_date, lt.order_date, lr.result_date, lt.fasting_required,
  lr.text_value as result_value, lr.numeric_value, lr.text_value,
  lr.units as unit,
  lr.reference_range_min, lr.reference_range_max, lr.reference_range_text,
  CASE WHEN lr.abnormal_flag IS NOT NULL AND lr.abnormal_flag != 'normal' THEN true ELSE false END as is_out_of_range,
  lr.abnormal_flag, lr.result_status, lr.interpretation,
  lt.priority, lt.test_status, lt.ordering_physician, lr.reviewing_physician, lt.performing_lab,
  COALESCE(lr.text_value, lt.notes) as notes,
  COALESCE(lr.created_at, lt.created_at) as created_at,
  COALESCE(lr.updated_at, lt.updated_at) as updated_at
FROM public.lab_tests lt
LEFT JOIN public.lab_results lr ON lr.lab_test_id = lt.id
WHERE lt.patient_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- Add allergies to clinical_diagnostic_lab_tests
INSERT INTO public.clinical_diagnostic_lab_tests (
  patient_id, measurement_time, data_source,
  test_name, test_type, test_category,
  allergen, reaction, severity, result_status,
  notes, created_at, updated_at
)
SELECT 
  a.patient_id,
  COALESCE(a.onset_date::timestamp, a.created_at) as measurement_time,
  'Clinical Assessment' as data_source,
  'Allergy Test - ' || a.allergen as test_name,
  'allergy' as test_type,
  'allergy' as test_category,
  a.allergen, a.reaction, a.severity,
  'final' as result_status,
  a.notes, a.created_at, a.updated_at
FROM public.allergies a
WHERE a.patient_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- Migrate cardiovascular_tests to clinical_diagnostic_cardiovascular
INSERT INTO public.clinical_diagnostic_cardiovascular (
  patient_id, measurement_time, test_date, data_source,
  test_type, test_status, heart_rate, systolic_bp, diastolic_bp, blood_pressure_peak,
  rhythm, ecg_interpretation, pr_interval, qrs_duration, qt_interval, qtc_interval, axis_degrees,
  stress_test_type, stress_test_result, target_heart_rate, max_heart_rate, exercise_duration, mets_achieved,
  findings, interpretation, performing_physician, performing_facility,
  created_at, updated_at
)
SELECT 
  c.patient_id,
  COALESCE(c.test_date::timestamp, c.created_at) as measurement_time,
  c.test_date, 'Clinical' as data_source,
  c.test_type, c.test_status, c.heart_rate, null, null, c.blood_pressure_peak,
  c.rhythm, c.ecg_interpretation, c.pr_interval, c.qrs_duration, c.qt_interval, c.qtc_interval, c.axis_degrees,
  c.stress_test_type, c.stress_test_result, c.target_heart_rate, c.max_heart_rate, c.exercise_duration, c.mets_achieved,
  c.findings, c.interpretation, c.performing_physician, c.performing_facility,
  c.created_at, c.updated_at
FROM public.cardiovascular_tests c
WHERE c.patient_id IS NOT NULL
ON CONFLICT DO NOTHING;