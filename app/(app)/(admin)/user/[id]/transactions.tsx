import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { colors } from '@/constants/adminColors';
import { ArrowLeft, CreditCard } from 'lucide-react-native';
import { Pressable } from 'react-native';
import { supabase } from '@/utils/supabase';
import EmptyState from '@/components/admin/EmptyState';
import { formatCurrency } from '@/utils/currencyUtils';
import { formatBookingDate, formatTimeAMPM } from '@/utils/dateUtils';

interface Transaction {
  id: string;
  booking_id: string;
  payment_method: string;
  amount: number;
  status: string;
  created_at: string;
  booking_number?: string;
}

export default function AgentTransactionsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadTransactions();
  }, [id]);

  const loadTransactions = async () => {
    if (!id) return;

    try {
      setLoading(true);

      // Fetch transactions for agent bookings
      const { data: bookings, error: bookingsError } = await supabase
        .from('bookings')
        .select('id')
        .eq('agent_id', id);

      if (bookingsError) throw bookingsError;

      const bookingIds = bookings?.map(b => b.id) || [];

      if (bookingIds.length === 0) {
        setTransactions([]);
        return;
      }

      // Fetch payments for these bookings
      const { data: payments, error: paymentsError } = await supabase
        .from('payments')
        .select(
          `
          id,
          booking_id,
          payment_method,
          amount,
          status,
          created_at,
          bookings!inner(
            booking_number
          )
        `
        )
        .in('booking_id', bookingIds)
        .order('created_at', { ascending: false });

      if (paymentsError) throw paymentsError;

      const transformedTransactions: Transaction[] = (payments || []).map(
        (payment: any) => ({
          id: payment.id,
          booking_id: payment.booking_id,
          payment_method: payment.payment_method || 'Unknown',
          amount: payment.amount || 0,
          status: payment.status || 'pending',
          created_at: payment.created_at,
          booking_number:
            payment.bookings?.booking_number ||
            (Array.isArray(payment.bookings)
              ? payment.bookings[0]?.booking_number
              : null) ||
            'N/A',
        })
      );

      setTransactions(transformedTransactions);
    } catch (error) {
      console.error('Error loading transactions:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadTransactions();
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
      case 'success':
        return colors.success;
      case 'pending':
        return colors.warning;
      case 'failed':
      case 'cancelled':
        return colors.danger;
      default:
        return colors.textSecondary;
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Agent Transactions',
          headerShown: true,
          headerLeft: () => (
            <Pressable style={styles.backButton} onPress={() => router.back()}>
              <ArrowLeft size={24} color={colors.primary} />
            </Pressable>
          ),
        }}
      />

      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size='large' color={colors.primary} />
          <Text style={styles.loadingText}>Loading transactions...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.contentContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
        >
          {transactions.length === 0 ? (
            <EmptyState
              icon={<CreditCard size={48} color={colors.textSecondary} />}
              title='No Transactions'
              message='This agent has no transactions yet.'
            />
          ) : (
            <View style={styles.listContainer}>
              <Text style={styles.sectionTitle}>
                {transactions.length} Transaction
                {transactions.length !== 1 ? 's' : ''}
              </Text>
              {transactions.map(transaction => (
                <View key={transaction.id} style={styles.transactionCard}>
                  <View style={styles.transactionHeader}>
                    <View style={styles.transactionInfo}>
                      <Text style={styles.transactionAmount}>
                        {formatCurrency(transaction.amount, 'MVR')}
                      </Text>
                      <Text style={styles.transactionMethod}>
                        {transaction.payment_method}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.statusBadge,
                        {
                          backgroundColor: `${getStatusColor(transaction.status)}20`,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusText,
                          { color: getStatusColor(transaction.status) },
                        ]}
                      >
                        {transaction.status.charAt(0).toUpperCase() +
                          transaction.status.slice(1)}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.transactionDetails}>
                    <Text style={styles.bookingNumber}>
                      Booking: {transaction.booking_number}
                    </Text>
                    <Text style={styles.transactionDate}>
                      {formatBookingDate(transaction.created_at)} at{' '}
                      {formatTimeAMPM(
                        new Date(transaction.created_at)
                          .toTimeString()
                          .split(' ')[0]
                      )}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  listContainer: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  transactionCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionAmount: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  transactionMethod: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  transactionDetails: {
    gap: 4,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  bookingNumber: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
  },
  transactionDate: {
    fontSize: 12,
    color: colors.textSecondary,
  },
});
