import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  RefreshControl,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { colors } from '@/constants/adminColors';
import { Alert as AdminAlert } from '@/types/admin';
import { useAdminStore } from '@/store/admin/adminStore';
import { ArrowLeft, Bell, AlertTriangle, X, Filter } from 'lucide-react-native';

// Components
import AlertItem from '@/components/admin/AlertItem';

export default function AlertsScreen() {
  const {
    alerts,
    fetchDashboardData,
    markAlertAsRead,
    dismissAlert,
    markAllAlertsAsRead,
  } = useAdminStore();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filterSeverity, setFilterSeverity] = useState<string | null>(null);

  useEffect(() => {
    if (alerts.length === 0) {
      fetchDashboardData();
    }
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await fetchDashboardData();
    } catch (error) {
      console.error('Refresh error:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleAlertAction = (alert: AdminAlert) => {
    markAlertAsRead(alert.id);
  };

  // Calculate stats
  const stats = {
    total: alerts.length,
    unread: alerts.filter((a: AdminAlert) => !a.read).length,
    critical: alerts.filter((a: AdminAlert) => a.severity === 'critical')
      .length,
  };

  // Filter alerts
  const filteredAlerts = React.useMemo(() => {
    let filtered = [...alerts];

    if (filterSeverity) {
      filtered = filtered.filter(
        (a: AdminAlert) => a.severity === filterSeverity
      );
    }

    return filtered;
  }, [alerts, filterSeverity]);

  const renderHeader = () => (
    <View style={styles.listHeader}>
      {/* Quick Stats */}
      <View style={styles.quickStats}>
        <View style={styles.quickStatsRow}>
          <View style={styles.quickStatItem}>
            <View
              style={[
                styles.quickStatIcon,
                { backgroundColor: colors.primaryLight },
              ]}
            >
              <Bell size={16} color={colors.primary} />
            </View>
            <Text style={styles.quickStatValue}>{stats.total}</Text>
            <Text style={styles.quickStatLabel}>Total Alerts</Text>
          </View>
          <View style={styles.quickStatItem}>
            <View
              style={[
                styles.quickStatIcon,
                { backgroundColor: colors.warningLight },
              ]}
            >
              <AlertTriangle size={16} color={colors.warning} />
            </View>
            <Text style={styles.quickStatValue}>{stats.unread}</Text>
            <Text style={styles.quickStatLabel}>Unread</Text>
          </View>
          <View style={styles.quickStatItem}>
            <View
              style={[
                styles.quickStatIcon,
                { backgroundColor: colors.dangerLight },
              ]}
            >
              <X size={16} color={colors.danger} />
            </View>
            <Text style={styles.quickStatValue}>{stats.critical}</Text>
            <Text style={styles.quickStatLabel}>Critical</Text>
          </View>
        </View>
      </View>

      {/* Action Bar */}
      <View style={styles.actionBar}>
        <View style={styles.actionBarLeft}>
          <Pressable
            style={[
              styles.filterButton,
              showFilters && styles.filterButtonActive,
            ]}
            onPress={() => setShowFilters(!showFilters)}
          >
            <Filter
              size={16}
              color={showFilters ? colors.primary : colors.textSecondary}
            />
            <Text
              style={[
                styles.filterButtonText,
                showFilters && styles.filterButtonTextActive,
              ]}
            >
              Filters
            </Text>
          </Pressable>
        </View>

        <View style={styles.actionBarRight}>
          {stats.unread > 0 && (
            <Pressable
              style={styles.markAllButton}
              onPress={markAllAlertsAsRead}
            >
              <Text style={styles.markAllButtonText}>Mark All Read</Text>
            </Pressable>
          )}
        </View>
      </View>

      {/* Filters Panel */}
      {showFilters && (
        <View style={styles.filtersPanel}>
          <View style={styles.filterRow}>
            <Text style={styles.filterLabel}>Severity:</Text>
            <View style={styles.filterChips}>
              <Pressable
                style={[
                  styles.filterChip,
                  filterSeverity === null && styles.filterChipActive,
                ]}
                onPress={() => setFilterSeverity(null)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    filterSeverity === null && styles.filterChipTextActive,
                  ]}
                >
                  All
                </Text>
              </Pressable>
              <Pressable
                style={[
                  styles.filterChip,
                  filterSeverity === 'critical' && styles.filterChipActive,
                ]}
                onPress={() => setFilterSeverity('critical')}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    filterSeverity === 'critical' &&
                      styles.filterChipTextActive,
                  ]}
                >
                  Critical
                </Text>
              </Pressable>
              <Pressable
                style={[
                  styles.filterChip,
                  filterSeverity === 'high' && styles.filterChipActive,
                ]}
                onPress={() => setFilterSeverity('high')}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    filterSeverity === 'high' && styles.filterChipTextActive,
                  ]}
                >
                  High
                </Text>
              </Pressable>
              <Pressable
                style={[
                  styles.filterChip,
                  filterSeverity === 'medium' && styles.filterChipActive,
                ]}
                onPress={() => setFilterSeverity('medium')}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    filterSeverity === 'medium' && styles.filterChipTextActive,
                  ]}
                >
                  Medium
                </Text>
              </Pressable>
              <Pressable
                style={[
                  styles.filterChip,
                  filterSeverity === 'low' && styles.filterChipActive,
                ]}
                onPress={() => setFilterSeverity('low')}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    filterSeverity === 'low' && styles.filterChipTextActive,
                  ]}
                >
                  Low
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}

      {filteredAlerts.length > 0 && (
        <View style={styles.sectionDivider}>
          <Text style={styles.listTitle}>
            System Alerts ({filteredAlerts.length})
          </Text>
        </View>
      )}
    </View>
  );

  const renderItem = ({ item }: { item: AdminAlert }) => (
    <View style={styles.alertWrapper}>
      <AlertItem alert={item} onPress={() => handleAlertAction(item)} />
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyStateIcon}>
        <Bell size={64} color={colors.textTertiary} />
      </View>
      <Text style={styles.emptyStateTitle}>No system alerts</Text>
      <Text style={styles.emptyStateText}>
        {filterSeverity
          ? 'Try adjusting your filter criteria'
          : 'All system alerts will appear here'}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'System Alerts',
          headerLeft: () => (
            <Pressable onPress={() => router.back()} style={styles.backButton}>
              <ArrowLeft size={24} color={colors.primary} />
            </Pressable>
          ),
        }}
      />

      <FlatList
        data={filteredAlerts}
        renderItem={renderItem}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmptyState}
        keyExtractor={(item, index) => `${item.id}-${index}`}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={styles.itemSeparator} />}
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
  listContainer: {
    flexGrow: 1,
    paddingBottom: 100,
  },
  listHeader: {
    padding: 12,
    gap: 16,
  },
  quickStats: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 12,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  quickStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quickStatItem: {
    alignItems: 'center',
    flex: 1,
  },
  quickStatIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  quickStatValue: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  quickStatLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  actionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 12,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  actionBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: colors.background,
  },
  filterButtonActive: {
    backgroundColor: colors.primaryLight,
  },
  filterButtonText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  filterButtonTextActive: {
    color: colors.primary,
  },
  markAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: colors.primaryLight,
  },
  markAllButtonText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '500',
  },
  filtersPanel: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    gap: 16,
  },
  filterRow: {
    gap: 8,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  filterChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.background,
  },
  filterChipActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  filterChipText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: colors.primary,
  },
  sectionDivider: {
    marginTop: 8,
  },
  listTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  itemSeparator: {
    height: 12,
  },
  alertWrapper: {
    paddingHorizontal: 16,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    minHeight: 300,
  },
  emptyStateIcon: {
    marginBottom: 24,
  },
  emptyStateTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
});
