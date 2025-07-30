-- Enable Row Level Security and create user profiles
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  date_of_birth DATE,
  gender TEXT CHECK (gender IN ('male', 'female', 'other', 'prefer_not_to_say')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (new.id, new.raw_user_meta_data ->> 'display_name');
  RETURN new;
END;
$$;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Core Patient Information Table
CREATE TABLE public.patients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  medical_record_number TEXT UNIQUE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  date_of_birth DATE NOT NULL,
  gender TEXT CHECK (gender IN ('male', 'female', 'other', 'prefer_not_to_say')),
  race_ethnicity TEXT,
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  country TEXT DEFAULT 'US',
  phone_primary TEXT,
  phone_secondary TEXT,
  email TEXT,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  emergency_contact_relationship TEXT,
  primary_care_physician TEXT,
  insurance_provider TEXT,
  insurance_policy_number TEXT,
  insurance_group_number TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on patients
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;

-- Create policies for patients
CREATE POLICY "Users can view their own patient data" 
ON public.patients 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own patient data" 
ON public.patients 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own patient data" 
ON public.patients 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Allergies and Adverse Reactions
CREATE TABLE public.allergies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  allergen TEXT NOT NULL,
  reaction TEXT NOT NULL,
  severity TEXT CHECK (severity IN ('mild', 'moderate', 'severe', 'life_threatening')),
  onset_date DATE,
  notes TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on allergies
ALTER TABLE public.allergies ENABLE ROW LEVEL SECURITY;

-- Create policies for allergies
CREATE POLICY "Users can manage allergies for their patients" 
ON public.allergies 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.patients 
    WHERE patients.id = allergies.patient_id 
    AND patients.user_id = auth.uid()
  )
);

-- Laboratory Tests Master Table
CREATE TABLE public.lab_tests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  test_category TEXT NOT NULL, -- 'hematology', 'chemistry', 'lipid', 'cardiac', 'endocrine', etc.
  test_subcategory TEXT, -- 'cbc', 'bmp', 'cmp', etc.
  test_name TEXT NOT NULL,
  test_code TEXT, -- LOINC code if available
  order_date DATE NOT NULL,
  collection_date DATE,
  result_date DATE,
  ordering_physician TEXT,
  performing_lab TEXT,
  test_status TEXT CHECK (test_status IN ('ordered', 'collected', 'in_progress', 'completed', 'cancelled')) DEFAULT 'ordered',
  priority TEXT CHECK (priority IN ('routine', 'stat', 'asap')) DEFAULT 'routine',
  specimen_type TEXT, -- 'blood', 'urine', 'tissue', etc.
  fasting_required BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on lab_tests
ALTER TABLE public.lab_tests ENABLE ROW LEVEL SECURITY;

-- Create policies for lab_tests
CREATE POLICY "Users can manage lab tests for their patients" 
ON public.lab_tests 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.patients 
    WHERE patients.id = lab_tests.patient_id 
    AND patients.user_id = auth.uid()
  )
);

-- Laboratory Results Table
CREATE TABLE public.lab_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lab_test_id UUID NOT NULL REFERENCES public.lab_tests(id) ON DELETE CASCADE,
  result_name TEXT NOT NULL, -- e.g., 'Hemoglobin', 'White Blood Cell Count'
  numeric_value DECIMAL(10,3),
  text_value TEXT,
  reference_range_min DECIMAL(10,3),
  reference_range_max DECIMAL(10,3),
  reference_range_text TEXT,
  units TEXT,
  abnormal_flag TEXT CHECK (abnormal_flag IN ('normal', 'high', 'low', 'critical_high', 'critical_low')),
  result_status TEXT CHECK (result_status IN ('preliminary', 'final', 'corrected', 'cancelled')) DEFAULT 'final',
  interpretation TEXT,
  reviewing_physician TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on lab_results
ALTER TABLE public.lab_results ENABLE ROW LEVEL SECURITY;

-- Create policies for lab_results
CREATE POLICY "Users can manage lab results for their patients" 
ON public.lab_results 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.lab_tests 
    JOIN public.patients ON patients.id = lab_tests.patient_id
    WHERE lab_tests.id = lab_results.lab_test_id 
    AND patients.user_id = auth.uid()
  )
);

-- Imaging Studies Table
CREATE TABLE public.imaging_studies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  study_type TEXT NOT NULL, -- 'x-ray', 'ct', 'mri', 'ultrasound', 'nuclear'
  study_subtype TEXT, -- 'chest_xray', 'head_ct', 'brain_mri', etc.
  study_date DATE NOT NULL,
  ordering_physician TEXT,
  performing_facility TEXT,
  radiologist TEXT,
  body_part TEXT,
  contrast_used BOOLEAN DEFAULT false,
  contrast_type TEXT,
  findings TEXT,
  impression TEXT,
  study_status TEXT CHECK (study_status IN ('scheduled', 'in_progress', 'completed', 'cancelled')) DEFAULT 'scheduled',
  images_available BOOLEAN DEFAULT false,
  report_available BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on imaging_studies
ALTER TABLE public.imaging_studies ENABLE ROW LEVEL SECURITY;

-- Create policies for imaging_studies
CREATE POLICY "Users can manage imaging studies for their patients" 
ON public.imaging_studies 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.patients 
    WHERE patients.id = imaging_studies.patient_id 
    AND patients.user_id = auth.uid()
  )
);

-- Cardiovascular Tests Table
CREATE TABLE public.cardiovascular_tests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  test_type TEXT NOT NULL, -- 'ecg', 'stress_test', 'holter', 'event_monitor', 'echo', 'cardiac_cath'
  test_date DATE NOT NULL,
  performing_physician TEXT,
  performing_facility TEXT,
  
  -- ECG specific fields
  rhythm TEXT,
  heart_rate INTEGER,
  pr_interval INTEGER, -- milliseconds
  qrs_duration INTEGER, -- milliseconds
  qt_interval INTEGER, -- milliseconds
  qtc_interval INTEGER, -- milliseconds
  axis_degrees INTEGER,
  ecg_interpretation TEXT,
  
  -- Stress test fields
  stress_test_type TEXT, -- 'exercise', 'pharmacological'
  max_heart_rate INTEGER,
  target_heart_rate INTEGER,
  blood_pressure_peak TEXT, -- "systolic/diastolic"
  exercise_duration INTEGER, -- minutes
  mets_achieved DECIMAL(3,1),
  stress_test_result TEXT,
  
  -- General fields
  findings TEXT,
  interpretation TEXT,
  test_status TEXT CHECK (test_status IN ('scheduled', 'in_progress', 'completed', 'cancelled')) DEFAULT 'scheduled',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on cardiovascular_tests
ALTER TABLE public.cardiovascular_tests ENABLE ROW LEVEL SECURITY;

-- Create policies for cardiovascular_tests
CREATE POLICY "Users can manage cardiovascular tests for their patients" 
ON public.cardiovascular_tests 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.patients 
    WHERE patients.id = cardiovascular_tests.patient_id 
    AND patients.user_id = auth.uid()
  )
);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_patients_updated_at
  BEFORE UPDATE ON public.patients
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_allergies_updated_at
  BEFORE UPDATE ON public.allergies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_lab_tests_updated_at
  BEFORE UPDATE ON public.lab_tests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_lab_results_updated_at
  BEFORE UPDATE ON public.lab_results
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_imaging_studies_updated_at
  BEFORE UPDATE ON public.imaging_studies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_cardiovascular_tests_updated_at
  BEFORE UPDATE ON public.cardiovascular_tests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();