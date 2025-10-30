import React, { useState, useEffect } from 'react';
import {
  View,
  Pressable,
  Text,
  RefreshControl,
  FlatList,
  StyleSheet,
} from 'react-native';
import {
  Bell,
  AlertTriangle,
  X,
  Filter,
  Trash2,
  AlertCircle,
  Users,
  Calendar,
  Clock,
  Phone,
} from 'lucide-react-native';
import { colors } from '@/constants/adminColors';
import { Alert as AdminAlert } from '@/types/admin';
import { SettingsStats } from '@/types/settings';
import Button from '@/components/admin/Button';
import StatCard from '@/components/admin/StatCard';
import EmptyState from '@/components/admin/EmptyState';
import AlertItem from '@/components/admin/AlertItem';
import { useAdminStore } from '@/store/admin/adminStore';
import { router } from 'expo-router';
import { formatDate } from '@/utils/contentUtils';
import { formatTripStatus } from '@/utils/tripUtils';
import { styles } from './styles';

type AlertSubTab = 'system' | 'assistance';

interface AlertsTabProps {
  filteredData: AdminAlert[];
  stats: SettingsStats;
  onAlertAction: (alert: AdminAlert, action: 'read' | 'delete') => void;
  onMarkAllAlertsAsRead: () => void;
  isActive: boolean;
  searchQuery: string;
}

