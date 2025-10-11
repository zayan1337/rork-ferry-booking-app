-- ============================================================================
-- Add Missing Columns to wallet_transactions Table
-- ============================================================================
-- The app expects these columns but they don't exist in the database yet

-- Add missing columns to wallet_transactions table
ALTER TABLE public.wallet_transactions
  ADD COLUMN IF NOT EXISTS user_id UUID,
  ADD COLUMN IF NOT EXISTS user_name TEXT,
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'completed',
  ADD COLUMN IF NOT EXISTS description TEXT;

-- Add foreign key constraint for user_id (optional but recommended)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'wallet_transactions_user_id_fkey'
  ) THEN
    ALTER TABLE public.wallet_transactions
      ADD CONSTRAINT wallet_transactions_user_id_fkey 
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user_id 
  ON public.wallet_transactions(user_id);

CREATE INDEX IF NOT EXISTS idx_wallet_transactions_status 
  ON public.wallet_transactions(status);

-- Update existing rows to populate user_id from the wallet's user_id
UPDATE public.wallet_transactions wt
SET user_id = w.user_id
FROM public.wallets w
WHERE wt.wallet_id = w.id
  AND wt.user_id IS NULL;

-- Update existing rows to populate user_name from user_profiles
UPDATE public.wallet_transactions wt
SET user_name = up.full_name
FROM public.user_profiles up
WHERE wt.user_id = up.id
  AND wt.user_name IS NULL;

-- Add comment
COMMENT ON COLUMN public.wallet_transactions.user_id IS 'User who owns the wallet (denormalized for query performance)';
COMMENT ON COLUMN public.wallet_transactions.user_name IS 'User full name at time of transaction (denormalized)';
COMMENT ON COLUMN public.wallet_transactions.status IS 'Transaction status: completed, pending, or failed';
COMMENT ON COLUMN public.wallet_transactions.description IS 'Optional description or notes about the transaction';

-- Verify the columns were added
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'wallet_transactions'
ORDER BY ordinal_position;

-- Show sample of updated table structure
SELECT 'Migration completed successfully! Columns added to wallet_transactions table.' AS status;

