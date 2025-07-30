-- Device Integration Metadata
CREATE TABLE public.device_integrations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_type TEXT NOT NULL, -- 'apple_health', 'whoop', 'oura', 'viome', 'fitbit', 'garmin'
  device_model TEXT,
  device_name TEXT,
  is_active BOOLEAN DEFAULT true,
  last_sync_timestamp TIMESTAMP WITH TIME ZONE,
  sync_frequency INTEGER DEFAULT 1440, -- minutes (24 hours default)
  api_version TEXT,
  authentication_status TEXT CHECK (authentication_status IN ('connected', 'disconnected', 'error', 'pending')) DEFAULT 'pending',
  data_permissions_granted JSONB, -- store granted permissions as JSON
  sync_settings JSONB, -- store sync preferences
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, device_type)
);

-- Enable RLS on device_integrations
ALTER TABLE public.device_integrations ENABLE ROW LEVEL SECURITY;

-- Create policies for device_integrations
CREATE POLICY "Users can manage their own device integrations" 
ON public.device_integrations 
FOR ALL 
USING (auth.uid() = user_id);

-- Activity & Fitness Metrics
CREATE TABLE public.activity_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_type TEXT NOT NULL,
  measurement_date DATE NOT NULL,
  measurement_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  
  -- Step and movement data
  steps_count INTEGER,
  distance_walked_meters DECIMAL(10,2),
  distance_ran_meters DECIMAL(10,2),
  distance_cycled_meters DECIMAL(10,2),
  flights_climbed INTEGER,
  
  -- Energy and calories
  active_calories INTEGER,
  basal_calories INTEGER,
  total_calories INTEGER,
  
  -- Activity time
  exercise_minutes INTEGER,
  moderate_activity_minutes INTEGER,
  vigorous_activity_minutes INTEGER,
  stand_hours INTEGER,
  sedentary_minutes INTEGER,
  
  -- Goals and achievements
  move_goal_calories INTEGER,
  move_goal_percentage DECIMAL(5,2),
  exercise_goal_minutes INTEGER,
  stand_goal_hours INTEGER,
  
  -- Workout specific data
  workout_type TEXT,
  workout_duration_minutes INTEGER,
  workout_calories INTEGER,
  workout_distance_meters DECIMAL(10,2),
  workout_avg_heart_rate INTEGER,
  workout_max_heart_rate INTEGER,
  
  -- Metadata
  data_source TEXT,
  raw_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on activity_metrics
ALTER TABLE public.activity_metrics ENABLE ROW LEVEL SECURITY;

-- Create policies for activity_metrics
CREATE POLICY "Users can manage their own activity metrics" 
ON public.activity_metrics 
FOR ALL 
USING (auth.uid() = user_id);

-- Heart Health Metrics
CREATE TABLE public.heart_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_type TEXT NOT NULL,
  measurement_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  
  -- Heart rate measurements
  resting_heart_rate INTEGER,
  walking_heart_rate INTEGER,
  workout_heart_rate INTEGER,
  recovery_heart_rate INTEGER,
  max_heart_rate INTEGER,
  min_heart_rate INTEGER,
  average_heart_rate INTEGER,
  
  -- Heart rate variability
  hrv_rmssd DECIMAL(6,2),
  hrv_sdnn DECIMAL(6,2),
  hrv_score INTEGER, -- 0-100 for devices that provide scored HRV
  
  -- Advanced metrics
  vo2_max DECIMAL(5,2),
  cardio_fitness_level TEXT,
  
  -- ECG/Rhythm data
  ecg_rhythm_classification TEXT,
  afib_detected BOOLEAN DEFAULT false,
  irregular_rhythm_detected BOOLEAN DEFAULT false,
  
  -- Blood pressure (manual or connected device)
  systolic_bp INTEGER,
  diastolic_bp INTEGER,
  
  -- Heart rate zones (minutes spent in each zone)
  hr_zone_1_minutes INTEGER, -- Recovery zone
  hr_zone_2_minutes INTEGER, -- Aerobic base
  hr_zone_3_minutes INTEGER, -- Aerobic threshold
  hr_zone_4_minutes INTEGER, -- Lactate threshold
  hr_zone_5_minutes INTEGER, -- Neuromuscular power
  
  -- Metadata
  measurement_context TEXT, -- 'resting', 'exercise', 'sleep', 'recovery'
  data_source TEXT,
  raw_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on heart_metrics
