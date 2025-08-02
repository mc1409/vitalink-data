-- Update the handle_new_user function to create patient profile during signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
    new_patient_id UUID;
BEGIN
    -- Insert profile first
    INSERT INTO public.profiles (user_id, display_name)
    VALUES (new.id, new.raw_user_meta_data ->> 'display_name');
    
    -- Create patient profile automatically
    -- For now, use display_name as first_name if no patient data provided
    INSERT INTO public.patients (
        user_id,
        first_name,
        last_name,
        date_of_birth,
        gender
    )
    VALUES (
        new.id,
        COALESCE(new.raw_user_meta_data ->> 'first_name', split_part(new.raw_user_meta_data ->> 'display_name', ' ', 1), 'User'),
        COALESCE(new.raw_user_meta_data ->> 'last_name', split_part(new.raw_user_meta_data ->> 'display_name', ' ', 2), 'Patient'),
        COALESCE((new.raw_user_meta_data ->> 'date_of_birth')::date, CURRENT_DATE - INTERVAL '30 years'),
        COALESCE(new.raw_user_meta_data ->> 'gender', 'other')
    )
    RETURNING id INTO new_patient_id;
    
    -- Update profile with primary_patient_id
    UPDATE public.profiles 
    SET primary_patient_id = new_patient_id
    WHERE user_id = new.id;
    
    RETURN new;
END;
$$;