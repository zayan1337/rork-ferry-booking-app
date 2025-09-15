import React, { forwardRef } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
// Icons removed as they're not used in the new design
import type { Booking } from '@/types';
import { formatBookingDate, formatTimeAMPM } from '@/utils/dateUtils';
import ViewShot from 'react-native-view-shot';
import colors from '@/constants/colors';
import { Users, Scissors } from 'lucide-react-native';

const { width: screenWidth } = Dimensions.get('window');

interface TicketDesignProps {
  booking: Booking;
  size?: 'small' | 'large';
}

export const TicketDesign = forwardRef<ViewShot, TicketDesignProps>(
  ({ booking, size = 'large' }, ref) => {
    const isLarge = size === 'large';
    // Make ticket responsive to screen width
    const maxWidth = screenWidth - 32; // Account for padding
    const ticketWidth = Math.min(isLarge ? 400 : 340, maxWidth);

    return (
      <ViewShot ref={ref}>
        <View
          style={[
            styles.container,
            isLarge ? styles.large : styles.small,
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
            <Text style={styles.companyName}>CRYSTAL TRANSFER VAAVU</Text>
            <Text style={styles.companySubtitle}>
              Ferry Services #{booking.bookingNumber}
            </Text>
          </View>

          {/* Main Ticket Content */}
          <View style={styles.ticketBody}>
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
                    {booking.vessel?.registrationNumber ||
                      booking.vessel?.model ||
                      booking.vessel?.name ||
                      'Ferry'}
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
                <Text style={styles.priceLabel}>Ticket Price (MVR)</Text>
                <Text style={styles.priceValue}>
                  {Math.round(booking.totalFare / booking.passengers.length)}
                </Text>
              </View>
            </View>

            {/* Center - QR Code */}
            <View style={styles.centerSection}>
              <View style={styles.qrContainer}>
                <QRCode
                  value={booking.qrCodeUrl || booking.bookingNumber}
                  size={isLarge ? 80 : 60}
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

          <View style={styles.passengerDetailsSection}>
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

          {/* Ferry Policy Section - Compact Grid Layout */}
          <View style={styles.policySection}>
            <View style={styles.policyHeader}>
              <Text style={styles.policyTitle}>FERRY POLICY</Text>
            </View>

            {/* Policy Grid - 2x2 Layout */}
            <View style={styles.policyGrid}>
              {/* Row 1 */}
              <View style={styles.policyGridRow}>
                {/* Check-in & Boarding */}
                <View style={styles.policyGridItem}>
                  <Text style={styles.policyGridTitle}>
                    Check-in & Boarding
                  </Text>
                  <Text style={styles.policyGridText}>
                    • Check-in: 30 min before departure
                  </Text>
                  <Text style={styles.policyGridText}>
                    • Boarding: 15 min before departure
                  </Text>
                  <Text style={styles.policyGridText}>
                    • Late arrivals: denied boarding, no refund
                  </Text>
                  <Text style={styles.policyGridText}>
                    • Children 0-2 years: FREE
                  </Text>
                  <Text style={styles.policyGridText}>
                    • Above 2 years: adult prices
                  </Text>
                </View>

                {/* Luggage Policy */}
                <View style={styles.policyGridItem}>
                  <Text style={styles.policyGridTitle}>Luggage Policy</Text>
                  <Text style={styles.policyGridText}>
                    • 1 luggage: Max 15kg (67x43x26cm)
                  </Text>
                  <Text style={styles.policyGridText}>
                    • 1 handbag: Max 5kg (25x20x6cm)
                  </Text>
                  <Text style={styles.policyGridText}>
                    • Prohibited: Chemicals, aerosols, alcohol
                  </Text>
                  <Text style={styles.policyGridText}>
                    • No drugs, weapons, ammunition
                  </Text>
                  <Text style={styles.policyGridText}>
                    • No valuables, fragile articles
                  </Text>
                  <Text style={styles.policyGridText}>
                    • No fishing rods, poles, pipes, tubes
                  </Text>
                  <Text style={styles.policyGridText}>
                    • Ferry not liable for lost luggage
                  </Text>
                </View>
              </View>

              {/* Row 2 */}
              <View style={styles.policyGridRow}>
                {/* Cancellation & Refund */}
                <View style={styles.policyGridItem}>
                  <Text style={styles.policyGridTitle}>
                    Cancellation & Refund
                  </Text>
                  <Text style={styles.policyGridText}>
                    • Cancel: 48+ hrs before departure
                  </Text>
                  <Text style={styles.policyGridText}>
                    • No cancel: Less than 72 hrs before
                  </Text>
                  <Text style={styles.policyGridText}>
                    • Modify: 72+ hrs before departure
                  </Text>
                  <Text style={styles.policyGridText}>
                    • Cancellation charge: 50% of fare
                  </Text>
                  <Text style={styles.policyGridText}>
                    • No refund: no-shows/late arrivals
                  </Text>
                  <Text style={styles.policyGridText}>
                    • Refund processing: 72 hrs to bank
                  </Text>
                  <Text style={styles.policyGridText}>
                    • Operator cancels: full refund/rebooking
                  </Text>
                </View>

                {/* Conditions of Carriage */}
                <View style={styles.policyGridItem}>
                  <Text style={styles.policyGridTitle}>
                    Conditions of Carriage
                  </Text>
                  <Text style={styles.policyGridText}>
                    • Valid ID required upon request
                  </Text>
                  <Text style={styles.policyGridText}>
                    • 18+ years for unaccompanied travel
                  </Text>
                  <Text style={styles.policyGridText}>
                    • Tickets non-transferable
                  </Text>
                  <Text style={styles.policyGridText}>
                    • Valid only for specified date/time
                  </Text>
                  <Text style={styles.policyGridText}>
                    • Fare covers departure to destination
                  </Text>
                  <Text style={styles.policyGridText}>
                    • Extra charges for excess baggage
                  </Text>
                  <Text style={styles.policyGridText}>
                    • Behave appropriately, follow crew
                  </Text>
                  <Text style={styles.policyGridText}>
                    • No drugs/alcohol/smoking on board
                  </Text>
                  <Text style={styles.policyGridText}>
                    • Special assistance: book at time
                  </Text>
                  <Text style={styles.policyGridText}>
                    • Weather delays may occur
                  </Text>
                </View>
              </View>
            </View>
          </View>
          {/* Important Pricing Notice */}
          <View style={styles.pricingNoticeSection}>
            <View style={styles.pricingNoticeHeader}>
              <Text style={styles.pricingNoticeTitle}>
                IMPORTANT PRICING NOTICE
              </Text>
            </View>
            <Text style={styles.pricingNoticeText}>
              The ticket price(s) shown are valid for locals and Work Permit
              holders only. For tickets related to tourists, please reach us on
              our hotlines <Text style={styles.hotlineText}>3323113</Text> or{' '}
              <Text style={styles.hotlineText}>7892929</Text>.
            </Text>
          </View>
          {/* Contact Details */}
          <View style={styles.contactSection}>
            <View style={styles.contactLeft}>
              <Text style={styles.contactTitle}>Contact Details</Text>
              <Text style={styles.contactDescription}>
                For booking or more information about our services and ferry
                schedules, you may contact:
              </Text>

              {/* Phone Numbers Row */}
              <View style={styles.contactRow}>
                <Text style={styles.contactPhone}>
                  Emergency: +960 123-4567
                </Text>
              </View>
              <View style={styles.contactRow}>
                <Text style={styles.contactPhone}>Hotline: +960 3323113</Text>
                <Text style={styles.contactPhone}>+960 7892929</Text>
              </View>

              {/* Email & Website Row */}
              <View style={styles.contactRow}>
                <Text style={styles.contactEmail}>
                  Support: info@crystaltransfer.mv
                </Text>
                <Text style={styles.contactWebsite}>
                  Website: www.crystaltransfer.mv
                </Text>
              </View>
              <View style={styles.contactRow}></View>
            </View>

            {/* <View style={styles.contactCenter}>
              <Text style={styles.socialTitle}>
                Follow us on Social Media for a surprise!
              </Text>
              <Text style={styles.companyNameFooter}>Crystal Transfer</Text>
            </View> */}

            <View style={styles.contactRight}>
              <Text style={styles.qrTitle}>Scan and Join our Community</Text>
              <View style={styles.footerQrContainer}>
                <QRCode
                  value='https://crystaltransfer.mv'
                  size={45}
                  backgroundColor='white'
                  color='#1e40af'
                />
              </View>
            </View>
          </View>

          {/* Cutting Line with Scissors */}
          <View style={styles.cuttingLine}>
            <View style={styles.cuttingDots}>
              {Array.from({ length: 20 }).map((_, index) => (
                <View key={index} style={styles.dot} />
              ))}
            </View>
            <View style={styles.scissorsContainer}>
              <Scissors size={16} color='#94a3b8' style={styles.scissorsIcon} />
            </View>
          </View>

          {/* Ticket Stub Footer */}
          <View style={styles.ticketStub}>
            <View style={styles.stubContent}>
              <View style={styles.stubLeft}>
                <Text style={styles.stubTitle}>CRYSTAL TRANSFER VAAVU</Text>
                <Text style={styles.stubBookingNumber}>
                  #{booking.bookingNumber}
                </Text>
                <Text style={styles.stubRoute}>
                  {booking.route.fromIsland.name} →{' '}
                  {booking.route.toIsland.name}
                </Text>
              </View>
              <View style={styles.stubCenter}>
                <Text style={styles.stubDate}>
                  {formatBookingDate(booking.departureDate)}
                </Text>
                <Text style={styles.stubTime}>
                  {formatTimeAMPM(booking.departureTime)}
                </Text>
              </View>
              <View style={styles.stubRight}>
                <QRCode
                  value={booking.qrCodeUrl || booking.bookingNumber}
                  size={30}
                  backgroundColor='white'
                  color='#1e40af'
                />
              </View>
            </View>
            <Text style={styles.stubFooter}>
              Keep this stub for verification • Present at boarding
            </Text>
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
    paddingVertical: 15,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },
  companyName: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  companySubtitle: {
    color: 'white',
    fontSize: 14,
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
    fontSize: 18,
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
    fontSize: 18,
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
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  policyColumn: {
    flex: 1,
    paddingHorizontal: 8,
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  contactLeft: {
    flex: 2,
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
    fontSize: 8,
    marginBottom: 6,
    lineHeight: 10,
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