ALTER TABLE public.heart_metrics ENABLE ROW LEVEL SECURITY;

-- Create policies for heart_metrics
CREATE POLICY "Users can manage their own heart metrics" 
ON public.heart_metrics 
FOR ALL 
USING (auth.uid() = user_id);

-- Sleep Metrics
CREATE TABLE public.sleep_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_type TEXT NOT NULL,
  sleep_date DATE NOT NULL,
  
  -- Sleep timing
  bedtime TIMESTAMP WITH TIME ZONE,
  sleep_start TIMESTAMP WITH TIME ZONE,
  sleep_end TIMESTAMP WITH TIME ZONE,
  wake_time TIMESTAMP WITH TIME ZONE,
  
  -- Sleep duration (in minutes)
  total_sleep_time INTEGER,
  time_in_bed INTEGER,
  rem_sleep_minutes INTEGER,
  deep_sleep_minutes INTEGER,
  light_sleep_minutes INTEGER,
  awake_minutes INTEGER,
  
  -- Sleep quality metrics
  sleep_efficiency DECIMAL(5,2), -- percentage
  sleep_latency INTEGER, -- minutes to fall asleep
  sleep_score INTEGER, -- 0-100 overall sleep score
  sleep_debt INTEGER, -- minutes of sleep debt
  sleep_disturbances INTEGER, -- number of wake events
  restfulness_score INTEGER, -- movement during sleep
  
  -- Physiological metrics during sleep
  avg_heart_rate INTEGER,
  min_heart_rate INTEGER,
  max_heart_rate INTEGER,
  avg_hrv DECIMAL(6,2),
  avg_respiratory_rate DECIMAL(4,1),
  avg_spo2 INTEGER,
  min_spo2 INTEGER,
  avg_body_temperature DECIMAL(4,2),
  temperature_deviation DECIMAL(3,2),
  
  -- Environmental factors
  room_temperature DECIMAL(4,1),
  ambient_light_level INTEGER,
  noise_level INTEGER,
  
  -- Metadata
  data_source TEXT,
  raw_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE(user_id, device_type, sleep_date)
);

-- Enable RLS on sleep_metrics
ALTER TABLE public.sleep_metrics ENABLE ROW LEVEL SECURITY;

-- Create policies for sleep_metrics
CREATE POLICY "Users can manage their own sleep metrics" 
ON public.sleep_metrics 
FOR ALL 
USING (auth.uid() = user_id);

-- Recovery & Strain Metrics (WHOOP specific but adaptable)
CREATE TABLE public.recovery_strain_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_type TEXT NOT NULL,
  measurement_date DATE NOT NULL,
  
  -- Recovery metrics
  recovery_score INTEGER, -- 0-100
  hrv_score INTEGER,
  resting_hr_score INTEGER,
  sleep_performance_score INTEGER,
  
  -- Strain metrics
  strain_score DECIMAL(4,1), -- 0-21 for WHOOP
  cardiovascular_load INTEGER,
  max_strain_time TIMESTAMP WITH TIME ZONE,
  
  -- Physiological measurements
  skin_temperature DECIMAL(4,2),
  skin_temperature_deviation DECIMAL(3,2),
  stress_score INTEGER,
  
  -- Calories and energy
  total_calories INTEGER,
  active_calories INTEGER,
  
  -- Additional metrics
  hydration_level INTEGER, -- 0-100 if tracked
  alcohol_consumption_units DECIMAL(3,1),
  caffeine_intake_mg INTEGER,
  
  -- Metadata
  data_source TEXT,
  raw_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE(user_id, device_type, measurement_date)
);

-- Enable RLS on recovery_strain_metrics
ALTER TABLE public.recovery_strain_metrics ENABLE ROW LEVEL SECURITY;

-- Create policies for recovery_strain_metrics
CREATE POLICY "Users can manage their own recovery strain metrics" 
ON public.recovery_strain_metrics 
FOR ALL 
USING (auth.uid() = user_id);

