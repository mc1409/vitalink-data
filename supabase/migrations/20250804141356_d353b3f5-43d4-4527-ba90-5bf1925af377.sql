-- Fix the trigger that should create patients automatically for new users
-- First, ensure the trigger is properly set up
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_new_user();

-- Now manually create a patient for the current user who doesn't have one
-- This user signed up but didn't get a patient created due to the missing trigger
INSERT INTO public.user_patients (
    user_id,
    first_name,
    last_name,
    date_of_birth,
    gender,
    display_name,
    is_primary,
    created_at
)
VALUES (
    'ad223ca1-f6c1-4cd5-8936-032de67fbec1',
    'User',
    'Patient', 
    CURRENT_DATE - INTERVAL '30 years',
    'other',
    'mc14o9all@gmail.com',
    true,
    NOW()
)
ON CONFLICT (user_id, first_name, last_name, date_of_birth) DO NOTHING;