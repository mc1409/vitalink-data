-- Phase 1: Complete Schema Refactor for Patient-Centric Health Database

-- First, create the enhanced patient table structure
ALTER TABLE public.patients 
ADD COLUMN IF NOT EXISTS profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Update existing patients to link to profiles via user_id
UPDATE public.patients 
SET profile_id = (SELECT id FROM public.profiles WHERE user_id = patients.user_id)
WHERE profile_id IS NULL;

-- Create test standardization mapping table
CREATE TABLE public.test_standardization_map (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    test_alias_name text NOT NULL,
    standard_test_name text NOT NULL,
    loinc_code text,
    test_category text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.test_standardization_map ENABLE ROW LEVEL SECURITY;

-- Create policy for test standardization (readable by all authenticated users)
CREATE POLICY "Authenticated users can view test standardization" 
ON public.test_standardization_map 
FOR SELECT 
TO authenticated 
USING (true);

-- Create new biomarker tables with patient_id linkage

-- Biomarker Heart (replaces heart_metrics)
CREATE TABLE public.biomarker_heart (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    measurement_time timestamp with time zone NOT NULL,
    data_source text NOT NULL,
    device_type text NOT NULL,
    resting_heart_rate integer,
    walking_heart_rate integer,
    workout_heart_rate integer,
    recovery_heart_rate integer,
    max_heart_rate integer,
    min_heart_rate integer,
    average_heart_rate integer,
    hrv_rmssd numeric,
    hrv_sdnn numeric,
    hrv_score integer,
    vo2_max numeric,
    systolic_bp integer,
    diastolic_bp integer,
    afib_detected boolean DEFAULT false,
    irregular_rhythm_detected boolean DEFAULT false,
    ecg_rhythm_classification text,
    cardio_fitness_level text,
    hr_zone_1_minutes integer,
    hr_zone_2_minutes integer,
    hr_zone_3_minutes integer,
    hr_zone_4_minutes integer,
    hr_zone_5_minutes integer,
    measurement_context text,
    reference_range_min numeric,
    reference_range_max numeric,
    unit text,
    raw_data jsonb,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Biomarker Sleep (replaces sleep_metrics)
CREATE TABLE public.biomarker_sleep (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    measurement_time timestamp with time zone NOT NULL,
    sleep_date date NOT NULL,
    data_source text NOT NULL,
    device_type text NOT NULL,
    bedtime timestamp with time zone,
    sleep_start timestamp with time zone,
    sleep_end timestamp with time zone,
    wake_time timestamp with time zone,
    total_sleep_time integer,
    time_in_bed integer,
    rem_sleep_minutes integer,
    deep_sleep_minutes integer,
    light_sleep_minutes integer,
    awake_minutes integer,
    sleep_efficiency numeric,
    sleep_latency integer,
    sleep_score integer,
    sleep_debt integer,
    sleep_disturbances integer,
    restfulness_score integer,
    avg_heart_rate integer,
    min_heart_rate integer,
    max_heart_rate integer,
    avg_hrv numeric,
    avg_respiratory_rate numeric,
    avg_spo2 integer,
    min_spo2 integer,
    avg_body_temperature numeric,
    temperature_deviation numeric,
    room_temperature numeric,
    ambient_light_level integer,
    noise_level integer,
    reference_range_min numeric,
    reference_range_max numeric,
    unit text,
    raw_data jsonb,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Biomarker Activity (replaces activity_metrics)
CREATE TABLE public.biomarker_activity (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    measurement_time timestamp with time zone NOT NULL,
    measurement_date date NOT NULL,
    data_source text NOT NULL,
    device_type text NOT NULL,
    steps_count integer,
    distance_walked_meters numeric,
    distance_ran_meters numeric,
    distance_cycled_meters numeric,
    flights_climbed integer,
    total_calories integer,
    active_calories integer,
    basal_calories integer,
    workout_calories integer,
    exercise_minutes integer,
    exercise_goal_minutes integer,
    vigorous_activity_minutes integer,
    moderate_activity_minutes integer,
    sedentary_minutes integer,
    stand_hours integer,
    stand_goal_hours integer,
    move_goal_calories integer,
    move_goal_percentage numeric,
    workout_type text,
    workout_duration_minutes integer,
    workout_distance_meters numeric,
    workout_avg_heart_rate integer,
    workout_max_heart_rate integer,
    reference_range_min numeric,
    reference_range_max numeric,
    unit text,
    raw_data jsonb,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Biomarker Nutrition (replaces nutrition_metrics)
CREATE TABLE public.biomarker_nutrition (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    measurement_time timestamp with time zone NOT NULL,
    measurement_date date NOT NULL,
    data_source text NOT NULL,
    total_calories integer,
    carbohydrates_grams numeric,
    protein_grams numeric,
    fat_grams numeric,
    fiber_grams numeric,
    sugar_grams numeric,
    added_sugar_grams numeric,
    sodium_mg numeric,
    potassium_mg numeric,
    calcium_mg numeric,
    magnesium_mg numeric,
    iron_mg numeric,
    zinc_mg numeric,
    phosphorus_mg numeric,
    vitamin_a_iu numeric,
    vitamin_c_mg numeric,
    vitamin_d_iu numeric,
    vitamin_e_mg numeric,
    vitamin_k_mcg numeric,
    thiamine_mg numeric,
    riboflavin_mg numeric,
    niacin_mg numeric,
    vitamin_b6_mg numeric,
    folate_mcg numeric,
    vitamin_b12_mcg numeric,
    biotin_mcg numeric,
    pantothenic_acid_mg numeric,
    water_intake_ml integer,
    caffeine_mg numeric,
    alcohol_grams numeric,
    breakfast_calories integer,
    lunch_calories integer,
    dinner_calories integer,
    snack_calories integer,
    eating_window_hours numeric,
    meal_data jsonb,
    supplement_data jsonb,
    reference_range_min numeric,
    reference_range_max numeric,
    unit text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Biomarker Biological Genetic Microbiome (replaces microbiome_metrics + recovery_strain_metrics)
CREATE TABLE public.biomarker_biological_genetic_microbiome (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    measurement_time timestamp with time zone NOT NULL,
    test_date date NOT NULL,
    data_source text NOT NULL,
    test_provider text NOT NULL,
    test_version text,
    sample_type text,
    sample_collection_date date,
    lab_processing_date date,
    report_generated_date date,
    
    -- Microbiome metrics
    microbiome_age numeric,
    alpha_diversity numeric,
    beta_diversity numeric,
    species_richness integer,
    microbial_diversity_shannon numeric,
    dysbiosis_index numeric,
    firmicutes_bacteroidetes_ratio numeric,
    beneficial_bacteria_score integer,
    pathogenic_bacteria_score integer,
    bifidobacterium_level numeric,
    lactobacillus_level numeric,
    akkermansia_level numeric,
    proteobacteria_level numeric,
    candida_level numeric,
    
    -- Short chain fatty acids
    butyrate_production numeric,
    acetate_production numeric,
    propionate_production numeric,
    
    -- Vitamin production
    vitamin_b_production integer,
    vitamin_k_production integer,
    folate_production integer,
    
    -- Functional scores
    fiber_utilization_score integer,
    fat_utilization_score integer,
    carb_utilization_score integer,
    protein_utilization_score integer,
    immune_function_score integer,
    mitochondrial_health_score integer,
    oxidative_stress_score integer,
    inflammatory_pathways_score integer,
    
    -- Recovery/Strain metrics (merged from recovery_strain_metrics)
    recovery_score integer,
    strain_score numeric,
    hrv_score integer,
    resting_hr_score integer,
    sleep_performance_score integer,
    stress_score integer,
    cardiovascular_load integer,
    max_strain_time timestamp with time zone,
    skin_temperature numeric,
    skin_temperature_deviation numeric,
    hydration_level integer,
    caffeine_intake_mg integer,
    alcohol_consumption_units numeric,
    
    reference_range_min numeric,
    reference_range_max numeric,
    unit text,
    raw_data jsonb,
    recommendations jsonb,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Clinical Diagnostic Lab Tests (merges lab_tests + lab_results + allergies)
CREATE TABLE public.clinical_diagnostic_lab_tests (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    measurement_time timestamp with time zone NOT NULL,
    data_source text NOT NULL,
    
    -- Test information
    test_name text NOT NULL,
    test_type text NOT NULL, -- 'standard', 'allergy', 'hormone', 'metabolic', etc.
    test_code text,
    test_category text NOT NULL,
    test_subcategory text,
    standard_test_name text, -- normalized name from standardization map
    
    -- Sample information
    sample_type text, -- blood, saliva, urine, etc.
    collection_date date,
    order_date date,
    result_date date,
    fasting_required boolean DEFAULT false,
    
    -- Results
    result_value text, -- can be numeric or text
    numeric_value numeric, -- extracted numeric value when applicable
    text_value text, -- text results
    unit text,
    reference_range_min numeric,
    reference_range_max numeric,
    reference_range_text text,
    is_out_of_range boolean,
    abnormal_flag text,
    
    -- Clinical context
    result_status text DEFAULT 'final',
    interpretation text,
    priority text DEFAULT 'routine',
    test_status text DEFAULT 'completed',
    
    -- Provider information
    ordering_physician text,
    reviewing_physician text,
    performing_lab text,
    
    -- Allergy-specific fields (when test_type = 'allergy')
    allergen text, -- what the patient is allergic to
    reaction text, -- type of reaction
    severity text, -- mild, moderate, severe
    onset_date date, -- when allergy was first observed
    active boolean DEFAULT true, -- is allergy still active
    
    notes text,
    raw_data jsonb,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Clinical Diagnostic Cardiovascular (enhanced cardiovascular_tests)
CREATE TABLE public.clinical_diagnostic_cardiovascular (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    measurement_time timestamp with time zone NOT NULL,
    test_date date NOT NULL,
    data_source text NOT NULL,
    
    -- Test information
    test_type text NOT NULL, -- 'ecg', 'stress_test', 'echo', 'holter', etc.
    test_status text DEFAULT 'scheduled',
    
    -- Basic vitals
    heart_rate integer,
    systolic_bp integer,
    diastolic_bp integer,
    blood_pressure_peak text,
    
    -- ECG specific
    rhythm text,
    ecg_interpretation text,
    pr_interval integer, -- milliseconds
    qrs_duration integer, -- milliseconds
    qt_interval integer, -- milliseconds
    qtc_interval integer, -- milliseconds
    axis_degrees integer,
    
    -- Stress test specific
    stress_test_type text,
    stress_test_result text,
    target_heart_rate integer,
    max_heart_rate integer,
    exercise_duration integer, -- minutes
    mets_achieved numeric,
    
    -- Results and interpretation
    findings text,
    interpretation text,
    
    -- Provider information
    performing_physician text,
    performing_facility text,
    
    reference_range_min numeric,
    reference_range_max numeric,
    unit text,
    raw_data jsonb,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Update device_integrations to link to patients instead of users
ALTER TABLE public.device_integrations 
ADD COLUMN IF NOT EXISTS patient_id uuid REFERENCES public.patients(id) ON DELETE CASCADE;

-- Update document_processing_logs to link to patients
ALTER TABLE public.document_processing_logs 
ADD COLUMN IF NOT EXISTS patient_id uuid REFERENCES public.patients(id) ON DELETE CASCADE;

-- Enable RLS on all new tables
ALTER TABLE public.biomarker_heart ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.biomarker_sleep ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.biomarker_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.biomarker_nutrition ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.biomarker_biological_genetic_microbiome ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinical_diagnostic_lab_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinical_diagnostic_cardiovascular ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for biomarker tables
CREATE POLICY "Users can manage biomarker heart data for their patients" 
ON public.biomarker_heart 
FOR ALL 
USING (EXISTS (
    SELECT 1 FROM public.patients p 
    JOIN public.profiles pr ON p.profile_id = pr.id 
    WHERE p.id = biomarker_heart.patient_id AND pr.user_id = auth.uid()
));

CREATE POLICY "Users can manage biomarker sleep data for their patients" 
ON public.biomarker_sleep 
FOR ALL 
USING (EXISTS (
    SELECT 1 FROM public.patients p 
    JOIN public.profiles pr ON p.profile_id = pr.id 
    WHERE p.id = biomarker_sleep.patient_id AND pr.user_id = auth.uid()
));

CREATE POLICY "Users can manage biomarker activity data for their patients" 
ON public.biomarker_activity 
FOR ALL 
USING (EXISTS (
    SELECT 1 FROM public.patients p 
    JOIN public.profiles pr ON p.profile_id = pr.id 
    WHERE p.id = biomarker_activity.patient_id AND pr.user_id = auth.uid()
));

CREATE POLICY "Users can manage biomarker nutrition data for their patients" 
ON public.biomarker_nutrition 
FOR ALL 
USING (EXISTS (
    SELECT 1 FROM public.patients p 
    JOIN public.profiles pr ON p.profile_id = pr.id 
    WHERE p.id = biomarker_nutrition.patient_id AND pr.user_id = auth.uid()
));

CREATE POLICY "Users can manage biomarker biological data for their patients" 
ON public.biomarker_biological_genetic_microbiome 
FOR ALL 
USING (EXISTS (
    SELECT 1 FROM public.patients p 
    JOIN public.profiles pr ON p.profile_id = pr.id 
    WHERE p.id = biomarker_biological_genetic_microbiome.patient_id AND pr.user_id = auth.uid()
));

-- Create RLS policies for clinical diagnostic tables
CREATE POLICY "Users can manage lab tests for their patients" 
ON public.clinical_diagnostic_lab_tests 
FOR ALL 
USING (EXISTS (
    SELECT 1 FROM public.patients p 
    JOIN public.profiles pr ON p.profile_id = pr.id 
    WHERE p.id = clinical_diagnostic_lab_tests.patient_id AND pr.user_id = auth.uid()
));

CREATE POLICY "Users can manage cardiovascular tests for their patients" 
ON public.clinical_diagnostic_cardiovascular 
FOR ALL 
USING (EXISTS (
    SELECT 1 FROM public.patients p 
    JOIN public.profiles pr ON p.profile_id = pr.id 
    WHERE p.id = clinical_diagnostic_cardiovascular.patient_id AND pr.user_id = auth.uid()
));

-- Create triggers for updated_at timestamps
CREATE TRIGGER update_biomarker_heart_updated_at
    BEFORE UPDATE ON public.biomarker_heart
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_biomarker_sleep_updated_at
    BEFORE UPDATE ON public.biomarker_sleep
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_biomarker_activity_updated_at
    BEFORE UPDATE ON public.biomarker_activity
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_biomarker_nutrition_updated_at
    BEFORE UPDATE ON public.biomarker_nutrition
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_biomarker_biological_genetic_microbiome_updated_at
    BEFORE UPDATE ON public.biomarker_biological_genetic_microbiome
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_clinical_diagnostic_lab_tests_updated_at
    BEFORE UPDATE ON public.clinical_diagnostic_lab_tests
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_clinical_diagnostic_cardiovascular_updated_at
    BEFORE UPDATE ON public.clinical_diagnostic_cardiovascular
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_test_standardization_map_updated_at
    BEFORE UPDATE ON public.test_standardization_map
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Add some initial test standardization data
INSERT INTO public.test_standardization_map (test_alias_name, standard_test_name, test_category) VALUES
('FBS', 'Glucose (Fasting)', 'metabolic'),
('Blood Sugar (Fasting)', 'Glucose (Fasting)', 'metabolic'),
('Fasting Blood Sugar', 'Glucose (Fasting)', 'metabolic'),
('HbA1c', 'Hemoglobin A1c', 'metabolic'),
('A1C', 'Hemoglobin A1c', 'metabolic'),
('TSH', 'Thyroid Stimulating Hormone', 'hormonal'),
('T3', 'Triiodothyronine', 'hormonal'),
('T4', 'Thyroxine', 'hormonal'),
('Cholesterol Total', 'Total Cholesterol', 'lipid'),
('HDL', 'HDL Cholesterol', 'lipid'),
('LDL', 'LDL Cholesterol', 'lipid'),
('CBC', 'Complete Blood Count', 'hematology'),
('WBC', 'White Blood Cell Count', 'hematology'),
('RBC', 'Red Blood Cell Count', 'hematology');