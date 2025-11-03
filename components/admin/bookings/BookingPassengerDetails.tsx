import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { colors } from '@/constants/adminColors';
import { AdminBooking } from '@/types/admin/management';
import { Users, Phone, MapPin, AlertCircle } from 'lucide-react-native';
import { supabase } from '@/utils/supabase';

interface Passenger {
  id: string;
  booking_id: string;
  seat_id?: string;
  passenger_name: string;
  passenger_contact_number: string;
  special_assistance_request?: string;
  seat_number?: string;
  seat_row?: string;
  seat_column?: string;
}

interface BookingPassengerDetailsProps {
  booking: AdminBooking;
}

export default function BookingPassengerDetails({
  booking,
}: BookingPassengerDetailsProps) {
  const [passengers, setPassengers] = useState<Passenger[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPassengers = async () => {
      try {
        setLoading(true);

        // Fetch passengers with seat information
        const { data, error } = await supabase
          .from('passengers')
          .select(
            `
             id,
             booking_id,
             seat_id,
             passenger_name,
             passenger_contact_number,
             special_assistance_request,
             seats (
               seat_number,
               row_number,
               position_x
             )
           `
          )
          .eq('booking_id', booking.id);

        if (error) throw error;

        // Transform the data to include seat information
        const transformedPassengers =
          data?.map(passenger => {
            const seat = Array.isArray(passenger.seats)
              ? passenger.seats[0]
              : passenger.seats;
            return {
              id: passenger.id,
              booking_id: passenger.booking_id,
              seat_id: passenger.seat_id,
              passenger_name: passenger.passenger_name,
              passenger_contact_number: passenger.passenger_contact_number,
              special_assistance_request: passenger.special_assistance_request,
              seat_number: seat?.seat_number,
              seat_row: seat?.row_number?.toString(),
              seat_column: seat?.position_x?.toString(),
            };
          }) || [];

        setPassengers(transformedPassengers);
      } catch (error) {
        console.error('Error fetching passengers:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPassengers();
  }, [booking.id]);

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Users size={20} color={colors.primary} />
          <Text style={styles.title}>Passenger Details</Text>
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading passenger details...</Text>
        </View>
      </View>
    );
  }

  if (passengers.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Users size={20} color={colors.primary} />
          <Text style={styles.title}>Passenger Details</Text>
        </View>
        <View style={styles.emptyContainer}>
          <AlertCircle size={48} color={colors.textSecondary} />
          <Text style={styles.emptyText}>No passenger details available</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Users size={20} color={colors.primary} />
        <Text style={styles.title}>Passenger Details</Text>
      </View>

      <ScrollView
        style={styles.passengersContainer}
        showsVerticalScrollIndicator={false}
      >
        {passengers.map((passenger, index) => (
          <View key={passenger.id} style={styles.passengerCard}>
            <View style={styles.passengerHeader}>
              <View style={styles.passengerNumber}>
                <Text style={styles.passengerNumberText}>{index + 1}</Text>
              </View>
              <View style={styles.passengerInfo}>
                <Text style={styles.passengerName}>
                  {passenger.passenger_name}
                </Text>
                <View style={styles.contactRow}>
                  <Phone size={16} color={colors.textSecondary} />
                  <Text style={styles.contactText}>
                    {passenger.passenger_contact_number}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.seatSection}>
              <View style={styles.seatRow}>
                <MapPin size={16} color={colors.primary} />
                <Text style={styles.seatLabel}>Seat:</Text>
                <Text style={styles.seatValue}>
                  {passenger.seat_number ||
                    (passenger.seat_row && passenger.seat_column
                      ? `Row ${passenger.seat_row}, Seat ${passenger.seat_column}`
                      : 'Not assigned')}
                </Text>
              </View>

              {passenger.special_assistance_request && (
                <View style={styles.assistanceRow}>
                  <AlertCircle size={16} color={colors.warning} />
                  <Text style={styles.assistanceLabel}>
                    Special Assistance:
                  </Text>
                  <Text style={styles.assistanceValue}>
                    {passenger.special_assistance_request}
                  </Text>
                </View>
              )}
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  loadingText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  passengersContainer: {
    maxHeight: 300,
  },
  passengerCard: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  passengerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  passengerNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  passengerNumberText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  passengerInfo: {
    flex: 1,
  },
  passengerName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  contactText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  seatSection: {
    gap: 8,
  },
  seatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  seatLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  seatValue: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '600',
  },
  assistanceRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  assistanceLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
    flexShrink: 0,
  },
  assistanceValue: {
    fontSize: 14,
    color: colors.text,
    flex: 1,
  },
});
