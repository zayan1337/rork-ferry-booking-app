import React, { useState, useMemo, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { colors } from '@/constants/adminColors';
import { useFinanceData } from '@/hooks/useFinanceData';
import type { Wallet } from '@/types/admin/finance';
import {
  Wallet as WalletIcon,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
} from 'lucide-react-native';

// Components
import SearchBar from '@/components/admin/SearchBar';
import LoadingSpinner from '@/components/admin/LoadingSpinner';

interface WalletsListPageProps {
  agentOnly?: boolean;
}

function WalletsListPage({ agentOnly = false }: WalletsListPageProps) {
  const {
    filteredWallets,
    agentWallets,
    loading,
    formatCurrency,
    formatDate,
    setSearchQuery,
    searchQueries,
    canViewWallets,
    handleRefresh,
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
      <View style={styles.walletIcon}>
        <WalletIcon size={24} color={colors.primary} />
      </View>
      <View style={styles.walletContent}>
        <View style={styles.walletHeader}>
          <Text style={styles.walletUser}>{item.user_name}</Text>
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
        <Text style={styles.walletEmail}>{item.user_email}</Text>
        <View style={styles.walletFooter}>
          <View style={styles.balanceContainer}>
            <Text style={styles.balanceLabel}>Balance:</Text>
            <Text style={styles.balanceValue}>
              {formatCurrency(item.balance)} {item.currency}
            </Text>
          </View>
          <Text style={styles.walletDate}>{formatDate(item.updated_at)}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <WalletIcon size={64} color={colors.textSecondary} />
      <Text style={styles.emptyStateTitle}>No Wallets Found</Text>
      <Text style={styles.emptyStateText}>
        {localSearchQuery
          ? 'Try adjusting your search terms'
          : agentOnly
            ? 'No agent wallets available'
            : 'No wallet records available'}
      </Text>
    </View>
  );

  const renderFilterButtons = () => (
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
          All
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
          Active
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
          Inactive
        </Text>
      </TouchableOpacity>
    </View>
  );

  // Permission check
  if (!canViewWallets) {
    return (
      <View style={styles.noPermissionContainer}>
        <AlertTriangle size={48} color={colors.warning} />
        <Text style={styles.noPermissionText}>
          You don't have permission to view wallets.
        </Text>
      </View>
    );
  }

  // Loading state
  if (loading.wallets && (!baseWallets || baseWallets.length === 0)) {
    return <LoadingSpinner />;
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {agentOnly ? 'Agent Wallets' : 'All Wallets'}
        </Text>
        <Text style={styles.headerSubtitle}>
          {displayWallets.length} wallet{displayWallets.length !== 1 ? 's' : ''}
        </Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <SearchBar
          placeholder='Search by name or email...'
          value={localSearchQuery}
          onChangeText={setLocalSearchQuery}
        />
      </View>

      {/* Filter Buttons */}
      {renderFilterButtons()}

      {/* Wallets List */}
      <FlatList
        data={displayWallets}
        renderItem={renderWallet}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
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
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
  },
  header: {
    padding: 16,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  searchContainer: {
    padding: 16,
    paddingBottom: 8,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 8,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 6,
  },
  filterButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  filterButtonTextActive: {
    color: colors.white,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  walletItem: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  walletIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  walletContent: {
    flex: 1,
  },
  walletHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  walletUser: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
    marginRight: 8,
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
  walletEmail: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  walletFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  balanceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  balanceLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  balanceValue: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
  },
  walletDate: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    gap: 16,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
  },
  emptyStateText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 280,
  },
  noPermissionContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    gap: 16,
  },
  noPermissionText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 280,
  },
} as any);

export default memo(WalletsListPage);
