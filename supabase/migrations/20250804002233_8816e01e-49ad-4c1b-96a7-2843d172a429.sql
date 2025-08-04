-- Update profile to point to the new patient ID
UPDATE profiles 
SET primary_patient_id = '6f62cad2-f00a-4cb4-8575-7f74b9e42e81' 
WHERE primary_patient_id = 'aab92d9e-4fdb-4ffd-adbe-10958eda66d5';