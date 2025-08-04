-- PHASE 4: Update the user creation trigger to use new table
-- Drop the old trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create new function for user_patients table
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
    new_patient_id UUID;
BEGIN
    -- Create patient profile automatically using the new consolidated table
    INSERT INTO public.user_patients (
        user_id,
        first_name,
        last_name,
        date_of_birth,
        gender,
        display_name,
        is_primary
    )
    VALUES (
        new.id,
        COALESCE(new.raw_user_meta_data ->> 'first_name', split_part(new.raw_user_meta_data ->> 'display_name', ' ', 1), 'User'),
        COALESCE(new.raw_user_meta_data ->> 'last_name', split_part(new.raw_user_meta_data ->> 'display_name', ' ', 2), 'Patient'),
        COALESCE((new.raw_user_meta_data ->> 'date_of_birth')::date, CURRENT_DATE - INTERVAL '30 years'),
        COALESCE(new.raw_user_meta_data ->> 'gender', 'other'),
        new.raw_user_meta_data ->> 'display_name',
        true  -- First patient is always primary
    )
    RETURNING id INTO new_patient_id;
    
    RETURN new;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();