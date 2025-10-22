import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { colors } from '@/constants/adminColors';
import {
  Navigation,
  MapPin,
  Activity,
  Clock,
  ChevronRight,
  BarChart3,
  Users,
  TrendingUp,
} from 'lucide-react-native';

// Components
import StatusBadge from '@/components/admin/StatusBadge';

type StatusType = 'active' | 'inactive' | 'maintenance';

interface RouteItemProps {
  route: {
    id: string;
    name?: string;
    route_name?: string;
    from_island_name?: string;
    to_island_name?: string;
    origin?: string;
    destination?: string;
    base_fare?: number;
    distance?: string;
    duration?: string;
    status?: string;
    is_active?: boolean;
    total_trips_30d?: number;
    total_bookings_30d?: number;
    total_revenue_30d?: number;
    avg_occupancy_30d?: number;
    created_at?: string;
  };
  onPress: (routeId: string) => void;
  showStats?: boolean;
}

export default function RouteItem({
  route,
  onPress,
  showStats = true,
}: RouteItemProps) {
  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'active':
        return 'default';
      case 'inactive':
        return 'payment';
      case 'maintenance':
        return 'payment';
      default:
        return 'default';
    }
  };

  const getOccupancyColor = (occupancy: number) => {
    if (occupancy >= 80) return colors.success;
    if (occupancy >= 60) return colors.warning;
    return colors.danger;
  };

  const routeName = route.name || route.route_name || 'Unknown Route';
  const routeDirection = `${route.origin || route.from_island_name || 'Unknown'} → ${route.destination || route.to_island_name || 'Unknown'}`;
  const routeStatus: StatusType =
    (route.status as StatusType) || (route.is_active ? 'active' : 'inactive');

  return (
    <Pressable style={styles.container} onPress={() => onPress(route.id)}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.iconContainer}>
            <Navigation size={20} color={colors.primary} />
          </View>
          <View style={styles.headerContent}>
            <Text style={styles.routeName} numberOfLines={1}>
              {routeName}
            </Text>
            <View style={styles.routeDirection}>
              <MapPin size={12} color={colors.textSecondary} />
              <Text style={styles.routeDirectionText} numberOfLines={1}>
                {routeDirection}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.headerRight}>
          <StatusBadge
            status={routeStatus as 'active' | 'inactive' | 'maintenance'}
            variant={getStatusVariant(routeStatus)}
            size='small'
          />
          <ChevronRight size={16} color={colors.textTertiary} />
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.primaryInfo}>
          {route.distance && (
            <View style={styles.infoItem}>
              <View style={styles.infoIcon}>
                <Activity size={16} color={colors.primary} />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Distance</Text>
                <Text style={styles.infoValue}>{route.distance}</Text>
              </View>
            </View>
          )}

          {route.duration && (
            <View style={styles.infoItem}>
              <View style={styles.infoIcon}>
                <Clock size={16} color={colors.textSecondary} />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Duration</Text>
                <Text style={styles.infoValue}>{route.duration}</Text>
              </View>
            </View>
          )}

          <View style={styles.infoItem}>
            <View style={styles.infoIcon}>
              <Navigation size={16} color={colors.textSecondary} />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Route Type</Text>
              <Text style={styles.infoValue}>Multi-Stop</Text>
            </View>
          </View>
        </View>

        {showStats && (
          <View style={styles.statsContainer}>
            <View style={styles.statsRow}>
              {route.total_trips_30d !== null &&
                route.total_trips_30d !== undefined && (
                  <View style={styles.statItem}>
                    <View
                      style={[
                        styles.statIcon,
                        { backgroundColor: `${colors.primary}15` },
                      ]}
                    >
                      <BarChart3 size={12} color={colors.primary} />
                    </View>
                    <View style={styles.statContent}>
                      <Text style={styles.statValue}>
                        {route.total_trips_30d}
                      </Text>
                      <Text style={styles.statLabel}>Trips</Text>
                    </View>
                  </View>
                )}

              {route.total_bookings_30d !== null &&
                route.total_bookings_30d !== undefined && (
                  <View style={styles.statItem}>
                    <View
                      style={[
                        styles.statIcon,
                        { backgroundColor: `${colors.info}15` },
                      ]}
                    >
                      <Users size={12} color={colors.info} />
                    </View>
                    <View style={styles.statContent}>
                      <Text style={styles.statValue}>
                        {route.total_bookings_30d}
                      </Text>
                      <Text style={styles.statLabel}>Bookings</Text>
                    </View>
                  </View>
                )}

              {route.total_revenue_30d !== null &&
                route.total_revenue_30d !== undefined && (
                  <View style={styles.statItem}>
                    <View
                      style={[
                        styles.statIcon,
                        { backgroundColor: `${colors.success}15` },
                      ]}
                    >
                      <TrendingUp size={12} color={colors.success} />
                    </View>
                    <View style={styles.statContent}>
                      <Text style={styles.statValue}>
                        {route.total_revenue_30d >= 1000
                          ? `${(route.total_revenue_30d / 1000).toFixed(1)}K`
                          : route.total_revenue_30d.toString()}
                      </Text>
                      <Text style={styles.statLabel}>Revenue</Text>
                    </View>
                  </View>
                )}

              {route.avg_occupancy_30d !== null &&
                route.avg_occupancy_30d !== undefined && (
                  <View style={styles.statItem}>
                    <View
                      style={[
                        styles.statIcon,
                        {
                          backgroundColor: `${getOccupancyColor(route.avg_occupancy_30d)}15`,
                        },
                      ]}
                    >
                      <Activity
                        size={12}
                        color={getOccupancyColor(route.avg_occupancy_30d)}
                      />
                    </View>
                    <View style={styles.statContent}>
                      <Text style={styles.statValue}>
                        {route.avg_occupancy_30d.toFixed(0)}%
                      </Text>
                      <Text style={styles.statLabel}>Occupancy</Text>
                    </View>
                  </View>
                )}
            </View>
          </View>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    shadowColor: colors.shadowMedium,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerContent: {
    flex: 1,
    paddingRight: 12,
  },
  routeName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
    lineHeight: 20,
  },
  routeDirection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  routeDirectionText: {
    fontSize: 14,
    color: colors.textSecondary,
    flex: 1,
    lineHeight: 18,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  content: {
    gap: 16,
  },
  primaryInfo: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minWidth: 80,
  },
  infoIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.backgroundTertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
    lineHeight: 14,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 13,
    color: colors.text,
    fontWeight: '600',
    lineHeight: 16,
  },
  statsContainer: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 12,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minWidth: 60,
  },
  statIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statContent: {
    alignItems: 'flex-start',
  },
  statValue: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    lineHeight: 16,
  },
  statLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    fontWeight: '500',
    lineHeight: 12,
  },
});
