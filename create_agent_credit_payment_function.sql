-- ============================================================================
-- Agent Credit Payment Function
-- ============================================================================
-- This function records a payment for an agent's credit balance
-- It increases their available credit and optionally creates a transaction record

-- Drop function if exists (for clean reinstall)
DROP FUNCTION IF EXISTS public.record_agent_credit_payment(UUID, NUMERIC, VARCHAR, VARCHAR);

-- Create the function
CREATE OR REPLACE FUNCTION public.record_agent_credit_payment(
  p_user_id UUID,
  p_payment_amount NUMERIC,
  p_payment_method VARCHAR DEFAULT 'manual',
  p_reference VARCHAR DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_balance NUMERIC;
  v_current_ceiling NUMERIC;
  v_new_balance NUMERIC;
  v_wallet_id UUID;
  v_transaction_id UUID;
  v_user_name TEXT;
BEGIN
  -- Log the payment attempt
  RAISE NOTICE 'Recording payment for user: %, amount: %, method: %', p_user_id, p_payment_amount, p_payment_method;

  -- Validate payment amount
  IF p_payment_amount IS NULL OR p_payment_amount <= 0 THEN
    RAISE EXCEPTION 'Payment amount must be greater than zero';
  END IF;

  -- Get current credit info and user name
  SELECT 
    credit_balance, 
    credit_ceiling,
    full_name
  INTO 
    v_current_balance, 
    v_current_ceiling,
    v_user_name
  FROM user_profiles
  WHERE id = p_user_id AND role = 'agent';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Agent not found with ID: %', p_user_id;
  END IF;

  -- Log current state
  RAISE NOTICE 'Current balance: %, ceiling: %', v_current_balance, v_current_ceiling;

  -- Calculate new balance (increase available credit)
  v_new_balance := COALESCE(v_current_balance, 0) + p_payment_amount;

  -- Ensure new balance doesn't exceed ceiling
  IF v_new_balance > v_current_ceiling THEN
    RAISE NOTICE 'Payment would exceed ceiling, capping at ceiling amount';
    v_new_balance := v_current_ceiling;
  END IF;

  -- Update agent's credit balance
  UPDATE user_profiles
  SET 
    credit_balance = v_new_balance,
    updated_at = NOW()
  WHERE id = p_user_id AND role = 'agent';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Failed to update agent credit balance';
  END IF;

  RAISE NOTICE 'Updated balance from % to %', v_current_balance, v_new_balance;

  -- Get wallet ID for this user (if wallet exists)
  SELECT id INTO v_wallet_id
  FROM wallets
  WHERE user_id = p_user_id
  LIMIT 1;

  -- If wallet exists, create a transaction record
  IF v_wallet_id IS NOT NULL THEN
    INSERT INTO wallet_transactions (
      wallet_id,
      user_id,
      user_name,
      amount,
      transaction_type,
      status,
      reference_id,
      description,
      created_at
    ) VALUES (
      v_wallet_id,
      p_user_id,
      COALESCE(v_user_name, 'Unknown'),
      p_payment_amount,
      'credit', -- This is a credit transaction (payment received)
      'completed',
      COALESCE(p_reference, 'MANUAL-' || EXTRACT(EPOCH FROM NOW())::TEXT),
      'Credit payment - ' || p_payment_method || ' payment recorded',
      NOW()
    )
    RETURNING id INTO v_transaction_id;

    RAISE NOTICE 'Created wallet transaction: %', v_transaction_id;
  ELSE
    RAISE NOTICE 'No wallet found for user, skipping transaction record';
  END IF;

  -- Return success response
  RETURN json_build_object(
    'success', true,
    'user_id', p_user_id,
    'previous_balance', v_current_balance,
    'new_balance', v_new_balance,
    'payment_amount', p_payment_amount,
    'payment_method', p_payment_method,
    'transaction_id', v_transaction_id,
    'wallet_id', v_wallet_id,
    'timestamp', NOW()
  );

EXCEPTION
  WHEN OTHERS THEN
    -- Log the error
    RAISE NOTICE 'Error in record_agent_credit_payment: %', SQLERRM;
    -- Re-raise with more context
    RAISE EXCEPTION 'Payment recording failed: %', SQLERRM;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.record_agent_credit_payment(UUID, NUMERIC, VARCHAR, VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_agent_credit_payment(UUID, NUMERIC, VARCHAR, VARCHAR) TO service_role;

-- Add comment
COMMENT ON FUNCTION public.record_agent_credit_payment IS 'Records a credit payment for an agent, increasing their available credit balance. Creates a wallet transaction if wallet exists.';

-- ============================================================================
-- Test the function (optional - comment out if not needed)
-- ============================================================================

-- Test query (replace with actual agent user_id)
-- SELECT record_agent_credit_payment(
--   'your-agent-user-id-here'::UUID,
--   1000.00,
--   'manual',
--   'TEST-PAYMENT-001'
-- );

-- ============================================================================
-- Verification Queries
-- ============================================================================

-- Verify function exists
SELECT 
  routine_name,
  routine_type,
  data_type,
  security_type
FROM information_schema.routines
WHERE routine_schema = 'public' 
  AND routine_name = 'record_agent_credit_payment';

-- Show function definition
SELECT pg_get_functiondef(oid)
FROM pg_proc
WHERE proname = 'record_agent_credit_payment';

