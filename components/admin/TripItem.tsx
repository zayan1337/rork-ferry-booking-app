import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { colors } from "@/constants/adminColors";
import { ArrowRight, Calendar, Clock, Ship } from "lucide-react-native";
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
      <View style={styles.header}>
        <Text style={styles.id}>#{trip.id}</Text>
        <StatusBadge status={trip.status} />
      </View>

      <View style={styles.routeContainer}>
        <Text style={styles.routeName}>{trip.routeName}</Text>
        <Text style={styles.vesselName}>{trip.vesselName}</Text>
      </View>

      <View style={styles.timeContainer}>
        <View style={styles.timeBlock}>
          <Text style={styles.time}>{trip.departureTime}</Text>
          <Text style={styles.timeLabel}>Departure</Text>
        </View>

        <ArrowRight size={20} color={colors.textSecondary} />

        <View style={styles.timeBlock}>
          <Text style={styles.time}>{trip.arrivalTime}</Text>
          <Text style={styles.timeLabel}>Arrival</Text>
        </View>
      </View>

      <View style={styles.detailsContainer}>
        <View style={styles.detailItem}>
          <Calendar size={16} color={colors.textSecondary} />
          <Text style={styles.detailText}>{trip.date}</Text>
        </View>

        <View style={styles.detailItem}>
          <Ship size={16} color={colors.textSecondary} />
          <Text style={styles.detailText}>
            {trip.bookings}/{trip.capacity} passengers
          </Text>
        </View>
      </View>

      <View style={styles.occupancyContainer}>
        <View style={styles.occupancyBar}>
          <View
            style={[
              styles.occupancyFill,
              {
                width: `${occupancyPercentage}%`,
                backgroundColor: getOccupancyColor()
              }
            ]}
          />
        </View>
        <Text style={[styles.occupancyText, { color: getOccupancyColor() }]}>
          {occupancyPercentage}% Full
        </Text>
      </View>
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
    elevation: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  id: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: "500",
  },
  routeContainer: {
    marginBottom: 16,
  },
  routeName: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
    marginBottom: 4,
  },
  vesselName: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  timeContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
    paddingHorizontal: 10,
  },
  timeBlock: {
    alignItems: "center",
  },
  time: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
    marginBottom: 4,
  },
  timeLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  detailsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 12,
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 16,
    marginBottom: 8,
  },
  detailText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginLeft: 6,
  },
  occupancyContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  occupancyBar: {
    flex: 1,
    height: 8,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 4,
    marginRight: 10,
    overflow: "hidden",
  },
  occupancyFill: {
    height: "100%",
    borderRadius: 4,
  },
  occupancyText: {
    fontSize: 14,
    fontWeight: "600",
    width: 70,
    textAlign: "right",
  },
});