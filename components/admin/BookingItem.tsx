import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { colors } from "@/constants/adminColors";
import { Calendar, Clock, Users } from "lucide-react-native";
import StatusBadge from "./StatusBadge";
import { Booking } from "@/types/admin";

interface BookingItemProps {
  booking: Booking;
  onPress?: () => void;
}

export default function BookingItem({ booking, onPress }: BookingItemProps) {
  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.header}>
        <Text style={styles.id}>#{booking.id}</Text>
        <StatusBadge status={booking.status} />
      </View>

      <Text style={styles.routeName}>{booking.routeName}</Text>
      <Text style={styles.customerName}>{booking.customerName}</Text>

      <View style={styles.detailsContainer}>
        <View style={styles.detailItem}>
          <Calendar size={16} color={colors.textSecondary} />
          <Text style={styles.detailText}>{booking.date}</Text>
        </View>

        <View style={styles.detailItem}>
          <Clock size={16} color={colors.textSecondary} />
          <Text style={styles.detailText}>{booking.departureTime}</Text>
        </View>

        <View style={styles.detailItem}>
          <Users size={16} color={colors.textSecondary} />
          <Text style={styles.detailText}>{booking.passengers} passengers</Text>
        </View>
      </View>

      <View style={styles.footer}>
        <StatusBadge status={booking.paymentStatus} size="small" />
        <Text style={styles.amount}>${booking.totalAmount}</Text>
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
  routeName: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
    marginBottom: 4,
  },
  customerName: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 12,
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
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  amount: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.primary,
  },
});