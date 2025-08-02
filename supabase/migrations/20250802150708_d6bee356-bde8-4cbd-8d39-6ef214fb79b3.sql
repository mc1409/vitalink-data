-- Fix RLS policy for clinical_diagnostic_lab_tests table
-- The current policy uses p.profile_id = pr.id which fails because profile_id is NULL
-- We should use p.user_id = pr.user_id since both tables have user_id

DROP POLICY IF EXISTS "Users can manage lab tests for their patients" ON clinical_diagnostic_lab_tests;

CREATE POLICY "Users can manage lab tests for their patients"
ON clinical_diagnostic_lab_tests
FOR ALL
USING (
  EXISTS (
    SELECT 1 
    FROM patients p 
    WHERE p.id = clinical_diagnostic_lab_tests.patient_id 
    AND p.user_id = auth.uid()
  )
);

-- Also fix other biomarker tables that might have the same issue
DROP POLICY IF EXISTS "Users can manage biomarker activity data for their patients" ON biomarker_activity;
CREATE POLICY "Users can manage biomarker activity data for their patients"
ON biomarker_activity
FOR ALL
USING (
  EXISTS (
    SELECT 1 
    FROM patients p 
    WHERE p.id = biomarker_activity.patient_id 
    AND p.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can manage biomarker biological data for their patients" ON biomarker_biological_genetic_microbiome;
CREATE POLICY "Users can manage biomarker biological data for their patients"
ON biomarker_biological_genetic_microbiome
FOR ALL
USING (
  EXISTS (
    SELECT 1 
    FROM patients p 
    WHERE p.id = biomarker_biological_genetic_microbiome.patient_id 
    AND p.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can manage biomarker heart data for their patients" ON biomarker_heart;
CREATE POLICY "Users can manage biomarker heart data for their patients"
ON biomarker_heart
FOR ALL
USING (
  EXISTS (
    SELECT 1 
    FROM patients p 
    WHERE p.id = biomarker_heart.patient_id 
    AND p.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can manage biomarker nutrition data for their patients" ON biomarker_nutrition;
CREATE POLICY "Users can manage biomarker nutrition data for their patients"
ON biomarker_nutrition
FOR ALL
USING (
  EXISTS (
    SELECT 1 
    FROM patients p 
    WHERE p.id = biomarker_nutrition.patient_id 
    AND p.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can manage biomarker sleep data for their patients" ON biomarker_sleep;
CREATE POLICY "Users can manage biomarker sleep data for their patients"
ON biomarker_sleep
FOR ALL
USING (
  EXISTS (
    SELECT 1 
    FROM patients p 
    WHERE p.id = biomarker_sleep.patient_id 
    AND p.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can manage cardiovascular tests for their patients" ON clinical_diagnostic_cardiovascular;
CREATE POLICY "Users can manage cardiovascular tests for their patients"
ON clinical_diagnostic_cardiovascular
FOR ALL
USING (
  EXISTS (
    SELECT 1 
    FROM patients p 
    WHERE p.id = clinical_diagnostic_cardiovascular.patient_id 
    AND p.user_id = auth.uid()
  )
);