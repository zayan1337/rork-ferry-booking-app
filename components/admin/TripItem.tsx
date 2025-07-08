import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { colors } from "@/constants/adminColors";
import { ArrowRight, Calendar, Clock, Ship } from "lucide-react-native";
import StatusBadge from "./StatusBadge";
import { AdminTrip } from "@/types/admin";

interface TripItemProps {
  trip: AdminTrip;
  onPress?: () => void;
}

export default function TripItem({ trip, onPress }: TripItemProps) {
  const occupancyPercentage = Math.round(
    ((trip.vessel_capacity - trip.available_seats) / trip.vessel_capacity) * 100
  );

  const getOccupancyColor = () => {
    if (occupancyPercentage >= 90) return colors.danger;
    if (occupancyPercentage >= 70) return colors.warning;
    return colors.success;
  };

  // Calculate estimated arrival time (departure + 2 hours as default)
  const getArrivalTime = () => {
    try {
      const [hours, minutes] = trip.departure_time.split(':');
      const departureDate = new Date();
      departureDate.setHours(parseInt(hours), parseInt(minutes));
      departureDate.setHours(departureDate.getHours() + 2); // Assume 2-hour journey
      return departureDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return "TBD";
    }
  };

  // Format date for display
  const formatDate = () => {
    try {
      const date = new Date(trip.travel_date);
      return date.toLocaleDateString([], { 
        month: 'short', 
        day: 'numeric',
        year: 'numeric' 
      });
    } catch {
      return trip.travel_date;
    }
  };

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.header}>
        <Text style={styles.id}>#{trip.id.slice(-8)}</Text>
        <StatusBadge status={trip.status || 'scheduled'} />
      </View>

      <View style={styles.routeContainer}>
        <Text style={styles.routeName}>
          {trip.route_name || `${trip.from_island_name} to ${trip.to_island_name}`}
        </Text>
        <Text style={styles.vesselName}>{trip.vessel_name}</Text>
      </View>

      <View style={styles.timeContainer}>
        <View style={styles.timeBlock}>
          <Text style={styles.time}>{trip.departure_time}</Text>
          <Text style={styles.timeLabel}>Departure</Text>
        </View>

        <ArrowRight size={20} color={colors.textSecondary} />

        <View style={styles.timeBlock}>
          <Text style={styles.time}>{getArrivalTime()}</Text>
          <Text style={styles.timeLabel}>Arrival</Text>
        </View>
      </View>

      <View style={styles.detailsContainer}>
        <View style={styles.detailItem}>
          <Calendar size={16} color={colors.textSecondary} />
          <Text style={styles.detailText}>{formatDate()}</Text>
        </View>

        <View style={styles.detailItem}>
          <Ship size={16} color={colors.textSecondary} />
          <Text style={styles.detailText}>
            {trip.vessel_capacity - trip.available_seats}/{trip.vessel_capacity} passengers
          </Text>
        </View>

        {trip.revenue && (
          <View style={styles.detailItem}>
            <Text style={styles.detailText}>
              MVR {trip.revenue.toLocaleString()}
            </Text>
          </View>
        )}
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
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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