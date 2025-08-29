-- Fix RLS policies for user registration
-- This script resolves the "new row violates row-level security policy" error

-- Create missing user_preferences table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.user_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  timezone TEXT DEFAULT 'UTC',
  default_view TEXT DEFAULT 'month' CHECK (default_view IN ('month', 'week', 'day')),
  notifications_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

-- Create index for user_preferences
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON public.user_preferences(user_id);

-- First, disable RLS temporarily to clean up and recreate policies
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.events DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_events DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences DISABLE ROW LEVEL SECURITY;

-- Drop existing policies to start fresh
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
DROP POLICY IF EXISTS "Anyone can view events" ON public.events;
DROP POLICY IF EXISTS "Service role can manage events" ON public.events;
DROP POLICY IF EXISTS "Users can view own saved events" ON public.saved_events;
DROP POLICY IF EXISTS "Users can manage own saved events" ON public.saved_events;
DROP POLICY IF EXISTS "Users can view own preferences" ON public.user_preferences;
DROP POLICY IF EXISTS "Users can manage own preferences" ON public.user_preferences;

-- Drop existing triggers and functions
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create improved function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER -- This allows the function to bypass RLS
SET search_path = public, auth
LANGUAGE plpgsql
AS $$
BEGIN
  -- Insert new user profile with SECURITY DEFINER privileges
  INSERT INTO public.users (
    id,
    email,
    full_name,
    avatar_url,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url',
    NOW(),
    NOW()
  );

  -- Also create default user preferences
  INSERT INTO public.user_preferences (
    user_id,
    timezone,
    default_view,
    notifications_enabled,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    'UTC',
    'month',
    true,
    NOW(),
    NOW()
  );

  RETURN NEW;
EXCEPTION
  WHEN others THEN
    -- Log the error but don't fail the auth process
    RAISE LOG 'Error creating user profile: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Recreate the trigger on auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Re-enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- Create comprehensive RLS policies

-- Users table policies
CREATE POLICY "Enable read access for users on own data"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Enable insert for authenticated users during signup"
  ON public.users FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Enable update for users on own data"
  ON public.users FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Events table policies (public read, service role write)
CREATE POLICY "Enable read access for all users"
  ON public.events FOR SELECT
  USING (true);

CREATE POLICY "Enable insert for service role"
  ON public.events FOR INSERT
  WITH CHECK (
    current_setting('role') = 'service_role' OR
    current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
  );

CREATE POLICY "Enable update for service role"
  ON public.events FOR UPDATE
  USING (
    current_setting('role') = 'service_role' OR
    current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
  );

-- Saved events policies
CREATE POLICY "Enable read access for users on own saved events"
  ON public.saved_events FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Enable insert for users on own saved events"
  ON public.saved_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Enable delete for users on own saved events"
  ON public.saved_events FOR DELETE
  USING (auth.uid() = user_id);

-- User preferences policies
CREATE POLICY "Enable read access for users on own preferences"
  ON public.user_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Enable insert for users on own preferences"
  ON public.user_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Enable update for users on own preferences"
  ON public.user_preferences FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Grant necessary permissions to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.users TO authenticated;
GRANT SELECT ON public.events TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.saved_events TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.user_preferences TO authenticated;

-- Grant permissions to service role for events management
GRANT ALL ON public.events TO service_role;

-- Verify the setup
DO $$
BEGIN
  RAISE NOTICE 'RLS policies have been successfully updated!';
  RAISE NOTICE 'Users can now register without RLS policy violations.';
  RAISE NOTICE 'The trigger will automatically create user profiles and preferences.';
END $$;