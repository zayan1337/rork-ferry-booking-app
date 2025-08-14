import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Input from '@/components/Input';
import Colors from '@/constants/colors';
import type { Passenger, Seat } from '@/types';

interface PassengerDetailsStepProps {
  // Passenger data
  passengers: Passenger[];
  onPassengerChange: (
    index: number,
    field: keyof Passenger,
    value: string
  ) => void;

  // Seat information for reference
  selectedSeats: Seat[];
  selectedReturnSeats?: Seat[];
  tripType: 'one_way' | 'round_trip' | null;

  // Validation
  errors: {
    passengers?: string;
  };
  clearError: (field: string) => void;
}

const PassengerDetailsStep: React.FC<PassengerDetailsStepProps> = ({
  passengers,
  onPassengerChange,
  selectedSeats,
  selectedReturnSeats,
  tripType,
  errors,
  clearError,
}) => {
  const handlePassengerChange = (
    index: number,
    field: keyof Passenger,
    value: string
  ) => {
    onPassengerChange(index, field, value);
    if (errors.passengers) clearError('passengers');
  };

  const getSeatInfo = (index: number) => {
    const departureSeat = selectedSeats[index]?.number;
    const returnSeat = selectedReturnSeats?.[index]?.number;

    if (tripType === 'round_trip' && returnSeat) {
      return `Seats: ${departureSeat} (Departure), ${returnSeat} (Return)`;
    }
    return `Seat: ${departureSeat}`;
  };

  return (
    <View>
      <Text style={styles.stepTitle}>Passenger Details</Text>

      <Text style={styles.subtitle}>
        Please provide details for all passengers
      </Text>

      {passengers.map((passenger, index) => (
        <View key={index} style={styles.passengerContainer}>
          <Text style={styles.passengerTitle}>Passenger {index + 1}</Text>

          <Text style={styles.seatInfo}>{getSeatInfo(index)}</Text>

          <Input
            label='Full Name'
            placeholder="Enter passenger's full name"
            value={passenger.fullName}
            onChangeText={text =>
              handlePassengerChange(index, 'fullName', text)
            }
            required
          />

          <Input
            label='ID Number (Optional)'
            placeholder='Enter ID number (passport, national ID, etc.)'
            value={passenger.idNumber || ''}
            onChangeText={text =>
              handlePassengerChange(index, 'idNumber', text)
            }
          />

          <Input
            label='Special Assistance (Optional)'
            placeholder='Any special requirements or assistance needed?'
            value={passenger.specialAssistance || ''}
            onChangeText={text =>
              handlePassengerChange(index, 'specialAssistance', text)
            }
            multiline
            numberOfLines={2}
          />
        </View>
      ))}

      {errors.passengers && (
        <Text style={styles.errorText}>{errors.passengers}</Text>
      )}

      <View style={styles.infoContainer}>
        <Text style={styles.infoTitle}>Important Information</Text>
        <Text style={styles.infoText}>
          • Full names must match official identification documents
        </Text>
        <Text style={styles.infoText}>
          • ID numbers help with faster check-in processing
        </Text>
        <Text style={styles.infoText}>
          • Special assistance requests will be communicated to the vessel crew
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
    marginBottom: 16,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  passengerContainer: {
    marginBottom: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  passengerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  seatInfo: {
    fontSize: 14,
    color: Colors.primary,
    marginBottom: 16,
    fontWeight: '500',
  },
  errorText: {
    fontSize: 14,
    color: Colors.error,
    marginBottom: 16,
    textAlign: 'center',
  },
  infoContainer: {
    marginTop: 16,
    padding: 16,
    backgroundColor: Colors.highlight,
    borderRadius: 8,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 6,
    lineHeight: 20,
  },
});

export default PassengerDetailsStep;