-- Microbiome Metrics (Viome and similar)
CREATE TABLE public.microbiome_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  test_provider TEXT NOT NULL, -- 'viome', 'ubiome', 'thryve', etc.
  test_date DATE NOT NULL,
  sample_collection_date DATE,
  sample_type TEXT, -- 'stool', 'saliva', 'urine'
  
  -- Diversity metrics
  microbial_diversity_shannon DECIMAL(6,3),
  species_richness INTEGER,
  alpha_diversity DECIMAL(6,3),
  beta_diversity DECIMAL(6,3),
  
  -- Key ratios and indices
  firmicutes_bacteroidetes_ratio DECIMAL(6,3),
  dysbiosis_index DECIMAL(6,3),
  microbiome_age DECIMAL(5,1),
  proteobacteria_level DECIMAL(6,3),
  
  -- Beneficial bacteria levels
  bifidobacterium_level DECIMAL(6,3),
  lactobacillus_level DECIMAL(6,3),
  akkermansia_level DECIMAL(6,3),
  beneficial_bacteria_score INTEGER, -- 0-100
  
  -- Pathogenic indicators
  pathogenic_bacteria_score INTEGER, -- 0-100
  candida_level DECIMAL(6,3),
  
  -- Functional capabilities
  butyrate_production DECIMAL(6,3),
  acetate_production DECIMAL(6,3),
  propionate_production DECIMAL(6,3),
  vitamin_b_production INTEGER, -- 0-100 score
  vitamin_k_production INTEGER, -- 0-100 score
  folate_production INTEGER, -- 0-100 score
  
  -- Health markers
  inflammatory_pathways_score INTEGER, -- 0-100
  oxidative_stress_score INTEGER, -- 0-100
  mitochondrial_health_score INTEGER, -- 0-100
  immune_function_score INTEGER, -- 0-100
  
  -- Nutritional insights scores
  protein_utilization_score INTEGER, -- 0-100
  carb_utilization_score INTEGER, -- 0-100
  fat_utilization_score INTEGER, -- 0-100
  fiber_utilization_score INTEGER, -- 0-100
  
  -- Metadata
  test_version TEXT,
  lab_processing_date DATE,
  report_generated_date DATE,
  raw_data JSONB,
  recommendations JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on microbiome_metrics
ALTER TABLE public.microbiome_metrics ENABLE ROW LEVEL SECURITY;

-- Create policies for microbiome_metrics
CREATE POLICY "Users can manage their own microbiome metrics" 
ON public.microbiome_metrics 
FOR ALL 
USING (auth.uid() = user_id);

-- Environmental & Exposure Metrics
CREATE TABLE public.environmental_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_type TEXT NOT NULL,
  measurement_date DATE NOT NULL,
  measurement_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  
  -- UV and light exposure
  uv_exposure_minutes INTEGER,
  uv_index_max DECIMAL(3,1),
  bright_light_exposure_minutes INTEGER,
  
  -- Audio exposure
  headphone_audio_level INTEGER, -- decibels
  environmental_audio_level INTEGER, -- decibels
  loud_environment_exposure_minutes INTEGER,
  
  -- Air quality (if available)
  air_quality_index INTEGER,
  pm25_level DECIMAL(6,2),
  pm10_level DECIMAL(6,2),
  ozone_level DECIMAL(6,2),
  
  -- Safety events
  fall_detected BOOLEAN DEFAULT false,
  fall_timestamp TIMESTAMP WITH TIME ZONE,
  emergency_alert_triggered BOOLEAN DEFAULT false,
  
  -- Location-based (if permitted)
  altitude_meters INTEGER,
  weather_temperature DECIMAL(4,1),
  humidity_percentage INTEGER,
  barometric_pressure DECIMAL(6,2),
  
  -- Metadata
  data_source TEXT,
  raw_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on environmental_metrics
ALTER TABLE public.environmental_metrics ENABLE ROW LEVEL SECURITY;

-- Create policies for environmental_metrics
CREATE POLICY "Users can manage their own environmental metrics" 
ON public.environmental_metrics 
FOR ALL 
USING (auth.uid() = user_id);

