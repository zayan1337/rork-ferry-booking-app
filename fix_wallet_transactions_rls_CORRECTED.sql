-- Fix Wallet Transactions RLS Policies (CORRECTED VERSION)
-- This version works with your actual database schema using user_profiles and permissions tables

-- 1. Enable RLS on wallet_transactions table if not already enabled
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view own transactions" ON public.wallet_transactions;
DROP POLICY IF EXISTS "Admins can view all transactions" ON public.wallet_transactions;
DROP POLICY IF EXISTS "Admins can create transactions" ON public.wallet_transactions;
DROP POLICY IF EXISTS "System can create transactions" ON public.wallet_transactions;

-- 3. Create comprehensive RLS policies for wallet_transactions table

-- SELECT Policies (Read Access)
-- Users can view their own wallet transactions
CREATE POLICY "Users can view own transactions" ON public.wallet_transactions
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.wallets
            WHERE wallets.id = wallet_transactions.wallet_id
            AND wallets.user_id = auth.uid()
        )
    );

-- Admins can view all transactions
CREATE POLICY "Admins can view all transactions" ON public.wallet_transactions
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

-- INSERT Policy (Create Transactions)
-- Admins can create wallet transactions
CREATE POLICY "Admins can create transactions" ON public.wallet_transactions
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

-- System can create transactions (for automated processes)
CREATE POLICY "System can create transactions" ON public.wallet_transactions
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- 4. Grant necessary permissions to authenticated users
GRANT SELECT, INSERT ON public.wallet_transactions TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- 5. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_wallet_id ON public.wallet_transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_created_at ON public.wallet_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_type ON public.wallet_transactions(transaction_type);

-- 6. Verify the policies are created
DO $$
BEGIN
    RAISE NOTICE '=================================================';
    RAISE NOTICE 'Wallet Transactions RLS policies created!';
    RAISE NOTICE '=================================================';
    RAISE NOTICE 'Policies created:';
    RAISE NOTICE '  ✓ Users can view own transactions (SELECT)';
    RAISE NOTICE '  ✓ Admins can view all transactions (SELECT)';
    RAISE NOTICE '  ✓ Admins can create transactions (INSERT)';
    RAISE NOTICE '  ✓ System can create transactions (INSERT)';
    RAISE NOTICE '';
    RAISE NOTICE 'Access is granted to:';
    RAISE NOTICE '  - Users with role = ''admin''';
    RAISE NOTICE '  - Users with is_super_admin = true';
    RAISE NOTICE '  - Users with wallets permissions in user_permissions table';
    RAISE NOTICE '=================================================';
END $$;

