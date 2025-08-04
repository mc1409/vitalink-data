-- PHASE 5: Clean up old tables (after validating new structure works)
-- First, let's verify the new structure is working by checking data

-- Check that all users have primary patients in the new table
DO $$
DECLARE
    user_count INTEGER;
    primary_count INTEGER;
BEGIN
    SELECT COUNT(DISTINCT user_id) INTO user_count FROM user_patients;
    SELECT COUNT(DISTINCT user_id) INTO primary_count FROM user_patients WHERE is_primary = true;
    
    RAISE NOTICE 'Total users with patients: %, Users with primary patients: %', user_count, primary_count;
    
    IF user_count != primary_count THEN
        RAISE EXCEPTION 'Not all users have a primary patient set';
    END IF;
END $$;

-- Drop the old tables since we've successfully migrated to user_patients
DROP TABLE IF EXISTS profiles CASCADE;
DROP TABLE IF EXISTS patients CASCADE;