import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  RefreshControl,
  FlatList,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { colors } from '@/constants/adminColors';
import {
  Wallet,
  DollarSign,
  TrendingUp,
  ChevronRight,
} from 'lucide-react-native';
import { useFinanceStore } from '@/store/admin/financeStore';
import { useAdminPermissions } from '@/hooks/useAdminPermissions';
import SearchBar from '@/components/admin/SearchBar';
import StatCard from '@/components/admin/StatCard';
import { Wallet as WalletType } from '@/types/admin/finance';

const { width: screenWidth } = Dimensions.get('window');

export default function WalletsListingScreen() {
  const {
    wallets,
    stats,
    loading,
    fetchWallets,
    fetchStats,
    setSearchQuery,
    searchQueries,
  } = useFinanceStore();

  const { canViewWallets, canManageWallets } = useAdminPermissions();

  const [refreshing, setRefreshing] = useState(false);
  const [filterStatus, setFilterStatus] = useState<
    'all' | 'active' | 'inactive'
  >('all');

  const isTablet = screenWidth >= 768;

  useEffect(() => {
    if (canViewWallets()) {
      fetchWallets();
      fetchStats();
    }
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchWallets(true);
    await fetchStats();
    setRefreshing(false);
  };

  const handleWalletPress = (walletId: string) => {
    router.push(`/(app)/(admin)/wallet-detail?walletId=${walletId}` as any);
  };

  const handleSearch = (query: string) => {
    setSearchQuery('wallets', query);
  };

  const filteredWallets = wallets.filter(wallet => {
    const matchesSearch =
      wallet.user_name
        .toLowerCase()
        .includes(searchQueries.wallets.toLowerCase()) ||
      wallet.user_email
        .toLowerCase()
        .includes(searchQueries.wallets.toLowerCase());

    const matchesFilter =
      filterStatus === 'all' ||
      (filterStatus === 'active' && wallet.is_active) ||
      (filterStatus === 'inactive' && !wallet.is_active);

    return matchesSearch && matchesFilter;
  });

  const renderWalletItem = ({ item }: { item: WalletType }) => (
    <TouchableOpacity
      style={styles.walletCard}
      onPress={() => handleWalletPress(item.id)}
    >
      <View style={styles.walletHeader}>
        <View style={styles.walletIconContainer}>
          <View
            style={[
              styles.walletIcon,
              { backgroundColor: colors.primary + '15' },
            ]}
          >
            <Wallet size={24} color={colors.primary} />
          </View>
          <View style={styles.walletInfo}>
            <Text style={styles.walletUserName}>{item.user_name}</Text>
            <Text style={styles.walletUserEmail}>{item.user_email}</Text>
          </View>
        </View>
        <ChevronRight size={20} color={colors.textSecondary} />
      </View>

      <View style={styles.walletDetails}>
        <View style={styles.balanceContainer}>
          <Text style={styles.balanceLabel}>Balance</Text>
          <Text style={styles.balanceAmount}>
            {item.currency} {item.balance.toFixed(2)}
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
              {
                color: item.is_active ? colors.success : colors.danger,
              },
            ]}
          >
            {item.is_active ? 'Active' : 'Inactive'}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (!canViewWallets()) {
    return (
      <View style={styles.container}>
        <Stack.Screen
          options={{
            title: 'Wallets',
            headerShown: true,
          }}
        />
        <View style={styles.centerContainer}>
          <Text style={styles.noAccessText}>
            You don't have permission to view wallets
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Wallets',
          headerShown: true,
          headerStyle: {
            backgroundColor: colors.background,
          },
          headerTintColor: colors.text,
          headerTitleStyle: {
            fontWeight: '600',
            fontSize: 18,
          },
        }}
      />

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
        {/* Stats Section */}
        <View style={styles.statsSection}>
          <View style={styles.statsGrid}>
            <StatCard
              icon={<Wallet size={24} color={colors.primary} />}
              title='Total Wallets'
              value={wallets.length.toString()}
              color={colors.primary}
            />
            <StatCard
              icon={<TrendingUp size={24} color={colors.success} />}
              title='Active Wallets'
              value={stats.activeWallets.toString()}
              color={colors.success}
            />
            <StatCard
              icon={<DollarSign size={24} color={colors.warning} />}
              title='Total Balance'
              value={`MVR ${stats.totalWalletBalance.toFixed(2)}`}
              color={colors.warning}
            />
          </View>
        </View>

        {/* Search and Filter Section */}
        <View style={styles.searchSection}>
          <SearchBar
            placeholder='Search wallets...'
            value={searchQueries.wallets}
            onChangeText={handleSearch}
          />

          <View style={styles.filterChips}>
            {[
              { key: 'all', label: 'All' },
              { key: 'active', label: 'Active' },
              { key: 'inactive', label: 'Inactive' },
            ].map(filter => (
              <TouchableOpacity
                key={filter.key}
                style={[
                  styles.filterChip,
                  filterStatus === filter.key && styles.filterChipActive,
                ]}
                onPress={() => setFilterStatus(filter.key as any)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    filterStatus === filter.key && styles.filterChipTextActive,
                  ]}
                >
                  {filter.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Wallets List */}
        <View style={styles.listSection}>
          <View style={styles.listHeader}>
            <Text style={styles.listTitle}>All Wallets</Text>
            <Text style={styles.listSubtitle}>
              {filteredWallets.length} wallet
              {filteredWallets.length !== 1 ? 's' : ''}
            </Text>
          </View>

          {loading.wallets ? (
            <View style={styles.centerContainer}>
              <Text style={styles.loadingText}>Loading wallets...</Text>
            </View>
          ) : filteredWallets.length === 0 ? (
            <View style={styles.emptyState}>
              <Wallet size={48} color={colors.textSecondary} />
              <Text style={styles.emptyStateText}>No wallets found</Text>
            </View>
          ) : (
            <FlatList
              data={filteredWallets}
              renderItem={renderWalletItem}
              keyExtractor={item => item.id}
              scrollEnabled={false}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      </ScrollView>
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
    paddingBottom: 20,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  noAccessText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: colors.textSecondary,
  },

  // Stats Section
  statsSection: {
    padding: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },

  // Search Section
  searchSection: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  filterChips: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: colors.background,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: {
    backgroundColor: colors.primary + '15',
    borderColor: colors.primary,
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  filterChipTextActive: {
    color: colors.primary,
  },

  // List Section
  listSection: {
    paddingHorizontal: 16,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  listTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  listSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },

  // Wallet Card
  walletCard: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  walletHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  walletIconContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  walletIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  walletInfo: {
    flex: 1,
  },
  walletUserName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  walletUserEmail: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  walletDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  balanceContainer: {
    flex: 1,
  },
  balanceLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  balanceAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: 12,
  },
} as any);
