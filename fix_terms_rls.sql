-- Fix Routes RLS Policies and Database Issues
-- This file fixes the RLS policies for the routes table and ensures proper access

-- 1. Enable RLS on routes table if not already enabled
ALTER TABLE public.routes ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.routes;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON public.routes;
DROP POLICY IF EXISTS "Enable update access for authenticated users" ON public.routes;
DROP POLICY IF EXISTS "Enable delete access for authenticated users" ON public.routes;

-- 3. Create comprehensive RLS policies for routes table
-- Read access for all authenticated users
CREATE POLICY "Enable read access for authenticated users" ON public.routes
    FOR SELECT
    TO authenticated
    USING (true);

-- Insert access for authenticated users
CREATE POLICY "Enable insert access for authenticated users" ON public.routes
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Update access for authenticated users
CREATE POLICY "Enable update access for authenticated users" ON public.routes
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Delete access for authenticated users
CREATE POLICY "Enable delete access for authenticated users" ON public.routes
    FOR DELETE
    TO authenticated
    USING (true);

-- 4. Grant necessary permissions to authenticated users
GRANT ALL ON public.routes TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;