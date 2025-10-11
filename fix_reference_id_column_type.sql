-- ============================================================================
-- Fix reference_id Column Type in wallet_transactions
-- ============================================================================
-- The column is currently UUID but needs to be VARCHAR to support
-- both UUID references and manual payment references like 'MANUAL-12345'

-- Change reference_id from UUID to VARCHAR(255)
ALTER TABLE public.wallet_transactions 
  ALTER COLUMN reference_id TYPE VARCHAR(255) USING reference_id::VARCHAR;

-- Add comment explaining the column
COMMENT ON COLUMN public.wallet_transactions.reference_id IS 'Reference identifier - can be UUID for payment gateway transactions or string like MANUAL-xxx for manual payments';

-- Verify the change
SELECT 
  column_name,
  data_type,
  character_maximum_length
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'wallet_transactions'
  AND column_name = 'reference_id';

SELECT 'reference_id column type updated successfully!' AS status;

