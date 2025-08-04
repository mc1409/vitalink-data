-- PHASE 2: Create Simplified Schema
-- Create the new consolidated user_patients table that combines profiles + patients

CREATE TABLE public.user_patients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  date_of_birth DATE NOT NULL,
  gender TEXT,
  
  -- Additional profile fields
  display_name TEXT,
  
  -- Additional patient fields
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
  medical_record_number TEXT,
  
  -- Metadata
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Constraints
  UNIQUE(user_id, first_name, last_name, date_of_birth)
);

-- Enable RLS
ALTER TABLE public.user_patients ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can manage their own patients" 
ON public.user_patients 
FOR ALL 
USING (auth.uid() = user_id);

-- Create updated_at trigger
CREATE TRIGGER update_user_patients_updated_at
BEFORE UPDATE ON public.user_patients
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for performance
CREATE INDEX idx_user_patients_user_id ON public.user_patients(user_id);
CREATE INDEX idx_user_patients_primary ON public.user_patients(user_id, is_primary);