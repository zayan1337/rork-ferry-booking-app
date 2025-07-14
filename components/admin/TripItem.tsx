import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { colors } from "@/constants/adminColors";
import { ArrowRight, Calendar, Clock, Ship, MapPin } from "lucide-react-native";
import StatusBadge from "./StatusBadge";
import { Trip } from "@/types/admin";

interface TripItemProps {
  trip: Trip;
  onPress?: () => void;
}

export default function TripItem({ trip, onPress }: TripItemProps) {
  const occupancyPercentage = Math.round((trip.bookings / trip.capacity) * 100);

  const getOccupancyColor = () => {
    if (occupancyPercentage >= 90) return colors.danger;
    if (occupancyPercentage >= 70) return colors.warning;
    return colors.success;
  };

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.7}>
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
        <StatusBadge status={trip.status} size="small" />
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
            <Clock size={14} color={colors.primary} />
            <Text style={styles.timeText}>{trip.departureTime}</Text>
            <Text style={styles.timeLabel}>Dep</Text>
          </View>

          <ArrowRight size={14} color={colors.textSecondary} />

          <View style={styles.timeItem}>
            <Clock size={14} color={colors.secondary} />
            <Text style={styles.timeText}>{trip.arrivalTime}</Text>
            <Text style={styles.timeLabel}>Arr</Text>
          </View>
        </View>
      </View>

      {/* Occupancy Info */}
      <View style={styles.occupancySection}>
        <View style={styles.occupancyInfo}>
          <Text style={styles.passengerCount}>
            {trip.bookings}/{trip.capacity} passengers
          </Text>
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
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
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
});