import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import SeatSelector from '@/components/SeatSelector';
import { formatCurrency } from '@/utils/agentFormatters';
import Colors from '@/constants/colors';
import type { Seat } from '@/types';

interface SeatSelectionStepProps {
  // Seat data
  availableSeats: Seat[] | null;
  availableReturnSeats: Seat[] | null;
  selectedSeats: Seat[];
  selectedReturnSeats: Seat[];
  
  // Seat selection handlers
  onSeatToggle: (seat: Seat, isReturn?: boolean) => void;
  
  // Trip type
  tripType: 'one_way' | 'round_trip' | null;
  
  // Loading state
  isLoading: boolean;
  
  // Fare calculation
  totalFare: number;
  discountRate?: number;
  discountedFare?: number;
  agent: any;
  
  // Validation
  errors: {
    seats?: string;
  };
  clearError: (field: string) => void;
}

const SeatSelectionStep: React.FC<SeatSelectionStepProps> = ({
  availableSeats,
  availableReturnSeats,
  selectedSeats,
  selectedReturnSeats,
  onSeatToggle,
  tripType,
  isLoading,
  totalFare,
  discountRate,
  discountedFare,
  agent,
  errors,
  clearError,
}) => {
  const handleSeatToggle = (seat: Seat, isReturn = false) => {
    onSeatToggle(seat, isReturn);
    if (errors.seats) clearError('seats');
  };

  return (
    <View>
      <Text style={styles.stepTitle}>Select Seats</Text>

      {/* Departure Seats */}
      <Text style={styles.seatSectionTitle}>Departure Seats</Text>
      {availableSeats ? (
        <SeatSelector
          seats={availableSeats}
          selectedSeats={selectedSeats}
          onSeatToggle={(seat) => handleSeatToggle(seat, false)}
          isLoading={isLoading}
        />
      ) : (
        <Text style={styles.loadingText}>Loading available seats...</Text>
      )}

      {/* Return Seats */}
      {tripType === 'round_trip' && (
        <>
          <Text style={styles.seatSectionTitle}>Return Seats</Text>
          {availableReturnSeats ? (
            <SeatSelector
              seats={availableReturnSeats}
              selectedSeats={selectedReturnSeats}
              onSeatToggle={(seat) => handleSeatToggle(seat, true)}
              isLoading={isLoading}
            />
          ) : (
            <Text style={styles.loadingText}>Loading available return seats...</Text>
          )}
        </>
      )}

      {/* Validation Error */}
      {errors.seats && (
        <Text style={styles.errorText}>{errors.seats}</Text>
      )}

      {/* Fare Summary */}
      {selectedSeats.length > 0 && (
        <View style={styles.fareContainer}>
          <View style={styles.fareRow}>
            <Text style={styles.fareLabel}>Total Fare:</Text>
            <Text style={styles.fareValue}>
              {formatCurrency(totalFare)}
            </Text>
          </View>

          {/* Agent Discount */}
          {agent && discountRate && discountRate > 0 && (
            <View style={styles.fareRow}>
              <Text style={styles.discountLabel}>
                Agent Discount ({discountRate}%):
              </Text>
              <Text style={styles.discountValue}>
                -{formatCurrency(totalFare * (discountRate / 100))}
              </Text>
            </View>
          )}

          {/* Discounted Fare */}
          {agent && discountedFare && discountedFare < totalFare && (
            <View style={[styles.fareRow, styles.finalFareRow]}>
              <Text style={styles.finalFareLabel}>Final Amount:</Text>
              <Text style={styles.finalFareValue}>
                {formatCurrency(discountedFare)}
              </Text>
            </View>
          )}
        </View>
      )}
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
  seatSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
    marginTop: 16,
  },
  loadingText: {
    fontSize: 14,
    color: Colors.primary,
    textAlign: 'center',
    padding: 20,
    fontStyle: 'italic',
  },
  errorText: {
    fontSize: 14,
    color: Colors.error,
    marginTop: 16,
    textAlign: 'center',
  },
  fareContainer: {
    marginTop: 24,
    padding: 16,
    backgroundColor: Colors.highlight,
    borderRadius: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  fareRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  fareLabel: {
    fontSize: 16,
    color: Colors.text,
  },
  fareValue: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.primary,
  },
  discountLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  discountValue: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.success,
  },
  finalFareRow: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  finalFareLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  finalFareValue: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.primary,
  },
});

export default SeatSelectionStep; 