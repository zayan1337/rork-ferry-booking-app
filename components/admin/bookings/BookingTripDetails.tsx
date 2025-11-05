import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '@/constants/adminColors';
import { AdminBooking } from '@/types/admin/management';
import { Calendar, MapPin, Ship, Route } from 'lucide-react-native';

interface BookingTripDetailsProps {
  booking: AdminBooking;
  boardingStopName?: string | null;
  destinationStopName?: string | null;
  boardingStop?: any | null;
  destinationStop?: any | null;
  bookingSegment?: any | null;
}

export default function BookingTripDetails({
  booking,
  boardingStopName,
  destinationStopName,
  boardingStop,
  destinationStop,
  bookingSegment,
}: BookingTripDetailsProps) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Route size={20} color={colors.primary} />
        <Text style={styles.title}>Trip Details</Text>
      </View>

      <View style={styles.section}>
        {/* Boarding/Departure Stop Details */}
        {(bookingSegment ||
          boardingStop ||
          boardingStopName ||
          booking.from_island_name) && (
          <View style={styles.row}>
            <View style={styles.iconContainer}>
              <MapPin size={20} color={colors.success} />
            </View>
            <View style={styles.content}>
              <Text style={styles.label}>Boarding Point</Text>
              <Text style={styles.value}>
                {boardingStop?.island?.name ||
                  boardingStopName ||
                  booking.from_island_name ||
                  'Unknown'}
              </Text>
              {(bookingSegment?.boarding_stop?.island?.zone ||
                boardingStop?.island?.zone) && (
                <Text style={styles.subValue}>
                  Zone:{' '}
                  {bookingSegment?.boarding_stop?.island?.zone ||
                    boardingStop?.island?.zone}
                </Text>
              )}
            </View>
          </View>
        )}

        {/* Dropoff/Destination Stop Details - Using booking_segments table */}
        {(bookingSegment ||
          destinationStop ||
          destinationStopName ||
          booking.to_island_name) && (
          <View style={styles.row}>
            <View style={styles.iconContainer}>
              <MapPin size={20} color={colors.warning} />
            </View>
            <View style={styles.content}>
              <Text style={styles.label}>Dropoff Point</Text>
              <Text style={styles.value}>
                {destinationStop?.island?.name ||
                  destinationStopName ||
                  booking.to_island_name ||
                  'Unknown'}
              </Text>
              {(bookingSegment?.destination_stop?.island?.zone ||
                destinationStop?.island?.zone) && (
                <Text style={styles.subValue}>
                  Zone:{' '}
                  {bookingSegment?.destination_stop?.island?.zone ||
                    destinationStop?.island?.zone}
                </Text>
              )}
            </View>
          </View>
        )}

        {booking.vessel_name && (
          <View style={styles.row}>
            <View style={styles.iconContainer}>
              <Ship size={20} color={colors.primary} />
            </View>
            <View style={styles.content}>
              <Text style={styles.label}>Vessel</Text>
              <Text style={styles.value}>{booking.vessel_name}</Text>
              {booking.vessel_capacity && (
                <Text style={styles.subValue}>
                  Capacity: {booking.vessel_capacity} passengers
                </Text>
              )}
            </View>
          </View>
        )}

        {booking.is_round_trip && booking.return_booking_id && (
          <View style={styles.row}>
            <View style={styles.iconContainer}>
              <Calendar size={20} color={colors.warning} />
            </View>
            <View style={styles.content}>
              <Text style={styles.label}>Round Trip</Text>
              <Text style={styles.value}>
                Return Booking: #{booking.return_booking_id}
              </Text>
            </View>
          </View>
        )}
      </View>
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
  section: {
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  label: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
    fontWeight: '500',
  },
  value: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '600',
    marginBottom: 2,
  },
  subValue: {
    fontSize: 14,
    color: colors.textSecondary,
  },
});
