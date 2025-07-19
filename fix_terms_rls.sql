-- ============================================================================
-- TERMS AND CONDITIONS TABLE RLS POLICIES FIX
-- This script restores the Row Level Security policies for the terms_and_conditions table
-- ============================================================================

-- Enable RLS on terms_and_conditions table (should already be enabled)
ALTER TABLE public.terms_and_conditions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (cleanup)
DROP POLICY IF EXISTS "Allow authenticated users to view terms" ON public.terms_and_conditions;
DROP POLICY IF EXISTS "Allow admins to insert terms" ON public.terms_and_conditions;
DROP POLICY IF EXISTS "Allow admins to update terms" ON public.terms_and_conditions;
DROP POLICY IF EXISTS "Allow admins to delete terms" ON public.terms_and_conditions;
DROP POLICY IF EXISTS "Allow content managers to manage terms" ON public.terms_and_conditions;

-- ============================================================================
-- SELECT POLICY - Allow all authenticated users to view terms and conditions
-- ============================================================================
CREATE POLICY "Allow authenticated users to view terms"
ON public.terms_and_conditions
FOR SELECT
TO authenticated
USING (true);

-- ============================================================================
-- INSERT POLICY - Allow admins and content managers to create terms and conditions
-- ============================================================================
CREATE POLICY "Allow admins to insert terms"
ON public.terms_and_conditions
FOR INSERT
TO authenticated
WITH CHECK (
    -- Check if user is authenticated and has admin role or content management permissions
    EXISTS (
        SELECT 1 FROM public.user_profiles
        WHERE id = auth.uid()
        AND is_active = true
        AND (
            role = 'admin'
            OR is_super_admin = true
        )
    )
);

-- ============================================================================
-- UPDATE POLICY - Allow admins and content managers to update terms and conditions
-- ============================================================================
CREATE POLICY "Allow admins to update terms"
ON public.terms_and_conditions
FOR UPDATE
TO authenticated
USING (
    -- Check if user is authenticated and has admin role or content management permissions
    EXISTS (
        SELECT 1 FROM public.user_profiles
        WHERE id = auth.uid()
        AND is_active = true
        AND (
            role = 'admin'
            OR is_super_admin = true
        )
    )
)
WITH CHECK (
    -- Same check for the updated data
    EXISTS (
        SELECT 1 FROM public.user_profiles
        WHERE id = auth.uid()
        AND is_active = true
        AND (
            role = 'admin'
            OR is_super_admin = true
        )
    )
);

-- ============================================================================
-- DELETE POLICY - Allow admins and content managers to delete terms and conditions
-- ============================================================================
CREATE POLICY "Allow admins to delete terms"
ON public.terms_and_conditions
FOR DELETE
TO authenticated
USING (
    -- Check if user is authenticated and has admin role or content management permissions
    EXISTS (
        SELECT 1 FROM public.user_profiles
        WHERE id = auth.uid()
        AND is_active = true
        AND (
            role = 'admin'
            OR is_super_admin = true
        )
    )
);

-- ============================================================================
-- ALTERNATIVE POLICY - More granular permission-based policy (commented out)
-- Uncomment this if you want to use the user_permissions table for more granular control
-- ============================================================================

/*
-- More granular policy using user_permissions table
CREATE POLICY "Allow content managers to manage terms"
ON public.terms_and_conditions
FOR ALL
TO authenticated
USING (
    -- Check if user has content management permissions
    EXISTS (
        SELECT 1 FROM public.user_profiles up
        WHERE up.id = auth.uid()
        AND up.is_active = true
        AND (
            up.role = 'admin'
            OR up.is_super_admin = true
            OR EXISTS (
                SELECT 1 FROM public.user_permissions uper
                JOIN public.permissions p ON uper.permission_id = p.id
                WHERE uper.user_id = auth.uid()
                AND uper.is_active = true
                AND (uper.expires_at IS NULL OR uper.expires_at > NOW())
                AND p.resource = 'content'
                AND p.action IN ('create', 'update', 'delete', 'manage')
            )
        )
    )
)
WITH CHECK (
    -- Same check for insert/update operations
    EXISTS (
        SELECT 1 FROM public.user_profiles up
        WHERE up.id = auth.uid()
        AND up.is_active = true
        AND (
            up.role = 'admin'
            OR up.is_super_admin = true
            OR EXISTS (
                SELECT 1 FROM public.user_permissions uper
                JOIN public.permissions p ON uper.permission_id = p.id
                WHERE uper.user_id = auth.uid()
                AND uper.is_active = true
                AND (uper.expires_at IS NULL OR uper.expires_at > NOW())
                AND p.resource = 'content'
                AND p.action IN ('create', 'update', 'delete', 'manage')
            )
        )
    )
);
*/

-- ============================================================================
-- VERIFY POLICIES
-- ============================================================================

-- Check that policies are created
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'terms_and_conditions' 
ORDER BY policyname;

-- ============================================================================
-- TEST QUERIES (for verification - run these as different user types)
-- ============================================================================

/*
-- Test as authenticated user (should work for SELECT)
SELECT * FROM public.terms_and_conditions LIMIT 5;

-- Test as admin user (should work for all operations)
INSERT INTO public.terms_and_conditions (title, content, version, effective_date) 
VALUES ('Test Terms', 'Test Content for terms and conditions', '1.0', NOW());

-- Test UPDATE
UPDATE public.terms_and_conditions SET title = 'Updated Test Terms' WHERE title = 'Test Terms';

-- Test DELETE
DELETE FROM public.terms_and_conditions WHERE title = 'Updated Test Terms';
*/

-- ============================================================================
-- NOTES
-- ============================================================================

/*
POLICY EXPLANATION:

1. SELECT Policy: Allows all authenticated users to view terms and conditions
   - This is typically safe as terms are meant to be accessible to all users for legal compliance

2. INSERT/UPDATE/DELETE Policies: Only allows admins and super admins to manage terms and conditions
   - Checks that the user exists in user_profiles table
   - Verifies user is active
   - Ensures user has admin role or is_super_admin = true

SECURITY FEATURES:
- Uses auth.uid() to get the current authenticated user ID
- Verifies user exists and is active in user_profiles
- Role-based access control for content management
- Prevents inactive users from performing operations
- Ensures only authorized personnel can modify legal documents

LEGAL COMPLIANCE:
- Terms and conditions are critical legal documents
- Only authorized administrators should be able to modify them
- All users should be able to read current terms for legal compliance
- Consider implementing audit logging for all changes to terms

CUSTOMIZATION:
- If you need more granular permissions, uncomment the alternative policy
- Modify role checks based on your specific role structure
- Add additional permission checks for legal/compliance roles
- Consider adding version control and approval workflows

TROUBLESHOOTING:
- If policies still don't work, check if user_profiles table has the correct user data
- Verify that auth.uid() returns the expected user ID
- Check that user roles are set correctly in the user_profiles table
- Ensure legal team has appropriate admin access
*/ 