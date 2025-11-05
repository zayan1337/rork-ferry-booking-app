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
import { useAdminStore } from '@/store/admin/adminStore';
import {
  ArrowLeft,
  AlertCircle,
  Users,
  Calendar,
  Clock,
  Phone,
  Filter,
} from 'lucide-react-native';
import { formatDate } from '@/utils/contentUtils';
import { formatTripStatus } from '@/utils/tripUtils';

export default function SpecialAssistanceScreen() {
  const { fetchSpecialAssistanceNotifications } = useAdminStore();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string | null>(null);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    setIsRefreshing(true);
    try {
      const data = await fetchSpecialAssistanceNotifications();
      setNotifications(data);
    } catch (error) {
      console.error('Failed to load special assistance notifications:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleTripPress = (tripId: string) => {
    router.push(`./trip/${tripId}` as any);
  };

  const getStatusColor = (status: string) => {
    const statusInfo = formatTripStatus(status);
    return statusInfo.color;
  };

  // Calculate stats
  const stats = {
    total: notifications.length,
    passengers: notifications.reduce(
      (sum, item) => sum + item.passengers.length,
      0
    ),
    scheduled: notifications.filter(n => n.tripStatus === 'scheduled').length,
  };

  // Filter notifications
  const filteredNotifications = React.useMemo(() => {
    let filtered = [...notifications];

    if (filterStatus) {
      filtered = filtered.filter(n => n.tripStatus === filterStatus);
    }

    return filtered;
  }, [notifications, filterStatus]);

  const renderHeader = () => (
    <View style={styles.listHeader}>
      {/* Quick Stats */}
      <View style={styles.quickStats}>
        <View style={styles.quickStatsRow}>
          <View style={styles.quickStatItem}>
            <View
              style={[
                styles.quickStatIcon,
                { backgroundColor: colors.warningLight },
              ]}
            >
              <AlertCircle size={16} color={colors.warning} />
            </View>
            <Text style={styles.quickStatValue}>{stats.total}</Text>
            <Text style={styles.quickStatLabel}>Total Trips</Text>
          </View>
          <View style={styles.quickStatItem}>
            <View
              style={[
                styles.quickStatIcon,
                { backgroundColor: colors.primaryLight },
              ]}
            >
              <Users size={16} color={colors.primary} />
            </View>
            <Text style={styles.quickStatValue}>{stats.passengers}</Text>
            <Text style={styles.quickStatLabel}>Passengers</Text>
          </View>
          <View style={styles.quickStatItem}>
            <View
              style={[
                styles.quickStatIcon,
                { backgroundColor: colors.successLight },
              ]}
            >
              <Clock size={16} color={colors.success} />
            </View>
            <Text style={styles.quickStatValue}>{stats.scheduled}</Text>
            <Text style={styles.quickStatLabel}>Scheduled</Text>
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
      </View>

      {/* Filters Panel */}
      {showFilters && (
        <View style={styles.filtersPanel}>
          <View style={styles.filterRow}>
            <Text style={styles.filterLabel}>Trip Status:</Text>
            <View style={styles.filterChips}>
              <Pressable
                style={[
                  styles.filterChip,
                  filterStatus === null && styles.filterChipActive,
                ]}
                onPress={() => setFilterStatus(null)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    filterStatus === null && styles.filterChipTextActive,
                  ]}
                >
                  All
                </Text>
              </Pressable>
              <Pressable
                style={[
                  styles.filterChip,
                  filterStatus === 'scheduled' && styles.filterChipActive,
                ]}
                onPress={() => setFilterStatus('scheduled')}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    filterStatus === 'scheduled' && styles.filterChipTextActive,
                  ]}
                >
                  Scheduled
                </Text>
              </Pressable>
              <Pressable
                style={[
                  styles.filterChip,
                  filterStatus === 'boarding' && styles.filterChipActive,
                ]}
                onPress={() => setFilterStatus('boarding')}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    filterStatus === 'boarding' && styles.filterChipTextActive,
                  ]}
                >
                  Boarding
                </Text>
              </Pressable>
              <Pressable
                style={[
                  styles.filterChip,
                  filterStatus === 'departed' && styles.filterChipActive,
                ]}
                onPress={() => setFilterStatus('departed')}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    filterStatus === 'departed' && styles.filterChipTextActive,
                  ]}
                >
                  Departed
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}

      {filteredNotifications.length > 0 && (
        <View style={styles.sectionDivider}>
          <Text style={styles.listTitle}>
            Special Assistance Requests ({filteredNotifications.length})
          </Text>
        </View>
      )}
    </View>
  );

  const renderItem = ({ item }: { item: any }) => (
    <Pressable
      style={styles.notificationCard}
      onPress={() => handleTripPress(item.tripId)}
    >
      {/* Trip Header */}
      <View style={styles.notificationHeader}>
        <View style={styles.alertBadge}>
          <AlertCircle size={16} color={colors.warning} />
        </View>
        <View style={styles.tripInfo}>
          <Text style={styles.tripTitle}>{item.routeName}</Text>
          <Text style={styles.tripSubtitle}>{item.vesselName}</Text>
        </View>
        <View style={styles.passengerCountBadge}>
          <Users size={14} color={colors.white} />
          <Text style={styles.passengerCountText}>
            {item.passengers.length}
          </Text>
        </View>
      </View>

      {/* Trip Details */}
      <View style={styles.tripDetails}>
        <View style={styles.tripDetailItem}>
          <Calendar size={12} color={colors.textSecondary} />
          <Text style={styles.tripDetailText}>
            {formatDate(item.travelDate)}
          </Text>
        </View>
        <View style={styles.tripDetailItem}>
          <Clock size={12} color={colors.textSecondary} />
          <Text style={styles.tripDetailText}>{item.departureTime}</Text>
        </View>
        <View style={styles.tripDetailItem}>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: getStatusColor(item.tripStatus) },
            ]}
          >
            <Text style={styles.statusText}>
              {item.tripStatus.toUpperCase()}
            </Text>
          </View>
        </View>
      </View>

      {/* Passengers List */}
      <View style={styles.passengersList}>
        {item.passengers.map((passenger: any, index: number) => (
          <View key={index} style={styles.passengerItem}>
            <View style={styles.passengerMainInfo}>
              <Text style={styles.passengerName}>{passenger.name}</Text>
              <Text style={styles.seatNumber}>Seat {passenger.seatNumber}</Text>
            </View>
            <View style={styles.assistanceTag}>
              <AlertCircle size={12} color={colors.warning} />
              <Text style={styles.assistanceText}>{passenger.assistance}</Text>
            </View>
            {passenger.contactNumber && (
              <View style={styles.contactRow}>
                <Phone size={10} color={colors.textSecondary} />
                <Text style={styles.contactText}>
                  {passenger.contactNumber}
                </Text>
              </View>
            )}
          </View>
        ))}
      </View>
    </Pressable>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyStateIcon}>
        <AlertCircle size={64} color={colors.textTertiary} />
      </View>
      <Text style={styles.emptyStateTitle}>No Special Assistance Needed</Text>
      <Text style={styles.emptyStateText}>
        {filterStatus
          ? 'Try adjusting your filter criteria'
          : 'All upcoming trips have no passengers requiring special assistance'}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Special Assistance',
          headerLeft: () => (
            <Pressable onPress={() => router.back()} style={styles.backButton}>
              <ArrowLeft size={24} color={colors.primary} />
            </Pressable>
          ),
        }}
      />

      <FlatList
        data={filteredNotifications}
        renderItem={renderItem}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmptyState}
        keyExtractor={(item, index) => `${item.tripId}-${index}`}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={loadNotifications}
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
  notificationCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 12,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    borderLeftWidth: 4,
    borderLeftColor: colors.warning,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  alertBadge: {
    backgroundColor: `${colors.warning}20`,
    borderRadius: 16,
    padding: 6,
    marginRight: 10,
  },
  tripInfo: {
    flex: 1,
  },
  tripTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  tripSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  passengerCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginLeft: 10,
    gap: 4,
  },
  passengerCountText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.white,
  },
  tripDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: 12,
  },
  tripDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tripDetailText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.white,
    textTransform: 'uppercase',
  },
  passengersList: {
    marginTop: 8,
  },
  passengerItem: {
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  passengerMainInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  passengerName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  seatNumber: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  assistanceTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: `${colors.warning}15`,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  assistanceText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.warning,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  contactText: {
    fontSize: 12,
    color: colors.textSecondary,
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
