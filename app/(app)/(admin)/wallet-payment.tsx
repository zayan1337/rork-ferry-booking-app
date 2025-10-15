import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  Alert,
  ScrollView,
} from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { colors } from '@/constants/adminColors';
import {
  ArrowLeft,
  CreditCard,
  DollarSign,
  User,
  Wallet as WalletIcon,
} from 'lucide-react-native';
import MibPaymentWebView from '@/components/MibPaymentWebView';
import { supabase } from '@/utils/supabase';

export default function WalletPaymentPage() {
  const params = useLocalSearchParams();
  const walletId = params.walletId as string;
  const userId = params.userId as string;
  const amount = parseFloat(params.amount as string);
  const paymentType = params.paymentType as string;

  const [isLoading, setIsLoading] = useState(false);
  const [walletInfo, setWalletInfo] = useState<any>(null);
  const [sessionData, setSessionData] = useState<any>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  useEffect(() => {
    fetchWalletInfo();
  }, [walletId, userId]);

  const fetchWalletInfo = async () => {
    try {
      setIsLoading(true);

      // Fetch wallet and user details
      const { data: wallet, error: walletError } = await supabase
        .from('wallets')
        .select(
          `
          *,
          user_profiles!inner(
            id,
            full_name,
            email,
            credit_balance,
            credit_ceiling
          )
        `
        )
        .eq('id', walletId)
        .single();

      if (walletError) throw walletError;

      setWalletInfo({
        ...wallet,
        user_name: wallet.user_profiles.full_name,
        user_email: wallet.user_profiles.email,
        credit_balance: wallet.user_profiles.credit_balance,
        credit_ceiling: wallet.user_profiles.credit_ceiling,
      });
    } catch (error) {
      console.error('Error fetching wallet info:', error);
      Alert.alert('Error', 'Failed to load wallet information');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInitiatePayment = async () => {
    try {
      setIsLoading(true);

      // Call the edge function to create MIB session
      const { data, error } = await supabase.functions.invoke('mib-payment', {
        body: {
          action: 'create-session',
          bookingId: walletId, // Use walletId as bookingId for tracking
          amount: amount,
          currency: 'MVR',
          returnUrl: `${window.location.origin}/wallet-payment-success`,
          cancelUrl: `${window.location.origin}/wallet-payment-cancel`,
        },
      });

      if (error) {
        console.error('❌ Error creating MIB session:', error);
        throw error;
      }

      if (!data || !data.sessionId || !data.redirectUrl) {
        console.error('❌ Invalid response from MIB session creation:', data);
        throw new Error('Invalid payment session data received');
      }

      setSessionData({
        sessionId: data.sessionId,
        sessionUrl: data.redirectUrl,
        redirectUrl: data.redirectUrl,
      });

      setShowPaymentModal(true);
    } catch (error: any) {
      console.error('❌ Failed to initiate payment:', error);
      Alert.alert(
        'Payment Error',
        error.message || 'Failed to initiate payment. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handlePaymentSuccess = async (result: any) => {
    try {
      // Call the database function to record the payment
      const { data, error } = await supabase.rpc(
        'record_agent_credit_payment',
        {
          p_user_id: userId,
          p_payment_amount: amount,
          p_payment_method: 'mib_gateway',
          p_reference: sessionData?.sessionId || result?.sessionId,
        }
      );

      if (error) throw error;

      Alert.alert(
        'Payment Successful',
        `Payment of MVR ${amount.toFixed(2)} has been processed successfully!`,
        [
          {
            text: 'OK',
            onPress: () => {
              setShowPaymentModal(false);
              router.back();
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error recording payment:', error);
      Alert.alert(
        'Payment Recorded',
        'Payment was successful but there was an issue updating the wallet. Please contact support.',
        [
          {
            text: 'OK',
            onPress: () => {
              setShowPaymentModal(false);
              router.back();
            },
          },
        ]
      );
    }
  };

  const handlePaymentFailure = (error: string) => {
    console.error('❌ Payment failed:', error);
    setShowPaymentModal(false);
    Alert.alert(
      'Payment Failed',
      error || 'Payment was not completed successfully.',
      [
        { text: 'Try Again', onPress: handleInitiatePayment },
        { text: 'Cancel', style: 'cancel', onPress: () => router.back() },
      ]
    );
  };

  const handlePaymentCancel = () => {
    setShowPaymentModal(false);
    Alert.alert('Payment Cancelled', 'The payment was cancelled.', [
      { text: 'Try Again', onPress: handleInitiatePayment },
      { text: 'Go Back', style: 'cancel', onPress: () => router.back() },
    ]);
  };

  const formatCurrency = (value: number) => {
    return `MVR ${value.toFixed(2)}`;
  };

  if (isLoading && !walletInfo) {
    return (
      <View style={styles.container}>
        <Stack.Screen
          options={{
            title: 'Processing Payment',
            headerShown: true,
          }}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size='large' color={colors.primary} />
          <Text style={styles.loadingText}>Loading payment details...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Agent Credit Payment',
          headerShown: true,
          headerLeft: () => (
            <Pressable style={styles.backButton} onPress={() => router.back()}>
              <ArrowLeft size={24} color={colors.primary} />
            </Pressable>
          ),
        }}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
      >
        {/* Payment Summary Card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <CreditCard size={28} color={colors.primary} />
            <Text style={styles.summaryTitle}>Payment Summary</Text>
          </View>

          {/* Amount */}
          <View style={styles.amountSection}>
            <Text style={styles.amountLabel}>Amount to Pay</Text>
            <Text style={styles.amountValue}>{formatCurrency(amount)}</Text>
          </View>

          {/* Divider */}
          <View style={styles.divider} />

          {/* User Details */}
          {walletInfo && (
            <View style={styles.detailsSection}>
              <View style={styles.detailRow}>
                <User size={16} color={colors.textSecondary} />
                <Text style={styles.detailLabel}>Agent Name</Text>
                <Text style={styles.detailValue}>{walletInfo.user_name}</Text>
              </View>

              <View style={styles.detailRow}>
                <WalletIcon size={16} color={colors.textSecondary} />
                <Text style={styles.detailLabel}>Wallet ID</Text>
                <Text style={styles.detailValue} numberOfLines={1}>
                  {walletId.substring(0, 8)}...
                </Text>
              </View>

              <View style={styles.detailRow}>
                <DollarSign size={16} color={colors.textSecondary} />
                <Text style={styles.detailLabel}>Payment Type</Text>
                <Text style={styles.detailValue}>Credit Repayment</Text>
              </View>
            </View>
          )}
        </View>

        {/* Payment Info */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Payment via MIB Gateway</Text>
          <Text style={styles.infoText}>
            • This payment will be processed through the MIB payment gateway
          </Text>
          <Text style={styles.infoText}>
            • Your agent credit balance will be updated immediately after
            successful payment
          </Text>
          <Text style={styles.infoText}>
            • You will receive a payment confirmation
          </Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          <Pressable
            style={[styles.payButton, isLoading && styles.payButtonDisabled]}
            onPress={handleInitiatePayment}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size='small' color={colors.white} />
            ) : (
              <>
                <CreditCard size={20} color={colors.white} />
                <Text style={styles.payButtonText}>Proceed to Payment</Text>
              </>
            )}
          </Pressable>

          <Pressable
            style={styles.cancelButton}
            onPress={() => router.back()}
            disabled={isLoading}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* MIB Payment WebView */}
      {sessionData && (
        <MibPaymentWebView
          visible={showPaymentModal}
          bookingDetails={{
            bookingNumber: `WALLET-${walletId.substring(0, 8)}`,
            route: 'Agent Credit Payment',
            travelDate: new Date().toLocaleDateString(),
            amount: amount,
            currency: 'MVR',
            passengerCount: 1,
          }}
          bookingId={walletId}
          sessionData={sessionData}
          onClose={() => setShowPaymentModal(false)}
          onSuccess={handlePaymentSuccess}
          onFailure={handlePaymentFailure}
          onCancel={handlePaymentCancel}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: colors.textSecondary,
    fontWeight: '500',
  },

  // Summary Card
  summaryCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 24,
  },
  summaryTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  amountSection: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  amountLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  amountValue: {
    fontSize: 36,
    fontWeight: '800',
    color: colors.primary,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 20,
  },
  detailsSection: {
    gap: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  detailLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
    minWidth: 100,
  },
  detailValue: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '600',
    flex: 1,
  },

  // Info Card
  infoCard: {
    backgroundColor: `${colors.primary}10`,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: `${colors.primary}30`,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
    marginBottom: 8,
  },

  // Actions
  actionsContainer: {
    gap: 12,
  },
  payButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 12,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  payButtonDisabled: {
    opacity: 0.6,
  },
  payButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.white,
  },
  cancelButton: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary,
  },
});
