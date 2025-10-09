import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { colors } from '@/constants/adminColors';
import { useFinanceData } from '@/hooks/useFinanceData';
import type { Wallet } from '@/types/admin/finance';
import {
  Wallet as WalletIcon,
  AlertTriangle,
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
} from 'lucide-react-native';
import SearchBar from '@/components/admin/SearchBar';

interface WalletsListPageProps {
  agentOnly?: boolean;
}

export default function WalletsListPage({
  agentOnly = false,
}: WalletsListPageProps) {
  const {
    filteredWallets,
    agentWallets,
    loading,
    formatCurrency,
    formatDate,
    canViewWallets,
    handleRefresh,
    walletStats,
  } = useFinanceData();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [localSearchQuery, setLocalSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<
    'all' | 'active' | 'inactive'
  >('all');

  // Choose wallet list based on agentOnly prop
  const baseWallets = agentOnly ? agentWallets : filteredWallets;

  // Client-side search and filter
  const displayWallets = useMemo(() => {
    let filtered = [...baseWallets];

    // Apply search filter
    if (localSearchQuery.trim()) {
      const query = localSearchQuery.toLowerCase().trim();
      filtered = filtered.filter(
        wallet =>
          wallet.user_name.toLowerCase().includes(query) ||
          wallet.user_email.toLowerCase().includes(query)
      );
    }

    // Apply status filter
    if (filterStatus !== 'all') {
      if (filterStatus === 'active') {
        filtered = filtered.filter(w => w.balance > 0);
      } else if (filterStatus === 'inactive') {
        filtered = filtered.filter(w => w.balance === 0);
      }
    }

    return filtered;
  }, [baseWallets, localSearchQuery, filterStatus]);

  const handleRefreshData = async () => {
    setIsRefreshing(true);
    try {
      await handleRefresh();
    } catch (error) {
      console.error('Error refreshing wallets:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleWalletPress = (walletId: string) => {
    router.push(`/(app)/(admin)/wallet-detail?walletId=${walletId}` as any);
  };

  const renderWallet = ({ item }: { item: Wallet }) => (
    <TouchableOpacity
      style={styles.walletItem}
      onPress={() => handleWalletPress(item.id)}
      activeOpacity={0.7}
    >
      <View
        style={[
          styles.walletIcon,
          {
            backgroundColor: item.is_active
              ? colors.success + '15'
              : colors.danger + '15',
          },
        ]}
      >
        <WalletIcon
          size={24}
          color={item.is_active ? colors.success : colors.danger}
        />
      </View>
      <View style={styles.walletContent}>
        <View style={styles.walletHeader}>
          <View style={styles.walletUserInfo}>
            <Text style={styles.walletUser} numberOfLines={1}>
              {item.user_name}
            </Text>
            <Text style={styles.walletEmail} numberOfLines={1}>
              {item.user_email}
            </Text>
          </View>
          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor: item.is_active
                  ? colors.success + '15'
                  : colors.danger + '15',
              },
            ]}
          >
            <View
              style={[
                styles.statusDot,
                {
                  backgroundColor: item.is_active
                    ? colors.success
                    : colors.danger,
                },
              ]}
            />
            <Text
              style={[
                styles.statusText,
                { color: item.is_active ? colors.success : colors.danger },
              ]}
            >
              {item.is_active ? 'ACTIVE' : 'INACTIVE'}
            </Text>
          </View>
        </View>

        <View style={styles.walletFooter}>
          <View style={styles.balanceContainer}>
            <Text style={styles.balanceLabel}>Balance</Text>
            <Text style={styles.balanceValue}>
              {formatCurrency(item.balance)} {item.currency}
            </Text>
          </View>
          <Text style={styles.walletDate}>
            Updated {new Date(item.updated_at).toLocaleDateString()}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIcon}>
        <WalletIcon size={48} color={colors.textSecondary} />
      </View>
      <Text style={styles.emptyStateTitle}>No Wallets Found</Text>
      <Text style={styles.emptyStateText}>
        {localSearchQuery || filterStatus !== 'all'
          ? 'Try adjusting your filters or search terms'
          : agentOnly
            ? 'No agent wallets available yet'
            : 'No wallet records available yet'}
      </Text>
    </View>
  );

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      {/* Summary Stats */}
      {walletStats && (
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <View style={styles.statIconContainer}>
              <DollarSign size={20} color={colors.primary} />
            </View>
            <Text style={styles.statValue}>
              {formatCurrency(walletStats.totalBalance)}
            </Text>
            <Text style={styles.statLabel}>Total Balance</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <View style={styles.statIconContainer}>
              <TrendingUp size={20} color={colors.success} />
            </View>
            <Text style={styles.statValue}>{walletStats.activeWallets}</Text>
            <Text style={styles.statLabel}>Active Wallets</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <View style={styles.statIconContainer}>
              <Users size={20} color={colors.info} />
            </View>
            <Text style={styles.statValue}>{walletStats.totalWallets}</Text>
            <Text style={styles.statLabel}>Total Wallets</Text>
          </View>
        </View>
      )}

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <SearchBar
          placeholder='Search by name or email...'
          value={localSearchQuery}
          onChangeText={setLocalSearchQuery}
        />
      </View>

      {/* Filter Buttons */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[
            styles.filterButton,
            filterStatus === 'all' && styles.filterButtonActive,
          ]}
          onPress={() => setFilterStatus('all')}
        >
          <Text
            style={[
              styles.filterButtonText,
              filterStatus === 'all' && styles.filterButtonTextActive,
            ]}
          >
            All ({baseWallets.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.filterButton,
            filterStatus === 'active' && styles.filterButtonActive,
          ]}
          onPress={() => setFilterStatus('active')}
        >
          <TrendingUp
            size={16}
            color={filterStatus === 'active' ? colors.white : colors.success}
          />
          <Text
            style={[
              styles.filterButtonText,
              filterStatus === 'active' && styles.filterButtonTextActive,
            ]}
          >
            Active ({walletStats?.activeWallets || 0})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.filterButton,
            filterStatus === 'inactive' && styles.filterButtonActive,
          ]}
          onPress={() => setFilterStatus('inactive')}
        >
          <TrendingDown
            size={16}
            color={filterStatus === 'inactive' ? colors.white : colors.danger}
          />
          <Text
            style={[
              styles.filterButtonText,
              filterStatus === 'inactive' && styles.filterButtonTextActive,
            ]}
          >
            Inactive ({walletStats?.inactiveWallets || 0})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Results Count */}
      <View style={styles.resultsHeader}>
        <Text style={styles.resultsText}>
          Showing {displayWallets.length} wallet
          {displayWallets.length !== 1 ? 's' : ''}
          {filterStatus !== 'all' && ` · ${filterStatus}`}
        </Text>
      </View>
    </View>
  );

  // Permission check
  if (!canViewWallets) {
    return (
      <View style={styles.container}>
        <Stack.Screen
          options={{
            title: agentOnly ? 'Agent Wallets' : 'All Wallets',
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
        <View style={styles.noPermissionContainer}>
          <View style={styles.noPermissionIcon}>
            <AlertTriangle size={40} color={colors.warning} />
          </View>
          <Text style={styles.noPermissionTitle}>Access Denied</Text>
          <Text style={styles.noPermissionText}>
            You don't have permission to view wallet records.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: agentOnly ? 'Agent Wallets' : 'All Wallets',
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

      <FlatList
        data={displayWallets}
        renderItem={renderWallet}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefreshData}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={[0]}
      />
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
  headerContainer: {
    backgroundColor: colors.backgroundSecondary,
    paddingBottom: 8,
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 16,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary + '10',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: colors.border,
    marginHorizontal: 8,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.border,
    gap: 6,
  },
  filterButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  filterButtonTextActive: {
    color: colors.white,
  },
  resultsHeader: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  resultsText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  walletItem: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: colors.border + '40',
  },
  walletIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  walletContent: {
    flex: 1,
  },
  walletHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 12,
  },
  walletUserInfo: {
    flex: 1,
  },
  walletUser: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 2,
  },
  walletEmail: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 6,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  walletFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  balanceContainer: {
    flex: 1,
  },
  balanceLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
    fontWeight: '500',
  },
  balanceValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
  },
  walletDate: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 100,
    gap: 16,
  },
  emptyIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  emptyStateText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 20,
  },
  noPermissionContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    gap: 16,
  },
  noPermissionIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.warning + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  noPermissionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  noPermissionText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 22,
  },
} as any);
