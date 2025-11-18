import React, { useState, useMemo, memo, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
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
  const {
    wallets,
    loading,
    fetchWallets,
    setSearchQuery,
    searchQueries,
    createWalletsForAllUsers,
  } = useFinanceStore();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const hasFetchedRef = useRef(false);

  // Local search state - completely client-side, no store updates
  const [localSearchQuery, setLocalSearchQuery] = useState('');

  // Fetch wallets when tab becomes active (only once per activation)
  useEffect(() => {
    if (!isActive) {
      // Reset ref when tab becomes inactive
      hasFetchedRef.current = false;
      return;
    }
    
    if (canViewWallets() && !hasFetchedRef.current) {
      hasFetchedRef.current = true;
      console.log('🔄 [WalletsTab] Tab active, fetching wallets...');
      fetchWallets(true).catch(err => {
        console.error('❌ [WalletsTab] Error fetching wallets:', err);
        hasFetchedRef.current = false; // Reset on error so we can retry
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive]); // Only depend on isActive, not fetchWallets

  // Filter wallets based on search query - client-side only
  const filteredWallets = useMemo(() => {
    if (!wallets) {
      return [];
    }

    if (!localSearchQuery.trim()) return wallets;

    const query = localSearchQuery.toLowerCase().trim();
    const filtered = wallets.filter(
      wallet =>
        wallet.user_name.toLowerCase().includes(query) ||
        wallet.user_email.toLowerCase().includes(query)
    );

    return filtered;
  }, [wallets, localSearchQuery]);

  // Limit wallets to 4 for display
  const displayWallets = useMemo(() => {
    const limited = filteredWallets.slice(0, 4);

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

  const handleCreateWalletsForAllUsers = async () => {
    try {
      const result = await createWalletsForAllUsers();
      console.log('✅ Created wallets:', result);
      // Wallets will be automatically refreshed by the store
    } catch (error: any) {
      console.error('❌ Error creating wallets:', error);
    }
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
              wallets
                ? `${wallets.length || 0} total wallets`
                : loading.wallets
                  ? 'Loading wallets...'
                  : 'No wallets'
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

      {/* Create Wallets for All Agent Users Button - Show when no wallets exist */}
      {wallets.length === 0 && canManageWallets() && (
        <View style={styles.createAllWalletsContainer}>
          <Text style={styles.createAllWalletsText}>
            No wallets found. Create wallets for all active agent users?
          </Text>
          <Button
            title='Create Wallets for All Agents'
            onPress={handleCreateWalletsForAllUsers}
            size='medium'
            variant='primary'
            disabled={loading.creating}
          />
        </View>
      )}

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
              <Pressable
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
                    {(wallet as any).is_credit_account && (
                      <View style={styles.creditBadge}>
                        <Text style={styles.creditBadgeText}>CREDIT</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.walletEmail}>{wallet.user_email}</Text>

                  {/* Agent Credit Summary */}
                  {isAgent && wallet.credit_ceiling !== undefined ? (
                    <View style={styles.agentCreditSummary}>
                      <Text style={styles.creditSummaryText}>
                        Credit: {wallet.currency}{' '}
                        {wallet.credit_balance?.toFixed(2) || '0.00'} /{' '}
                        {wallet.credit_ceiling.toFixed(2)}
                      </Text>
                      {wallet.balance_to_pay !== undefined &&
                        wallet.balance_to_pay > 0 && (
                          <Text style={styles.creditDebtText}>
                            To Pay: {wallet.currency}{' '}
                            {wallet.balance_to_pay.toFixed(2)}
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
              </Pressable>
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
      <Pressable style={styles.viewAllButton} onPress={handleViewAllWallets}>
        <Text style={styles.viewAllText}>View All Wallets</Text>
        <Eye size={16} color={colors.primary} />
      </Pressable>
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
  creditBadge: {
    backgroundColor: colors.warning,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  creditBadgeText: {
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
  createAllWalletsContainer: {
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: `${colors.primary}30`,
  },
  createAllWalletsText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
} as any);

export default memo(WalletsTab);
