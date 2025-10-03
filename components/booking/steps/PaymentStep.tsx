import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Dropdown from '@/components/Dropdown';
import { formatCurrency } from '@/utils/agentFormatters';
import { AGENT_PAYMENT_OPTIONS } from '@/utils/bookingFormUtils';
import Colors from '@/constants/colors';
import type { AgentClient, Route } from '@/types/agent';
import type { Seat, Passenger } from '@/types';

interface PaymentStepProps {
  // Booking data for summary
  client: AgentClient | null;
  tripType: 'one_way' | 'round_trip' | null;
  route: Route | null;
  returnRoute: Route | null;
  departureDate: string | null;
  returnDate: string | null;
  selectedSeats: Seat[];
  selectedReturnSeats: Seat[];
  passengers: Passenger[];

  // Fare calculation
  totalFare: number;
  discountedFare?: number;
  agent: any;

  // Payment method
  paymentMethod: string | null;
  onPaymentMethodChange: (method: string) => void;

  // Terms acceptance
  termsAccepted: boolean;
  onTermsToggle: () => void;

  // Validation
  errors: {
    paymentMethod?: string;
    terms?: string;
  };
  clearError: (field: string) => void;
}

const PaymentStep: React.FC<PaymentStepProps> = ({
  client,
  tripType,
  route,
  returnRoute,
  departureDate,
  returnDate,
  selectedSeats,
  selectedReturnSeats,
  passengers,
  totalFare,
  discountedFare,
  agent,
  paymentMethod,
  onPaymentMethodChange,
  termsAccepted,
  onTermsToggle,
  errors,
  clearError,
}) => {
  const summaryData = {
    clientName: client?.name || 'N/A',
    tripType: tripType === 'one_way' ? 'One Way' : 'Round Trip',
    routeDisplay: route
      ? `${route.from_island?.name || 'Unknown'} → ${route.to_island?.name || 'Unknown'}`
      : 'N/A',
    returnRouteDisplay: returnRoute
      ? `${returnRoute.from_island?.name || 'Unknown'} → ${returnRoute.to_island?.name || 'Unknown'}`
      : null,
    departureDate: departureDate
      ? new Date(departureDate).toLocaleDateString()
      : 'N/A',
    returnDate: returnDate ? new Date(returnDate).toLocaleDateString() : null,
    passengerCount: String(passengers?.length || 0),
    seatNumbers: selectedSeats?.map(seat => seat.number).join(', ') || 'None',
    returnSeatNumbers:
      selectedReturnSeats?.length > 0
        ? selectedReturnSeats.map(seat => seat.number).join(', ')
        : null,
  };

  const handlePaymentMethodChange = (method: string) => {
    onPaymentMethodChange(method);
    if (errors.paymentMethod) clearError('paymentMethod');
  };

  const handleTermsToggle = () => {
    onTermsToggle();
    if (errors.terms) clearError('terms');
  };

  const finalAmount = agent && discountedFare ? discountedFare : totalFare;

  return (
    <View>
      <Text style={styles.stepTitle}>Payment & Confirmation</Text>

      {/* Booking Summary */}
      <View style={styles.summaryContainer}>
        <Text style={styles.summaryTitle}>Booking Summary</Text>

        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Client:</Text>
          <Text style={styles.summaryValue}>{summaryData.clientName}</Text>
        </View>

        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Trip Type:</Text>
          <Text style={styles.summaryValue}>{summaryData.tripType}</Text>
        </View>

        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Route:</Text>
          <Text style={styles.summaryValue}>{summaryData.routeDisplay}</Text>
        </View>

        {summaryData.returnRouteDisplay && (
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Return Route:</Text>
            <Text style={styles.summaryValue}>
              {summaryData.returnRouteDisplay}
            </Text>
          </View>
        )}

        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Departure Date:</Text>
          <Text style={styles.summaryValue}>{summaryData.departureDate}</Text>
        </View>

        {summaryData.returnDate && (
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Return Date:</Text>
            <Text style={styles.summaryValue}>{summaryData.returnDate}</Text>
          </View>
        )}

        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Passengers:</Text>
          <Text style={styles.summaryValue}>{summaryData.passengerCount}</Text>
        </View>

        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Seats:</Text>
          <Text style={styles.summaryValue}>{summaryData.seatNumbers}</Text>
        </View>

        {summaryData.returnSeatNumbers && (
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Return Seats:</Text>
            <Text style={styles.summaryValue}>
              {summaryData.returnSeatNumbers}
            </Text>
          </View>
        )}

        {/* Fare Breakdown */}
        <View style={styles.fareBreakdown}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Base Amount:</Text>
            <Text style={styles.summaryValue}>{formatCurrency(totalFare)}</Text>
          </View>

          {agent && discountedFare && discountedFare < totalFare && (
            <>
              <View style={styles.summaryRow}>
                <Text style={styles.discountLabel}>Agent Discount:</Text>
                <Text style={styles.discountValue}>
                  -{formatCurrency(totalFare - discountedFare)}
                </Text>
              </View>
            </>
          )}

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Amount:</Text>
            <Text style={styles.totalValue}>{formatCurrency(finalAmount)}</Text>
          </View>
        </View>
      </View>

      {/* Payment Method Selection */}
      <Dropdown
        label='Payment Method'
        items={[...AGENT_PAYMENT_OPTIONS]}
        value={paymentMethod || ''}
        onChange={handlePaymentMethodChange}
        placeholder='Select payment method'
        error={errors.paymentMethod}
        required
      />

      {/* Terms and Conditions */}
      <View style={styles.termsContainer}>
        <TouchableOpacity style={styles.checkbox} onPress={handleTermsToggle}>
          <View
            style={[
              styles.checkboxInner,
              termsAccepted && styles.checkboxChecked,
            ]}
          />
        </TouchableOpacity>
        <Text style={styles.termsText}>
          I accept the{' '}
          <Text style={styles.termsLink}>Terms and Conditions</Text> and confirm
          that all booking details are correct
        </Text>
      </View>

      {errors.terms && <Text style={styles.errorText}>{errors.terms}</Text>}

      {errors.paymentMethod && (
        <Text style={styles.errorText}>{errors.paymentMethod}</Text>
      )}

      {/* Payment Information */}
      <View style={styles.paymentInfoContainer}>
        <Text style={styles.paymentInfoTitle}>Payment Information</Text>
        <Text style={styles.paymentInfoText}>
          • Agent Credit: Deducted immediately from your agent account
        </Text>
        <Text style={styles.paymentInfoText}>
          • MIB Payment Gateway: Secure online payment processing via MIB
        </Text>
        <Text style={styles.paymentInfoText}>
          • Free Ticket: Using available free ticket allocation
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  stepTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 24,
    textAlign: 'center',
  },
  summaryContainer: {
    marginBottom: 24,
    padding: 16,
    backgroundColor: Colors.highlight,
    borderRadius: 8,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
    textAlign: 'right',
    flex: 1,
    marginLeft: 8,
  },
  fareBreakdown: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  discountLabel: {
    fontSize: 14,
    color: Colors.success,
  },
  discountValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.success,
    textAlign: 'right',
    flex: 1,
    marginLeft: 8,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.primary,
  },
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 24,
    marginBottom: 16,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 4,
    marginRight: 12,
    marginTop: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxInner: {
    width: 12,
    height: 12,
    borderRadius: 2,
  },
  checkboxChecked: {
    backgroundColor: Colors.primary,
  },
  termsText: {
    flex: 1,
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
  },
  termsLink: {
    color: Colors.primary,
    fontWeight: '600',
  },
  errorText: {
    fontSize: 14,
    color: Colors.error,
    marginBottom: 16,
    textAlign: 'center',
  },
  paymentInfoContainer: {
    marginTop: 24,
    padding: 16,
    backgroundColor: Colors.highlight,
    borderRadius: 8,
  },
  paymentInfoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  paymentInfoText: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 6,
    lineHeight: 20,
  },
});

export default PaymentStep;
