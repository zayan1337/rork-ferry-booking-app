import React from "react";
import { StyleSheet, Text, View, ScrollView } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useAgentStore } from "@/store/agentStore";
import Colors from "@/constants/colors";
import Card from "@/components/Card";
import Button from "@/components/Button";
import { Calendar, MapPin, User, DollarSign, CreditCard } from "lucide-react-native";

export default function BookingDetailsScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { bookings, cancelBooking, updateBookingStatus } = useAgentStore();

  const booking = bookings.find(b => b.id === id);

  if (!booking) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Booking not found</Text>
      </View>
    );
  }

  const formatCurrency = (amount: number) => {
    return `$${amount.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const handleCancelBooking = async () => {
    try {
      await cancelBooking(booking.id);
      router.back();
    } catch (error) {
      console.error('Error cancelling booking:', error);
    }
  };

  const handleUpdateStatus = async (status: typeof booking.status) => {
    try {
      await updateBookingStatus(booking.id, status);
    } catch (error) {
      console.error('Error updating booking status:', error);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Card variant="elevated" style={styles.detailsCard}>
        <Text style={styles.title}>Booking Details</Text>
        <Text style={styles.bookingId}>ID: {booking.id}</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Route Information</Text>
          <View style={styles.routeContainer}>
            <MapPin size={16} color={Colors.primary} />
            <Text style={styles.routeText}>
              {booking.origin} → {booking.destination}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Travel Dates</Text>
          <View style={styles.dateContainer}>
            <Calendar size={16} color={Colors.primary} />
            <Text style={styles.dateText}>
              Departure: {formatDate(booking.departureDate)}
            </Text>
          </View>
          {booking.returnDate && (
            <View style={styles.dateContainer}>
              <Calendar size={16} color={Colors.primary} />
              <Text style={styles.dateText}>
                Return: {formatDate(booking.returnDate)}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Passenger Information</Text>
          <View style={styles.passengerContainer}>
            <User size={16} color={Colors.primary} />
            <Text style={styles.passengerText}>
              {booking.passengerCount} {booking.passengerCount === 1 ? 'passenger' : 'passengers'}
            </Text>
          </View>
          <Text style={styles.clientName}>Client: {booking.clientName}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Information</Text>
          <View style={styles.priceContainer}>
            <DollarSign size={16} color={Colors.primary} />
            <View>
              <Text style={styles.priceText}>
                Total: {formatCurrency(booking.discountedAmount)}
              </Text>
              {booking.discountedAmount !== booking.totalAmount && (
                <Text style={styles.originalPrice}>
                  Original: {formatCurrency(booking.totalAmount)}
                </Text>
              )}
            </View>
          </View>
          <View style={styles.paymentContainer}>
            <CreditCard size={16} color={Colors.primary} />
            <Text style={styles.paymentText}>
              Payment: {booking.paymentMethod.charAt(0).toUpperCase() + booking.paymentMethod.slice(1)}
            </Text>
          </View>
        </View>

        <View style={styles.statusContainer}>
          <Text style={styles.statusLabel}>Status:</Text>
          <Text style={[styles.statusText, {
            color: booking.status === 'confirmed' ? Colors.primary :
              booking.status === 'completed' ? Colors.success :
                booking.status === 'cancelled' ? Colors.error : Colors.inactive
          }]}>
            {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
          </Text>
        </View>

        {booking.status === 'confirmed' && (
          <View style={styles.actionButtons}>
            <Button
              title="Mark Complete"
              onPress={() => handleUpdateStatus('completed')}
              variant="primary"
              style={styles.actionButton}
            />
            <Button
              title="Cancel Booking"
              onPress={handleCancelBooking}
              variant="outline"
              style={styles.cancelButton}
            />
          </View>
        )}
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    padding: 16,
  },
  detailsCard: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: Colors.text,
    marginBottom: 8,
  },
  bookingId: {
    fontSize: 14,
    color: Colors.subtext,
    marginBottom: 20,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.text,
    marginBottom: 8,
  },
  routeContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  routeText: {
    fontSize: 16,
    color: Colors.text,
    marginLeft: 8,
  },
  dateContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  dateText: {
    fontSize: 14,
    color: Colors.text,
    marginLeft: 8,
  },
  passengerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  passengerText: {
    fontSize: 14,
    color: Colors.text,
    marginLeft: 8,
  },
  clientName: {
    fontSize: 14,
    color: Colors.subtext,
    marginTop: 4,
  },
  priceContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  priceText: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.text,
    marginLeft: 8,
  },
  originalPrice: {
    fontSize: 14,
    color: Colors.subtext,
    textDecorationLine: "line-through",
    marginLeft: 8,
  },
  paymentContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  paymentText: {
    fontSize: 14,
    color: Colors.text,
    marginLeft: 8,
  },
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  statusLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.text,
    marginRight: 8,
  },
  statusText: {
    fontSize: 16,
    fontWeight: "600",
  },
  actionButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  actionButton: {
    flex: 1,
    marginHorizontal: 8,
  },
  cancelButton: {
    flex: 1,
    marginHorizontal: 8,
    borderColor: Colors.error,
  },
  errorText: {
    fontSize: 16,
    color: Colors.error,
    textAlign: "center",
    marginTop: 40,
  },
});