-- PHASE 3: Migrate Data to New Structure
-- Migrate existing patients data into the new user_patients table

INSERT INTO public.user_patients (
  id,
  user_id,
  first_name,
  last_name,
  date_of_birth,
  gender,
  display_name,
  race_ethnicity,
  address_line1,
  address_line2,
  city,
  state,
  zip_code,
  country,
  phone_primary,
  phone_secondary,
  email,
  emergency_contact_name,
  emergency_contact_phone,
  emergency_contact_relationship,
  primary_care_physician,
  insurance_provider,
  insurance_policy_number,
  insurance_group_number,
  medical_record_number,
  is_primary,
  created_at,
  updated_at
)
SELECT 
  p.id,
  p.user_id,
  p.first_name,
  p.last_name,
  p.date_of_birth,
  p.gender,
  pr.display_name,
  p.race_ethnicity,
  p.address_line1,
  p.address_line2,
  p.city,
  p.state,
  p.zip_code,
  p.country,
  p.phone_primary,
  p.phone_secondary,
  p.email,
  p.emergency_contact_name,
  p.emergency_contact_phone,
  p.emergency_contact_relationship,
  p.primary_care_physician,
  p.insurance_provider,
  p.insurance_policy_number,
  p.insurance_group_number,
  p.medical_record_number,
  (p.id = pr.primary_patient_id) as is_primary,
  p.created_at,
  p.updated_at
FROM patients p
LEFT JOIN profiles pr ON p.user_id = pr.user_id
ON CONFLICT (id) DO NOTHING;

-- Fix the shared patient issue by updating the profile for user 'e6a771fb-b91f-4494-8835-5c858511ebd6'
-- to point to their newest patient record instead of the shared one
UPDATE public.user_patients 
SET is_primary = true 
WHERE user_id = 'e6a771fb-b91f-4494-8835-5c858511ebd6' 
  AND id = 'facd39ab-e81b-4449-bfe3-be30800ab351';

-- Ensure only one primary patient per user
UPDATE public.user_patients 
SET is_primary = false 
WHERE user_id = 'e6a771fb-b91f-4494-8835-5c858511ebd6' 
  AND id != 'facd39ab-e81b-4449-bfe3-be30800ab351';