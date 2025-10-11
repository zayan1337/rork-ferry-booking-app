import React, { useState, useMemo, memo, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { colors } from '@/constants/adminColors';
import { useFinanceStore } from '@/store/admin/financeStore';
import { useAdminPermissions } from '@/hooks/useAdminPermissions';
import { Wallet } from '@/types/admin/finance';
import {
  Plus,
  Eye,
  AlertTriangle,
  Wallet as WalletIcon,
  CreditCard,
  User,
} from 'lucide-react-native';

// Components
import SectionHeader from '@/components/admin/SectionHeader';
import Button from '@/components/admin/Button';
import SearchBar from '@/components/admin/SearchBar';

interface WalletsTabProps {
  isActive: boolean;
  searchQuery?: string;
}

function WalletsTab({ isActive, searchQuery = '' }: WalletsTabProps) {
  const { canViewWallets, canManageWallets } = useAdminPermissions();
  const { wallets, loading, fetchWallets, setSearchQuery, searchQueries } =
    useFinanceStore();

  console.log('🔍 [WalletsTab] Component state:', {
    isActive,
    walletsCount: wallets?.length || 0,
    loading: loading.wallets,
    canView: canViewWallets(),
    wallets: wallets?.map(w => ({ id: w.id, name: w.user_name })),
  });

  const [isRefreshing, setIsRefreshing] = useState(false);

  // Local search state - completely client-side, no store updates
  const [localSearchQuery, setLocalSearchQuery] = useState('');

  // Fetch wallets when tab becomes active
  useEffect(() => {
    if (isActive && canViewWallets()) {
      console.log('📥 [WalletsTab] Tab is active, fetching wallets...');
      fetchWallets();
    }
  }, [isActive, canViewWallets]);

  // Filter wallets based on search query - client-side only
  const filteredWallets = useMemo(() => {
    if (!wallets) {
      console.log('⚠️ [WalletsTab] No wallets available');
      return [];
    }

    console.log(`📋 [WalletsTab] Filtering ${wallets.length} wallets with query: "${localSearchQuery}"`);

    if (!localSearchQuery.trim()) return wallets;

    const query = localSearchQuery.toLowerCase().trim();
    const filtered = wallets.filter(
      wallet =>
        wallet.user_name.toLowerCase().includes(query) ||
        wallet.user_email.toLowerCase().includes(query)
    );
    
    console.log(`✅ [WalletsTab] Filtered down to ${filtered.length} wallets`);
    return filtered;
  }, [wallets, localSearchQuery]);

  // Limit wallets to 4 for display
  const displayWallets = useMemo(() => {
    const limited = filteredWallets.slice(0, 4);
    console.log(`📊 [WalletsTab] Displaying ${limited.length} wallets (limited from ${filteredWallets.length})`);
    return limited;
  }, [filteredWallets]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await fetchWallets(true);
    } catch (error) {
      console.error('Error refreshing wallets:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleWalletPress = (walletId: string) => {
    if (canViewWallets()) {
      router.push(`/(app)/(admin)/wallet-detail?walletId=${walletId}` as any);
    }
  };

  const handleViewAllWallets = () => {
    router.push('/(app)/(admin)/wallets' as any);
  };

  // Permission check
  if (!canViewWallets()) {
    return (
      <View style={styles.noPermissionContainer}>
        <AlertTriangle size={48} color={colors.warning} />
        <Text style={styles.noPermissionText}>
          You don't have permission to view wallets.
        </Text>
      </View>
    );
  }

  // Don't show loading spinner - let the page render with empty state instead
  // This prevents the "always loading" issue

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.sectionHeader}>
        <View style={styles.sectionHeaderContent}>
          <SectionHeader
            title='Wallet Management'
            subtitle={
              loading.wallets
                ? 'Loading wallets...'
                : `${wallets?.length || 0} total wallets`
            }
          />
        </View>
        {canManageWallets() && (
          <View style={styles.sectionHeaderButton}>
            <Button
              title='Add Wallet'
              onPress={() => router.push('/(app)/(admin)/wallet-new' as any)}
              size='small'
              variant='outline'
              icon={<Plus size={16} color={colors.primary} />}
            />
          </View>
        )}
      </View>

      {/* Search Bar */}
      <SearchBar
        placeholder='Search wallets...'
        value={localSearchQuery}
        onChangeText={setLocalSearchQuery}
      />

      {/* Wallets List */}
      <View style={styles.itemsList}>
        {displayWallets.length > 0 ? (
          displayWallets.map((wallet: Wallet, index: number) => {
            const isAgent = wallet.user_role === 'agent';
            
            return (
              <TouchableOpacity
                key={`wallet-${wallet.id}-${index}`}
                style={styles.walletItem}
                onPress={() => handleWalletPress(wallet.id)}
              >
                <View style={styles.walletIcon}>
                  {isAgent ? (
                    <CreditCard size={20} color={colors.primary} />
                  ) : (
                    <WalletIcon size={20} color={colors.primary} />
                  )}
                </View>
                <View style={styles.walletInfo}>
                  <View style={styles.walletUserContainer}>
                    <Text style={styles.walletUser}>{wallet.user_name}</Text>
                    {isAgent && (
                      <View style={styles.agentBadge}>
                        <Text style={styles.agentBadgeText}>AGENT</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.walletEmail}>{wallet.user_email}</Text>
                  
                  {/* Agent Credit Summary */}
                  {isAgent && wallet.credit_ceiling !== undefined ? (
                    <View style={styles.agentCreditSummary}>
                      <Text style={styles.creditSummaryText}>
                        Credit: {wallet.currency} {wallet.credit_balance?.toFixed(2) || '0.00'} / {wallet.credit_ceiling.toFixed(2)}
                      </Text>
                      {wallet.balance_to_pay !== undefined && wallet.balance_to_pay > 0 && (
                        <Text style={styles.creditDebtText}>
                          To Pay: {wallet.currency} {wallet.balance_to_pay.toFixed(2)}
                        </Text>
                      )}
                    </View>
                  ) : (
                    <Text style={styles.walletBalance}>
                      {wallet.currency} {wallet.balance.toFixed(2)}
                    </Text>
                  )}
                </View>
                <View style={styles.walletStatus}>
                  <View
                    style={[
                      styles.statusBadge,
                      {
                        backgroundColor: wallet.is_active
                          ? colors.success + '15'
                          : colors.danger + '15',
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.statusDot,
                        {
                          backgroundColor: wallet.is_active
                            ? colors.success
                            : colors.danger,
                        },
                      ]}
                    />
                    <Text
                      style={[
                        styles.statusText,
                        {
                          color: wallet.is_active
                            ? colors.success
                            : colors.danger,
                        },
                      ]}
                    >
                      {wallet.is_active ? 'ACTIVE' : 'INACTIVE'}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        ) : (
          <View style={styles.emptyState}>
            <WalletIcon size={48} color={colors.textSecondary} />
            <Text style={styles.emptyStateTitle}>No wallets found</Text>
            <Text style={styles.emptyStateText}>
              {localSearchQuery
                ? 'Try adjusting your search terms'
                : 'No wallets available'}
            </Text>
          </View>
        )}
      </View>

      {/* View All Button */}
      <TouchableOpacity
        style={styles.viewAllButton}
        onPress={handleViewAllWallets}
      >
        <Text style={styles.viewAllText}>View All Wallets</Text>
        <Eye size={16} color={colors.primary} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    minHeight: 44,
    paddingHorizontal: 4,
  },
  sectionHeaderContent: {
    flex: 1,
    paddingRight: 8,
  },
  sectionHeaderButton: {
    flexShrink: 0,
    maxWidth: '40%',
  },
  itemsList: {
    gap: 12,
    marginTop: 16,
  },
  walletItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: 12,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  walletIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  walletInfo: {
    flex: 1,
  },
  walletUserContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  walletUser: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  agentBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  agentBadgeText: {
    fontSize: 8,
    fontWeight: '700',
    color: colors.white,
  },
  walletEmail: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  walletBalance: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
  },
  agentCreditSummary: {
    backgroundColor: colors.backgroundSecondary,
    padding: 8,
    borderRadius: 6,
    marginTop: 4,
    gap: 4,
  },
  creditSummaryText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },
  creditDebtText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.danger,
  },
  walletStatus: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  emptyStateText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 280,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary + '10',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 16,
    gap: 8,
  },
  viewAllText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
  noPermissionContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 16,
  },
  noPermissionText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 280,
  },
} as any);

export default memo(WalletsTab);
