-- Create patients for existing users who don't have any
INSERT INTO public.patients (
    user_id,
    first_name,
    last_name,
    date_of_birth,
    gender
)
SELECT 
    p.user_id,
    COALESCE(split_part(p.display_name, ' ', 1), 'User') as first_name,
    COALESCE(split_part(p.display_name, ' ', 2), 'Patient') as last_name,
    CURRENT_DATE - INTERVAL '30 years' as date_of_birth,
    'other' as gender
FROM public.profiles p
LEFT JOIN public.patients pt ON p.user_id = pt.user_id
WHERE pt.user_id IS NULL;

-- Update profiles to set primary_patient_id for users who don't have one
UPDATE public.profiles 
SET primary_patient_id = (
    SELECT p.id 
    FROM public.patients p 
    WHERE p.user_id = profiles.user_id 
    LIMIT 1
)
WHERE primary_patient_id IS NULL;