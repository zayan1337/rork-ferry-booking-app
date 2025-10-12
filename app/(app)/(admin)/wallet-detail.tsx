import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Stack, useLocalSearchParams, router } from 'expo-router';
import { colors } from '@/constants/adminColors';
import { useFinanceData } from '@/hooks/useFinanceData';
import WalletDetailCard from '@/components/admin/finance/WalletDetailCard';
import { AlertCircle, RefreshCw, ArrowLeft } from 'lucide-react-native';

export default function WalletDetailPage() {
  const { walletId } = useLocalSearchParams<{ walletId: string }>();
  const {
    getWalletById,
    getWalletTransactions,
    formatCurrency,
    formatDate,
    loading,
    handleRefresh,
  } = useFinanceData();

  const [isRefreshing, setIsRefreshing] = useState(false);

  const wallet = getWalletById(walletId);
  const allTransactions = getWalletTransactions(walletId);

  const handleRefreshData = async () => {
    setIsRefreshing(true);
    try {
      await handleRefresh();
    } catch (error) {
      console.error('Error refreshing wallet:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  if (loading.wallets && !wallet) {
    return (
      <View style={styles.container}>
        <Stack.Screen
          options={{
            title: 'Wallet Details',
          }}
        />
        <View style={styles.loadingContainer}>
          <RefreshCw size={48} color={colors.primary} />
          <Text style={styles.loadingText}>Loading wallet details...</Text>
        </View>
      </View>
    );
  }

  if (!wallet) {
    return (
      <View style={styles.container}>
        <Stack.Screen
          options={{
            title: 'Wallet Not Found',
          }}
        />
        <View style={styles.notFoundContainer}>
          <View style={styles.notFoundIcon}>
            <AlertCircle size={40} color={colors.warning} />
          </View>
          <Text style={styles.notFoundTitle}>Wallet Not Found</Text>
          <Text style={styles.notFoundText}>
            The wallet you're looking for doesn't exist or has been removed.
          </Text>
          <TouchableOpacity
            style={styles.backToListButton}
            onPress={() => router.back()}
          >
            <ArrowLeft size={20} color={colors.primary} />
            <Text style={styles.backToListText}>Back to Wallets</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Wallet Details',
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backButton}
            >
              <ArrowLeft size={24} color={colors.primary} />
            </TouchableOpacity>
          ),
        }}
      />

      <WalletDetailCard
        wallet={wallet}
        transactions={allTransactions}
        formatCurrency={formatCurrency}
        formatDate={formatDate}
        onRefresh={handleRefreshData}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
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
  notFoundContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    gap: 16,
  },
  notFoundIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.warning + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  notFoundTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  notFoundText: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 300,
    lineHeight: 22,
  },
  backToListButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: colors.primary,
    borderRadius: 12,
    gap: 8,
    marginTop: 16,
  },
  backToListText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
} as any);
