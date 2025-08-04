-- Fix the primary_patient_id reference to point to an existing patient
UPDATE profiles 
SET primary_patient_id = 'aab92d9e-4fdb-4ffd-adbe-10958eda66d5'
WHERE user_id = 'e6a771fb-b91f-4494-8835-5c858511ebd6';