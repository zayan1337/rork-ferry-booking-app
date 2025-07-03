import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Alert,
  TouchableOpacity,
  Share
} from "react-native";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { useAgentStore } from "@/store/agent/agentStore";
import Colors from "@/constants/colors";
import Card from "@/components/Card";
import Button from "@/components/Button";
import TicketCard from "@/components/TicketCard";
import { getClientDisplayName } from "@/utils/clientUtils";
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Share2,
  Edit,
  XCircle,
  CheckCircle,
  User,
  DollarSign,
  CreditCard,
  Mail,
  Phone,
  Percent
} from "lucide-react-native";

export default function BookingDetailsScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { bookings, clients, cancelBooking, updateBookingStatus } = useAgentStore();
  const [loading, setLoading] = useState(false);

  // Find the booking by id
  const booking = bookings.find(b => b.id === id);

  if (!booking) {
    return (
      <View style={styles.notFoundContainer}>
        <Text style={styles.notFoundText}>Booking not found</Text>
        <Button
          title="Go Back"
          onPress={() => router.back()}
          style={styles.notFoundButton}
        />
      </View>
    );
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatCurrency = (amount: number) => {
    return 'MVR ' + amount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed":
        return Colors.success;
      case "completed":
        return Colors.primary;
      case "cancelled":
        return Colors.error;
      case "modified":
        return Colors.warning;
      case "pending":
        return Colors.inactive;
      default:
        return Colors.inactive;
    }
  };

  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case "confirmed":
        return styles.statusConfirmed;
      case "completed":
        return styles.statusCompleted;
      case "cancelled":
        return styles.statusCancelled;
      case "modified":
        return styles.statusModified;
      case "pending":
        return styles.statusPending;
      default:
        return {};
    }
  };

  const getStatusTextStyle = (status: string) => {
    switch (status) {
      case "confirmed":
        return styles.statusTextConfirmed;
      case "completed":
        return styles.statusTextCompleted;
      case "cancelled":
        return styles.statusTextCancelled;
      case "modified":
        return styles.statusTextModified;
      case "pending":
        return styles.statusTextPending;
      default:
        return {};
    }
  };

  const handleShareTicket = async () => {
    try {
      const shareMessage = 'Ferry Booking #' + String(booking.bookingNumber) + '\n' +
        'From: ' + String(booking.route?.fromIsland?.name || booking.origin) + '\n' +
        'To: ' + String(booking.route?.toIsland?.name || booking.destination) + '\n' +
        'Date: ' + formatDate(booking.departureDate) + '\n' +
        'Time: ' + String(booking.departureTime) + '\n' +
        'Passengers: ' + String(booking.passengers?.length || booking.passengerCount) + '\n' +
        'Client: ' + String(booking.clientName) + '\n' +
        'Agent Booking';

      await Share.share({
        message: shareMessage,
        title: 'Ferry Ticket #' + String(booking.bookingNumber),
      });
    } catch (error) {
      Alert.alert('Error', 'Could not share the ticket');
    }
  };

  const handleModifyBooking = () => {
    // Ensure booking ID is properly formatted
    const bookingId = String(booking.id || '');

    if (!bookingId) {
      Alert.alert('Error', 'Invalid booking ID');
      return;
    }

    // Check if booking is eligible for modification
    const departureDate = new Date(booking.departureDate);
    const now = new Date();
    const hoursDifference = (departureDate.getTime() - now.getTime()) / (1000 * 60 * 60);

    const showTicketSelection = () => {
      if (booking.tripType === 'round_trip' && booking.returnDate) {
        // For round trip, let agent choose which ticket to modify
        Alert.alert(
          "Select Ticket to Modify",
          "Which ticket would you like to modify?",
          [
            {
              text: "Cancel",
              style: "cancel"
            },
            {
              text: "Departure Ticket",
              onPress: () => router.push(`/(agent)/agent-modify-booking/${bookingId}?ticketType=departure` as any)
            },
            {
              text: "Return Ticket",
              onPress: () => router.push(`/(agent)/agent-modify-booking/${bookingId}?ticketType=return` as any)
            }
          ]
        );
      } else {
        // For one-way trip, modify departure ticket
        router.push(`/(agent)/agent-modify-booking/${bookingId}?ticketType=departure` as any);
      }
    };

    if (hoursDifference < 72) {
      Alert.alert(
        "Cannot Modify",
        "Bookings can only be modified at least 72 hours before departure. As an agent, you can override this policy if needed.",
        [
          {
            text: "Cancel",
            style: "cancel"
          },
          {
            text: "Override & Modify",
            onPress: showTicketSelection
          }
        ]
      );
      return;
    }

    showTicketSelection();
  };

  const handleCancelBooking = () => {
    // Ensure booking ID is properly formatted
    const bookingId = String(booking.id || '');

    if (!bookingId) {
      Alert.alert('Error', 'Invalid booking ID');
      return;
    }

    // Check if booking is eligible for cancellation
    const departureDate = new Date(booking.departureDate);
    const now = new Date();
    const hoursDifference = (departureDate.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursDifference < 72) {
      Alert.alert(
        "Cancel Booking",
        "Standard policy requires 72 hours notice for cancellation. As an agent, you can override this policy and process the cancellation with appropriate refund terms.",
        [
          {
            text: "Go Back",
            style: "cancel"
          },
          {
            text: "Process Cancellation",
            onPress: () => router.push(`/(agent)/agent-cancel-booking/${bookingId}` as any)
          }
        ]
      );
      return;
    }

    router.push(`/(agent)/agent-cancel-booking/${bookingId}` as any);
  };

  const handleUpdateStatus = async (status: string) => {
    try {
      await updateBookingStatus(booking.id, status as any);
      Alert.alert("Success", `Booking marked as ${status}`);
    } catch (error) {
      console.error('Error updating booking status:', error);
      Alert.alert('Error', 'Failed to update booking status');
    }
  };

  const isModifiable = () => {
    // Only allow modification for confirmed bookings
    // Modified and completed tickets cannot be modified again
    const allowedStatuses = ['confirmed'];
    return allowedStatuses.includes(String(booking.status));
  };

  const isCancellable = () => {
    // Only allow cancellation for confirmed bookings
    // Modified and completed tickets cannot be cancelled
    const allowedStatuses = ['confirmed'];
    return allowedStatuses.includes(String(booking.status));
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: "Booking Details",
          headerRight: () => (
            <TouchableOpacity
              style={styles.shareButton}
              onPress={handleShareTicket}
            >
              <Share2 size={20} color={Colors.primary} />
            </TouchableOpacity>
          ),
        }}
      />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
      >
        <View style={styles.header}>
          <Text style={styles.bookingNumber}>{'Booking #' + String(booking.bookingNumber || 'N/A')}</Text>
          <View
            style={[
              styles.statusBadge,
              booking.status === 'confirmed' && styles.statusConfirmed,
              booking.status === 'completed' && styles.statusCompleted,
              booking.status === 'cancelled' && styles.statusCancelled,
              booking.status === 'modified' && styles.statusModified,
            ]}
          >
            <Text
              style={[
                styles.statusText,
                booking.status === 'confirmed' && styles.statusTextConfirmed,
                booking.status === 'completed' && styles.statusTextCompleted,
                booking.status === 'cancelled' && styles.statusTextCancelled,
                booking.status === 'modified' && styles.statusTextModified,
              ]}
            >
              {String(booking.status || 'unknown').charAt(0).toUpperCase() + String(booking.status || 'unknown').slice(1)}
            </Text>
          </View>
        </View>

        {/* Ticket Card with QR Code */}
        <TicketCard booking={{
          ...booking,
          totalFare: Number(booking.totalAmount) || 0,
          createdAt: String(booking.bookingDate || new Date().toISOString()),
          bookingNumber: String(booking.bookingNumber || booking.id || 'N/A'),
          tripType: String(booking.tripType || 'one_way'),
          departureTime: String(booking.departureTime || '00:00'),
          route: booking.route || ({
            id: 'unknown',
            fromIsland: { id: 'from', name: String(booking.origin || 'Unknown'), zone: 'A' },
            toIsland: { id: 'to', name: String(booking.destination || 'Unknown'), zone: 'A' },
            baseFare: Number(booking.totalAmount) || 0
          } as any),
          seats: Array.isArray(booking.seats) ? booking.seats : []
        } as any} />

        {/* Booking Details */}
        <Card variant="elevated" style={styles.detailsCard}>
          <Text style={styles.cardTitle}>Trip Details</Text>

          <View style={styles.detailRow}>
            <View style={styles.detailIcon}>
              <Calendar size={20} color={Colors.primary} />
            </View>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Departure Date</Text>
              <Text style={styles.detailValue}>{formatDate(booking.departureDate)}</Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <View style={styles.detailIcon}>
              <Clock size={20} color={Colors.primary} />
            </View>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Departure Time</Text>
              <Text style={styles.detailValue}>{booking.departureTime || 'N/A'}</Text>
            </View>
          </View>

          {booking.tripType === 'round_trip' && booking.returnDate && (
            <>
              <View style={styles.detailRow}>
                <View style={styles.detailIcon}>
                  <Calendar size={20} color={Colors.primary} />
                </View>
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Return Date</Text>
                  <Text style={styles.detailValue}>{formatDate(booking.returnDate)}</Text>
                </View>
              </View>
            </>
          )}

          <View style={styles.detailRow}>
            <View style={styles.detailIcon}>
              <MapPin size={20} color={Colors.primary} />
            </View>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Route</Text>
              <Text style={styles.detailValue}>
                {String(booking.route?.fromIsland?.name || booking.origin || 'Unknown')} → {String(booking.route?.toIsland?.name || booking.destination || 'Unknown')}
              </Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <View style={styles.detailIcon}>
              <MapPin size={20} color={Colors.primary} />
            </View>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Zone</Text>
              <Text style={styles.detailValue}>{String(booking.route?.fromIsland?.zone || 'N/A')}</Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <View style={styles.detailIcon}>
              <Users size={20} color={Colors.primary} />
            </View>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Passengers</Text>
              <Text style={styles.detailValue}>{String(booking.passengers?.length || booking.passengerCount || 0)}</Text>
            </View>
          </View>

          {booking.vessel ? (
            <View style={styles.detailRow}>
              <View style={styles.detailIcon}>
                <MapPin size={20} color={Colors.primary} />
              </View>
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Vessel</Text>
                <Text style={styles.detailValue}>{String(booking.vessel.name || 'N/A')}</Text>
              </View>
            </View>
          ) : null}

          {/* Status History */}
          {booking.status && (
            <View style={styles.detailRow}>
              <View style={styles.detailIcon}>
                <CheckCircle size={20} color={getStatusColor(booking.status)} />
              </View>
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Current Status</Text>
                <View style={[styles.inlineStatusBadge, getStatusBadgeStyle(String(booking.status))]}>
                  <Text style={[styles.inlineStatusText, getStatusTextStyle(String(booking.status))]}>
                    {String(booking.status || 'unknown').charAt(0).toUpperCase() + String(booking.status || 'unknown').slice(1)}
                  </Text>
                </View>
              </View>
            </View>
          )}
        </Card>

        {/* Passenger Details */}
        {(booking.passengers && booking.passengers.length > 0) ? (
          <Card variant="elevated" style={styles.passengersCard}>
            <Text style={styles.cardTitle}>Passenger Details</Text>

            {booking.passengers.map((passenger: any, index) => (
              <View key={index} style={styles.passengerItem}>
                <View style={styles.passengerHeader}>
                  <Text style={styles.passengerName}>
                    {String(passenger.fullName || passenger.passenger_name || 'Passenger ' + (index + 1))}
                  </Text>
                  <Text style={styles.seatNumber}>
                    Seat: {String(booking.seats?.[index]?.number || 'N/A')}
                  </Text>
                </View>

                {(passenger.idNumber || passenger.id_number) && (
                  <Text style={styles.passengerDetail}>
                    ID: {String(passenger.idNumber || passenger.id_number)}
                  </Text>
                )}

                {(passenger.specialAssistance || passenger.special_assistance_request) && (
                  <Text style={styles.passengerDetail}>
                    Special Assistance: {String(passenger.specialAssistance || passenger.special_assistance_request)}
                  </Text>
                )}

                {(passenger.contactNumber || passenger.passenger_contact_number) && (
                  <Text style={styles.passengerDetail}>
                    Contact: {String(passenger.contactNumber || passenger.passenger_contact_number)}
                  </Text>
                )}
              </View>
            ))}
          </Card>
        ) : null}

        {/* Client Information */}
        <Card variant="elevated" style={styles.clientCard}>
          <Text style={styles.cardTitle}>Client Information</Text>

          <View style={styles.detailRow}>
            <View style={styles.detailIcon}>
              <User size={20} color={Colors.primary} />
            </View>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Name</Text>
              <Text style={styles.detailValue}>{getClientDisplayName(booking.clientName, clients)}</Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <View style={styles.detailIcon}>
              <Mail size={20} color={Colors.primary} />
            </View>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Email</Text>
              <Text style={styles.detailValue}>{String(booking.clientEmail || 'N/A')}</Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <View style={styles.detailIcon}>
              <Phone size={20} color={Colors.primary} />
            </View>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Phone</Text>
              <Text style={styles.detailValue}>{String(booking.clientPhone || 'N/A')}</Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <View style={styles.detailIcon}>
              <User size={20} color={Colors.primary} />
            </View>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Account Status</Text>
              <Text style={styles.detailValue}>
                {String(booking.clientHasAccount ? 'Has Account' : 'No Account')}
              </Text>
            </View>
          </View>
        </Card>

        {/* Payment Details */}
        <Card variant="elevated" style={styles.paymentCard}>
          <Text style={styles.cardTitle}>Payment Details</Text>

          <View style={styles.paymentRow}>
            <Text style={styles.paymentLabel}>Original Amount</Text>
            <Text style={styles.paymentValue}>{formatCurrency(Number(booking.totalAmount) || 0)}</Text>
          </View>

          {booking.discountedAmount && Number(booking.discountedAmount) !== Number(booking.totalAmount) && (
            <>
              <View style={styles.paymentRow}>
                <Text style={styles.paymentLabel}>Agent Discount</Text>
                <Text style={[styles.paymentValue, { color: Colors.warning }]}>
                  {((Number(booking.totalAmount) - Number(booking.discountedAmount)) / Number(booking.totalAmount) * 100).toFixed(1)}%
                </Text>
              </View>
              <View style={styles.paymentRow}>
                <Text style={styles.paymentLabel}>Discount Amount</Text>
                <Text style={[styles.paymentValue, { color: Colors.warning }]}>
                  -{formatCurrency(Number(booking.totalAmount) - Number(booking.discountedAmount))}
                </Text>
              </View>
              <View style={styles.paymentRow}>
                <Text style={styles.paymentLabel}>Final Amount</Text>
                <Text style={[styles.paymentValue, { color: Colors.primary, fontWeight: '700' }]}>
                  {formatCurrency(Number(booking.discountedAmount))}
                </Text>
              </View>
            </>
          )}

          <View style={styles.paymentRow}>
            <Text style={styles.paymentLabel}>Payment Method</Text>
            <Text style={styles.paymentValue}>
              {String(booking.paymentMethod) === 'credit' ? 'Agent Credit' :
                String(booking.paymentMethod) === 'free' ? 'Free Ticket' : 'Payment Gateway'}
            </Text>
          </View>

          {booking.payment && (
            <View style={styles.paymentRow}>
              <Text style={styles.paymentLabel}>Payment Status</Text>
              <Text
                style={[
                  styles.paymentValue,
                  String(booking.payment.status) === 'completed' && styles.paymentPaid,
                  String(booking.payment.status) === 'pending' && styles.paymentPending,
                  String(booking.payment.status) === 'failed' && styles.paymentFailed,
                ]}
              >
                {String(booking.payment.status || 'UNKNOWN').toUpperCase()}
              </Text>
            </View>
          )}

          {(booking.commission && Number(booking.commission) > 0) ? (
            <View style={styles.paymentRow}>
              <Text style={styles.paymentLabel}>Agent Commission</Text>
              <Text style={[styles.paymentValue, { color: Colors.secondary, fontWeight: '700' }]}>
                {formatCurrency(Number(booking.commission))}
              </Text>
            </View>
          ) : null}

          <View style={styles.divider} />

          <View style={styles.paymentRow}>
            <Text style={[styles.paymentLabel, { fontSize: 16, fontWeight: '600' }]}>Total Paid</Text>
            <Text style={[styles.paymentValue, { fontSize: 18, fontWeight: '700', color: Colors.primary }]}>
              {formatCurrency(Number(booking.discountedAmount) || Number(booking.totalAmount) || 0)}
            </Text>
          </View>
        </Card>

        {/* Booking Policies */}
        <Card variant="elevated" style={styles.policyCard}>
          <Text style={styles.cardTitle}>Booking Policies</Text>

          <View style={styles.policyItem}>
            <Text style={styles.policyTitle}>Cancellation Policy</Text>
            <Text style={styles.policyText}>
              • Bookings can be cancelled up to 72 hours before departure
            </Text>
            <Text style={styles.policyText}>
              • Cancellation within 72 hours may incur charges
            </Text>
            <Text style={styles.policyText}>
              • No-show bookings are non-refundable
            </Text>
          </View>

          <View style={styles.policyItem}>
            <Text style={styles.policyTitle}>Modification Policy</Text>
            <Text style={styles.policyText}>
              • Bookings can be modified up to 72 hours before departure
            </Text>
            <Text style={styles.policyText}>
              • Subject to seat availability and fare differences
            </Text>
          </View>

          <View style={styles.policyItem}>
            <Text style={styles.policyTitle}>Check-in Information</Text>
            <Text style={styles.policyText}>
              • Check-in opens 2 hours before departure
            </Text>
            <Text style={styles.policyText}>
              • Please arrive at least 30 minutes before departure
            </Text>
            <Text style={styles.policyText}>
              • Present this QR code ticket at check-in
            </Text>
          </View>
        </Card>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <Button
            title="Share Ticket"
            onPress={handleShareTicket}
            variant="outline"
            style={styles.actionButton}
            textStyle={styles.actionButtonText}
          />

          {isModifiable() && (
            <Button
              title="Modify Booking"
              onPress={handleModifyBooking}
              variant="outline"
              style={styles.actionButton}
              textStyle={styles.modifyButtonText}
            />
          )}

          {isCancellable() && (
            <Button
              title="Cancel Booking"
              onPress={handleCancelBooking}
              variant="outline"
              style={styles.actionButton}
              textStyle={styles.cancelButtonText}
              loading={loading}
            />
          )}

          {String(booking.status) === "confirmed" && (
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
                      onPress: () => handleUpdateStatus("completed"),
                    },
                  ]
                );
              }}
              variant="secondary"
              style={styles.actionButton}
            />
          )}


        </View>

        <Text style={styles.bookingId}>Booking ID: {String(booking.id || 'N/A')}</Text>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  notFoundContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  notFoundText: {
    fontSize: 18,
    color: Colors.text,
    marginBottom: 20,
  },
  notFoundButton: {
    minWidth: 120,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  bookingNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: Colors.inactive,
  },
  statusConfirmed: {
    backgroundColor: '#e8f5e9',
  },
  statusCompleted: {
    backgroundColor: '#e3f2fd',
  },
  statusCancelled: {
    backgroundColor: '#ffebee',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  statusTextConfirmed: {
    color: Colors.success,
  },
  statusTextCompleted: {
    color: Colors.primary,
  },
  statusTextCancelled: {
    color: Colors.error,
  },
  shareButton: {
    padding: 8,
  },
  detailsCard: {
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  detailIcon: {
    width: 40,
    alignItems: 'center',
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 16,
    color: Colors.text,
  },
  passengersCard: {
    marginBottom: 16,
  },
  passengerItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  passengerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  passengerName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  seatNumber: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '600',
  },
  passengerDetail: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  clientCard: {
    marginBottom: 16,
  },
  paymentCard: {
    marginBottom: 24,
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  paymentLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  paymentValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  paymentPaid: {
    color: Colors.success,
  },
  paymentPending: {
    color: Colors.warning,
  },
  paymentFailed: {
    color: Colors.error,
  },
  actionButtons: {
    marginBottom: 16,
  },
  actionButton: {
    marginBottom: 12,
  },
  actionButtonText: {
    color: Colors.primary,
  },
  modifyButtonText: {
    color: Colors.secondary,
  },
  cancelButtonText: {
    color: Colors.error,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 16,
  },
  policyCard: {
    marginBottom: 16,
  },
  policyItem: {
    marginBottom: 16,
  },
  policyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  policyText: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 4,
    lineHeight: 20,
  },
  bookingId: {
    textAlign: 'center',
    color: Colors.textSecondary,
    fontSize: 12,
    marginBottom: 24,
  },
  inlineStatusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  inlineStatusText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  statusModified: {
    backgroundColor: '#fff9c4',
  },
  statusPending: {
    backgroundColor: '#fff9c4',
  },
  statusTextModified: {
    color: Colors.warning,
  },
  statusTextPending: {
    color: Colors.warning,
  },
});