-- Nutrition Metrics
CREATE TABLE public.nutrition_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  measurement_date DATE NOT NULL,
  data_source TEXT, -- 'myfitnesspal', 'cronometer', 'manual', etc.
  
  -- Macronutrients
  total_calories INTEGER,
  carbohydrates_grams DECIMAL(6,2),
  protein_grams DECIMAL(6,2),
  fat_grams DECIMAL(6,2),
  fiber_grams DECIMAL(6,2),
  sugar_grams DECIMAL(6,2),
  added_sugar_grams DECIMAL(6,2),
  
  -- Minerals
  sodium_mg DECIMAL(8,2),
  potassium_mg DECIMAL(8,2),
  calcium_mg DECIMAL(8,2),
  magnesium_mg DECIMAL(8,2),
  iron_mg DECIMAL(6,2),
  zinc_mg DECIMAL(6,2),
  phosphorus_mg DECIMAL(8,2),
  
  -- Vitamins
  vitamin_a_iu DECIMAL(8,2),
  vitamin_c_mg DECIMAL(6,2),
  vitamin_d_iu DECIMAL(8,2),
  vitamin_e_mg DECIMAL(6,2),
  vitamin_k_mcg DECIMAL(6,2),
  thiamine_mg DECIMAL(6,2),
  riboflavin_mg DECIMAL(6,2),
  niacin_mg DECIMAL(6,2),
  vitamin_b6_mg DECIMAL(6,2),
  folate_mcg DECIMAL(6,2),
  vitamin_b12_mcg DECIMAL(6,2),
  biotin_mcg DECIMAL(6,2),
  pantothenic_acid_mg DECIMAL(6,2),
  
  -- Hydration
  water_intake_ml INTEGER,
  caffeine_mg DECIMAL(6,2),
  alcohol_grams DECIMAL(6,2),
  
  -- Meal timing
  breakfast_calories INTEGER,
  lunch_calories INTEGER,
  dinner_calories INTEGER,
  snack_calories INTEGER,
  eating_window_hours DECIMAL(4,2), -- for intermittent fasting
  
  -- Metadata
  meal_data JSONB, -- detailed meal breakdown
  supplement_data JSONB, -- supplements taken
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE(user_id, measurement_date, data_source)
);

-- Enable RLS on nutrition_metrics
ALTER TABLE public.nutrition_metrics ENABLE ROW LEVEL SECURITY;

-- Create policies for nutrition_metrics
CREATE POLICY "Users can manage their own nutrition metrics" 
ON public.nutrition_metrics 
FOR ALL 
USING (auth.uid() = user_id);

-- Create triggers for biomarker tables
CREATE TRIGGER update_device_integrations_updated_at
  BEFORE UPDATE ON public.device_integrations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_activity_metrics_updated_at
  BEFORE UPDATE ON public.activity_metrics
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_heart_metrics_updated_at
  BEFORE UPDATE ON public.heart_metrics
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sleep_metrics_updated_at
  BEFORE UPDATE ON public.sleep_metrics
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_recovery_strain_metrics_updated_at
  BEFORE UPDATE ON public.recovery_strain_metrics
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_microbiome_metrics_updated_at
  BEFORE UPDATE ON public.microbiome_metrics
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_environmental_metrics_updated_at
  BEFORE UPDATE ON public.environmental_metrics
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_nutrition_metrics_updated_at
  BEFORE UPDATE ON public.nutrition_metrics
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better query performance
CREATE INDEX idx_activity_metrics_user_date ON public.activity_metrics(user_id, measurement_date);
CREATE INDEX idx_heart_metrics_user_timestamp ON public.heart_metrics(user_id, measurement_timestamp);
CREATE INDEX idx_sleep_metrics_user_date ON public.sleep_metrics(user_id, sleep_date);
CREATE INDEX idx_recovery_strain_metrics_user_date ON public.recovery_strain_metrics(user_id, measurement_date);
CREATE INDEX idx_microbiome_metrics_user_date ON public.microbiome_metrics(user_id, test_date);
CREATE INDEX idx_environmental_metrics_user_date ON public.environmental_metrics(user_id, measurement_date);
CREATE INDEX idx_nutrition_metrics_user_date ON public.nutrition_metrics(user_id, measurement_date);

-- Create indexes for medical data
CREATE INDEX idx_lab_tests_patient_date ON public.lab_tests(patient_id, order_date);
CREATE INDEX idx_lab_results_test_id ON public.lab_results(lab_test_id);
CREATE INDEX idx_imaging_studies_patient_date ON public.imaging_studies(patient_id, study_date);
CREATE INDEX idx_cardiovascular_tests_patient_date ON public.cardiovascular_tests(patient_id, test_date);