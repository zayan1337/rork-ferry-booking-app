/**
 * Trip Route Info Component
 *
 * Displays route information for trips, including multi-stop route details
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { colors } from '@/constants/adminColors';
import { Route as RouteIcon, AlertCircle } from 'lucide-react-native';
import type { MultiStopRoute } from '@/types/multiStopRoute';
import { getMultiStopRoute } from '@/utils/multiStopRouteUtils';
import RouteStopsDisplay from '../routes/RouteStopsDisplay';

interface TripRouteInfoProps {
  routeId: string;
  onOverrideFares?: () => void;
  showOverrideOption?: boolean;
}

export default function TripRouteInfo({
  routeId,
  onOverrideFares,
  showOverrideOption = false,
}: TripRouteInfoProps) {
  const [multiRoute, setMultiRoute] = useState<MultiStopRoute | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRouteData();
  }, [routeId]);

  const loadRouteData = async () => {
    setLoading(true);
    try {
      const route = await getMultiStopRoute(routeId);
      setMultiRoute(route);
    } catch (error) {
      console.error('Error loading multi-stop route:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size='small' color={colors.primary} />
        <Text style={styles.loadingText}>Loading route info...</Text>
      </View>
    );
  }

  if (!multiRoute) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <AlertCircle size={16} color={colors.error} />
          <Text style={styles.errorText}>Unable to load route information</Text>
        </View>
      </View>
    );
  }

  const stopCount = multiRoute.stops.length || multiRoute.total_stops || 2;
  const segmentCount = multiRoute.segment_fares.length || 1;

  return (
    <View style={styles.container}>
      {/* Route information banner */}
      <View style={styles.banner}>
        <View style={styles.bannerIcon}>
          <RouteIcon size={16} color={colors.info} />
        </View>
        <View style={styles.bannerContent}>
          <Text style={styles.bannerTitle}>{multiRoute.name}</Text>
          <Text style={styles.bannerText}>
            {stopCount} stops with {segmentCount} bookable segment
            {segmentCount !== 1 ? 's' : ''}
          </Text>
        </View>
      </View>

      {/* Route stops display */}
      <View style={styles.stopsContainer}>
        <Text style={styles.stopsTitle}>Route Stops</Text>
        <RouteStopsDisplay stops={multiRoute.stops} showCompact />
      </View>

      {/* Override option */}
      {showOverrideOption && onOverrideFares && (
        <Pressable style={styles.overrideButton} onPress={onOverrideFares}>
          <Text style={styles.overrideButtonText}>
            Override fares for this trip →
          </Text>
        </Pressable>
      )}

      {/* Info message */}
      <View style={styles.infoContainer}>
        <AlertCircle size={14} color={colors.textSecondary} />
        <Text style={styles.infoText}>
          Trip will use route's segment fares unless overridden
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 16,
    gap: 12,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 8,
  },
  loadingText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    backgroundColor: colors.infoLight,
    borderRadius: 12,
  },
  bannerIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: `${colors.info}20`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerContent: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.info,
    marginBottom: 2,
  },
  bannerText: {
    fontSize: 12,
    color: colors.info,
  },
  stopsContainer: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 12,
    padding: 16,
  },
  stopsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  overrideButton: {
    padding: 14,
    backgroundColor: colors.primaryLight,
    borderRadius: 8,
    alignItems: 'center',
  },
  overrideButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 8,
  },
  infoText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: colors.errorLight,
    borderRadius: 8,
  },
  errorText: {
    fontSize: 13,
    color: colors.error,
    fontWeight: '500',
  },
});
