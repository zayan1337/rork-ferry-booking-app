import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { colors } from "@/constants/adminColors";
import { ArrowRight, Calendar, Clock, Ship, MapPin, Users, CheckCircle } from "lucide-react-native";
import StatusBadge from "./StatusBadge";
import { Trip } from "@/types/admin";

interface TripItemProps {
  trip: Trip;
  viewMode?: 'card' | 'list' | 'compact';
  isSelected?: boolean;
  showSelection?: boolean;
  onPress?: () => void;
  onLongPress?: () => void;
  onSelectionToggle?: () => void;
}

export default function TripItem({ 
  trip, 
  viewMode = 'card', 
  isSelected = false,
  showSelection = false,
  onPress, 
  onLongPress,
  onSelectionToggle 
}: TripItemProps) {
  const occupancyPercentage = Math.round((trip.bookings / trip.capacity) * 100);

  const getOccupancyColor = () => {
    if (occupancyPercentage >= 90) return colors.danger;
    if (occupancyPercentage >= 70) return colors.warning;
    return colors.success;
  };

  // List view mode - compact horizontal layout
  if (viewMode === 'list') {
    return (
      <TouchableOpacity 
        style={[styles.listContainer, isSelected && styles.selectedContainer]} 
        onPress={onPress}
        onLongPress={onLongPress || onSelectionToggle}
        activeOpacity={0.7}
      >
        <View style={styles.listContent}>
          <View style={styles.listMain}>
            <View style={styles.routeInfo}>
              <MapPin size={14} color={colors.textSecondary} />
              <Text style={styles.listRouteName} numberOfLines={1}>
                {trip.routeName}
              </Text>
            </View>
            <Text style={styles.listDateTime}>
              {trip.date} • {trip.departureTime}
            </Text>
          </View>
          <View style={styles.listMeta}>
            <StatusBadge status={trip.status} size="small" />
            <Text style={[styles.occupancyPercent, { color: getOccupancyColor() }]}>
              {occupancyPercentage}%
            </Text>
          </View>
        </View>
        {showSelection && (
          <TouchableOpacity 
            style={styles.selectionButton}
            onPress={onSelectionToggle}
          >
            <CheckCircle 
              size={20} 
              color={isSelected ? colors.primary : colors.textSecondary} 
              fill={isSelected ? colors.primary : "transparent"}
            />
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  }

  // Compact view mode - minimal info
  if (viewMode === 'compact') {
    return (
      <TouchableOpacity 
        style={[styles.compactContainer, isSelected && styles.selectedContainer]} 
        onPress={onPress}
        onLongPress={onLongPress || onSelectionToggle}
        activeOpacity={0.7}
      >
        <View style={styles.compactHeader}>
          <Text style={styles.compactTime}>{trip.departureTime}</Text>
          <StatusBadge status={trip.status} size="small" />
        </View>
        <Text style={styles.compactRoute} numberOfLines={1}>
          {trip.routeName}
        </Text>
        <View style={styles.compactMeta}>
          <Text style={styles.compactVessel} numberOfLines={1}>
            {trip.vesselName}
          </Text>
          <Text style={[styles.compactOccupancy, { color: getOccupancyColor() }]}>
            {trip.bookings}/{trip.capacity}
          </Text>
        </View>
        {showSelection && isSelected && (
          <View style={styles.compactSelection}>
            <CheckCircle size={16} color={colors.primary} fill={colors.primary} />
          </View>
        )}
      </TouchableOpacity>
    );
  }

  // Default card view mode
  return (
    <TouchableOpacity 
      style={[styles.container, isSelected && styles.selectedContainer]} 
      onPress={onPress} 
      onLongPress={onLongPress || onSelectionToggle}
      activeOpacity={0.7}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.tripId}>#{trip.id}</Text>
          <View style={styles.routeInfo}>
            <MapPin size={14} color={colors.textSecondary} />
            <Text style={styles.routeName} numberOfLines={1}>
              {trip.routeName}
            </Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          <StatusBadge status={trip.status} size="small" />
          {showSelection && (
            <TouchableOpacity 
              style={styles.selectionButton}
              onPress={onSelectionToggle}
            >
              <CheckCircle 
                size={20} 
                color={isSelected ? colors.primary : colors.textSecondary} 
                fill={isSelected ? colors.primary : "transparent"}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Vessel Info */}
      <View style={styles.vesselContainer}>
        <Ship size={14} color={colors.textSecondary} />
        <Text style={styles.vesselName}>{trip.vesselName}</Text>
      </View>

      {/* Time and Date Info */}
      <View style={styles.detailsGrid}>
        <View style={styles.detailItem}>
          <Calendar size={14} color={colors.textSecondary} />
          <Text style={styles.detailText}>{trip.date}</Text>
        </View>
        
        <View style={styles.timeContainer}>
          <View style={styles.timeItem}>
            <Clock size={12} color={colors.textSecondary} />
            <Text style={styles.timeText}>{trip.departureTime}</Text>
            <Text style={styles.timeLabel}>Departure</Text>
          </View>
          <ArrowRight size={14} color={colors.textSecondary} />
          <View style={styles.timeItem}>
            <Clock size={12} color={colors.textSecondary} />
            <Text style={styles.timeText}>{trip.arrivalTime || '--:--'}</Text>
            <Text style={styles.timeLabel}>Arrival</Text>
          </View>
        </View>
      </View>

      {/* Occupancy Section */}
      <View style={styles.occupancySection}>
        <View style={styles.occupancyInfo}>
          <View style={styles.passengerInfo}>
            <Users size={14} color={colors.textSecondary} />
            <Text style={styles.passengerCount}>
              {trip.bookings}/{trip.capacity} passengers
            </Text>
          </View>
          <Text style={[styles.occupancyPercent, { color: getOccupancyColor() }]}>
            {occupancyPercentage}%
          </Text>
        </View>
        <View style={styles.occupancyBar}>
          <View
            style={[
              styles.occupancyFill,
              { 
                width: `${Math.min(occupancyPercentage, 100)}%`,
                backgroundColor: getOccupancyColor()
              }
            ]}
          />
        </View>
      </View>

      {/* Selection Overlay */}
      {isSelected && (
        <View style={styles.selectedOverlay} />
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  selectedContainer: {
    borderWidth: 2,
    borderColor: colors.primary,
  },
  selectedOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.primary + '10',
    borderRadius: 12,
    pointerEvents: 'none',
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  headerLeft: {
    flex: 1,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  tripId: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: "500",
    marginBottom: 4,
  },
  routeInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  routeName: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
    flex: 1,
  },
  vesselContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 12,
  },
  vesselName: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: "500",
  },
  detailsGrid: {
    gap: 8,
    marginBottom: 12,
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  detailText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  timeContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 8,
    padding: 8,
  },
  timeItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  timeText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
  },
  timeLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginLeft: 2,
  },
  occupancySection: {
    gap: 8,
  },
  occupancyInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  passengerInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  passengerCount: {
    fontSize: 14,
    color: colors.text,
    fontWeight: "500",
  },
  occupancyPercent: {
    fontSize: 14,
    fontWeight: "600",
  },
  occupancyBar: {
    height: 6,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 3,
    overflow: "hidden",
  },
  occupancyFill: {
    height: "100%",
    borderRadius: 3,
  },
  selectionButton: {
    padding: 4,
  },
  // List view styles
  listContainer: {
    backgroundColor: colors.card,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  listContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  listMain: {
    flex: 1,
  },
  listRouteName: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
    flex: 1,
  },
  listDateTime: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  listMeta: {
    alignItems: 'flex-end',
    gap: 4,
  },
  // Compact view styles
  compactContainer: {
    backgroundColor: colors.card,
    borderRadius: 8,
    padding: 10,
    margin: 4,
    minWidth: 140,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
    position: 'relative',
  },
  compactHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  compactTime: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.primary,
  },
  compactRoute: {
    fontSize: 13,
    fontWeight: "500",
    color: colors.text,
    marginBottom: 6,
  },
  compactMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  compactVessel: {
    fontSize: 11,
    color: colors.textSecondary,
    flex: 1,
  },
  compactOccupancy: {
    fontSize: 11,
    fontWeight: "500",
  },
  compactSelection: {
    position: 'absolute',
    top: 4,
    right: 4,
  },
});