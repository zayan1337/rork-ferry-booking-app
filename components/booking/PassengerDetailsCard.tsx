import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Card from '@/components/Card';
import Colors from '@/constants/colors';

interface Passenger {
  fullName?: string;
  passenger_name?: string;
  idNumber?: string;
  id_number?: string;
  specialAssistance?: string;
  special_assistance_request?: string;
  contactNumber?: string;
  passenger_contact_number?: string;
}

interface Seat {
  number?: string;
}

interface PassengerDetailsCardProps {
  passengers: Passenger[];
  seats?: Seat[];
}

const PassengerDetailsCard: React.FC<PassengerDetailsCardProps> = ({
  passengers,
  seats = [],
}) => {
  if (!passengers || passengers.length === 0) {
    return null;
  }

  return (
    <Card variant="elevated" style={styles.passengersCard}>
      <Text style={styles.cardTitle}>Passenger Details</Text>

      {passengers.map((passenger, index) => (
        <View key={index} style={styles.passengerItem}>
          <View style={styles.passengerHeader}>
            <Text style={styles.passengerName}>
              {passenger.fullName || passenger.passenger_name || `Passenger ${index + 1}`}
            </Text>
            <Text style={styles.seatNumber}>
              Seat: {seats[index]?.number || 'N/A'}
            </Text>
          </View>

          {(passenger.idNumber || passenger.id_number) && (
            <Text style={styles.passengerDetail}>
              ID: {passenger.idNumber || passenger.id_number}
            </Text>
          )}

          {(passenger.specialAssistance || passenger.special_assistance_request) && (
            <Text style={styles.passengerDetail}>
              Special Assistance: {passenger.specialAssistance || passenger.special_assistance_request}
            </Text>
          )}

          {(passenger.contactNumber || passenger.passenger_contact_number) && (
            <Text style={styles.passengerDetail}>
              Contact: {passenger.contactNumber || passenger.passenger_contact_number}
            </Text>
          )}
        </View>
      ))}
    </Card>
  );
};

const styles = StyleSheet.create({
  passengersCard: {
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
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
});

export default PassengerDetailsCard; 