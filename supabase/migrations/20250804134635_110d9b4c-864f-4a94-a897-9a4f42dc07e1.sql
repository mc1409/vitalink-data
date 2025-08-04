-- PHASE 1: Data Cleanup & Fix Ownership Issues
-- Step 1: Create new patient records to fix the shared patient issue

-- First, let's create a new patient for user 'e6a771fb-b91f-4494-8835-5c858511ebd6' 
-- since they're sharing patient '6f62cad2-f00a-4cb4-8575-7f74b9e42e81' with another user
INSERT INTO patients (
  id,
  user_id,
  first_name,
  last_name,
  date_of_birth,
  gender
) VALUES (
  gen_random_uuid(),
  'e6a771fb-b91f-4494-8835-5c858511ebd6',
  'Manish',
  'Choudhary',
  '1990-01-01',
  'male'
) 
ON CONFLICT (id) DO NOTHING;

-- Get the new patient ID for the user (we'll use this in next steps)
-- The bulk data (1097 records each) will stay with user 'ad223ca1-f6c1-4cd5-8936-032de67fbec1'
-- User 'e6a771fb-b91f-4494-8835-5c858511ebd6' will get their existing 2 patients