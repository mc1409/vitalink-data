-- Fix RLS policy for lab_results to allow insertion without lab_test_id initially
DROP POLICY IF EXISTS "Users can manage lab results for their patients" ON lab_results;

-- Create new policy that allows users to manage lab results for their own data
CREATE POLICY "Users can manage lab results for their patients" 
ON lab_results 
FOR ALL
USING (
  CASE 
    WHEN lab_test_id IS NULL THEN true  -- Allow insertion with null lab_test_id initially
    ELSE EXISTS (
      SELECT 1
      FROM lab_tests
      JOIN patients ON patients.id = lab_tests.patient_id
      WHERE lab_tests.id = lab_results.lab_test_id 
      AND patients.user_id = auth.uid()
    )
  END
)
WITH CHECK (
  CASE 
    WHEN lab_test_id IS NULL THEN true  -- Allow insertion with null lab_test_id initially
    ELSE EXISTS (
      SELECT 1
      FROM lab_tests
      JOIN patients ON patients.id = lab_tests.patient_id
      WHERE lab_tests.id = lab_results.lab_test_id 
      AND patients.user_id = auth.uid()
    )
  END
);

-- Also update lab_results to make lab_test_id nullable
ALTER TABLE lab_results ALTER COLUMN lab_test_id DROP NOT NULL;