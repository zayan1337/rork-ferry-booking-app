import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Dimensions,
} from 'react-native';
import { colors } from '@/constants/adminColors';
import { Route } from '@/types/operations';
import { formatRouteDistance, formatRouteDuration } from '@/utils/routeUtils';
import { formatCurrency } from '@/utils/currencyUtils';
import Button from '@/components/admin/Button';
import StatCard from '@/components/admin/StatCard';
import StatusBadge from '@/components/admin/StatusBadge';
import {
  MapPin,
  Clock,
  DollarSign,
  Calendar,
  TrendingUp,
  Users,
  Activity,
  Edit,
  Archive,
  AlertTriangle,
  Navigation,
  BarChart3,
  Target,
  Route as RouteIcon,
} from 'lucide-react-native';

interface RouteDetailsProps {
  route: Route;
  onEdit?: () => void;
  onArchive?: () => void;
  onViewTrips?: () => void;
  showActions?: boolean;
}

const { width: screenWidth } = Dimensions.get('window');

export default function RouteDetails({
  route,
  onEdit,
  onArchive,
  onViewTrips,
  showActions = true,
}: RouteDetailsProps) {
  const isTablet = screenWidth >= 768;

  const handleArchive = () => {
    Alert.alert(
      'Archive Route',
      `Are you sure you want to archive "${route.name}"? This will stop all future trips on this route.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Archive',
          style: 'destructive',
          onPress: onArchive,
        },
      ]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return colors.success;
      case 'inactive':
        return colors.warning;
      case 'suspended':
        return colors.danger;
      default:
        return colors.textSecondary;
    }
  };

  const getUtilizationColor = (utilization: number) => {
    if (utilization >= 80) return colors.success;
    if (utilization >= 60) return colors.warning;
    return colors.danger;
  };

  const stats = [
    {
      title: 'Total Trips',
      value: route.total_trips_30d?.toString() || '0',
      subtitle: 'Last 30 days',
      icon: <Calendar size={20} color={colors.primary} />,
      trend: route.total_trips_30d && route.total_trips_30d > 0 ? '+' : '',
    },
    {
      title: 'Revenue',
      value: formatCurrency(route.total_revenue_30d || 0),
      subtitle: 'Last 30 days',
      icon: <DollarSign size={20} color={colors.success} />,
      trend: route.total_revenue_30d && route.total_revenue_30d > 0 ? '+' : '',
    },
    {
      title: 'Avg. Occupancy',
      value: `${route.average_occupancy_30d || 0}%`,
      subtitle: 'Last 30 days',
      icon: (
        <Users
          size={20}
          color={getUtilizationColor(route.average_occupancy_30d || 0)}
        />
      ),
      trend:
        route.average_occupancy_30d && route.average_occupancy_30d > 70
          ? '+'
          : '',
    },
    {
      title: 'Performance',
      value: `${route.popularity_score || 0}/100`,
      subtitle: 'Popularity score',
      icon: <TrendingUp size={20} color={colors.primary} />,
      trend:
        route.popularity_score && route.popularity_score > 80
          ? 'up'
          : 'neutral',
    },
  ];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.title}>{route.name}</Text>
          <Text style={styles.routePath}>
            {route.origin} → {route.destination}
          </Text>
          <View style={styles.statusContainer}>
            <StatusBadge status={route.status} />
            <Text style={styles.routeId}>ID: {route.id}</Text>
          </View>
        </View>
        {showActions && (
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.iconButton} onPress={onEdit}>
              <Edit size={20} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconButton} onPress={handleArchive}>
              <Archive size={20} color={colors.danger} />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Key Information */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Route Information</Text>
        <View style={styles.infoGrid}>
          <View style={styles.infoItem}>
            <View style={styles.infoIcon}>
              <MapPin size={16} color={colors.primary} />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Distance</Text>
              <Text style={styles.infoValue}>
                {formatRouteDistance(route.distance)}
              </Text>
            </View>
          </View>

          <View style={styles.infoItem}>
            <View style={styles.infoIcon}>
              <Clock size={16} color={colors.primary} />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Duration</Text>
              <Text style={styles.infoValue}>
                {formatRouteDuration(route.duration)}
              </Text>
            </View>
          </View>

          <View style={styles.infoItem}>
            <View style={styles.infoIcon}>
              <DollarSign size={16} color={colors.primary} />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Base Fare</Text>
              <Text style={styles.infoValue}>
                {formatCurrency(route.base_fare)}
              </Text>
            </View>
          </View>

          <View style={styles.infoItem}>
            <View style={styles.infoIcon}>
              <Calendar size={16} color={colors.primary} />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Created</Text>
              <Text style={styles.infoValue}>
                {new Date(route.created_at).toLocaleDateString()}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Statistics */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Performance Stats</Text>
        <View style={[styles.statsGrid, isTablet && styles.statsGridTablet]}>
          {stats.map((stat, index) => (
            <StatCard
              key={index}
              title={stat.title}
              value={stat.value}
              subtitle={stat.subtitle}
              icon={stat.icon}
              trend={stat.trend as 'up' | 'down' | 'neutral' | undefined}
            />
          ))}
        </View>
      </View>

      {/* Description */}
      {route.description && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.description}>{route.description}</Text>
        </View>
      )}

      {/* Route Analytics */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Route Analytics</Text>
        <View style={styles.analyticsContainer}>
          <View style={styles.analyticsItem}>
            <View style={styles.analyticsIcon}>
              <BarChart3 size={20} color={colors.primary} />
            </View>
            <View style={styles.analyticsContent}>
              <Text style={styles.analyticsLabel}>Demand Level</Text>
              <Text style={styles.analyticsValue}>
                {route.average_occupancy_30d && route.average_occupancy_30d > 80
                  ? 'High'
                  : route.average_occupancy_30d &&
                      route.average_occupancy_30d > 60
                    ? 'Medium'
                    : 'Low'}
              </Text>
            </View>
          </View>

          <View style={styles.analyticsItem}>
            <View style={styles.analyticsIcon}>
              <Target size={20} color={colors.success} />
            </View>
            <View style={styles.analyticsContent}>
              <Text style={styles.analyticsLabel}>Efficiency</Text>
              <Text style={styles.analyticsValue}>
                {route.popularity_score && route.popularity_score > 4
                  ? 'Excellent'
                  : route.popularity_score && route.popularity_score > 3
                    ? 'Good'
                    : 'Needs Improvement'}
              </Text>
            </View>
          </View>

          <View style={styles.analyticsItem}>
            <View style={styles.analyticsIcon}>
              <Activity size={20} color={colors.warning} />
            </View>
            <View style={styles.analyticsContent}>
              <Text style={styles.analyticsLabel}>Status</Text>
              <Text style={styles.analyticsValue}>
                {route.status === 'active' ? 'Operational' : 'Inactive'}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Action Buttons */}
      {showActions && (
        <View style={styles.actionContainer}>
          {onViewTrips && (
            <Button
              title='View Trips'
              variant='outline'
              onPress={onViewTrips}
              icon={<RouteIcon size={18} color={colors.primary} />}
            />
          )}
          {onEdit && (
            <Button
              title='Edit Route'
              variant='primary'
              onPress={onEdit}
              icon={<Edit size={18} color='#FFFFFF' />}
            />
          )}
        </View>
      )}

      {/* Warnings */}
      {route.status !== 'active' && (
        <View style={styles.warningContainer}>
          <AlertTriangle size={16} color={colors.warning} />
          <Text style={styles.warningText}>
            This route is currently {route.status}. No trips can be scheduled
            until it's activated.
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  routePath: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  routeId: {
    fontSize: 12,
    color: colors.textSecondary,
    fontFamily: 'monospace',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  section: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 16,
  },
  infoGrid: {
    gap: 12,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary + '10',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statsGridTablet: {
    gap: 16,
  },
  description: {
    fontSize: 16,
    color: colors.text,
    lineHeight: 24,
  },
  analyticsContainer: {
    gap: 16,
  },
  analyticsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  analyticsIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary + '10',
    alignItems: 'center',
    justifyContent: 'center',
  },
  analyticsContent: {
    flex: 1,
  },
  analyticsLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  analyticsValue: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  actionContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  actionButton: {
    flex: 1,
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.warning + '10',
    borderWidth: 1,
    borderColor: colors.warning + '30',
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
  },
  warningText: {
    fontSize: 14,
    color: colors.warning,
    flex: 1,
  },
});
