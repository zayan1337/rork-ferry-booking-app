import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Share2,
  X,
  AlertCircle,
  Info,
  Phone,
  Luggage,
  FileText,
  DollarSign,
  Globe,
  Timer,
  ChevronDown,
  ChevronUp,
} from 'lucide-react-native';
import { useUserBookingsStore } from '@/store/userBookingsStore';
import { useBookingEligibility } from '@/hooks/useBookingEligibility';
import Colors from '@/constants/colors';
import Card from '@/components/Card';
import Button from '@/components/Button';
import TicketCard from '@/components/TicketCard';
import TicketDesign from '@/components/TicketDesign';
import { shareBookingTicket } from '@/utils/shareUtils';
import { formatBookingDate, formatTimeAMPM } from '@/utils/dateUtils';
import { formatPaymentMethod } from '@/utils/paymentUtils';
import { useAlertContext } from '@/components/AlertProvider';

export default function BookingDetailsScreen() {
  const { id } = useLocalSearchParams();
  const { bookings, fetchUserBookings } = useUserBookingsStore();
  const { showError, showInfo } = useAlertContext();
  const ticketDesignRef = useRef<any>(null);
  const imageGenerationTicketRef = useRef<any>(null); // Separate ref for image generation
  const [showTicketPopup, setShowTicketPopup] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [expandedPolicies, setExpandedPolicies] = useState<{
    checkin: boolean;
    luggage: boolean;
    cancellation: boolean;
    refund: boolean;
    conditions: boolean;
  }>({
    checkin: false,
    luggage: false,
    cancellation: false,
    refund: false,
    conditions: false,
  });

  // Ensure bookings are loaded when component mounts
  useEffect(() => {
    if (bookings.length === 0) {
      fetchUserBookings();
    }
  }, [fetchUserBookings, bookings.length]);

  // Find the booking by id with proper type handling
  const booking = bookings.find(b => String(b.id) === String(id)) ?? null;

  // Use booking eligibility hook
  const { isModifiable, isCancellable, message } = useBookingEligibility({
    booking,
  });

  if (!booking) {
    return (
      <View style={styles.notFoundContainer}>
        <Text style={styles.notFoundText}>Booking not found</Text>
        <Button
          title='Go Back'
          onPress={() => router.back()}
          style={styles.notFoundButton}
        />
      </View>
    );
  }

  const handleShareTicket = () => {
    setShowTicketPopup(true);
  };

  const handleShareIconPress = async () => {
    try {
      setIsSharing(true);

      // Small delay to ensure component is ready
      await new Promise(resolve => setTimeout(resolve, 300));

      // Use the robust shareUtils function with image generation TicketDesign ref
      await shareBookingTicket(booking, imageGenerationTicketRef, showError);

      setShowTicketPopup(false);
    } catch (error) {
      showError('Sharing Error', 'Failed to share ticket. Please try again.');
    } finally {
      setIsSharing(false);
    }
  };

  const handleCloseTicketPopup = () => {
    setShowTicketPopup(false);
  };

  const handleModifyBooking = () => {
    if (!isModifiable) {
      showInfo(
        'Cannot Modify',
        'Bookings can only be modified at least 72 hours before departure time.'
      );
      return;
    }

    router.push(`/modify-booking/${booking.id}`);
  };

  const handleCancelBooking = () => {
    if (!isCancellable) {
      showInfo(
        'Cannot Cancel',
        'Bookings can only be cancelled at least 48 hours before departure time.'
      );
      return;
    }

    router.push(`/cancel-booking/${booking.id}`);
  };

  const togglePolicySection = (section: keyof typeof expandedPolicies) => {
    setExpandedPolicies(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const renderBookingDetails = () => (
    <Card variant='elevated' style={styles.detailsCard}>
      <Text style={styles.cardTitle}>Booking Details</Text>

      <View style={styles.detailRow}>
        <View style={styles.detailIcon}>
          <Calendar size={20} color={Colors.primary} />
        </View>
        <View style={styles.detailContent}>
          <Text style={styles.detailLabel}>Departure Date</Text>
          <Text style={styles.detailValue}>
            {formatBookingDate(booking.departureDate)}
          </Text>
        </View>
      </View>

      <View style={styles.detailRow}>
        <View style={styles.detailIcon}>
          <Clock size={20} color={Colors.primary} />
        </View>
        <View style={styles.detailContent}>
          <Text style={styles.detailLabel}>Departure Time</Text>
          <Text style={styles.detailValue}>
            {booking.departureTime
              ? formatTimeAMPM(booking.departureTime)
              : '-'}
          </Text>
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
              <Text style={styles.detailValue}>
                {formatBookingDate(booking.returnDate)}
              </Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <View style={styles.detailIcon}>
              <Clock size={20} color={Colors.primary} />
            </View>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Return Time</Text>
              <Text style={styles.detailValue}>
                {booking.returnTime ? formatTimeAMPM(booking.returnTime) : '-'}
              </Text>
            </View>
          </View>
        </>
      )}

      {/* <View style={styles.detailRow}>
        <View style={styles.detailIcon}>
          <MapPin size={20} color={Colors.primary} />
        </View>
        <View style={styles.detailContent}>
          <Text style={styles.detailLabel}>Pickup</Text>
          <Text style={styles.detailValue}>
            {booking.route.fromIsland.name}
          </Text>
        </View>
      </View>

      <View style={styles.detailRow}>
        <View style={styles.detailIcon}>
          <MapPin size={20} color={Colors.primary} />
        </View>
        <View style={styles.detailContent}>
          <Text style={styles.detailLabel}>Dropoff</Text>
          <Text style={styles.detailValue}>{booking.route.toIsland.name}</Text>
        </View>
      </View> */}

      {booking.tripType === 'round_trip' && booking.returnRoute && (
        <>
          <View style={styles.detailRow}>
            <View style={styles.detailIcon}>
              <MapPin size={20} color={Colors.primary} />
            </View>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Return Pickup</Text>
              <Text style={styles.detailValue}>
                {booking.returnRoute.fromIsland.name}
              </Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <View style={styles.detailIcon}>
              <MapPin size={20} color={Colors.primary} />
            </View>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Return Dropoff</Text>
              <Text style={styles.detailValue}>
                {booking.returnRoute.toIsland.name}
              </Text>
            </View>
          </View>
        </>
      )}

      <View style={styles.detailRow}>
        <View style={styles.detailIcon}>
          <Users size={20} color={Colors.primary} />
        </View>
        <View style={styles.detailContent}>
          <Text style={styles.detailLabel}>Passengers</Text>
          <Text style={styles.detailValue}>{booking.passengers.length}</Text>
        </View>
      </View>
    </Card>
  );

  const renderPassengerDetails = () => (
    <Card variant='elevated' style={styles.passengersCard}>
      <Text style={styles.cardTitle}>Passenger Details</Text>

      {booking.passengers.map((passenger, index) => (
        <View key={index} style={styles.passengerItem}>
          <View style={styles.passengerHeader}>
            <Text style={styles.passengerName}>{passenger.fullName}</Text>
            <Text style={styles.seatNumber}>
              Seat: {booking.seats[index]?.number}
            </Text>
          </View>

          {passenger.idNumber && (
            <Text style={styles.passengerDetail}>ID: {passenger.idNumber}</Text>
          )}

          {passenger.phoneNumber && (
            <Text style={styles.passengerDetail}>
              Phone: {passenger.phoneNumber}
            </Text>
          )}

          {passenger.specialAssistance && (
            <Text style={styles.passengerDetail}>
              Special Assistance: {passenger.specialAssistance}
            </Text>
          )}
        </View>
      ))}
    </Card>
  );

  const renderPaymentDetails = () => (
    <Card variant='elevated' style={styles.paymentCard}>
      <Text style={styles.cardTitle}>Payment Details</Text>

      {booking.payment ? (
        <>
          <View style={styles.paymentRow}>
            <Text style={styles.paymentLabel}>Payment Method</Text>
            <Text style={styles.paymentValue}>
              {formatPaymentMethod(booking.payment.method)}
            </Text>
          </View>

          <View style={styles.paymentRow}>
            <Text style={styles.paymentLabel}>Payment Status</Text>
            <Text
              style={[
                styles.paymentValue,
                booking.payment.status === 'completed' && styles.paymentPaid,
                booking.payment.status === 'pending' && styles.paymentPending,
                booking.payment.status === 'failed' && styles.paymentFailed,
              ]}
            >
              {booking.payment.status.toUpperCase()}
            </Text>
          </View>
        </>
      ) : (
        <Text style={styles.paymentValue}>
          No payment information available
        </Text>
      )}

      <View style={styles.paymentRow}>
        <Text style={styles.paymentLabel}>Total Amount</Text>
        <Text style={styles.totalAmount}>
          MVR {booking.totalFare.toFixed(2)}
        </Text>
      </View>
    </Card>
  );

  const renderPoliciesAndConditions = () => (
    <Card variant='elevated' style={styles.policiesCard}>
      <Text style={styles.cardTitle}>Important Information & Policies</Text>

      {/* Check-in & Boarding */}
      <View style={styles.policySection}>
        <Pressable
          style={styles.policySectionHeader}
          onPress={() => togglePolicySection('checkin')}
        >
          <Timer size={18} color={Colors.primary} />
          <Text style={styles.policySectionTitle}>Check-in & Boarding</Text>
          {expandedPolicies.checkin ? (
            <ChevronUp size={18} color={Colors.primary} />
          ) : (
            <ChevronDown size={18} color={Colors.primary} />
          )}
        </Pressable>
        <Text style={styles.policyText}>
          Check-in: 30 min before departure • Boarding: 10 min before departure
        </Text>
        {expandedPolicies.checkin && (
          <View style={styles.expandedContent}>
            <Text style={styles.policyText}>
              Passengers must check in at least 30 minutes before departure time
              at the jetty and be at the boarding gate at least 10 minutes
              before departure time at the ferry. Late arrivals may result in
              denied boarding without refund.
            </Text>
          </View>
        )}
      </View>

      {/* Luggage Policy */}
      <View style={styles.policySection}>
        <Pressable
          style={styles.policySectionHeader}
          onPress={() => togglePolicySection('luggage')}
        >
          <Luggage size={18} color={Colors.primary} />
          <Text style={styles.policySectionTitle}>Luggage Policy</Text>
          {expandedPolicies.luggage ? (
            <ChevronUp size={18} color={Colors.primary} />
          ) : (
            <ChevronDown size={18} color={Colors.primary} />
          )}
        </Pressable>
        <Text style={styles.policyText}>
          1 luggage per ticket • 1 handbag per ticket • Prohibited items apply
        </Text>
        {expandedPolicies.luggage && (
          <View style={styles.expandedContent}>
            <View style={styles.policyList}>
              <Text style={styles.policyListItem}>
                • 1 luggage per ticket: Max 15kg, dimensions 67x43x26cm
              </Text>
              <Text style={styles.policyListItem}>
                • 1 handbag per ticket: Max 5kg, dimensions 25x20x6cm
              </Text>
              <Text style={styles.policyListItem}>
                • Large/excessively long articles (fishing rods, poles, pipes,
                tubes) not allowed
              </Text>
              <Text style={styles.policyListItem}>
                • Prohibited: Chemicals, aerosols, alcohol, drugs, sharp
                objects, weapons, ammunition, valuables, fragile articles,
                dangerous goods
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* Cancellation & Modification Policy */}
      <View style={styles.policySection}>
        <Pressable
          style={styles.policySectionHeader}
          onPress={() => togglePolicySection('cancellation')}
        >
          <FileText size={18} color={Colors.primary} />
          <Text style={styles.policySectionTitle}>
            Cancellation & Modification
          </Text>
          {expandedPolicies.cancellation ? (
            <ChevronUp size={18} color={Colors.primary} />
          ) : (
            <ChevronDown size={18} color={Colors.primary} />
          )}
        </Pressable>
        <Text style={styles.policyText}>
          Cancel: 48+ hrs allowed • Modify: 72+ hrs • 50% charge applies
        </Text>
        {expandedPolicies.cancellation && (
          <View style={styles.expandedContent}>
            <View style={styles.policyList}>
              <Text style={styles.policyListItem}>
                • Cancellation allowed: 48+ hours before departure
              </Text>
              <Text style={styles.policyListItem}>
                • Cancellation not possible: Less than 72 hours before departure
              </Text>
              <Text style={styles.policyListItem}>
                • Cancellation charge: 50% of ticket fare
              </Text>
              <Text style={styles.policyListItem}>
                • Modification allowed: 72+ hours before departure
              </Text>
              <Text style={styles.policyListItem}>
                • No refund for no-shows or late arrivals
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* Refund Policy */}
      <View style={styles.policySection}>
        <Pressable
          style={styles.policySectionHeader}
          onPress={() => togglePolicySection('refund')}
        >
          <DollarSign size={18} color={Colors.primary} />
          <Text style={styles.policySectionTitle}>Refund Policy</Text>
          {expandedPolicies.refund ? (
            <ChevronUp size={18} color={Colors.primary} />
          ) : (
            <ChevronDown size={18} color={Colors.primary} />
          )}
        </Pressable>
        <Text style={styles.policyText}>
          Processing: 72 hrs • Bank transfer • 50% charge applies
        </Text>
        {expandedPolicies.refund && (
          <View style={styles.expandedContent}>
            <View style={styles.policyList}>
              <Text style={styles.policyListItem}>
                • Refund processing time: 72 hours after cancellation request
              </Text>
              <Text style={styles.policyListItem}>
                • Refunds processed to bank account provided during cancellation
              </Text>
              <Text style={styles.policyListItem}>
                • Cancellation charge of 50% applies to all eligible
                cancellations
              </Text>
              <Text style={styles.policyListItem}>
                • Operator cancellations: Full refund or rebooking on next
                available service
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* Conditions of Carriage */}
      <View style={styles.policySection}>
        <Pressable
          style={styles.policySectionHeader}
          onPress={() => togglePolicySection('conditions')}
        >
          <Info size={18} color={Colors.primary} />
          <Text style={styles.policySectionTitle}>Conditions of Carriage</Text>
          {expandedPolicies.conditions ? (
            <ChevronUp size={18} color={Colors.primary} />
          ) : (
            <ChevronDown size={18} color={Colors.primary} />
          )}
        </Pressable>
        <Text style={styles.policyText}>
          Contract terms • ID required • Age restrictions • Behavior rules
        </Text>
        {expandedPolicies.conditions && (
          <View style={styles.expandedContent}>
            <View style={styles.policyList}>
              <Text style={styles.policyListItem}>
                • By purchasing a ticket, you enter into a contract of carriage
                with the ferry operator
              </Text>
              <Text style={styles.policyListItem}>
                • Valid identification required and must be presented upon
                request
              </Text>
              <Text style={styles.policyListItem}>
                • Passengers must be 18+ years to travel unaccompanied
              </Text>
              <Text style={styles.policyListItem}>
                • Tickets are non-transferable and valid only for specified
                date/time
              </Text>
              <Text style={styles.policyListItem}>
                • Fare covers journey from departure point to destination
              </Text>
              <Text style={styles.policyListItem}>
                • Additional services or excess baggage may incur extra charges
              </Text>
              <Text style={styles.policyListItem}>
                • Passengers must behave appropriately and follow crew
                instructions
              </Text>
              <Text style={styles.policyListItem}>
                • Drugs, alcohol, and smoking are prohibited on board
              </Text>
              <Text style={styles.policyListItem}>
                • Special assistance requests must be made at time of booking
              </Text>
              <Text style={styles.policyListItem}>
                • Operator may cancel/delay services due to weather or
                unforeseen circumstances
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* Contact Information */}
      <View style={[styles.policySection, styles.contactSection]}>
        <View style={styles.policySectionHeader}>
          <Phone size={18} color={Colors.primary} />
          <Text style={styles.policySectionTitle}>Contact Information</Text>
        </View>
        <View style={styles.contactInfo}>
          <View style={styles.contactItem}>
            <Phone size={14} color={Colors.primary} />
            <Text style={styles.contactText}>Hotline: 3323113 or 7892929</Text>
          </View>
          <View style={styles.contactItem}>
            <Info size={14} color={Colors.primary} />
            <Text style={styles.contactText}>
              Email: crystalhotelsmv@gmail.com
            </Text>
          </View>
          <View style={styles.contactItem}>
            <Globe size={14} color={Colors.primary} />
            <Text style={styles.contactText}>
              Website: www.crystalhotels.mv
            </Text>
          </View>
          <View style={styles.contactItem}>
            <Clock size={14} color={Colors.primary} />
            <Text style={styles.contactText}>
              Office Hours: 6:00 AM - 10:00 PM
            </Text>
          </View>
        </View>
      </View>
    </Card>
  );

  const renderActionButtons = () => (
    <View style={styles.actionButtons}>
      {/* Only show Share Ticket button for confirmed bookings with completed payment */}
      {booking.status === 'confirmed' &&
        booking.payment?.status === 'completed' && (
          <Button
            title='Share Ticket'
            onPress={handleShareTicket}
            variant='outline'
            style={styles.actionButton}
            textStyle={styles.actionButtonText}
          />
        )}

      {isModifiable && (
        <Button
          title='Modify Booking'
          onPress={handleModifyBooking}
          variant='outline'
          style={styles.actionButton}
          textStyle={styles.modifyButtonText}
        />
      )}

      {isCancellable && (
        <Button
          title='Cancel Booking'
          onPress={handleCancelBooking}
          variant='outline'
          style={styles.actionButton}
          textStyle={styles.cancelButtonText}
        />
      )}
    </View>
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
      <View style={styles.header}>
        <Text style={styles.bookingNumber}>
          Booking #{booking.bookingNumber}
        </Text>
        <View
          style={[
            styles.statusBadge,
            booking.status === 'confirmed' && styles.statusConfirmed,
            booking.status === 'completed' && styles.statusCompleted,
            booking.status === 'cancelled' && styles.statusCancelled,
          ]}
        >
          <Text
            style={[
              styles.statusText,
              booking.status === 'confirmed' && styles.statusTextConfirmed,
              booking.status === 'completed' && styles.statusTextCompleted,
              booking.status === 'cancelled' && styles.statusTextCancelled,
            ]}
          >
            {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
          </Text>
        </View>
      </View>

      {/* Ticket Card */}
      <TicketCard booking={booking} />

      {/* Ticket Modal */}
      <Modal
        visible={showTicketPopup}
        animationType='slide'
        presentationStyle='pageSheet'
        onRequestClose={handleCloseTicketPopup}
      >
        <SafeAreaView style={styles.modalContainer}>
          {/* Header with buttons */}
          <View style={styles.modalHeader}>
            {/* Close Button */}
            <Pressable
              style={styles.modalCloseButton}
              onPress={handleCloseTicketPopup}
            >
              <X size={24} color={Colors.text} />
            </Pressable>

            {/* Title */}
            <Text style={styles.modalTitle}>Ticket Details</Text>

            {/* Share Button */}
            <Pressable
              style={[
                styles.modalShareButton,
                isSharing && styles.shareIconButtonDisabled,
              ]}
              onPress={handleShareIconPress}
              disabled={isSharing}
            >
              <Share2
                size={24}
                color={isSharing ? Colors.textSecondary : Colors.primary}
              />
            </Pressable>
          </View>

          {/* Ticket Content */}
          <ScrollView
            style={styles.modalScrollView}
            contentContainerStyle={styles.modalScrollContent}
            showsVerticalScrollIndicator={false}
            showsHorizontalScrollIndicator={false}
            bounces={false}
          >
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.modalTicketContainer}
              bounces={false}
            >
              <TicketDesign
                booking={booking}
                size='large'
                ref={ticketDesignRef}
              />
            </ScrollView>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Booking Details */}
      {renderBookingDetails()}

      {/* Passenger Details */}
      {renderPassengerDetails()}

      {/* Payment Details */}
      {renderPaymentDetails()}

      {/* Pricing Disclaimer */}
      <Card variant='elevated' style={styles.pricingDisclaimerCard}>
        <View style={styles.pricingDisclaimerHeader}>
          <AlertCircle size={20} color={Colors.error} />
          <Text style={styles.pricingDisclaimerTitle}>
            Important Pricing Notice
          </Text>
        </View>
        <Text style={styles.pricingDisclaimerText}>
          The ticket price(s) shown are valid for locals and Work Permit holders
          only. For tickets related to tourists, please reach us on our hotlines{' '}
          <Text style={styles.hotlineNumber}>3323113</Text> or{' '}
          <Text style={styles.hotlineNumber}>7892929</Text>.
        </Text>
      </Card>

      {/* Policies and Conditions */}
      {renderPoliciesAndConditions()}

      {/* Terms and Conditions Link */}
      <View style={styles.termsLinkSection}>
        <Pressable
          style={styles.termsLinkButton}
          onPress={() => router.push('/(app)/terms-and-conditions')}
        >
          <FileText size={18} color={Colors.primary} />
          <Text style={styles.termsLinkText}>View Full Terms & Conditions</Text>
        </Pressable>
      </View>

      {/* Action Buttons */}
      {renderActionButtons()}

      {/* Hidden TicketDesign for standardized image generation */}
      <View style={styles.hiddenTicketContainer}>
        <TicketDesign
          booking={booking}
          size='large'
          forImageGeneration={true}
          ref={imageGenerationTicketRef}
        />
      </View>
    </ScrollView>
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
    alignItems: 'center',
    marginBottom: 16,
  },
  detailIcon: {
    width: 32,
    alignItems: 'center',
    marginRight: 12,
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
    fontWeight: '600',
    color: Colors.text,
  },
  passengersCard: {
    marginBottom: 16,
  },
  passengerItem: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  passengerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  passengerName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    flex: 1,
  },
  seatNumber: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.primary,
    backgroundColor: Colors.card,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  passengerDetail: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  paymentCard: {
    marginBottom: 16,
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  paymentLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  paymentValue: {
    fontSize: 14,
    fontWeight: '500',
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
  totalAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  actionButtons: {
    gap: 12,
  },
  actionButton: {
    marginBottom: 8,
  },
  actionButtonText: {
    color: Colors.primary,
  },
  modifyButtonText: {
    color: Colors.primary,
  },
  cancelButtonText: {
    color: Colors.error,
  },
  notFoundContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  notFoundText: {
    fontSize: 18,
    color: Colors.textSecondary,
    marginBottom: 16,
  },
  notFoundButton: {
    minWidth: 120,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.card,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    flex: 1,
    textAlign: 'center',
  },
  modalCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  modalShareButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  modalScrollView: {
    flex: 1,
  },
  modalScrollContent: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  modalTicketContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '100%',
  },
  shareIconButtonDisabled: {
    opacity: 0.5,
  },
  // Policies and Conditions Styles
  policiesCard: {
    marginBottom: 16,
  },
  policySection: {
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  policySectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  policySectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginLeft: 8,
    flex: 1,
  },
  expandedContent: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  policyText: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  policyList: {
    gap: 6,
  },
  policyListItem: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  contactSection: {
    borderBottomWidth: 0,
    backgroundColor: Colors.card,
    padding: 12,
    borderRadius: 8,
  },
  contactInfo: {
    gap: 12,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  contactText: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  // Pricing Disclaimer Styles
  pricingDisclaimerCard: {
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: Colors.error,
  },
  pricingDisclaimerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  pricingDisclaimerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.error,
  },
  pricingDisclaimerText: {
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
  },
  hotlineNumber: {
    fontWeight: '700',
    color: Colors.primary,
  },
  // Terms Link Styles
  termsLinkSection: {
    marginBottom: 16,
  },
  termsLinkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.card,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.primary,
    gap: 8,
  },
  termsLinkText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
  },
  // Hidden container for image generation ticket
  hiddenTicketContainer: {
    position: 'absolute',
    left: -10000, // Move far off-screen
    top: -10000,
    opacity: 0,
    pointerEvents: 'none',
  },
});
