import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MapPin, Calendar, Activity } from 'lucide-react-native';
import { colors } from '@/constants/adminColors';
import { DatabaseIsland } from '@/types/database';

interface IslandItemProps {
  island: DatabaseIsland;
  onPress: (id: string) => void;
}

export default function IslandItem({ island, onPress }: IslandItemProps) {
  const getZoneColor = (zone: string) => {
    switch (zone.toLowerCase()) {
      case 'male':
        return colors.primary;
      case 'north':
        return colors.info;
      case 'south':
        return colors.warning;
      case 'central':
        return colors.success;
      default:
        return colors.textSecondary;
    }
  };

  const getZoneLabel = (zone: string) => {
    switch (zone.toLowerCase()) {
      case 'male':
        return 'Male Zone';
      case 'north':
        return 'North Zone';
      case 'south':
        return 'South Zone';
      case 'central':
        return 'Central Zone';
      default:
        return zone;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(date);
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => onPress(island.id)}
      activeOpacity={0.7}
    >
      <View style={styles.iconContainer}>
        <MapPin size={20} color={colors.primary} />
      </View>

      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.name} numberOfLines={1}>
            {island.name}
          </Text>
          <View
            style={[
              styles.statusBadge,
              island.is_active ? styles.statusActive : styles.statusInactive,
            ]}
          >
            <View
              style={[
                styles.statusDot,
                {
                  backgroundColor: island.is_active
                    ? colors.success
                    : colors.textSecondary,
                },
              ]}
            />
            <Text
              style={[
                styles.statusText,
                island.is_active
                  ? styles.statusTextActive
                  : styles.statusTextInactive,
              ]}
            >
              {island.is_active ? 'Active' : 'Inactive'}
            </Text>
          </View>
        </View>

        <View style={styles.details}>
          <View style={styles.detailRow}>
            <View
              style={[
                styles.zoneBadge,
                { backgroundColor: `${getZoneColor(island.zone)}15` },
              ]}
            >
              <Activity size={12} color={getZoneColor(island.zone)} />
              <Text
                style={[styles.zoneText, { color: getZoneColor(island.zone) }]}
              >
                {getZoneLabel(island.zone)}
              </Text>
            </View>
          </View>

          <View style={styles.metaRow}>
            <Calendar size={12} color={colors.textTertiary} />
            <Text style={styles.createdAt}>
              Created {formatDate(island.created_at)}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.chevron}>
        <View style={styles.chevronIcon} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    borderWidth: 1,
    borderColor: `${colors.primary}20`,
  },
  content: {
    flex: 1,
    minHeight: 60,
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  name: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
    marginRight: 12,
    lineHeight: 22,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
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
    letterSpacing: 0.2,
  },
  statusTextActive: {
    color: colors.success,
  },
  statusTextInactive: {
    color: colors.textSecondary,
  },
  details: {
    gap: 6,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  zoneBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  zoneText: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  createdAt: {
    fontSize: 12,
    color: colors.textTertiary,
    fontWeight: '500',
  },
  chevron: {
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  chevronIcon: {
    width: 8,
    height: 8,
    borderRightWidth: 2,
    borderTopWidth: 2,
    borderColor: colors.textTertiary,
    transform: [{ rotate: '45deg' }],
  },
});
