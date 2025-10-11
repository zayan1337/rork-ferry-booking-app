-- ============================================================================
-- QUICK FIX: Update Agent Credit Payment Function
-- ============================================================================
-- This fixes the "column name does not exist" error
-- The column is "full_name", not "name"

-- Drop and recreate the function with the correct column name
DROP FUNCTION IF EXISTS public.record_agent_credit_payment(UUID, NUMERIC, VARCHAR, VARCHAR);

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
  -- Validate payment amount
  IF p_payment_amount IS NULL OR p_payment_amount <= 0 THEN
    RAISE EXCEPTION 'Payment amount must be greater than zero';
  END IF;

  -- Get current credit info (using full_name, not name)
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
    RAISE EXCEPTION 'Agent not found';
  END IF;

  -- Calculate new balance
  v_new_balance := COALESCE(v_current_balance, 0) + p_payment_amount;
  
  -- Cap at ceiling
  IF v_new_balance > v_current_ceiling THEN
    v_new_balance := v_current_ceiling;
  END IF;

  -- Update credit balance
  UPDATE user_profiles
  SET 
    credit_balance = v_new_balance,
    updated_at = NOW()
  WHERE id = p_user_id AND role = 'agent';

  -- Get wallet ID
  SELECT id INTO v_wallet_id
  FROM wallets
  WHERE user_id = p_user_id
  LIMIT 1;

  -- Create transaction record if wallet exists
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
      'credit',
      'completed',
      COALESCE(p_reference, 'MANUAL-' || EXTRACT(EPOCH FROM NOW())::TEXT),
      'Credit payment - ' || p_payment_method || ' payment recorded',
      NOW()
    )
    RETURNING id INTO v_transaction_id;
  END IF;

  -- Return success
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
    RAISE EXCEPTION 'Payment recording failed: %', SQLERRM;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.record_agent_credit_payment(UUID, NUMERIC, VARCHAR, VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_agent_credit_payment(UUID, NUMERIC, VARCHAR, VARCHAR) TO service_role;

-- Add comment
COMMENT ON FUNCTION public.record_agent_credit_payment IS 'Records a credit payment for an agent, increasing their available credit balance. FIXED: Uses full_name column.';

-- Verify function was created
SELECT 'Function created successfully!' AS status;

