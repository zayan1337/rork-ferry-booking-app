import React, { useState, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Alert,
  Pressable,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import {
  Clock,
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
import { useAgentStore } from '@/store/agent/agentStore';
import { useBookingEligibility } from '@/hooks/useBookingEligibility';
import {
  BookingDetailsHeader,
  TripDetailsCard,
  PassengerDetailsCard,
  ClientInfoCard,
  PaymentDetailsCard,
  BookingActions,
} from '@/components/booking';
import TicketCard from '@/components/TicketCard';
import TicketDesign from '@/components/TicketDesign';
import Button from '@/components/Button';
import { shareBookingTicket } from '@/utils/shareUtils';
import Colors from '@/constants/colors';

export default function BookingDetailsScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { bookings, clients, updateBookingStatus } = useAgentStore();
  const [loading, setLoading] = useState(false);
  const ticketDesignRef = useRef<any>(null);
  const imageGenerationTicketRef = useRef<any>(null);
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

  // Find the booking by id
  const booking = bookings.find(b => b.id === id);

  // Use booking eligibility hook - convert agent booking to main booking type
  const convertedBooking = booking
    ? {
        ...booking,
        totalFare: Number(booking.totalAmount) || 0,
        createdAt: String(booking.bookingDate || new Date().toISOString()),
        bookingNumber: String(booking.bookingNumber || booking.id || 'N/A'),
      }
    : null;

  const { isModifiable, isCancellable, message } = useBookingEligibility({
    booking: convertedBooking as any,
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
      await shareBookingTicket(
        ticketBookingData as any,
        imageGenerationTicketRef
      );

      setShowTicketPopup(false);
    } catch (error) {
      Alert.alert('Sharing Error', 'Failed to share ticket. Please try again.');
    } finally {
      setIsSharing(false);
    }
  };

  const handleCloseTicketPopup = () => {
    setShowTicketPopup(false);
  };

  const handleUpdateStatus = async (status: string) => {
    try {
      setLoading(true);
      await updateBookingStatus(booking.id, status as any);
      Alert.alert('Success', `Booking marked as ${status}`);
    } catch (error) {
      console.error('Error updating booking status:', error);
      Alert.alert('Error', 'Failed to update booking status');
    } finally {
      setLoading(false);
    }
  };

  const togglePolicySection = (section: keyof typeof expandedPolicies) => {
    setExpandedPolicies(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const renderPoliciesAndConditions = () => (
    <View style={styles.policiesCard}>
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
    </View>
  );

  // Prepare data for components
  const ticketBookingData = {
    ...booking,
    totalFare: Number(booking.totalAmount) || 0,
    createdAt: String(booking.bookingDate || new Date().toISOString()),
    bookingNumber: String(booking.bookingNumber || booking.id || 'N/A'),
    tripType: String(booking.tripType || 'one_way'),
    departureTime: String(booking.departureTime || '00:00'),
    route:
      booking.route ||
      ({
        id: 'unknown',
        fromIsland: {
          id: 'from',
          name: String(booking.origin || 'Unknown'),
          zone: 'A',
        },
        toIsland: {
          id: 'to',
          name: String(booking.destination || 'Unknown'),
          zone: 'A',
        },
        baseFare: Number(booking.totalAmount) || 0,
      } as any),
    seats: Array.isArray(booking.seats) ? booking.seats : [],
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Booking Details',
        }}
      />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
      >
        {/* Header with booking number and status */}
        <BookingDetailsHeader
          bookingNumber={String(booking.bookingNumber || 'N/A')}
          status={String(booking.status || 'unknown')}
          onShare={handleShareTicket}
        />

        {/* Ticket Card with QR Code */}
        <TicketCard booking={ticketBookingData as any} />

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
                  booking={ticketBookingData as any}
                  size='large'
                  ref={ticketDesignRef}
                />
              </ScrollView>
            </ScrollView>
          </SafeAreaView>
        </Modal>

        {/* Trip Details */}
        <TripDetailsCard
          departureDate={booking.departureDate}
          departureTime={booking.departureTime}
          returnDate={booking.returnDate}
          tripType={booking.tripType}
          route={booking.route || undefined}
          origin={booking.origin}
          destination={booking.destination}
          passengerCount={
            booking.passengers?.length || booking.passengerCount || 0
          }
          vessel={booking.vessel || undefined}
          status={booking.status}
        />

        {/* Passenger Details */}
        <PassengerDetailsCard
          passengers={booking.passengers || []}
          seats={booking.seats || []}
        />

        {/* Client Information */}
        <ClientInfoCard
          clientName={booking.clientName}
          clientEmail={booking.clientEmail}
          clientPhone={booking.clientPhone}
          clientHasAccount={booking.clientHasAccount}
          clients={clients}
        />

        {/* Payment Details */}
        <PaymentDetailsCard
          totalAmount={Number(booking.totalAmount) || 0}
          discountedAmount={
            booking.discountedAmount
              ? Number(booking.discountedAmount)
              : undefined
          }
          paymentMethod={booking.paymentMethod}
          payment={booking.payment || undefined}
          commission={
            booking.commission ? Number(booking.commission) : undefined
          }
        />

        {/* Pricing Disclaimer */}
        <View style={styles.pricingDisclaimerCard}>
          <View style={styles.pricingDisclaimerHeader}>
            <AlertCircle size={20} color={Colors.error} />
            <Text style={styles.pricingDisclaimerTitle}>
              Important Pricing Notice
            </Text>
          </View>
          <Text style={styles.pricingDisclaimerText}>
            The ticket price(s) shown are valid for locals and Work Permit
            holders only. For tickets related to tourists, please reach us on
            our hotlines <Text style={styles.hotlineNumber}>3323113</Text> or{' '}
            <Text style={styles.hotlineNumber}>7892929</Text>.
          </Text>
        </View>

        {/* Policies and Conditions */}
        {renderPoliciesAndConditions()}

        {/* Terms and Conditions Link */}
        <View style={styles.termsLinkSection}>
          <Pressable
            style={styles.termsLinkButton}
            onPress={() => router.push('/(app)/terms-and-conditions')}
          >
            <FileText size={18} color={Colors.primary} />
            <Text style={styles.termsLinkText}>
              View Full Terms & Conditions
            </Text>
          </Pressable>
        </View>

        {/* Action Buttons */}
        <BookingActions
          bookingId={String(booking.id || '')}
          status={String(booking.status || '')}
          departureDate={booking.departureDate}
          tripType={booking.tripType}
          returnDate={booking.returnDate}
          loading={loading}
          onShare={handleShareTicket}
          onUpdateStatus={handleUpdateStatus}
          paymentStatus={booking.payment?.status || 'pending'}
          isModifiable={isModifiable}
          isCancellable={isCancellable}
        />

        <Text style={styles.bookingId}>
          Booking ID: {String(booking.id || 'N/A')}
        </Text>

        {/* Hidden TicketDesign for standardized image generation */}
        <View style={styles.hiddenTicketContainer}>
          <TicketDesign
            booking={ticketBookingData as any}
            size='large'
            forImageGeneration={true}
            ref={imageGenerationTicketRef}
          />
        </View>
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
  bookingId: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 16,
  },
  // Modal Styles
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
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
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
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: Colors.error,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
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
