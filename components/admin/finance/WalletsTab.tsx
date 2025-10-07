import React, { useState, useMemo, useEffect, memo } from 'react';
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
} from 'lucide-react-native';

// Components
import SectionHeader from '@/components/admin/SectionHeader';
import Button from '@/components/admin/Button';
import SearchBar from '@/components/admin/SearchBar';
import LoadingSpinner from '@/components/admin/LoadingSpinner';

interface WalletsTabProps {
  isActive: boolean;
  searchQuery?: string;
}

function WalletsTab({ isActive, searchQuery = '' }: WalletsTabProps) {
  const { canViewWallets, canManageWallets } = useAdminPermissions();
  const { wallets, loading, fetchWallets, setSearchQuery, searchQueries } =
    useFinanceStore();

  const [isRefreshing, setIsRefreshing] = useState(false);

  // Initialize wallets data when tab becomes active
  useEffect(() => {
    if (isActive && canViewWallets() && (!wallets || wallets.length === 0)) {
      fetchWallets();
    }
  }, [isActive, wallets?.length]);

  // Filter wallets based on search query
  const filteredWallets = useMemo(() => {
    if (!wallets) return [];

    let filtered = wallets;
    const query = searchQuery || searchQueries.wallets || '';

    if (query) {
      filtered = wallets.filter(
        wallet =>
          wallet.user_name.toLowerCase().includes(query.toLowerCase()) ||
          wallet.user_email.toLowerCase().includes(query.toLowerCase())
      );
    }

    return filtered;
  }, [wallets, searchQuery, searchQueries.wallets]);

  // Limit wallets to 4 for display
  const displayWallets = useMemo(() => {
    return filteredWallets.slice(0, 4);
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

  // Loading state - only show loading if we're actively loading and haven't received any data yet
  if (loading.wallets && (!wallets || wallets.length === 0)) {
    return <LoadingSpinner />;
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.sectionHeader}>
        <View style={styles.sectionHeaderContent}>
          <SectionHeader
            title='Wallet Management'
            subtitle={`${wallets?.length || 0} total wallets`}
          />
        </View>
        {canManageWallets() && (
          <View style={styles.sectionHeaderButton}>
            <Button
              title='Add Wallet'
              onPress={() => router.push('/(app)/(admin)/wallet/new' as any)}
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
        value={searchQuery || searchQueries.wallets || ''}
        onChangeText={text => setSearchQuery('wallets', text)}
      />

      {/* Wallets List */}
      <View style={styles.itemsList}>
        {displayWallets.length > 0 ? (
          displayWallets.map((wallet: Wallet, index: number) => (
            <TouchableOpacity
              key={`wallet-${wallet.id}-${index}`}
              style={styles.walletItem}
              onPress={() => handleWalletPress(wallet.id)}
            >
              <View style={styles.walletIcon}>
                <WalletIcon size={20} color={colors.primary} />
              </View>
              <View style={styles.walletInfo}>
                <Text style={styles.walletUser}>{wallet.user_name}</Text>
                <Text style={styles.walletEmail}>{wallet.user_email}</Text>
                <Text style={styles.walletBalance}>
                  {wallet.currency} {wallet.balance.toFixed(2)}
                </Text>
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
          ))
        ) : (
          <View style={styles.emptyState}>
            <WalletIcon size={48} color={colors.textSecondary} />
            <Text style={styles.emptyStateTitle}>No wallets found</Text>
            <Text style={styles.emptyStateText}>
              {searchQuery || searchQueries.wallets
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
  walletUser: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
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