export default function AlertsTab({
  filteredData,
  stats,
  onAlertAction,
  onMarkAllAlertsAsRead,
  isActive,
  searchQuery,
}: AlertsTabProps) {
  const { fetchSpecialAssistanceNotifications } = useAdminStore();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<AlertSubTab>('system');

  // Preview items - show first 10 items
  const previewSystemAlerts = filteredData.slice(0, 1);
  const previewAssistanceNotifications = notifications.slice(0, 1);

  useEffect(() => {
    if (isActive) {
      loadNotifications();
    }
  }, [isActive]);

  const loadNotifications = async () => {
    setRefreshing(true);
    try {
      const data = await fetchSpecialAssistanceNotifications();
      // Filter by search query
      const filteredNotifications = data.filter(
        (item: any) =>
          item.routeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.vesselName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.passengers.some(
            (p: any) =>
              p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
              p.assistance.toLowerCase().includes(searchQuery.toLowerCase())
          )
      );
      setNotifications(filteredNotifications);
    } catch (error) {
      console.error('Failed to load special assistance notifications:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await loadNotifications();
    } catch (error) {
      console.error('Failed to refresh:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleTripPress = (tripId: string) => {
    router.push(`/(admin)/trip/${tripId}` as any);
  };

  const getStatusColor = (status: string) => {
    const statusInfo = formatTripStatus(status);
    return statusInfo.color;
  };

  const renderHeader = () => (
    <View style={assistanceStyles.headerContainer}>
      {/* Alert Statistics */}
      <View style={assistanceStyles.statsWrapper}>
        <View style={styles.statsContainer}>
          <StatCard
            title='Total Alerts'
            value={(stats.totalAlerts + notifications.length).toString()}
            icon={<Bell size={20} color={colors.primary} />}
            trend='up'
            trendValue='+5'
          />
          <StatCard
            title='Unread Alerts'
            value={stats.unreadAlerts.toString()}
            icon={<AlertTriangle size={20} color={colors.warning} />}
            trend={stats.unreadAlerts > 0 ? 'up' : 'neutral'}
            trendValue={stats.unreadAlerts > 0 ? 'Action needed' : 'All clear'}
          />
          <StatCard
            title='Critical Alerts'
            value={stats.criticalAlerts.toString()}
            icon={<X size={20} color={colors.danger} />}
            trend={stats.criticalAlerts > 0 ? 'up' : 'neutral'}
            trendValue={stats.criticalAlerts > 0 ? 'High priority' : 'Normal'}
          />
        </View>
      </View>

      {/* Tab Toggle */}
      <View style={assistanceStyles.tabToggleContainer}>
        <Pressable
          style={[
            assistanceStyles.tabToggle,
            activeSubTab === 'system' && assistanceStyles.tabToggleActive,
          ]}
          onPress={() => setActiveSubTab('system')}
        >
          <Bell
            size={16}
            color={
              activeSubTab === 'system' ? colors.primary : colors.textSecondary
            }
          />
          <Text
            style={[
              assistanceStyles.tabToggleText,
              activeSubTab === 'system' && assistanceStyles.tabToggleTextActive,
            ]}
          >
            System Alerts ({filteredData.length})
          </Text>
        </Pressable>
        <Pressable
          style={[
            assistanceStyles.tabToggle,
            activeSubTab === 'assistance' && assistanceStyles.tabToggleActive,
          ]}
          onPress={() => setActiveSubTab('assistance')}
        >
          <AlertCircle
            size={16}
            color={
              activeSubTab === 'assistance'
                ? colors.primary
                : colors.textSecondary
            }
          />
          <Text
            style={[
              assistanceStyles.tabToggleText,
              activeSubTab === 'assistance' &&
                assistanceStyles.tabToggleTextActive,
            ]}
          >
            Special Assistance ({notifications.length})
          </Text>
        </Pressable>
      </View>

      {/* Action Buttons for System Alerts */}
      {activeSubTab === 'system' && (
        <View style={assistanceStyles.actionRow}>
          {stats.unreadAlerts > 0 && (
            <Button
              title='Mark All Read'
              variant='outline'
              size='small'
              onPress={onMarkAllAlertsAsRead}
            />
          )}
          <Button
            title='Filter'
            variant='ghost'
            size='small'
            icon={<Filter size={16} color={colors.primary} />}
            onPress={() => {}}
          />
        </View>
      )}
    </View>
  );

  const renderSystemAlert = ({ item }: { item: AdminAlert }) => (
    <View style={assistanceStyles.itemContainer}>
      <View style={styles.alertWrapper}>
        <AlertItem alert={item} onPress={() => onAlertAction(item, 'read')} />
        <Pressable
          style={styles.deleteAlertButton}
          onPress={() => onAlertAction(item, 'delete')}
        >
          <Trash2 size={16} color={colors.danger} />
        </Pressable>
      </View>
    </View>
  );

  const renderAssistanceNotification = ({ item }: { item: any }) => (
    <View style={assistanceStyles.itemContainer}>
      <Pressable
        style={assistanceStyles.notificationCard}
        onPress={() => handleTripPress(item.tripId)}
      >
        {/* Trip Header */}
        <View style={assistanceStyles.notificationHeader}>
          <View style={assistanceStyles.alertBadge}>
            <AlertCircle size={16} color={colors.warning} />
          </View>
          <View style={assistanceStyles.tripInfo}>
            <Text style={assistanceStyles.tripTitle}>{item.routeName}</Text>
            <Text style={assistanceStyles.tripSubtitle}>{item.vesselName}</Text>
          </View>
          <View style={assistanceStyles.passengerCountBadge}>
            <Users size={14} color={colors.white} />
            <Text style={assistanceStyles.passengerCountText}>
              {item.passengers.length}
            </Text>
          </View>
        </View>

        {/* Trip Details */}
        <View style={assistanceStyles.tripDetails}>
          <View style={assistanceStyles.tripDetailItem}>
            <Calendar size={12} color={colors.textSecondary} />
            <Text style={assistanceStyles.tripDetailText}>
              {formatDate(item.travelDate)}
            </Text>
          </View>
          <View style={assistanceStyles.tripDetailItem}>
            <Clock size={12} color={colors.textSecondary} />
            <Text style={assistanceStyles.tripDetailText}>
              {item.departureTime}
            </Text>
          </View>
          <View style={assistanceStyles.tripDetailItem}>
            <View
              style={[
                assistanceStyles.statusBadge,
                { backgroundColor: getStatusColor(item.tripStatus) },
              ]}
            >
              <Text style={assistanceStyles.statusText}>
                {item.tripStatus.toUpperCase()}
              </Text>
            </View>
          </View>
        </View>

        {/* Passengers List */}
        <View style={assistanceStyles.passengersList}>
          {item.passengers.slice(0, 3).map((passenger: any, index: number) => (
            <View key={index} style={assistanceStyles.passengerItem}>
              <View style={assistanceStyles.passengerMainInfo}>
                <Text style={assistanceStyles.passengerName}>
                  {passenger.name}
                </Text>
                <Text style={assistanceStyles.seatNumber}>
                  Seat {passenger.seatNumber}
                </Text>
              </View>
              <View style={assistanceStyles.assistanceTag}>
                <AlertCircle size={12} color={colors.warning} />
                <Text style={assistanceStyles.assistanceText}>
                  {passenger.assistance}
                </Text>
              </View>
              {passenger.contactNumber && (
                <View style={assistanceStyles.contactRow}>
                  <Phone size={10} color={colors.textSecondary} />
                  <Text style={assistanceStyles.contactText}>
                    {passenger.contactNumber}
                  </Text>
                </View>
              )}
            </View>
          ))}
          {item.passengers.length > 3 && (
            <Text style={assistanceStyles.morePassengers}>
              +{item.passengers.length - 3} more passengers
            </Text>
          )}
        </View>
      </Pressable>
    </View>
  );

  const renderEmptyState = () => {
    if (activeSubTab === 'system') {
      return (
        <EmptyState
          icon={<Bell size={48} color={colors.textSecondary} />}
          title='No system alerts'
          message='System alerts will appear here'
        />
      );
    } else {
      return (
        <EmptyState
          icon={<AlertCircle size={48} color={colors.textTertiary} />}
          title='No Special Assistance Needed'
          message='All upcoming trips have no passengers requiring special assistance'
        />
      );
    }
  };

  const renderFooter = () => {
    const hasMore =
      activeSubTab === 'system'
        ? filteredData.length >= 1
        : notifications.length > 1;

    if (!hasMore) return null;

    return (
      <View style={assistanceStyles.footerContainer}>
        <Pressable
          style={assistanceStyles.viewAllButton}
          onPress={() => {
            if (activeSubTab === 'system') {
              // Navigate to system alerts page
              router.push('/(admin)/alerts' as any);
            } else {
              // Navigate to special assistance page
              router.push('/(admin)/special-assistance' as any);
            }
          }}
        >
          <Text style={assistanceStyles.viewAllText}>
            View All{' '}
            {activeSubTab === 'system' ? 'System Alerts' : 'Special Assistance'}
          </Text>
          {activeSubTab === 'system' ? (
            <Bell size={16} color={colors.primary} />
          ) : (
            <AlertCircle size={16} color={colors.primary} />
          )}
        </Pressable>
      </View>
    );
  };

  return (
    <View style={assistanceStyles.container}>
      <FlatList
        data={
          activeSubTab === 'system'
            ? previewSystemAlerts
            : previewAssistanceNotifications
        }
        renderItem={
          activeSubTab === 'system'
            ? renderSystemAlert
            : renderAssistanceNotification
        }
        keyExtractor={(item: any, index) => {
          if (activeSubTab === 'system') {
            return `system-${item.id}-${index}`;
          } else {
            return `assistance-${item.tripId}-${index}`;
          }
        }}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmptyState}
        ListFooterComponent={renderFooter}
        contentContainerStyle={assistanceStyles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        ItemSeparatorComponent={() => (
          <View style={assistanceStyles.itemSeparator} />
        )}
      />
    </View>
  );
}

// Additional styles for special assistance section
const assistanceStyles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
    paddingBottom: 16,
  },
  headerContainer: {
    marginBottom: 0,
  },
  statsWrapper: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  tabToggleContainer: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 4,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 16,
    marginHorizontal: 16,
  },
  tabToggle: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  tabToggleActive: {
    backgroundColor: `${colors.primary}15`,
  },
  tabToggleText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  tabToggleTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  itemSeparator: {
    height: 12,
  },
  itemContainer: {
    paddingHorizontal: 16,
  },
  footerContainer: {
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: `${colors.primary}10`,
    borderRadius: 8,
    gap: 8,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.primary,
  },
  notificationCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
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
  morePassengers: {
    fontSize: 12,
    color: colors.textSecondary,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 8,
  },
});
