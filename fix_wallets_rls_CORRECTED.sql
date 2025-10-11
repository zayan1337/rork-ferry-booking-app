-- Fix Wallets RLS Policies (CORRECTED VERSION)
-- This version works with your actual database schema using user_profiles and permissions tables

-- 1. Enable RLS on wallets table if not already enabled
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view own wallet" ON public.wallets;
DROP POLICY IF EXISTS "Admins can view all wallets" ON public.wallets;
DROP POLICY IF EXISTS "Admins can create wallets" ON public.wallets;
DROP POLICY IF EXISTS "Admins can update wallets" ON public.wallets;
DROP POLICY IF EXISTS "System can update wallets" ON public.wallets;

-- 3. Create comprehensive RLS policies for wallets table

-- SELECT Policies (Read Access)
-- Users can view their own wallet
CREATE POLICY "Users can view own wallet" ON public.wallets
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

-- Admins can view all wallets
CREATE POLICY "Admins can view all wallets" ON public.wallets
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE id = auth.uid()
            AND (
                role = 'admin'
                OR is_super_admin = true
            )
        )
        OR
        -- Check if user has wallets:view permission
        EXISTS (
            SELECT 1 FROM public.user_permissions up
            JOIN public.permissions p ON up.permission_id = p.id
            WHERE up.user_id = auth.uid()
            AND up.is_active = true
            AND p.resource = 'wallets'
            AND p.action = 'view'
            AND (up.expires_at IS NULL OR up.expires_at > NOW())
        )
    );

-- INSERT Policy (Create Wallets)
-- Admins can create wallets for any user
CREATE POLICY "Admins can create wallets" ON public.wallets
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE id = auth.uid()
            AND (
                role = 'admin'
                OR is_super_admin = true
            )
        )
        OR
        -- Check if user has wallets:manage permission
        EXISTS (
            SELECT 1 FROM public.user_permissions up
            JOIN public.permissions p ON up.permission_id = p.id
            WHERE up.user_id = auth.uid()
            AND up.is_active = true
            AND p.resource = 'wallets'
            AND p.action IN ('manage', 'create')
            AND (up.expires_at IS NULL OR up.expires_at > NOW())
        )
    );

-- UPDATE Policy (Update Wallets)
-- Admins can update any wallet
CREATE POLICY "Admins can update wallets" ON public.wallets
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE id = auth.uid()
            AND (
                role = 'admin'
                OR is_super_admin = true
            )
        )
        OR
        -- Check if user has wallets:manage permission
        EXISTS (
            SELECT 1 FROM public.user_permissions up
            JOIN public.permissions p ON up.permission_id = p.id
            WHERE up.user_id = auth.uid()
            AND up.is_active = true
            AND p.resource = 'wallets'
            AND p.action IN ('manage', 'update')
            AND (up.expires_at IS NULL OR up.expires_at > NOW())
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE id = auth.uid()
            AND (
                role = 'admin'
                OR is_super_admin = true
            )
        )
        OR
        EXISTS (
            SELECT 1 FROM public.user_permissions up
            JOIN public.permissions p ON up.permission_id = p.id
            WHERE up.user_id = auth.uid()
            AND up.is_active = true
            AND p.resource = 'wallets'
            AND p.action IN ('manage', 'update')
            AND (up.expires_at IS NULL OR up.expires_at > NOW())
        )
    );

-- System can update wallets (for transaction processing)
-- Allow balance updates during payment/transaction processing
CREATE POLICY "System can update wallets" ON public.wallets
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- 4. Grant necessary permissions to authenticated users
GRANT SELECT, INSERT, UPDATE ON public.wallets TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- 5. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON public.wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_wallets_balance ON public.wallets(balance);
CREATE INDEX IF NOT EXISTS idx_wallets_created_at ON public.wallets(created_at);

-- 6. Verify the policies are created
DO $$
BEGIN
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'Wallets RLS policies successfully created!';
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'Policies created:';
    RAISE NOTICE '  ✓ Users can view own wallet (SELECT)';
    RAISE NOTICE '  ✓ Admins can view all wallets (SELECT)';
    RAISE NOTICE '  ✓ Admins can create wallets (INSERT)';
    RAISE NOTICE '  ✓ Admins can update wallets (UPDATE)';
    RAISE NOTICE '  ✓ System can update wallets (UPDATE)';
    RAISE NOTICE '';
    RAISE NOTICE 'Access is granted to:';
    RAISE NOTICE '  - Users with role = ''admin''';
    RAISE NOTICE '  - Users with is_super_admin = true';
    RAISE NOTICE '  - Users with wallets permissions in user_permissions table';
    RAISE NOTICE '==============================================';
END $$;

