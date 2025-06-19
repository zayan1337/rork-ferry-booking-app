import React, { useState } from "react";
import { StyleSheet, Text, View, ScrollView, Alert, TouchableOpacity } from "react-native";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { useAgentStore } from "@/store/agentStore";
import Colors from "@/constants/colors";
import Card from "@/components/Card";
import Button from "@/components/Button";
import {
  Calendar,
  MapPin,
  User,
  DollarSign,
  CreditCard,
  Mail,
  Phone,
  Edit,
  XCircle,
  Clock,
  CheckCircle
} from "lucide-react-native";

export default function BookingDetailsScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { bookings, cancelBooking, updateBookingStatus, clients } = useAgentStore();
  const [loading, setLoading] = useState(false);
  const booking = bookings.find(b => b.id === id);
  const client = clients.find(c => c.id === booking?.clientId);

  if (!booking) {
    return (
      <View style={styles.notFoundContainer}>
        <Text style={styles.notFoundText}>Booking not found</Text>
        <Button
          title="Go Back"
          onPress={() => router.back()}
          variant="primary"
        />
      </View>
    );
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatCurrency = (amount: number) => {
    return `$${amount.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed":
        return Colors.primary;
      case "completed":
        return Colors.success;
      case "cancelled":
        return Colors.error;
      default:
        return Colors.inactive;
    }
  };

  const handleModifyBooking = () => {
    // In a real app, this would navigate to a modification form
    Alert.alert(
      "Modify Booking",
      "This would open a form to modify the booking details.",
      [{ text: "OK" }]
    );
  };

  const handleCancelBooking = () => {
    Alert.alert(
      "Cancel Booking",
      "Are you sure you want to cancel this booking? This action cannot be undone.",
      [
        {
          text: "No",
          style: "cancel",
        },
        {
          text: "Yes, Cancel",
          onPress: () => {
            setLoading(true);
            // In a real app, this would make an API call to cancel the booking
            setTimeout(() => {
              setLoading(false);
              Alert.alert(
                "Booking Cancelled",
                "The booking has been successfully cancelled.",
                [
                  {
                    text: "OK",
                    onPress: async () => {
                      await cancelBooking(booking.id);
                      router.back()
                    },
                  },
                ]
              );
            }, 1000);
          },
          style: "destructive",
        },
      ]
    );
  };

  const handleViewClient = () => {
    if (client) {
      router.push(`../client/${client.id}`);
    }
  };

  // const handleCancelBooking = async () => {
  //   try {
  //     await cancelBooking(booking.id);
  //     router.back();
  //   } catch (error) {
  //     console.error('Error cancelling booking:', error);
  //   }
  // };

  const handleUpdateStatus = async (status: typeof booking.status) => {
    try {
      await updateBookingStatus(booking.id, status);
    } catch (error) {
      console.error('Error updating booking status:', error);
    }
  };
  return (
    <>
      <Stack.Screen
        options={{
          title: "Booking Details",
          headerRight: () => (
            <TouchableOpacity
              style={styles.editButton}
              onPress={handleModifyBooking}
              disabled={booking.status === "cancelled"}
            >
              <Edit size={20} color={booking.status === "cancelled" ? Colors.inactive : Colors.primary} />
            </TouchableOpacity>
          ),
        }}
      />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View style={styles.routeContainer}>
            <Text style={styles.routeText}>
              {booking.origin} → {booking.destination}
            </Text>
          </View>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: getStatusColor(booking.status) },
            ]}
          >
            <Text style={styles.statusText}>
              {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
            </Text>
          </View>
        </View>

        <Card variant="elevated" style={styles.detailsCard}>
          <Text style={styles.sectionTitle}>Trip Details</Text>

          <View style={styles.detailRow}>
            <Calendar size={20} color={Colors.subtext} />
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Departure Date</Text>
              <Text style={styles.detailValue}>{formatDate(booking.departureDate)}</Text>
            </View>
          </View>

          {booking.returnDate && (
            <View style={styles.detailRow}>
              <Calendar size={20} color={Colors.subtext} />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Return Date</Text>
                <Text style={styles.detailValue}>{formatDate(booking.returnDate)}</Text>
              </View>
            </View>
          )}

          <View style={styles.detailRow}>
            <MapPin size={20} color={Colors.subtext} />
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Origin</Text>
              <Text style={styles.detailValue}>{booking.origin}</Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <MapPin size={20} color={Colors.subtext} />
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Destination</Text>
              <Text style={styles.detailValue}>{booking.destination}</Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <User size={20} color={Colors.subtext} />
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Passengers</Text>
              <Text style={styles.detailValue}>{booking.passengerCount}</Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <Clock size={20} color={Colors.subtext} />
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Booking Date</Text>
              <Text style={styles.detailValue}>{formatDate(booking.bookingDate)}</Text>
            </View>
          </View>
        </Card>

        <Card variant="elevated" style={styles.paymentCard}>
          <Text style={styles.sectionTitle}>Payment Details</Text>

          <View style={styles.detailRow}>
            <DollarSign size={20} color={Colors.subtext} />
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Original Price</Text>
              <Text style={styles.detailValue}>{formatCurrency(booking.totalAmount)}</Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <Percent size={20} color={Colors.subtext} />
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Discounted Price</Text>
              <Text style={[styles.detailValue, { color: Colors.primary }]}>
                {formatCurrency(booking.discountedAmount)}
              </Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <CreditCard size={20} color={Colors.subtext} />
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Payment Method</Text>
              <Text style={styles.detailValue}>
                {booking.paymentMethod === "credit"
                  ? "Agent Credit"
                  : booking.paymentMethod === "free"
                    ? "Free Ticket"
                    : "Payment Gateway"}
              </Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <DollarSign size={20} color={Colors.subtext} />
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Commission</Text>
              <Text style={[styles.detailValue, { color: Colors.secondary }]}>
                {formatCurrency(booking.commission)}
              </Text>
            </View>
          </View>
        </Card>

        <Card variant="outlined" style={styles.clientCard}>
          <View style={styles.clientHeader}>
            <Text style={styles.sectionTitle}>Client Information</Text>
            <TouchableOpacity onPress={handleViewClient}>
              <Text style={styles.viewClientText}>View Client</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.detailRow}>
            <User size={20} color={Colors.subtext} />
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Name</Text>
              <Text style={styles.detailValue}>{client?.name}</Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <Mail size={20} color={Colors.subtext} />
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Email</Text>
              <Text style={styles.detailValue}>{client?.email}</Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <Phone size={20} color={Colors.subtext} />
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Phone</Text>
              <Text style={styles.detailValue}>{client?.phone}</Text>
            </View>
          </View>
        </Card>

        {booking.status === "confirmed" && (
          <View style={styles.actionsContainer}>
            <Button
              title="Modify Booking"
              onPress={handleModifyBooking}
              variant="primary"
              icon={<Edit size={20} color="white" />}
              style={styles.actionButton}
            />
            <Button
              title="Cancel Booking"
              onPress={handleCancelBooking}
              variant="outline"
              loading={loading}
              icon={<XCircle size={20} color={Colors.primary} />}
              style={styles.actionButton}
            />
          </View>
        )}

        {booking.status === "confirmed" && (
          <Button
            title="Mark as Completed"
            onPress={() => {
              Alert.alert(
                "Mark as Completed",
                "Are you sure you want to mark this booking as completed?",
                [
                  {
                    text: "Cancel",
                    style: "cancel",
                  },
                  {
                    text: "Confirm",
                    onPress: () => {
                      // In a real app, this would make an API call
                      Alert.alert("Success", "Booking marked as completed");
                    },
                  },
                ]
              );
            }}
            variant="secondary"
            icon={<CheckCircle size={20} color="white" />}
            style={styles.completeButton}
          />
        )}

        <Text style={styles.bookingId}>Booking ID: {booking.id}</Text>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: 16,
  },
  notFoundContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  notFoundText: {
    fontSize: 18,
    color: Colors.subtext,
    marginBottom: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  routeContainer: {
    flex: 1,
  },
  routeText: {
    fontSize: 24,
    fontWeight: "bold",
    color: Colors.text,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  statusText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
  detailsCard: {
    marginBottom: 16,
  },
  paymentCard: {
    marginBottom: 16,
  },
  clientCard: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: Colors.text,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  detailContent: {
    marginLeft: 12,
    flex: 1,
  },
  detailLabel: {
    fontSize: 14,
    color: Colors.subtext,
  },
  detailValue: {
    fontSize: 16,
    color: Colors.text,
    fontWeight: "500",
  },
  clientHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  viewClientText: {
    color: Colors.primary,
    fontWeight: "500",
  },
  actionsContainer: {
    flexDirection: "row",
    marginBottom: 16,
  },
  actionButton: {
    flex: 1,
    marginHorizontal: 4,
  },
  completeButton: {
    marginBottom: 16,
  },
  bookingId: {
    textAlign: "center",
    color: Colors.subtext,
    marginBottom: 24,
  },
  editButton: {
    padding: 8,
  },
});

function Percent({ size, color }: { size: number; color: string }) {
  return (
    <Text style={{ fontSize: size, color, fontWeight: "bold" }}>%</Text>
  );
}