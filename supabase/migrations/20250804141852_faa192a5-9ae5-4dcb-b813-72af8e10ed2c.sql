-- Create RLS policies for medical data tables

-- clinical_diagnostic_lab_tests policies
CREATE POLICY "Users can insert their patient lab tests" 
ON public.clinical_diagnostic_lab_tests 
FOR INSERT 
WITH CHECK (
  patient_id IN (
    SELECT id FROM public.user_patients 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can view their patient lab tests" 
ON public.clinical_diagnostic_lab_tests 
FOR SELECT 
USING (
  patient_id IN (
    SELECT id FROM public.user_patients 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their patient lab tests" 
ON public.clinical_diagnostic_lab_tests 
FOR UPDATE 
USING (
  patient_id IN (
    SELECT id FROM public.user_patients 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete their patient lab tests" 
ON public.clinical_diagnostic_lab_tests 
FOR DELETE 
USING (
  patient_id IN (
    SELECT id FROM public.user_patients 
    WHERE user_id = auth.uid()
  )
);

-- biomarker_heart policies
CREATE POLICY "Users can insert their patient heart data" 
ON public.biomarker_heart 
FOR INSERT 
WITH CHECK (
  patient_id IN (
    SELECT id FROM public.user_patients 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can view their patient heart data" 
ON public.biomarker_heart 
FOR SELECT 
USING (
  patient_id IN (
    SELECT id FROM public.user_patients 
    WHERE user_id = auth.uid()
  )
);

-- biomarker_activity policies
CREATE POLICY "Users can insert their patient activity data" 
ON public.biomarker_activity 
FOR INSERT 
WITH CHECK (
  patient_id IN (
    SELECT id FROM public.user_patients 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can view their patient activity data" 
ON public.biomarker_activity 
FOR SELECT 
USING (
  patient_id IN (
    SELECT id FROM public.user_patients 
    WHERE user_id = auth.uid()
  )
);

-- biomarker_sleep policies
CREATE POLICY "Users can insert their patient sleep data" 
ON public.biomarker_sleep 
FOR INSERT 
WITH CHECK (
  patient_id IN (
    SELECT id FROM public.user_patients 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can view their patient sleep data" 
ON public.biomarker_sleep 
FOR SELECT 
USING (
  patient_id IN (
    SELECT id FROM public.user_patients 
    WHERE user_id = auth.uid()
  )
);

-- biomarker_nutrition policies  
CREATE POLICY "Users can insert their patient nutrition data" 
ON public.biomarker_nutrition 
FOR INSERT 
WITH CHECK (
  patient_id IN (
    SELECT id FROM public.user_patients 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can view their patient nutrition data" 
ON public.biomarker_nutrition 
FOR SELECT 
USING (
  patient_id IN (
    SELECT id FROM public.user_patients 
    WHERE user_id = auth.uid()
  )
);

-- biomarker_biological_genetic_microbiome policies
CREATE POLICY "Users can insert their patient biomarker data" 
ON public.biomarker_biological_genetic_microbiome 
FOR INSERT 
WITH CHECK (
  patient_id IN (
    SELECT id FROM public.user_patients 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can view their patient biomarker data" 
ON public.biomarker_biological_genetic_microbiome 
FOR SELECT 
USING (
  patient_id IN (
    SELECT id FROM public.user_patients 
    WHERE user_id = auth.uid()
  )
);