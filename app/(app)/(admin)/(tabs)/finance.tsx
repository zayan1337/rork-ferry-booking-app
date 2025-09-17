import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Alert,
  RefreshControl,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { colors } from '@/constants/adminColors';
import { useAdminStore } from '@/store/admin/adminStore';
import { useAdminPermissions } from '@/hooks/useAdminPermissions';
import {
  DollarSign,
  Wallet,
  CreditCard,
  TrendingUp,
  TrendingDown,
  Plus,
  Eye,
  AlertTriangle,
  Download,
  Filter,
  Calendar,
  Clock,
  Users,
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCw,
  BarChart3,
  PieChart,
  Activity,
} from 'lucide-react-native';
import StatCard from '@/components/admin/StatCard';
import SectionHeader from '@/components/admin/SectionHeader';
import Button from '@/components/admin/Button';
import SearchBar from '@/components/admin/SearchBar';

// Finance Components
import { FinanceStats, PaymentMethodCard } from '@/components/admin/finance';

const { width: screenWidth } = Dimensions.get('window');

export default function FinanceScreen() {
  const {
    wallets,
    walletTransactions,
    paymentReports,
    dashboardStats,
    loading,
    refreshData,
    searchQueries,
    setSearchQuery,
    addWalletTransaction,
  } = useAdminStore();

  const {
    canViewWallets,
    canManageWallets,
    canViewPayments,
    canManagePayments,
  } = useAdminPermissions();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeSection, setActiveSection] = useState<
    'wallets' | 'payments' | 'reports' | 'transactions'
  >('wallets');
  const [selectedFilter, setSelectedFilter] = useState<
    'all' | 'today' | 'week' | 'month'
  >('all');

  const isTablet = screenWidth >= 768;
  const isSmallScreen = screenWidth < 480;

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshData();
    setIsRefreshing(false);
  };

  const handleWalletPress = (walletId: string) => {
    if (canViewWallets()) {
      router.push(`../wallet/${walletId}` as any);
    }
  };

  const handleAddCredit = (walletId: string) => {
    if (!canManageWallets()) {
      Alert.alert(
        'Access Denied',
        "You don't have permission to manage wallets."
      );
      return;
    }

    Alert.prompt(
      'Add Credit',
      'Enter the amount to add:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Add',
          onPress: (value: any) => {
            if (value && !isNaN(Number(value))) {
              addWalletTransaction({
                wallet_id: walletId,
                user_id: wallets?.find(w => w.id === walletId)?.user_id || '',
                user_name:
                  wallets?.find(w => w.id === walletId)?.user_name || '',
                amount: Number(value),
                transaction_type: 'credit',
                description: 'Manual credit addition',
              });
              Alert.alert('Success', 'Credit added successfully!');
            } else {
              Alert.alert('Error', 'Please enter a valid amount.');
            }
          },
        },
      ],
      'plain-text'
    );
  };

  const getResponsivePadding = () => ({
    paddingHorizontal: isTablet ? 24 : isSmallScreen ? 12 : 16,
    paddingVertical: isTablet ? 20 : 16,
  });

  // Calculate financial statistics
  const totalWalletBalance = wallets.reduce((sum, w) => sum + w.balance, 0);
  const activeWallets = wallets.filter(w => w.is_active).length;
  const todayTransactions = walletTransactions.filter(
    t => new Date(t.created_at).toDateString() === new Date().toDateString()
  ).length;
  const weeklyRevenue = dashboardStats.dailyBookings.revenue * 7;
  const monthlyRevenue = dashboardStats.dailyBookings.revenue * 30;

  // Filter transactions based on selected filter
  const getFilteredTransactions = () => {
    const now = new Date();
    const startOfDay = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );
    const startOfWeek = new Date(
      startOfDay.getTime() - 7 * 24 * 60 * 60 * 1000
    );
    const startOfMonth = new Date(
      startOfDay.getTime() - 30 * 24 * 60 * 60 * 1000
    );

    switch (selectedFilter) {
      case 'today':
        return walletTransactions.filter(
          t => new Date(t.created_at) >= startOfDay
        );
      case 'week':
        return walletTransactions.filter(
          t => new Date(t.created_at) >= startOfWeek
        );
      case 'month':
        return walletTransactions.filter(
          t => new Date(t.created_at) >= startOfMonth
        );
      default:
        return walletTransactions;
    }
  };

  // Helper function to render 3-card grid (single row layout)
  const render3CardGrid = (cards: React.ReactNode[]) => (
    <View style={[styles.statsGrid, styles.statsGrid3SingleRow]}>
      <View style={styles.statsRowSingle3}>{cards}</View>
    </View>
  );

  // Helper function to render 4-card grid (2x2 layout)
  const render4CardGrid = (cards: React.ReactNode[]) => (
    <View style={[styles.statsGrid, styles.statsGrid4]}>
      <View style={styles.statsRow}>{cards.slice(0, 2)}</View>
      <View style={styles.statsRow}>{cards.slice(2, 4)}</View>
    </View>
  );

  const renderSectionSelector = () => (
    <View style={styles.sectionSelector}>
      {[
        {
          key: 'wallets',
          label: 'Wallets',
          icon: Wallet,
          permission: canViewWallets(),
        },
        {
          key: 'transactions',
          label: 'Transactions',
          icon: Activity,
          permission: canViewWallets(),
        },
        {
          key: 'payments',
          label: 'Payments',
          icon: CreditCard,
          permission: canViewPayments(),
        },
        {
          key: 'reports',
          label: 'Reports',
          icon: BarChart3,
          permission: canViewPayments(),
        },
      ]
        .filter(section => section.permission)
        .map(section => (
          <TouchableOpacity
            key={section.key}
            style={[
              styles.sectionButton,
              activeSection === section.key && styles.sectionButtonActive,
            ]}
            onPress={() => setActiveSection(section.key as any)}
          >
            <section.icon
              size={16}
              color={
                activeSection === section.key
                  ? colors.primary
                  : colors.textSecondary
              }
            />
            <Text
              style={[
                styles.sectionButtonText,
                activeSection === section.key && styles.sectionButtonTextActive,
              ]}
            >
              {section.label}
            </Text>
          </TouchableOpacity>
        ))}
    </View>
  );

  const renderFilterButtons = () => (
    <View style={styles.filterContainer}>
      {[
        { key: 'all', label: 'All' },
        { key: 'today', label: 'Today' },
        { key: 'week', label: 'Week' },
        { key: 'month', label: 'Month' },
      ].map(filter => (
        <TouchableOpacity
          key={filter.key}
          style={[
            styles.filterChip,
            selectedFilter === filter.key && styles.filterChipActive,
          ]}
          onPress={() => setSelectedFilter(filter.key as any)}
        >
          <Text
            style={[
              styles.filterChipText,
              selectedFilter === filter.key && styles.filterChipTextActive,
            ]}
          >
            {filter.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderWallets = () => {
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

    return (
      <View style={styles.sectionContent}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionHeaderContent}>
            <SectionHeader
              title='Wallet Management'
              subtitle={`${activeWallets} active wallets • MVR ${totalWalletBalance.toFixed(2)} total`}
            />
          </View>
          {canManageWallets() && (
            <View style={styles.sectionHeaderButton}>
              <Button
                title='Add Wallet'
                onPress={() => router.push('../wallet/new' as any)}
                size='small'
                variant='outline'
                icon={<Plus size={16} color={colors.primary} />}
              />
            </View>
          )}
        </View>

        <SearchBar
          placeholder='Search wallets by name or email...'
          value={searchQueries.wallets || ''}
          onChangeText={text => setSearchQuery('wallets', text)}
        />

        {/* Wallet Statistics */}
        {render3CardGrid([
          <View
            key='active-wallets'
            style={[
              styles.statCard3Grid,
              isTablet && styles.statCard3GridTablet,
            ]}
          >
            <View style={styles.statIcon}>
              <Users size={20} color={colors.primary} />
            </View>
            <View style={styles.statInfo}>
              <Text style={styles.statValue}>{activeWallets}</Text>
              <Text style={styles.statLabel}>Active Wallets</Text>
            </View>
          </View>,
          <View
            key='total-balance'
            style={[
              styles.statCard3Grid,
              isTablet && styles.statCard3GridTablet,
            ]}
          >
            <View
              style={[styles.statIcon, { backgroundColor: '#34C759' + '15' }]}
            >
              <DollarSign size={20} color='#34C759' />
            </View>
            <View style={styles.statInfo}>
              <Text style={[styles.statValue, { color: '#34C759' }]}>
                MVR {totalWalletBalance.toFixed(0)}
              </Text>
              <Text style={styles.statLabel}>Total Balance</Text>
            </View>
          </View>,
          <View
            key='today-txns'
            style={[
              styles.statCard3Grid,
              isTablet && styles.statCard3GridTablet,
            ]}
          >
            <View
              style={[styles.statIcon, { backgroundColor: '#FF9500' + '15' }]}
            >
              <Activity size={20} color='#FF9500' />
            </View>
            <View style={styles.statInfo}>
              <Text style={[styles.statValue, { color: '#FF9500' }]}>
                {todayTransactions}
              </Text>
              <Text style={styles.statLabel}>Today's Txns</Text>
            </View>
          </View>,
        ])}

        <View style={styles.contentSection}>
          {/* Enhanced Wallet List with Section Header */}
          <View style={styles.enhancedWalletSection}>
            <View style={styles.walletSectionHeader}>
              <View style={styles.walletSectionTitleContainer}>
                <Text style={styles.walletSectionTitle}>Customer Wallets</Text>
                <Text style={styles.walletSectionSubtitle}>
                  {activeWallets} active of {wallets.length} total wallets
                </Text>
              </View>
              <View style={styles.walletSectionStats}>
                <View style={styles.walletStatItem}>
                  <Text style={styles.walletStatValue}>
                    MVR {totalWalletBalance.toFixed(0)}
                  </Text>
                  <Text style={styles.walletStatLabel}>Total Balance</Text>
                </View>
                <View style={styles.walletStatDivider} />
                <View style={styles.walletStatItem}>
                  <Text style={styles.walletStatValue}>
                    {todayTransactions}
                  </Text>
                  <Text style={styles.walletStatLabel}>Today's Txns</Text>
                </View>
              </View>
            </View>

            <View style={styles.enhancedWalletList}>
              {wallets.slice(0, isTablet ? 15 : 10).map(wallet => (
                <TouchableOpacity
                  key={wallet.id}
                  style={styles.enhancedWalletItem}
                  onPress={() => handleWalletPress(wallet.id)}
                >
                  <View style={styles.walletItemContent}>
                    {/* Wallet Header */}
                    <View style={styles.walletItemHeader}>
                      <View style={styles.walletUserInfo}>
                        <View
                          style={[
                            styles.walletAvatar,
                            {
                              backgroundColor: wallet.is_active
                                ? `${colors.primary}20`
                                : `${colors.textSecondary}20`,
                            },
                          ]}
                        >
                          <Wallet
                            size={20}
                            color={
                              wallet.is_active
                                ? colors.primary
                                : colors.textSecondary
                            }
                          />
                        </View>
                        <View style={styles.walletUserDetails}>
                          <Text style={styles.walletUserName}>
                            {wallet.user_name}
                          </Text>
                          <Text style={styles.walletUserEmail}>
                            {wallet.user_email}
                          </Text>
                          <Text style={styles.walletUserId}>
                            ID: {wallet.user_id.slice(-8)}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.walletStatusContainer}>
                        <View
                          style={[
                            styles.statusBadge,
                            wallet.is_active
                              ? styles.statusActive
                              : styles.statusInactive,
                          ]}
                        >
                          <Text
                            style={[
                              styles.statusText,
                              wallet.is_active
                                ? styles.statusTextActive
                                : styles.statusTextInactive,
                            ]}
                          >
                            {wallet.is_active ? 'ACTIVE' : 'INACTIVE'}
                          </Text>
                        </View>
                      </View>
                    </View>

                    {/* Wallet Balance Section */}
                    <View style={styles.walletBalanceSection}>
                      <View style={styles.walletBalanceMain}>
                        <Text style={styles.walletBalanceLabel}>
                          Current Balance
                        </Text>
                        <Text style={styles.walletBalanceAmount}>
                          {wallet.currency} {wallet.balance.toFixed(2)}
                        </Text>
                      </View>
                      <View style={styles.walletBalanceMetrics}>
                        <View style={styles.walletMetricItem}>
                          <Text style={styles.walletMetricValue}>
                            {wallet.transactions
                              ? wallet.transactions.length
                              : 0}
                          </Text>
                          <Text style={styles.walletMetricLabel}>
                            Transactions
                          </Text>
                        </View>
                        <View style={styles.walletMetricDivider} />
                        <View style={styles.walletMetricItem}>
                          <Text style={styles.walletMetricValue}>
                            {Math.floor(
                              (new Date().getTime() -
                                new Date(wallet.created_at).getTime()) /
                                (1000 * 60 * 60 * 24)
                            )}
                            d
                          </Text>
                          <Text style={styles.walletMetricLabel}>Age</Text>
                        </View>
                      </View>
                    </View>

                    {/* Financial Summary */}
                    <View style={styles.walletFinancialSummary}>
                      <View style={styles.walletFinancialItem}>
                        <View style={styles.walletFinancialHeader}>
                          <ArrowUpRight size={14} color={colors.success} />
                          <Text style={styles.walletFinancialLabel}>
                            Total Credits
                          </Text>
                        </View>
                        <Text
                          style={[
                            styles.walletFinancialValue,
                            { color: colors.success },
                          ]}
                        >
                          +MVR {(wallet.total_credits || 0).toFixed(2)}
                        </Text>
                      </View>
                      <View style={styles.walletFinancialItem}>
                        <View style={styles.walletFinancialHeader}>
                          <ArrowDownLeft size={14} color={colors.danger} />
                          <Text style={styles.walletFinancialLabel}>
                            Total Debits
                          </Text>
                        </View>
                        <Text
                          style={[
                            styles.walletFinancialValue,
                            { color: colors.danger },
                          ]}
                        >
                          -MVR {(wallet.total_debits || 0).toFixed(2)}
                        </Text>
                      </View>
                    </View>

                    {/* Wallet Actions */}
                    <View style={styles.walletItemActions}>
                      <View style={styles.walletLastActivity}>
                        <Clock size={12} color={colors.textSecondary} />
                        <Text style={styles.walletLastActivityText}>
                          Last updated:{' '}
                          {new Date(
                            wallet.updated_at || wallet.created_at
                          ).toLocaleDateString()}
                        </Text>
                      </View>
                      <View style={styles.walletActionButtons}>
                        {canManageWallets() && (
                          <TouchableOpacity
                            style={styles.walletActionButton}
                            onPress={() => handleAddCredit(wallet.id)}
                          >
                            <Plus size={14} color={colors.primary} />
                            <Text style={styles.walletActionText}>
                              Add Credit
                            </Text>
                          </TouchableOpacity>
                        )}
                        <TouchableOpacity
                          style={styles.walletActionButtonSecondary}
                          onPress={() => handleWalletPress(wallet.id)}
                        >
                          <Eye size={14} color={colors.textSecondary} />
                          <Text style={styles.walletActionTextSecondary}>
                            View Details
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {wallets.length > (isTablet ? 15 : 10) && (
            <TouchableOpacity
              style={styles.viewAllButton}
              onPress={() => router.push('../wallet' as any)}
            >
              <Text style={styles.viewAllText}>
                View All Wallets ({wallets.length})
              </Text>
              <Eye size={16} color={colors.primary} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  const renderTransactions = () => {
    if (!canViewWallets()) {
      return (
        <View style={styles.noPermissionContainer}>
          <AlertTriangle size={48} color={colors.warning} />
          <Text style={styles.noPermissionText}>
            You don't have permission to view transactions.
          </Text>
        </View>
      );
    }

    const filteredTransactions = getFilteredTransactions();

    return (
      <View style={styles.sectionContent}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionHeaderContent}>
            <SectionHeader
              title='Transaction History'
              subtitle={`${filteredTransactions.length} transactions`}
            />
          </View>
          <View style={styles.sectionHeaderButton}>
            <TouchableOpacity style={styles.filterButton}>
              <Download size={16} color={colors.primary} />
              <Text style={styles.filterButtonText}>Export</Text>
            </TouchableOpacity>
          </View>
        </View>

        <SearchBar
          placeholder='Search transactions...'
          value={searchQueries.transactions || ''}
          onChangeText={text => setSearchQuery('transactions', text)}
        />

        {renderFilterButtons()}

        {/* Transaction Stats */}
        {render3CardGrid([
          <View
            key='credits'
            style={[
              styles.statCard3Grid,
              isTablet && styles.statCard3GridTablet,
            ]}
          >
            <View
              style={[
                styles.statIcon,
                { backgroundColor: `${colors.success}15` },
              ]}
            >
              <ArrowUpRight size={20} color={colors.success} />
            </View>
            <View style={styles.statInfo}>
              <Text style={[styles.statValue, { color: colors.success }]}>
                {
                  filteredTransactions.filter(
                    t => t.transaction_type === 'credit'
                  ).length
                }
              </Text>
              <Text style={styles.statLabel}>Credits</Text>
            </View>
          </View>,
          <View
            key='debits'
            style={[
              styles.statCard3Grid,
              isTablet && styles.statCard3GridTablet,
            ]}
          >
            <View
              style={[
                styles.statIcon,
                { backgroundColor: `${colors.danger}15` },
              ]}
            >
              <ArrowDownLeft size={20} color={colors.danger} />
            </View>
            <View style={styles.statInfo}>
              <Text style={[styles.statValue, { color: colors.danger }]}>
                {
                  filteredTransactions.filter(
                    t => t.transaction_type === 'debit'
                  ).length
                }
              </Text>
              <Text style={styles.statLabel}>Debits</Text>
            </View>
          </View>,
          <View
            key='total-volume'
            style={[
              styles.statCard3Grid,
              isTablet && styles.statCard3GridTablet,
            ]}
          >
            <View style={styles.statIcon}>
              <DollarSign size={20} color={colors.primary} />
            </View>
            <View style={styles.statInfo}>
              <Text style={styles.statValue}>
                MVR{' '}
                {filteredTransactions
                  .reduce((sum, t) => sum + t.amount, 0)
                  .toFixed(0)}
              </Text>
              <Text style={styles.statLabel}>Total Volume</Text>
            </View>
          </View>,
        ])}

        <View style={styles.contentSection}>
          <View style={styles.itemsList}>
            {filteredTransactions
              .slice(0, isTablet ? 20 : 15)
              .map(transaction => (
                <View key={transaction.id} style={styles.listItem}>
                  <View style={styles.itemContent}>
                    <View style={styles.itemHeader}>
                      <View
                        style={[
                          styles.transactionTypeIndicator,
                          transaction.transaction_type === 'credit'
                            ? styles.creditIndicator
                            : styles.debitIndicator,
                        ]}
                      >
                        {transaction.transaction_type === 'credit' ? (
                          <ArrowUpRight size={16} color={colors.success} />
                        ) : (
                          <ArrowDownLeft size={16} color={colors.danger} />
                        )}
                      </View>
                      <View style={styles.transactionInfo}>
                        <Text style={styles.itemTitle}>
                          {transaction.user_name}
                        </Text>
                        <Text style={styles.itemSubtitle}>
                          {transaction.description ||
                            `${transaction.transaction_type} transaction`}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.itemFooter}>
                      <View style={styles.transactionMeta}>
                        <Clock size={12} color={colors.textSecondary} />
                        <Text style={styles.itemMeta}>
                          {new Date(transaction.created_at).toLocaleString()}
                        </Text>
                      </View>
                      <Text
                        style={[
                          styles.itemValue,
                          transaction.transaction_type === 'credit'
                            ? styles.creditAmount
                            : styles.debitAmount,
                        ]}
                      >
                        {transaction.transaction_type === 'credit' ? '+' : '-'}
                        MVR {transaction.amount.toFixed(2)}
                      </Text>
                    </View>
                    {transaction.id && (
                      <Text style={styles.transactionId}>
                        #{transaction.id.slice(-6)}
                      </Text>
                    )}
                  </View>
                </View>
              ))}
          </View>

          {filteredTransactions.length > (isTablet ? 20 : 15) && (
            <TouchableOpacity
              style={styles.viewAllButton}
              onPress={() => setActiveSection('transactions')}
            >
              <Text style={styles.viewAllText}>
                View All Transactions ({filteredTransactions.length})
              </Text>
              <Activity size={16} color={colors.primary} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  const renderPayments = () => {
    if (!canViewPayments()) {
      return (
        <View style={styles.noPermissionContainer}>
          <AlertTriangle size={48} color={colors.warning} />
          <Text style={styles.noPermissionText}>
            You don't have permission to view payments.
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.sectionContent}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionHeaderContent}>
            <SectionHeader
              title='Payment Management'
              subtitle='Transaction monitoring & processing'
            />
          </View>
          <View style={styles.sectionHeaderButton}>
            <TouchableOpacity style={styles.filterButton}>
              <Filter size={16} color={colors.primary} />
              <Text style={styles.filterButtonText}>Filter</Text>
            </TouchableOpacity>
          </View>
        </View>

        <SearchBar
          placeholder='Search payments by ID, user, or amount...'
          value={searchQueries.payments || ''}
          onChangeText={text => setSearchQuery('payments', text)}
        />

        {/* Enhanced Payment Stats */}
        {render3CardGrid([
          <View
            key='completed'
            style={[
              styles.statCard3Grid,
              isTablet && styles.statCard3GridTablet,
            ]}
          >
            <View
              style={[
                styles.statIcon,
                { backgroundColor: `${colors.success}15` },
              ]}
            >
              <TrendingUp size={20} color={colors.success} />
            </View>
            <View style={styles.statInfo}>
              <Text style={[styles.statValue, { color: colors.success }]}>
                {dashboardStats.paymentStatus.completed}
              </Text>
              <Text style={styles.statLabel}>Completed</Text>
              <Text style={styles.statSubtext}>
                MVR {(dashboardStats.paymentStatus.total_value || 0).toFixed(2)}
              </Text>
            </View>
          </View>,
          <View
            key='pending'
            style={[
              styles.statCard3Grid,
              isTablet && styles.statCard3GridTablet,
            ]}
          >
            <View
              style={[
                styles.statIcon,
                { backgroundColor: `${colors.warning}15` },
              ]}
            >
              <Clock size={20} color={colors.warning} />
            </View>
            <View style={styles.statInfo}>
              <Text style={[styles.statValue, { color: colors.warning }]}>
                {dashboardStats.paymentStatus.pending}
              </Text>
              <Text style={styles.statLabel}>Pending</Text>
              <Text style={styles.statSubtext}>Under review</Text>
            </View>
          </View>,
          <View
            key='failed'
            style={[
              styles.statCard3Grid,
              isTablet && styles.statCard3GridTablet,
            ]}
          >
            <View
              style={[
                styles.statIcon,
                { backgroundColor: `${colors.danger}15` },
              ]}
            >
              <TrendingDown size={20} color={colors.danger} />
            </View>
            <View style={styles.statInfo}>
              <Text style={[styles.statValue, { color: colors.danger }]}>
                {dashboardStats.paymentStatus.failed}
              </Text>
              <Text style={styles.statLabel}>Failed</Text>
              <Text style={styles.statSubtext}>Requires attention</Text>
            </View>
          </View>,
        ])}

        <View style={styles.contentSection}>
          {/* Enhanced Payment Methods */}
          <View style={styles.dataSection}>
            <Text style={styles.sectionTitle}>
              Payment Methods Distribution
            </Text>
            {render4CardGrid([
              <PaymentMethodCard
                key='gateway'
                icon={<CreditCard size={16} color={colors.primary} />}
                title='Gateway'
                value={156}
                percentage={45}
                color={colors.primary}
                isTablet={isTablet}
              />,
              <PaymentMethodCard
                key='wallet'
                icon={<Wallet size={16} color='#34C759' />}
                title='Wallet'
                value={89}
                percentage={25}
                color='#34C759'
                isTablet={isTablet}
              />,
              <PaymentMethodCard
                key='bank-transfer'
                icon={<DollarSign size={16} color='#FF9500' />}
                title='Bank Transfer'
                value={67}
                percentage={20}
                color='#FF9500'
                isTablet={isTablet}
              />,
              <PaymentMethodCard
                key='cash'
                icon={<Activity size={16} color='#8E44AD' />}
                title='Cash'
                value={34}
                percentage={10}
                color='#8E44AD'
                isTablet={isTablet}
              />,
            ])}
          </View>

          {/* Enhanced Recent Payment Transactions */}
          <View style={styles.dataSection}>
            <View style={styles.sectionTitleContainer}>
              <Text style={styles.sectionTitle}>
                Recent Payment Transactions
              </Text>
              <TouchableOpacity style={styles.viewAllTransactionsButton}>
                <Text style={styles.viewAllTransactionsText}>View All</Text>
                <ArrowUpRight size={14} color={colors.primary} />
              </TouchableOpacity>
            </View>
            <View style={styles.enhancedTransactionsList}>
              {[
                {
                  id: 'TXN001234',
                  customer: 'Ahmed Ali',
                  email: 'ahmed.ali@email.com',
                  phone: '+960 7123456',
                  method: 'Gateway',
                  gateway: 'BML Connect',
                  amount: 245.5,
                  fee: 12.25,
                  netAmount: 233.25,
                  status: 'completed',
                  time: '2 min ago',
                  date: 'Today, 3:45 PM',
                  reference: 'BML240123001',
                  route: 'Male - Hulhumale',
                  bookingId: 'BK-2024-001',
                  icon: CreditCard,
                  iconColor: colors.success,
                },
                {
                  id: 'TXN001235',
                  customer: 'Fatima Hassan',
                  email: 'fatima.hassan@email.com',
                  phone: '+960 7987654',
                  method: 'Wallet',
                  gateway: 'Rork Wallet',
                  amount: 150.0,
                  fee: 0.0,
                  netAmount: 150.0,
                  status: 'pending',
                  time: '15 min ago',
                  date: 'Today, 3:30 PM',
                  reference: 'WAL240123002',
                  route: 'Hulhumale - Airport',
                  bookingId: 'BK-2024-002',
                  icon: Wallet,
                  iconColor: colors.warning,
                },
                {
                  id: 'TXN001236',
                  customer: 'Mohamed Ibrahim',
                  email: 'mohamed.ibrahim@email.com',
                  phone: '+960 7456789',
                  method: 'Bank Transfer',
                  gateway: 'Bank of Maldives',
                  amount: 320.75,
                  fee: 5.0,
                  netAmount: 315.75,
                  status: 'failed',
                  time: '1 hour ago',
                  date: 'Today, 2:45 PM',
                  reference: 'BOM240123003',
                  route: 'Male - Villingili',
                  bookingId: 'BK-2024-003',
                  icon: DollarSign,
                  iconColor: colors.danger,
                },
                {
                  id: 'TXN001237',
                  customer: 'Aisha Ahmed',
                  email: 'aisha.ahmed@email.com',
                  phone: '+960 7321654',
                  method: 'Cash',
                  gateway: 'Agent Counter',
                  amount: 89.25,
                  fee: 0.0,
                  netAmount: 89.25,
                  status: 'completed',
                  time: '3 hours ago',
                  date: 'Today, 12:45 PM',
                  reference: 'CSH240123004',
                  route: 'Airport - Male',
                  bookingId: 'BK-2024-004',
                  icon: Activity,
                  iconColor: colors.success,
                },
                {
                  id: 'TXN001238',
                  customer: 'Ibrahim Ali',
                  email: 'ibrahim.ali@email.com',
                  phone: '+960 7789123',
                  method: 'Gateway',
                  gateway: 'Maldivian Heritage Bank',
                  amount: 195.0,
                  fee: 9.75,
                  netAmount: 185.25,
                  status: 'completed',
                  time: '5 hours ago',
                  date: 'Today, 10:45 AM',
                  reference: 'MHB240123005',
                  route: 'Hulhumale - Male',
                  bookingId: 'BK-2024-005',
                  icon: CreditCard,
                  iconColor: colors.success,
                },
              ].map((transaction, index) => (
                <TouchableOpacity
                  key={transaction.id}
                  style={styles.enhancedTransactionItem}
                >
                  <View style={styles.transactionMainContent}>
                    {/* Transaction Header */}
                    <View style={styles.transactionHeader}>
                      <View style={styles.transactionIconContainer}>
                        <View
                          style={[
                            styles.enhancedPaymentTypeIcon,
                            { backgroundColor: `${transaction.iconColor}20` },
                          ]}
                        >
                          <transaction.icon
                            size={20}
                            color={transaction.iconColor}
                          />
                        </View>
                        <View style={styles.transactionIdentifier}>
                          <Text style={styles.transactionId}>
                            #{transaction.id}
                          </Text>
                          <Text style={styles.transactionTime}>
                            {transaction.time}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.transactionStatusContainer}>
                        <View
                          style={[
                            styles.enhancedStatusBadge,
                            transaction.status === 'completed'
                              ? styles.statusCompleted
                              : transaction.status === 'pending'
                                ? styles.statusPending
                                : styles.statusFailed,
                          ]}
                        >
                          <Text
                            style={[
                              styles.enhancedStatusText,
                              transaction.status === 'completed'
                                ? styles.statusCompletedText
                                : transaction.status === 'pending'
                                  ? styles.statusPendingText
                                  : styles.statusFailedText,
                            ]}
                          >
                            {transaction.status.charAt(0).toUpperCase() +
                              transaction.status.slice(1)}
                          </Text>
                        </View>
                        <Text style={styles.transactionAmount}>
                          MVR {transaction.amount.toFixed(2)}
                        </Text>
                      </View>
                    </View>

                    {/* Customer Information */}
                    <View style={styles.customerInfo}>
                      <View style={styles.customerDetails}>
                        <Text style={styles.customerName}>
                          {transaction.customer}
                        </Text>
                        <Text style={styles.customerContact}>
                          {transaction.email}
                        </Text>
                        <Text style={styles.customerContact}>
                          {transaction.phone}
                        </Text>
                      </View>
                      <View style={styles.transactionDetails}>
                        <Text style={styles.routeInfo}>
                          {transaction.route}
                        </Text>
                        <Text style={styles.bookingInfo}>
                          Booking: {transaction.bookingId}
                        </Text>
                      </View>
                    </View>

                    {/* Payment Method & Gateway */}
                    <View style={styles.paymentMethodInfo}>
                      <View style={styles.methodDetails}>
                        <Text style={styles.paymentMethod}>
                          {transaction.method}
                        </Text>
                        <Text style={styles.gatewayInfo}>
                          {transaction.gateway}
                        </Text>
                      </View>
                      <View style={styles.referenceInfo}>
                        <Text style={styles.referenceLabel}>Ref:</Text>
                        <Text style={styles.referenceNumber}>
                          {transaction.reference}
                        </Text>
                      </View>
                    </View>

                    {/* Financial Breakdown */}
                    <View style={styles.financialBreakdown}>
                      <View style={styles.amountRow}>
                        <Text style={styles.amountLabel}>Amount:</Text>
                        <Text style={styles.amountValue}>
                          MVR {transaction.amount.toFixed(2)}
                        </Text>
                      </View>
                      {transaction.fee > 0 && (
                        <View style={styles.amountRow}>
                          <Text style={styles.feeLabel}>Processing Fee:</Text>
                          <Text style={styles.feeValue}>
                            MVR {transaction.fee.toFixed(2)}
                          </Text>
                        </View>
                      )}
                      <View style={styles.totalRow}>
                        <Text style={styles.totalLabel}>Net Amount:</Text>
                        <Text style={styles.totalValue}>
                          MVR {transaction.netAmount.toFixed(2)}
                        </Text>
                      </View>
                    </View>

                    {/* Transaction Metadata */}
                    <View style={styles.transactionMetadata}>
                      <View style={styles.metadataItem}>
                        <Calendar size={12} color={colors.textSecondary} />
                        <Text style={styles.metadataText}>
                          {transaction.date}
                        </Text>
                      </View>
                      <TouchableOpacity style={styles.viewDetailsButton}>
                        <Text style={styles.viewDetailsText}>View Details</Text>
                        <Eye size={12} color={colors.primary} />
                      </TouchableOpacity>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            {/* Load More Button */}
            <TouchableOpacity style={styles.loadMoreButton}>
              <RefreshCw size={16} color={colors.primary} />
              <Text style={styles.loadMoreText}>Load More Transactions</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  const renderReports = () => {
    if (!canViewPayments()) {
      return (
        <View style={styles.noPermissionContainer}>
          <AlertTriangle size={48} color={colors.warning} />
          <Text style={styles.noPermissionText}>
            You don't have permission to view financial reports.
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.sectionContent}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionHeaderContent}>
            <SectionHeader
              title='Financial Reports & Analytics'
              subtitle='Comprehensive revenue insights'
            />
          </View>
          <View style={styles.sectionHeaderButton}>
            <Button
              title='Generate Report'
              onPress={() => router.push('../reports/financial' as any)}
              size='small'
              variant='outline'
              icon={<Download size={16} color={colors.primary} />}
            />
          </View>
        </View>

        <View style={styles.contentSection}>
          {/* Enhanced Revenue Summary */}
          <View style={styles.dataSection}>
            <Text style={styles.sectionTitle}>Revenue Overview</Text>
            <View style={styles.statsGrid}>
              <StatCard
                title='Today'
                value={`MVR ${dashboardStats.dailyBookings.revenue.toFixed(2)}`}
                subtitle={`${dashboardStats.dailyBookings.count} transactions`}
                icon={
                  <Calendar size={isTablet ? 20 : 18} color={colors.primary} />
                }
                size={isTablet ? 'large' : 'medium'}
                trend={
                  Number(dashboardStats.dailyBookings.change_percentage || 0) >=
                  0
                    ? 'up'
                    : 'down'
                }
                trendValue={`${Math.abs(Number(dashboardStats.dailyBookings.change_percentage || 0))}%`}
              />
              <StatCard
                title='This Week'
                value={`MVR ${weeklyRevenue.toFixed(2)}`}
                subtitle='7-day average'
                icon={<BarChart3 size={isTablet ? 20 : 18} color='#34C759' />}
                color='#34C759'
                size={isTablet ? 'large' : 'medium'}
                trend='up'
                trendValue='12.5%'
              />
              <StatCard
                title='This Month'
                value={`MVR ${monthlyRevenue.toFixed(2)}`}
                subtitle='30-day projection'
                icon={<PieChart size={isTablet ? 20 : 18} color='#FF9500' />}
                color='#FF9500'
                size={isTablet ? 'large' : 'medium'}
                trend='up'
                trendValue='18.2%'
              />
              <StatCard
                title='Wallet Balance'
                value={`MVR ${totalWalletBalance.toFixed(2)}`}
                subtitle={`${activeWallets} active wallets`}
                icon={<Wallet size={isTablet ? 20 : 18} color='#8E44AD' />}
                color='#8E44AD'
                size={isTablet ? 'large' : 'medium'}
              />
            </View>
          </View>

          {/* Financial Metrics */}
          <View style={styles.dataSection}>
            <Text style={styles.sectionTitle}>Key Financial Metrics</Text>
            <View style={styles.statsGrid}>
              <StatCard
                title='Average Transaction'
                value={`MVR ${
                  walletTransactions.length > 0
                    ? (
                        walletTransactions.reduce(
                          (sum, t) => sum + t.amount,
                          0
                        ) / walletTransactions.length
                      ).toFixed(2)
                    : '0.00'
                }`}
                subtitle='per transaction'
                icon={
                  <DollarSign
                    size={isTablet ? 20 : 18}
                    color={colors.primary}
                  />
                }
                size={isTablet ? 'large' : 'medium'}
              />
              <StatCard
                title='Payment Success Rate'
                value={`${
                  dashboardStats.paymentStatus.completed > 0
                    ? Math.round(
                        (dashboardStats.paymentStatus.completed /
                          (dashboardStats.paymentStatus.completed +
                            dashboardStats.paymentStatus.failed)) *
                          100
                      )
                    : 0
                }%`}
                subtitle='success rate'
                icon={
                  <TrendingUp
                    size={isTablet ? 20 : 18}
                    color={colors.success}
                  />
                }
                color={colors.success}
                size={isTablet ? 'large' : 'medium'}
              />
              <StatCard
                title='Active Users'
                value={activeWallets.toString()}
                subtitle='with wallets'
                icon={<Users size={isTablet ? 20 : 18} color='#34C759' />}
                color='#34C759'
                size={isTablet ? 'large' : 'medium'}
              />
              <StatCard
                title='Transaction Volume'
                value={walletTransactions.length.toString()}
                subtitle='total transactions'
                icon={<Activity size={isTablet ? 20 : 18} color='#FF9500' />}
                color='#FF9500'
                size={isTablet ? 'large' : 'medium'}
              />
            </View>
          </View>

          {/* Enhanced Quick Actions */}
          <View style={styles.dataSection}>
            <Text style={styles.sectionTitle}>Financial Operations</Text>
            <View style={styles.actionGrid}>
              <TouchableOpacity style={styles.actionCard}>
                <View
                  style={[
                    styles.actionIcon,
                    { backgroundColor: `${colors.primary}15` },
                  ]}
                >
                  <Download size={24} color={colors.primary} />
                </View>
                <Text style={styles.actionTitle}>Export Transactions</Text>
                <Text style={styles.actionSubtitle}>
                  Download detailed transaction reports
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionCard}>
                <View
                  style={[
                    styles.actionIcon,
                    { backgroundColor: '#34C759' + '15' },
                  ]}
                >
                  <BarChart3 size={24} color='#34C759' />
                </View>
                <Text style={styles.actionTitle}>Revenue Analytics</Text>
                <Text style={styles.actionSubtitle}>
                  View comprehensive revenue insights
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionCard}>
                <View
                  style={[
                    styles.actionIcon,
                    { backgroundColor: '#FF9500' + '15' },
                  ]}
                >
                  <Wallet size={24} color='#FF9500' />
                </View>
                <Text style={styles.actionTitle}>Wallet Audit</Text>
                <Text style={styles.actionSubtitle}>
                  Review wallet activities and balances
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionCard}>
                <View
                  style={[
                    styles.actionIcon,
                    { backgroundColor: '#8E44AD' + '15' },
                  ]}
                >
                  <RefreshCw size={24} color='#8E44AD' />
                </View>
                <Text style={styles.actionTitle}>Reconciliation</Text>
                <Text style={styles.actionSubtitle}>
                  Balance payment gateways
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    );
  };

  const renderContent = () => {
    switch (activeSection) {
      case 'wallets':
        return renderWallets();
      case 'transactions':
        return renderTransactions();
      case 'payments':
        return renderPayments();
      case 'reports':
        return renderReports();
      default:
        return renderWallets();
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.contentContainer, getResponsivePadding()]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          colors={[colors.primary]}
          tintColor={colors.primary}
        />
      }
    >
      <Stack.Screen
        options={{
          title: 'Finance',
        }}
      />

      {/* Enhanced Financial Stats */}
      <FinanceStats
        totalWalletBalance={totalWalletBalance}
        activeWallets={activeWallets}
        todayRevenue={dashboardStats.dailyBookings.revenue}
        todayTransactions={todayTransactions}
        paymentSuccessRate={
          (dashboardStats.paymentStatus.completed /
            Math.max(
              1,
              dashboardStats.paymentStatus.completed +
                dashboardStats.paymentStatus.failed
            )) *
          100
        }
        completedPayments={dashboardStats.paymentStatus.completed}
        revenueChangePercentage={Number(
          dashboardStats.dailyBookings.change_percentage || 0
        )}
        isTablet={isTablet}
      />

      {/* Section Selector */}
      {renderSectionSelector()}

      {/* Content */}
      {renderContent()}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
  },
  contentContainer: {
    flexGrow: 1,
  },
  statsContainer: {
    marginBottom: 24,
    marginTop: 8,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
  },

  sectionSelector: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 4,
    marginBottom: 24,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  sectionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    gap: 6,
  },
  sectionButtonActive: {
    backgroundColor: `${colors.primary}15`,
  },
  sectionButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  sectionButtonTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  sectionContent: {
    flex: 1,
    paddingTop: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 8,
    minHeight: 44,
  },
  sectionHeaderContent: {
    flex: 1,
    paddingRight: 8,
  },
  sectionHeaderButton: {
    flexShrink: 0,
    maxWidth: '40%',
  },
  filterContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
    marginBottom: 20,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: colors.background,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: {
    backgroundColor: `${colors.primary}15`,
    borderColor: colors.primary,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  filterChipTextActive: {
    color: colors.primary,
  },

  statsGrid3: {
    // 2x1 layout for 3 cards
    flexDirection: 'column',
    gap: 12,
  },
  statsGrid3SingleRow: {
    // Single row layout for 3 cards
    flexDirection: 'column',
    gap: 12,
  },
  statsGrid4: {
    // 2x2 layout for 4 cards
    flexDirection: 'column',
    gap: 12,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  statsRowSingle: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  statsRowSingle3: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  itemsList: {
    gap: 12,
    marginTop: 12,
  },
  walletItem: {
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: 12,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  walletInfo: {
    flex: 1,
    marginBottom: 12,
  },
  walletHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },

  walletDetails: {
    gap: 8,
  },
  walletBalanceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  walletBalance: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.primary,
  },

  walletActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 8,
  },
  addCreditButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: `${colors.primary}15`,
  },
  viewButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: colors.background,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusActive: {
    backgroundColor: `${colors.success}20`,
  },
  statusInactive: {
    backgroundColor: `${colors.textSecondary}20`,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  statusTextActive: {
    color: colors.success,
  },
  statusTextInactive: {
    color: colors.textSecondary,
  },
  // Transaction Styles
  transactionStatsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
    marginBottom: 16,
  },
  transactionStatCard: {
    flex: 1,
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    gap: 8,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  transactionStatValue: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
  },
  transactionStatLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  transactionsList: {
    gap: 8,
    marginTop: 16,
  },
  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: 12,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  transactionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  transactionTypeIndicator: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  creditIndicator: {
    backgroundColor: `${colors.success}20`,
  },
  debitIndicator: {
    backgroundColor: `${colors.danger}20`,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionUser: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  transactionDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  transactionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  transactionDate: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  transactionRight: {
    alignItems: 'flex-end',
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  transactionId: {
    fontSize: 11,
    color: colors.textSecondary,
    fontFamily: 'monospace',
  },
  creditAmount: {
    color: colors.success,
  },
  debitAmount: {
    color: colors.danger,
  },
  // Payment Styles
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: `${colors.primary}15`,
    borderRadius: 6,
  },
  filterButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.primary,
  },
  paymentStats: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    gap: 8,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  paymentStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  paymentStatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  paymentStatValue: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.primary,
  },
  paymentStatLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  paymentStatSubtext: {
    fontSize: 10,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  paymentStatusIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentMethodsSection: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 16,
    marginTop: 4,
  },
  paymentMethods: {
    gap: 12,
  },
  paymentMethodItem: {
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: 12,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  paymentMethodHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  paymentMethodIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentMethodName: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
    flex: 1,
  },
  paymentMethodStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  paymentMethodCount: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  paymentMethodPercentage: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.primary,
  },
  paymentMethodBar: {
    height: 4,
    backgroundColor: colors.background,
    borderRadius: 2,
    overflow: 'hidden',
  },
  paymentMethodProgress: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  // Recent Payments
  recentPaymentsSection: {
    marginTop: 24,
  },
  recentPaymentsList: {
    gap: 8,
  },
  recentPaymentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.card,
    padding: 12,
    borderRadius: 8,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  recentPaymentLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  paymentTypeIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recentPaymentInfo: {
    flex: 1,
  },
  recentPaymentUser: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
    marginBottom: 2,
  },
  recentPaymentMethod: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  recentPaymentTime: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  recentPaymentRight: {
    alignItems: 'flex-end',
  },
  recentPaymentAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  paymentStatusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  paymentCompleted: {
    backgroundColor: `${colors.success}20`,
  },
  paymentPending: {
    backgroundColor: `${colors.warning}20`,
  },
  paymentFailed: {
    backgroundColor: `${colors.danger}20`,
  },
  paymentStatusText: {
    fontSize: 10,
    fontWeight: '500',
  },
  paymentCompletedText: {
    color: colors.success,
  },
  paymentPendingText: {
    color: colors.warning,
  },
  paymentFailedText: {
    color: colors.danger,
  },
  // Reports Styles
  revenueSummary: {
    marginTop: 16,
  },
  revenueGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  revenueItem: {
    flex: 1,
    minWidth: '22%',
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: 12,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  revenueHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  revenueLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  revenueIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: `${colors.primary}15`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  revenueValue: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  revenueChange: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  revenueChangeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  revenueSubtext: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  // Financial Metrics
  financialMetrics: {
    marginTop: 24,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metricCard: {
    flex: 1,
    minWidth: '22%',
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: 12,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  metricHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  metricLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    flex: 1,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  // Quick Actions
  quickActions: {
    marginTop: 24,
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionCard: {
    flex: 1,
    minWidth: screenWidth >= 768 ? '22%' : screenWidth >= 480 ? '45%' : '100%',
    maxWidth: screenWidth >= 768 ? '24%' : screenWidth >= 480 ? '48%' : '100%',
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: `${colors.primary}15`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 4,
  },
  actionSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 16,
  },
  // Utility Styles
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: 16,
    backgroundColor: `${colors.primary}10`,
    borderRadius: 8,
    gap: 8,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.primary,
  },
  noPermissionContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
    gap: 16,
  },
  noPermissionText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 250,
  },
  // New Styles for consistent layout
  statCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
    padding: 12,
    borderRadius: 12,
    gap: 8,
    minHeight: 85,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statCardTablet: {
    padding: 16,
    minHeight: 100,
  },
  statCard3Grid: {
    // For 3-card single row grid: each card takes 32%
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
    padding: 12,
    borderRadius: 12,
    gap: 8,
    minHeight: 85,
    maxWidth: '32%',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statCard3GridTablet: {
    padding: 16,
    minHeight: 100,
  },
  statCard4Grid: {
    // For 4-card grid: each card takes 48% (2x2)
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
    padding: 10,
    borderRadius: 12,
    gap: 6,
    minHeight: 75,
    maxWidth: '48%',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statCard4GridTablet: {
    padding: 14,
    minHeight: 90,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${colors.primary}15`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statInfo: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  statSubtext: {
    fontSize: 10,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  contentSection: {
    marginBottom: 8,
  },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: 12,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  itemContent: {
    flex: 1,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  itemSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  itemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemValue: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
  itemMeta: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  itemActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: `${colors.primary}15`,
  },
  actionButtonSecondary: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: colors.background,
  },
  dataSection: {
    marginBottom: 16,
  },
  cardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
  },
  dataCard: {
    flex: 1,
    minWidth: screenWidth >= 768 ? '22%' : screenWidth >= 480 ? '45%' : '100%',
    maxWidth: screenWidth >= 768 ? '24%' : screenWidth >= 480 ? '48%' : '100%',
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: 12,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  dataCard4Grid: {
    // For 4-card grid: each card takes 48% (2x2)
    flex: 1,
    backgroundColor: colors.card,
    padding: 12,
    borderRadius: 12,
    minHeight: 85,
    maxWidth: '48%',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  dataCard4GridTablet: {
    padding: 16,
    minHeight: 100,
  },
  paymentMethodCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
    justifyContent: 'space-between',
    minHeight: 130,
    maxWidth: '48%',
  },
  dataCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  dataCardIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dataCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginLeft: 2,
  },
  dataCardStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 8,
  },
  dataCardValue: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  dataCardPercentage: {
    fontSize: 15,
    fontWeight: '600',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    overflow: 'hidden',
    marginTop: 12,
    width: '100%',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
    minWidth: 8,
  },
  paymentStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dataCardChange: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  dataCardChangeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  dataCardSubtext: {
    fontSize: 12,
    color: colors.textSecondary,
  },

  // Enhanced Transaction List Styles
  sectionTitleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  viewAllTransactionsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: `${colors.primary}10`,
    borderRadius: 16,
  },
  viewAllTransactionsText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.primary,
  },
  enhancedTransactionsList: {
    gap: 16,
  },
  enhancedTransactionItem: {
    backgroundColor: colors.card,
    borderRadius: 16,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    overflow: 'hidden',
  },
  transactionMainContent: {
    padding: 20,
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  transactionIconContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  enhancedPaymentTypeIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  transactionIdentifier: {
    flex: 1,
  },
  enhancedTransactionId: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  transactionTime: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  transactionStatusContainer: {
    alignItems: 'flex-end',
    gap: 8,
  },
  enhancedStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    minWidth: 80,
    alignItems: 'center',
  },
  enhancedStatusText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  enhancedTransactionAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  customerInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  customerDetails: {
    flex: 1,
    marginRight: 16,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  customerContact: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  transactionDetails: {
    alignItems: 'flex-end',
  },
  routeInfo: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.primary,
    marginBottom: 4,
    textAlign: 'right',
  },
  bookingInfo: {
    fontSize: 12,
    color: colors.textSecondary,
    fontFamily: 'monospace',
  },
  paymentMethodInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 12,
  },
  methodDetails: {
    flex: 1,
  },
  paymentMethod: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  gatewayInfo: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  referenceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  referenceLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  referenceNumber: {
    fontSize: 12,
    color: colors.primary,
    fontFamily: 'monospace',
    fontWeight: '600',
  },
  financialBreakdown: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    gap: 8,
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: 4,
  },
  amountLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  amountValue: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
  },
  feeLabel: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  feeValue: {
    fontSize: 13,
    color: colors.danger,
    fontWeight: '500',
  },
  totalLabel: {
    fontSize: 15,
    color: colors.text,
    fontWeight: '600',
  },
  totalValue: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: '700',
  },
  transactionMetadata: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metadataItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metadataText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  viewDetailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: `${colors.primary}10`,
    borderRadius: 16,
  },
  viewDetailsText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.primary,
  },
  loadMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 20,
    marginTop: 16,
    backgroundColor: `${colors.primary}10`,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: `${colors.primary}30`,
  },
  loadMoreText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },

  // Enhanced Wallet List Styles
  enhancedWalletSection: {
    marginTop: 8,
  },
  walletSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: colors.card,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  walletSectionTitleContainer: {
    flex: 1,
  },
  walletSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  walletSectionSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  walletSectionStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  walletStatItem: {
    alignItems: 'center',
  },
  walletStatValue: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 2,
  },
  walletStatLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  walletStatDivider: {
    width: 1,
    height: 24,
    backgroundColor: colors.border,
  },
  enhancedWalletList: {
    gap: 16,
  },
  enhancedWalletItem: {
    backgroundColor: colors.card,
    borderRadius: 16,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    overflow: 'hidden',
  },
  walletItemContent: {
    padding: 20,
  },
  walletItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  walletUserInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
    gap: 12,
  },
  walletAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  walletUserDetails: {
    flex: 1,
  },

  walletUserId: {
    fontSize: 11,
    color: colors.textSecondary,
    fontFamily: 'monospace',
  },
  walletStatusContainer: {
    alignItems: 'flex-end',
  },
  walletBalanceSection: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  walletBalanceMain: {
    marginBottom: 12,
  },
  walletBalanceLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  walletBalanceAmount: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.primary,
  },
  walletBalanceMetrics: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  walletMetricItem: {
    alignItems: 'center',
  },
  walletMetricValue: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  walletMetricLabel: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  walletMetricDivider: {
    width: 1,
    height: 20,
    backgroundColor: colors.border,
  },
  walletFinancialSummary: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  walletFinancialItem: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 10,
    padding: 12,
  },
  walletFinancialHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  walletFinancialLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  walletFinancialValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  walletItemActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  walletLastActivityText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  walletActionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  walletActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: `${colors.primary}15`,
    borderRadius: 20,
  },
  walletActionText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.primary,
  },
  walletActionButtonSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.background,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  walletActionTextSecondary: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textSecondary,
  },
} as any);
