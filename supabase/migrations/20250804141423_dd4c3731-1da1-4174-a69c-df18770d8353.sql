-- The trigger might not be working because we need to ensure it's on the correct schema
-- Let's check the current triggers on auth.users and recreate properly

-- First check what schema the auth.users table is in and recreate the trigger
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_new_user();

-- Also let's make sure the function has the right permissions
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO supabase_auth_admin;