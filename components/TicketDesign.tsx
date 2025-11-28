import React, { forwardRef } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
// Icons removed as they're not used in the new design
import type { Booking } from '@/types';
import { formatBookingDate, formatTimeAMPM } from '@/utils/dateUtils';
import ViewShot from 'react-native-view-shot';
import colors from '@/constants/colors';
import { Users } from 'lucide-react-native';
import { FontAwesome } from '@expo/vector-icons';
import { SOCIAL_MEDIA } from '@/constants/customer';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

const { width: screenWidth } = Dimensions.get('window');

interface TicketDesignProps {
  booking: Booking;
  size?: 'small' | 'large';
  forImageGeneration?: boolean; // New prop for standardized image generation
}

export const TicketDesign = forwardRef<ViewShot, TicketDesignProps>(
  ({ booking, size = 'large', forImageGeneration = false }, ref) => {
    const isLarge = size === 'large';

    // Standardized width for image generation (consistent across all devices)
    // For display, use responsive width; for image generation, use fixed standard width
    const getTicketWidth = () => {
      if (forImageGeneration) {
        // Standardized width for image generation - 500px with natural height
        return 500;
      }
      // Original responsive width for display
      return isLarge ? 400 : 340;
    };

    const ticketWidth = getTicketWidth();

    // Scale factor for image generation (2x for high quality)
    const scaleFactor = forImageGeneration ? 2 : 1;

    // Dynamic styles that scale for image generation
    const getDynamicStyles = () => {
      if (!forImageGeneration) {
        return {}; // Use default styles for display
      }

      // Scaled styles for image generation (optimized for natural content fit)
      return {
        container: {
          ...styles.container,
          width: ticketWidth,
          // Remove fixed height to let content determine natural size
        },
        // Scale text and spacing proportionally
        scaledText: {
          transform: [{ scale: scaleFactor }],
        },
      };
    };

    const dynamicStyles = getDynamicStyles();

    const displayFare = booking.displayFare ?? booking.totalFare;

    return (
      <ViewShot ref={ref}>
        <View
          style={[
            forImageGeneration ? dynamicStyles.container : styles.container,
            !forImageGeneration && (isLarge ? styles.large : styles.small),
            { width: ticketWidth },
          ]}
          collapsable={false}
          removeClippedSubviews={false}
        >
          {/* Watermark */}
          <View style={styles.watermark}>
            <Text style={styles.watermarkText}>CRYSTAL TRANSFER VAAVU</Text>
            <Text style={styles.watermarkSubtext}>FERRY SERVICES</Text>
          </View>
          {/* Header - Legion Style */}
          <View style={styles.header}>
            <Text style={styles.companyName}>CRYSTAL TRANSFER</Text>
            <Text style={styles.companyLocation}>VAAVU</Text>
            <Text style={styles.ticketType}>Ferry Ticket</Text>
            <Text style={styles.companySubtitle}>
              Booking No. {booking.bookingNumber}
            </Text>
          </View>

          {/* Main Ticket Content */}
          <View
            style={[
              styles.ticketBody,
              forImageGeneration && { minHeight: 180 }, // Slightly compact for image generation
            ]}
          >
            {/* Left Side - Passenger & Trip Info */}
            <View style={styles.leftSection}>
              {/* <Text style={styles.sectionTitle}>Name of the Passenger</Text>
              <Text style={styles.passengerName}>
                {booking.passengers[0]?.fullName || 'Passenger'}
              </Text> */}

              <View style={styles.tripInfoRow}>
                <View style={styles.tripInfoItem}>
                  <Text style={styles.tripInfoLabel}>Ferry</Text>
                  <Text style={styles.tripInfoValue}>
                    Crystal Transfer
                    {/* {booking.vessel?.name ||
                      booking.vessel?.registrationNumber ||
                      booking.vessel?.model ||
                      'Ferry'} */}
                  </Text>
                </View>
                <View style={styles.tripInfoItem}>
                  <Text style={styles.tripInfoLabel} numberOfLines={1}>
                    Jetty of Departure
                  </Text>
                  <Text style={styles.tripInfoValue}>
                    {booking.route.fromIsland.name}
                  </Text>
                </View>
              </View>

              <View style={styles.priceSection}>
                <Text style={styles.priceLabel}>Total Fare (MVR)</Text>
                <Text style={styles.priceValue}>{displayFare}</Text>
              </View>
            </View>

            {/* Center - QR Code */}
            <View style={styles.centerSection}>
              <View style={styles.qrContainer}>
                <QRCode
                  value={booking.qrCodeUrl || booking.bookingNumber}
                  size={forImageGeneration ? 100 : isLarge ? 80 : 60}
                  backgroundColor='white'
                  color='#1e40af'
                />
              </View>
              <Text style={styles.bookingNumber}>Scan to verify</Text>
            </View>

            {/* Right Side - Route & Seat Info */}
            <View style={styles.rightSection}>
              <Text style={styles.routeTitle}>Trip Route</Text>
              <Text style={styles.fromLocation}>
                {booking.route.fromIsland.name}
              </Text>
              <Text style={styles.toLabel}>TO</Text>
              <Text style={styles.toLocation}>
                {booking.route.toIsland.name}
              </Text>
              <Text style={styles.dateTime}>
                {formatBookingDate(booking.departureDate)}
              </Text>
              <Text style={styles.dateTime}>
                ({formatTimeAMPM(booking.departureTime)})
              </Text>
              <Text style={styles.detailItemLabel}>
                Passengers : {booking.passengers.length}
              </Text>
              {/* <View style={styles.seatInfo}>
                <Text style={styles.seatLabel}>SEAT NO:</Text>
                <Text style={styles.seatNumber}>
                  {booking.seats.map(seat => seat.number).join(', ')}
                </Text>
              </View> */}
            </View>
          </View>

          <View
            style={[
              styles.passengerDetailsSection,
              forImageGeneration && { paddingVertical: 10 }, // Slightly reduce padding for image
            ]}
          >
            <View style={styles.passengerDetailsHeader}>
              <Users
                size={16}
                color='#1e40af'
                style={styles.passengerHeaderIcon}
              />
              <Text style={styles.passengerDetailsTitle}>
                Passenger Details
              </Text>
            </View>

            {booking.passengers.map((passenger, index) => (
              <View key={index} style={styles.passengerRow}>
                <Text style={styles.passengerIndex}>{index + 1}.</Text>
                <View style={styles.passengerInfoSimple}>
                  <Text style={styles.passengerNameSimple}>
                    {passenger.fullName}
                  </Text>
                  {passenger.idNumber && (
                    <Text style={styles.passengerIdSimple}>
                      ID: {passenger.idNumber}
                    </Text>
                  )}
                </View>
                <View style={styles.seatInfoSimple}>
                  <Text style={styles.seatLabelSimple}>Seat:</Text>
                  <Text style={styles.seatNumberSimple}>
                    {booking.seats[index]?.number || 'N/A'}
                  </Text>
                </View>
              </View>
            ))}
          </View>

          {/* Ferry Policy Section - Structured Layout */}
          <View
            style={[
              styles.policySection,
              forImageGeneration && { padding: 8 }, // Slightly reduce padding for image
            ]}
          >
            <View style={styles.policyHeader}>
              <Text style={styles.policyTitle}>FERRY POLICIES</Text>
            </View>

            {/* Policy Content */}
            <View style={styles.policyContent}>
              {/* Left Column */}
              <View style={styles.policyColumn}>
                {/* Luggage/Baggage Policy */}
                <View style={styles.policyItem}>
                  <Text style={styles.policyItemTitle}>
                    Luggage/baggage Policy
                  </Text>
                  <Text style={styles.policyItemText}>
                    1. 01 Luggage per ticket.
                  </Text>
                  <Text style={styles.policyItemText}>
                    2. 01 handbag per ticket.
                  </Text>
                </View>

                {/* Check-in & Boarding Policy */}
                <View style={styles.policyItem}>
                  <Text style={styles.policyItemTitle}>
                    Check-in & Boarding Policy
                  </Text>
                  <Text style={styles.policyItemText}>
                    1. Check-in: 30 minutes before departure time at the jetty.
                  </Text>
                  <Text style={styles.policyItemText}>
                    2. Boarding: 10 minutes before departure time at the ferry.
                  </Text>
                </View>

                {/* Cancellation, Modification & Refund Policy */}
                <View style={styles.policyItem}>
                  <Text style={styles.policyItemTitle}>
                    Cancellation, Modification & Refund Policy
                  </Text>
                  <Text style={styles.policyItemText}>
                    1. Cancellation allowed: 48+ Hours before trip's departure
                    time.
                  </Text>
                  <Text style={styles.policyItemText}>
                    2. Cancellation charge: 50% of ticket fare.
                  </Text>
                  <Text style={styles.policyItemText}>
                    3. Modification allowed: 72+ Hours before trip's departure
                    time.
                  </Text>
                  <Text style={styles.policyItemText}>
                    4. Late arrivals & No-Shows: No refund.
                  </Text>
                  <Text style={styles.policyItemText}>
                    5. Refund Processing: 72 Hours (to bank account).
                  </Text>
                  <Text style={styles.policyItemText}>
                    6. Trip cancelled by operator: Full refund or re-booking to
                    an available trip of choice.
                  </Text>
                </View>
              </View>

              {/* Right Column */}
              <View style={styles.policyColumn}>
                {/* Conditions of Carriage */}
                <View style={styles.policyItem}>
                  <Text style={styles.policyItemTitle}>
                    Conditions of Carriage
                  </Text>
                  <Text style={styles.policyItemText}>
                    *Applies to all passengers and baggage.
                  </Text>
                  <Text style={styles.policyItemText}>
                    1. Valid ID required upon request.
                  </Text>
                  <Text style={styles.policyItemText}>
                    2. Infants (below 02 years): Free (sits in accompanying
                    adult's lap).
                  </Text>
                  <Text style={styles.policyItemText}>
                    3. Children (above 02 years): Adult ticket price.
                  </Text>
                  <Text style={styles.policyItemText}>
                    4. Tickets valid only for date and time specified.
                  </Text>
                  <Text style={styles.policyItemText}>
                    5. Tickets are non-transferable.
                  </Text>
                  <Text style={styles.policyItemText}>
                    6. Fare covers trip from departure point to destination.
                  </Text>
                  <Text style={styles.policyItemText}>
                    7. Drugs, alcohol, smoking & inappropriate behavior
                    prohibited onboard.
                  </Text>
                  <Text style={styles.policyItemText}>
                    8. Dangerous articles, flammable materials & illegal
                    substances prohibited.
                  </Text>
                  <Text style={styles.policyItemText}>
                    9. Operator reserves the right to cancel or delay services
                    due to weather conditions or other unforeseen circumstances.
                  </Text>
                  <Text style={styles.policyItemText}>
                    10. Passengers requiring special assistance must notify
                    operator during booking.
                  </Text>
                </View>
              </View>
            </View>
          </View>
          {/* Contact Details */}
          <View
            style={[
              styles.contactSection,
              forImageGeneration && { padding: 8 }, // Slightly reduce padding for image
            ]}
          >
            {/* Top Row - Contact Details and QR Code */}
            <View style={styles.contactTopRow}>
              <View style={styles.contactLeft}>
                <Text style={styles.contactTitle}>Contact Details</Text>
                <Text style={styles.contactDescription}>
                  For inquiries and assistance please call 3323113 or 7892929
                </Text>
                <Text style={styles.contactDescription}>
                  email: crystalhotelsmv@gmail.com
                </Text>
              </View>

              <View style={styles.contactRight}>
                <Text style={styles.qrTitle}>Scan and Join our Community!</Text>
                <View style={styles.footerQrContainer}>
                  <QRCode
                    value={SOCIAL_MEDIA.COMMUNITY}
                    size={forImageGeneration ? 56 : 45}
                    backgroundColor='white'
                    color='#1e40af'
                  />
                </View>
              </View>
            </View>

            {/* Bottom Row - Social Media (Centered) */}
            <View style={styles.socialMediaSection}>
              {/* <Text style={styles.socialMediaText}>Social media accounts</Text> */}
              <View style={styles.socialMediaIcons}>
                <View style={styles.socialMediaItem}>
                  <FontAwesome name='facebook' size={12} color='white' />
                  <Text style={styles.socialMediaIcon}>
                    Crystal Transfer Vaavu
                  </Text>
                </View>
                <View style={styles.socialMediaItem}>
                  <FontAwesome name='instagram' size={12} color='white' />
                  <Text style={styles.socialMediaIcon}>@crystaltransfermv</Text>
                </View>
                <View style={styles.socialMediaItem}>
                  <MaterialIcons name='tiktok' size={14} color='white' />
                  <Text style={styles.socialMediaIcon}>@crystal.transfer</Text>
                </View>
              </View>
            </View>
          </View>
        </View>
      </ViewShot>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    borderWidth: 2,
    borderColor: '#1e40af',
    position: 'relative',
  },

  // Watermark Styles
  watermark: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -80 }, { translateY: -30 }, { rotate: '-45deg' }],
    zIndex: 1,
    opacity: 0.05,
    alignItems: 'center',
  },
  watermarkText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e40af',
    letterSpacing: 2,
  },
  watermarkSubtext: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1e40af',
    letterSpacing: 1,
    marginTop: 2,
  },
  large: {
    minHeight: 700,
  },
  small: {
    minHeight: 600,
  },
  // Header Section - Legion Style
  header: {
    backgroundColor: '#1e40af',
    paddingVertical: 8,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },
  companyName: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  companyLocation: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginTop: -2,
  },
  ticketType: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 4,
    opacity: 0.95,
  },
  companySubtitle: {
    color: 'white',
    fontSize: 12,
    opacity: 0.9,
    marginTop: 2,
  },

  // Main Ticket Body
  ticketBody: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: colors.highlight,
    minHeight: 200,
  },

  // Left Section - Passenger Info
  leftSection: {
    flex: 2,
    paddingRight: 12,
  },
  sectionTitle: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  passengerName: {
    backgroundColor: '#eff6ff',
    color: '#1e40af',
    fontSize: 16,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0,0,0,0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    padding: 8,
    borderRadius: 4,
    marginBottom: 16,
  },
  tripInfoRow: {
    flexDirection: 'column',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  tripInfoItem: {
    flex: 1,
    marginRight: 8,
  },
  tripInfoLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    marginBottom: 4,
  },
  tripInfoValue: {
    backgroundColor: '#eff6ff',
    color: '#1e40af',
    fontSize: 14,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0,0,0,0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    padding: 6,
    borderRadius: 4,
    textAlign: 'center',
  },
  singleDetailsCard: {
    backgroundColor: '#f9fafb',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginTop: 10,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  detailIconLucide: {
    marginRight: 8,
    width: 16,
  },
  detailItemLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6b7280',
    flex: 1,
  },
  detailItemValue: {
    fontSize: 11,
    fontWeight: '500',
    color: '#374151',
    textAlign: 'right',
  },
  lastDetailItem: {
    borderBottomWidth: 0, // Remove border from last item
  },
  // Keep old styles for backward compatibility
  detailCard: {
    backgroundColor: '#f9fafb',
    padding: 15,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailIcon: {
    fontSize: 16,
    marginRight: 12,
    width: 20,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
    textAlign: 'right',
  },
  returnSection: {
    backgroundColor: '#fef3c7',
    padding: 12,
    borderRadius: 12,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  returnHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  returnIcon: {
    marginRight: 8,
  },
  returnTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#92400e',
  },
  returnDetails: {
    alignItems: 'center',
  },
  returnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#92400e',
    marginBottom: 4,
  },
  returnDateTime: {
    fontSize: 13,
    color: '#a16207',
    fontWeight: '500',
  },
  priceSection: {
    marginTop: 8,
  },
  priceLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    marginBottom: 4,
  },
  priceValue: {
    backgroundColor: '#eff6ff',
    color: '#1e40af',
    fontSize: 20,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0,0,0,0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    padding: 8,
    borderRadius: 4,
    textAlign: 'center',
  },

  // Center Section - QR Code
  centerSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  qrContainer: {
    backgroundColor: '#f8fafc',
    padding: 8,
    borderRadius: 50,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  bookingNumber: {
    color: '#6b7280',
    fontSize: 10,
    fontWeight: '500',
    textAlign: 'center',
  },

  // Right Section - Route Info
  rightSection: {
    flex: 1.5,
    paddingLeft: 8,
    alignItems: 'flex-end',
  },
  routeTitle: {
    color: colors.text,
    fontSize: 12,
    marginBottom: 8,
  },
  fromLocation: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  toLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    marginBottom: 4,
  },
  toLocation: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  dateTime: {
    color: colors.textSecondary,
    fontSize: 12,
    marginBottom: 12,
  },
  seatInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  seatLabel: {
    color: colors.textSecondary,
    fontSize: 10,
    marginRight: 4,
  },
  seatNumber: {
    backgroundColor: '#eff6ff',
    color: '#1e40af',
    fontSize: 16,
    fontWeight: 'bold',
    paddingHorizontal: 12,
    textShadowColor: 'rgba(0,0,0,0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    paddingVertical: 6,
    borderRadius: 4,
  },

  // Passenger Details Section - Simple Design
  passengerDetailsSection: {
    backgroundColor: 'white',
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  passengerDetailsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  passengerHeaderIcon: {
    marginRight: 6,
  },
  passengerDetailsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1e40af',
    letterSpacing: 0.3,
  },
  passengerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  passengerIndex: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#374151',
    width: 25,
  },
  passengerInfoSimple: {
    flex: 1,
    marginLeft: 6,
  },
  passengerNameSimple: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 1,
  },
  passengerIdSimple: {
    fontSize: 10,
    color: '#6b7280',
  },
  seatInfoSimple: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  seatLabelSimple: {
    fontSize: 12,
    color: '#6b7280',
    marginRight: 4,
  },
  seatNumberSimple: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1e40af',
  },
  // Legacy styles for backward compatibility
  passengerInfo: {
    flex: 1,
  },
  passengerId: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  seatAssignment: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  // Pricing Notice Section
  pricingNoticeSection: {
    backgroundColor: '#fef2f2',
    padding: 4,
    borderLeftWidth: 4,
    borderLeftColor: '#ef4444',
    marginHorizontal: 12,
    marginVertical: 8,
    borderRadius: 6,
  },
  pricingNoticeHeader: {
    marginBottom: 4,
  },
  pricingNoticeTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#dc2626',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  pricingNoticeText: {
    fontSize: 10,
    color: '#374151',
    lineHeight: 14,
    textAlign: 'center',
  },
  hotlineText: {
    fontWeight: 'bold',
    color: '#1e40af',
  },

  // Policy Section
  policySection: {
    backgroundColor: '#f9fafb',
    padding: 10,
  },
  policyHeader: {
    backgroundColor: '#1e40af',
    paddingVertical: 4,
    paddingHorizontal: 12,
    marginBottom: 8,
    borderRadius: 4,
  },
  policyTitle: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  policyContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  policyColumn: {
    flex: 1,
    paddingHorizontal: 4,
  },
  policyItem: {
    marginBottom: 8,
  },
  policyItemTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#1e40af',
    marginBottom: 4,
  },
  policyItemText: {
    fontSize: 10,
    color: '#374151',
    lineHeight: 10,
    marginBottom: 2,
  },
  policySubtitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1e40af',
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingBottom: 4,
  },
  policyText: {
    fontSize: 10,
    color: '#374151',
    lineHeight: 14,
    marginBottom: 6,
  },

  // Policy Grid Styles
  policyGrid: {
    gap: 4,
  },
  policyGridRow: {
    flexDirection: 'row',
    gap: 4,
  },
  policyGridItem: {
    flex: 1,
    backgroundColor: '#f9fafb',
    padding: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  policyGridTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#1e40af',
    marginBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  policyGridText: {
    fontSize: 8,
    color: '#374151',
    lineHeight: 10,
  },

  // Contact Section
  contactSection: {
    backgroundColor: '#1e40af',
    padding: 10,
    flexDirection: 'column',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  contactTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    width: '100%',
    marginBottom: 8,
  },
  contactLeft: {
    flex: 1.2,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
    gap: 8,
  },
  contactTitle: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  contactDescription: {
    color: 'white',
    fontSize: 10,
    marginBottom: 4,
    lineHeight: 12,
  },
  contactPhone: {
    color: 'white',
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 1,
  },
  contactEmail: {
    color: 'white',
    fontSize: 10,
    marginBottom: 1,
  },
  contactWebsite: {
    color: 'white',
    fontSize: 10,
  },
  contactCenter: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  socialTitle: {
    color: 'white',
    fontSize: 10,
    textAlign: 'center',
    marginBottom: 6,
    lineHeight: 12,
  },
  companyNameFooter: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  contactRight: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  qrTitle: {
    color: 'white',
    fontSize: 8,
    textAlign: 'center',
    marginBottom: 6,
    lineHeight: 10,
  },
  footerQrContainer: {
    backgroundColor: 'white',
    padding: 3,
    borderRadius: 3,
  },
  socialMediaSection: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  socialMediaText: {
    color: 'white',
    fontSize: 8,
    textAlign: 'center',
    marginBottom: 2,
  },
  socialMediaIcons: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  socialMediaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    justifyContent: 'center',
  },
  socialMediaIcon: {
    color: 'white',
    fontSize: 7,
    fontWeight: '500',
    textAlign: 'center',
  },

  // Cutting Line Styles
  cuttingLine: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#e2e8f0',
    position: 'relative',
  },
  cuttingDots: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#94a3b8',
  },
  scissorsContainer: {
    position: 'absolute',
    right: 16,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 4,
  },
  scissorsIcon: {
    transform: [{ rotate: '90deg' }],
  },

  // Ticket Stub Styles
  ticketStub: {
    backgroundColor: '#f1f5f9',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  stubContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  stubLeft: {
    flex: 2,
  },
  stubTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1e40af',
    marginBottom: 2,
  },
  stubBookingNumber: {
    fontSize: 11,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 2,
  },
  stubRoute: {
    fontSize: 10,
    color: '#6b7280',
  },
  stubCenter: {
    flex: 1,
    alignItems: 'center',
  },
  stubDate: {
    fontSize: 11,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 2,
  },
  stubTime: {
    fontSize: 10,
    color: '#6b7280',
  },
  stubRight: {
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 4,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  stubFooter: {
    fontSize: 9,
    color: '#6b7280',
    textAlign: 'center',
    fontStyle: 'italic',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 6,
  },
});

TicketDesign.displayName = 'TicketDesign';

export default TicketDesign;
