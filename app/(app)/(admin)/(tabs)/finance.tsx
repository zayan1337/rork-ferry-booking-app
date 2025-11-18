import React, { useState, useEffect, useCallback, memo, useRef } from 'react';
import { StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { Stack } from 'expo-router';
import { colors } from '@/constants/adminColors';
import { useAdminPermissions } from '@/hooks/useAdminPermissions';
import { useFinanceStore } from '@/store/admin/financeStore';
import {
  getResponsiveDimensions,
  getResponsivePadding,
} from '@/utils/dashboardUtils';

// Finance Components
import {
  FinanceStats,
  FinanceSectionSelector,
  PaymentsTab,
  WalletsTab,
} from '@/components/admin/finance';

type FinanceSection = 'payments' | 'wallets';

function FinanceScreen() {
  const { canViewWallets, canViewPayments } = useAdminPermissions();

  const {
    payments,
    wallets,
    walletTransactions,
    stats,
    loading,
    fetchPayments,
    fetchWallets,
    fetchWalletTransactions,
    fetchStats,
    setSearchQuery,
    searchQueries,
  } = useFinanceStore();

  const [activeSection, setActiveSection] =
    useState<FinanceSection>('payments');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const hasInitialized = useRef(false);

  const { isTablet } = getResponsiveDimensions();

  // Load data on component mount
  useEffect(() => {
    const initializeData = async () => {
      // Prevent multiple initializations
      if (hasInitialized.current) return;

      hasInitialized.current = true;

      try {
        // Fetch all data in parallel for faster loading
        const promises = [];
        
        if (canViewPayments()) {
          promises.push(fetchPayments().catch(err => {
            console.error('Error fetching payments:', err);
          }));
        }
        
        if (canViewWallets()) {
          promises.push(
            fetchWallets().catch(err => {
              console.error('Error fetching wallets:', err);
            }),
            fetchWalletTransactions().catch(err => {
              console.error('Error fetching wallet transactions:', err);
            })
          );
        }
        
        promises.push(
          fetchStats().catch(err => {
            console.error('Error fetching stats:', err);
          })
        );

        await Promise.all(promises);
      } catch (error) {
        console.error('Error initializing finance data:', error);
      }
    };

    initializeData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      // Refresh all data
      await Promise.all([
        fetchPayments(true),
        fetchWallets(true),
        fetchWalletTransactions(true),
        fetchStats(),
      ]);
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [fetchPayments, fetchWallets, fetchWalletTransactions, fetchStats]);

  const handleSectionChange = useCallback((section: FinanceSection) => {
    setActiveSection(section);
  }, []);

  const renderContent = () => {
    switch (activeSection) {
      case 'payments':
        return (
          <PaymentsTab
            isActive={activeSection === 'payments'}
            searchQuery={searchQueries.payments}
          />
        );
      case 'wallets':
        return (
          <WalletsTab
            isActive={activeSection === 'wallets'}
            searchQuery={searchQueries.wallets}
          />
        );
      default:
        return (
          <PaymentsTab isActive={true} searchQuery={searchQueries.payments} />
        );
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

      {/* Finance Stats */}
      <FinanceStats
        totalWalletBalance={stats.totalWalletBalance || 0}
        activeWallets={stats.activeWallets || 0}
        totalWallets={wallets?.length || 0}
        todayTransactions={stats.todayTransactions || 0}
        totalRevenue={stats.totalRevenue || 0}
        completedPayments={stats.completedPayments || 0}
        pendingPayments={stats.pendingPayments || 0}
        failedPayments={stats.failedPayments || 0}
        totalPayments={payments?.length || 0}
        isTablet={isTablet}
      />

      {/* Section Selector */}
      <FinanceSectionSelector
        activeSection={activeSection}
        onSectionChange={handleSectionChange}
        canViewPayments={canViewPayments()}
        canViewWallets={canViewWallets()}
      />

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
    paddingTop: 16,
  },
});

export default memo(FinanceScreen);
