import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { colors } from '@/constants/adminColors';
import { Zone } from '@/types/admin/management';
import { formatDateInMaldives } from '@/utils/timezoneUtils';
import {
  MapPin,
  Clock,
  MoreVertical,
  Globe,
  Palette,
} from 'lucide-react-native';

interface ZoneItemProps {
  zone: Zone;
  onPress: (zoneId: string) => void;
  onMorePress?: (zone: Zone) => void;
}

const ZoneItem: React.FC<ZoneItemProps> = ({ zone, onPress, onMorePress }) => {
  const handlePress = () => {
    onPress(zone.id);
  };

  const handleMorePress = () => {
    onMorePress?.(zone);
  };

  const formatDate = (dateString: string) => {
    // Use Maldives timezone for consistent date display
    return formatDateInMaldives(dateString, 'short-date');
  };

  return (
    <Pressable style={styles.container} onPress={handlePress}>
      <View style={styles.header}>
        <View style={styles.leftSection}>
          <View style={styles.mainInfo}>
            <View style={styles.titleRow}>
              <Text style={styles.zoneName}>{zone.name}</Text>
              <View style={styles.zoneCodeBadge}>
                <Text style={styles.zoneCode}>{zone.code}</Text>
              </View>
            </View>
            {zone.description && (
              <Text style={styles.description} numberOfLines={2}>
                {zone.description}
              </Text>
            )}
          </View>
        </View>
        <View style={styles.rightSection}>
          <View
            style={[
              styles.statusBadge,
              zone.is_active ? styles.statusActive : styles.statusInactive,
            ]}
          >
            <View
              style={[
                styles.statusDot,
                {
                  backgroundColor: zone.is_active
                    ? colors.success
                    : colors.textTertiary,
                },
              ]}
            />
            <Text
              style={[
                styles.statusText,
                {
                  color: zone.is_active ? colors.success : colors.textTertiary,
                },
              ]}
            >
              {zone.is_active ? 'Active' : 'Inactive'}
            </Text>
          </View>
          {onMorePress && (
            <Pressable
              style={styles.moreButton}
              onPress={handleMorePress}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <MoreVertical size={16} color={colors.textSecondary} />
            </Pressable>
          )}
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <View style={styles.statIcon}>
            <MapPin size={14} color={colors.textSecondary} />
          </View>
          <Text style={styles.statLabel}>Islands:</Text>
          <Text style={styles.statValue}>
            {zone.total_islands || 0}
            {zone.total_islands && zone.active_islands !== undefined && (
              <Text style={styles.statSubValue}>
                {' '}
                ({zone.active_islands} active)
              </Text>
            )}
          </Text>
        </View>

        <View style={styles.statItem}>
          <View style={styles.statIcon}>
            <Globe size={14} color={colors.textSecondary} />
          </View>
          <Text style={styles.statLabel}>Routes:</Text>
          <Text style={styles.statValue}>
            {zone.total_routes || 0}
            {zone.total_routes && zone.active_routes !== undefined && (
              <Text style={styles.statSubValue}>
                {' '}
                ({zone.active_routes} active)
              </Text>
            )}
          </Text>
        </View>

        <View style={styles.statItem}>
          <View style={styles.statIcon}>
            <Clock size={14} color={colors.textSecondary} />
          </View>
          <Text style={styles.statLabel}>Created:</Text>
          <Text style={styles.statValue}>{formatDate(zone.created_at)}</Text>
        </View>

        <View style={styles.statItem}>
          <View style={styles.statIcon}>
            <Palette size={14} color={colors.textSecondary} />
          </View>
          <Text style={styles.statLabel}>Order:</Text>
          <Text style={styles.statValue}>{zone.order_index}</Text>
        </View>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: colors.borderLight,
    position: 'relative',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  leftSection: {
    flexDirection: 'row',
    flex: 1,
    alignItems: 'flex-start',
  },

  mainInfo: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 8,
  },
  zoneName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
  },
  zoneCodeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: colors.backgroundTertiary,
  },
  zoneCode: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: colors.textSecondary,
  },
  description: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginTop: 2,
  },
  rightSection: {
    alignItems: 'flex-end',
    gap: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusActive: {
    backgroundColor: colors.successLight,
  },
  statusInactive: {
    backgroundColor: colors.backgroundTertiary,
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
  moreButton: {
    padding: 4,
    borderRadius: 6,
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minWidth: '45%',
  },
  statIcon: {
    marginRight: 2,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  statValue: {
    fontSize: 12,
    color: colors.text,
    fontWeight: '600',
  },
  statSubValue: {
    color: colors.textSecondary,
    fontWeight: '400',
  },
});

export default ZoneItem;
