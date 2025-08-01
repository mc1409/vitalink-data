-- Add DELETE policy for patients table so users can delete their own patient data
CREATE POLICY "Users can delete their own patient data" 
ON public.patients 
FOR DELETE 
USING (auth.uid() = user_id);