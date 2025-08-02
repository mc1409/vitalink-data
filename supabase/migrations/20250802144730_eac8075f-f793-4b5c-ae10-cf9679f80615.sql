-- Add primary_patient_id to profiles table to store the user's main patient
ALTER TABLE public.profiles 
ADD COLUMN primary_patient_id UUID REFERENCES public.patients(id) ON DELETE SET NULL;