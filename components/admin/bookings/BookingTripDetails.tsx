import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '@/constants/adminColors';
import { AdminBooking } from '@/types/admin/management';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Ship,
  Route,
  DollarSign,
} from 'lucide-react-native';
import {
  formatDate,
  formatTime,
  formatCurrency,
} from '@/utils/admin/bookingManagementUtils';
import { getBookingSegment } from '@/utils/segmentBookingUtils';

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
  const [routeDisplay, setRouteDisplay] = useState<{
    from: string;
    to: string;
  } | null>(null);

  useEffect(() => {
    const loadRouteDisplay = async () => {
      // Prioritize booking's from_island_name and to_island_name (from booking, not route)
      if (booking.from_island_name && booking.to_island_name) {
        setRouteDisplay({
          from: booking.from_island_name,
          to: booking.to_island_name,
        });
        return;
      }

      // For multi-stop routes, use provided props or fetch booking segment
      if (boardingStopName && destinationStopName) {
        setRouteDisplay({
          from: boardingStopName,
          to: destinationStopName,
        });
      } else {
        // Try to fetch booking segment if props not provided
        try {
          const bookingSegment = await getBookingSegment(booking.id);
          if (bookingSegment) {
            const boardingStop = bookingSegment.boarding_stop;
            const destinationStop = bookingSegment.destination_stop;

            setRouteDisplay({
              from: boardingStop?.island?.name || 'Unknown',
              to: destinationStop?.island?.name || 'Unknown',
            });
          } else {
            setRouteDisplay({
              from: 'Unknown',
              to: 'Unknown',
            });
          }
        } catch (err: any) {
          // If booking segment doesn't exist, it's okay
          if (err?.code !== 'PGRST116') {
            console.error('Error loading booking segment:', err);
          }
          setRouteDisplay({
            from: 'Multi-stop Route',
            to: '',
          });
        }
      }
    };

    loadRouteDisplay();
  }, [booking, boardingStopName, destinationStopName]);
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Route size={20} color={colors.primary} />
        <Text style={styles.title}>Trip Details</Text>
      </View>

      <View style={styles.section}>
        <View style={styles.row}>
          <View style={styles.iconContainer}>
            <MapPin size={20} color={colors.primary} />
          </View>
          <View style={styles.content}>
            <Text style={styles.label}>Route</Text>
            <Text style={styles.value}>
              {routeDisplay
                ? routeDisplay.to
                  ? `${routeDisplay.from} → ${routeDisplay.to}`
                  : routeDisplay.from
                : booking.from_island_name && booking.to_island_name
                  ? `${booking.from_island_name} → ${booking.to_island_name}`
                  : 'Loading route...'}
            </Text>
            {booking.route_name && (
              <Text style={styles.subValue}>{booking.route_name}</Text>
            )}
          </View>
        </View>

        {/* Boarding/Departure Stop Details - Using booking_segments table */}
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
              {bookingSegment && (
                <>
                  <Text style={styles.subValue}>
                    Stop Sequence: #{bookingSegment.boarding_stop_sequence}
                  </Text>
                  {bookingSegment.boarding_stop && (
                    <>
                      {bookingSegment.boarding_stop.island?.zone && (
                        <Text style={styles.subValue}>
                          Zone: {bookingSegment.boarding_stop.island.zone}
                        </Text>
                      )}
                      {bookingSegment.boarding_stop.stop_type && (
                        <Text style={styles.subValue}>
                          Type:{' '}
                          {bookingSegment.boarding_stop.stop_type.replace(
                            '_',
                            ' '
                          )}
                        </Text>
                      )}
                      {bookingSegment.boarding_stop.notes && (
                        <Text style={styles.subValue}>
                          Note: {bookingSegment.boarding_stop.notes}
                        </Text>
                      )}
                    </>
                  )}
                </>
              )}
              {!bookingSegment && boardingStop && (
                <>
                  {boardingStop.island?.zone && (
                    <Text style={styles.subValue}>
                      Zone: {boardingStop.island.zone}
                    </Text>
                  )}
                  <Text style={styles.subValue}>
                    Stop #{boardingStop.stop_sequence}
                    {boardingStop.stop_type && (
                      <> • {boardingStop.stop_type.replace('_', ' ')}</>
                    )}
                  </Text>
                  {boardingStop.notes && (
                    <Text style={styles.subValue}>
                      Note: {boardingStop.notes}
                    </Text>
                  )}
                </>
              )}
              {!bookingSegment && !boardingStop && booking.from_island_name && (
                <Text style={styles.subValue}>Origin</Text>
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
              {bookingSegment && (
                <>
                  <Text style={styles.subValue}>
                    Stop Sequence: #{bookingSegment.destination_stop_sequence}
                  </Text>
                  {bookingSegment.fare_amount && (
                    <Text style={styles.subValue}>
                      Segment Fare:{' '}
                      {formatCurrency(Number(bookingSegment.fare_amount))}
                    </Text>
                  )}
                  {bookingSegment.destination_stop_sequence &&
                    bookingSegment.boarding_stop_sequence && (
                      <Text style={styles.subValue}>
                        Segments Traveled:{' '}
                        {bookingSegment.destination_stop_sequence -
                          bookingSegment.boarding_stop_sequence}
                      </Text>
                    )}
                  {bookingSegment.destination_stop && (
                    <>
                      {bookingSegment.destination_stop.island?.zone && (
                        <Text style={styles.subValue}>
                          Zone: {bookingSegment.destination_stop.island.zone}
                        </Text>
                      )}
                      {bookingSegment.destination_stop.stop_type && (
                        <Text style={styles.subValue}>
                          Type:{' '}
                          {bookingSegment.destination_stop.stop_type.replace(
                            '_',
                            ' '
                          )}
                        </Text>
                      )}
                      {bookingSegment.destination_stop
                        .estimated_travel_time && (
                        <Text style={styles.subValue}>
                          Travel time:{' '}
                          {
                            bookingSegment.destination_stop
                              .estimated_travel_time
                          }{' '}
                          minutes
                        </Text>
                      )}
                      {bookingSegment.destination_stop.notes && (
                        <Text style={styles.subValue}>
                          Note: {bookingSegment.destination_stop.notes}
                        </Text>
                      )}
                    </>
                  )}
                </>
              )}
              {!bookingSegment && destinationStop && (
                <>
                  {destinationStop.island?.zone && (
                    <Text style={styles.subValue}>
                      Zone: {destinationStop.island.zone}
                    </Text>
                  )}
                  <Text style={styles.subValue}>
                    Stop #{destinationStop.stop_sequence}
                    {destinationStop.stop_type && (
                      <> • {destinationStop.stop_type.replace('_', ' ')}</>
                    )}
                  </Text>
                  {destinationStop.estimated_travel_time && (
                    <Text style={styles.subValue}>
                      Travel time: {destinationStop.estimated_travel_time}{' '}
                      minutes
                    </Text>
                  )}
                  {destinationStop.notes && (
                    <Text style={styles.subValue}>
                      Note: {destinationStop.notes}
                    </Text>
                  )}
                </>
              )}
              {!bookingSegment &&
                !destinationStop &&
                booking.to_island_name && (
                  <Text style={styles.subValue}>Destination</Text>
                )}
            </View>
          </View>
        )}

        <View style={styles.row}>
          <View style={styles.iconContainer}>
            <Calendar size={20} color={colors.primary} />
          </View>
          <View style={styles.content}>
            <Text style={styles.label}>Travel Date</Text>
            <Text style={styles.value}>
              {formatDate(booking.trip_travel_date || booking.created_at)}
            </Text>
          </View>
        </View>

        <View style={styles.row}>
          <View style={styles.iconContainer}>
            <Clock size={20} color={colors.primary} />
          </View>
          <View style={styles.content}>
            <Text style={styles.label}>Departure Time</Text>
            <Text style={styles.value}>
              {formatTime(booking.trip_departure_time || '00:00')}
            </Text>
          </View>
        </View>

        <View style={styles.row}>
          <View style={styles.iconContainer}>
            <Users size={20} color={colors.primary} />
          </View>
          <View style={styles.content}>
            <Text style={styles.label}>Passengers</Text>
            <Text style={styles.value}>
              {booking.passenger_count || 1} passenger(s)
            </Text>
            {booking.agent_id && (
              <Text style={styles.subValue}>
                Booked by: {booking.agent_name || 'Agent'}
              </Text>
            )}
          </View>
        </View>

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
      </View>

      <View style={styles.tripInfo}>
        <View style={styles.infoHeader}>
          <DollarSign size={16} color={colors.textSecondary} />
          <Text style={styles.infoTitle}>Fare Information</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Trip Type:</Text>
          <Text style={styles.infoValue}>
            {booking.is_round_trip ? 'Round Trip' : 'One Way'}
          </Text>
        </View>

        {booking.is_round_trip && booking.return_booking_id && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Return Booking:</Text>
            <Text style={styles.infoValue}>#{booking.return_booking_id}</Text>
          </View>
        )}

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Base Fare:</Text>
          <Text style={styles.infoValue}>
            {formatCurrency(booking.trip_base_fare || 0)}
          </Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Total Fare:</Text>
          <Text style={[styles.infoValue, styles.totalFare]}>
            {formatCurrency(booking.total_fare || 0)}
          </Text>
        </View>
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
  tripInfo: {
    borderTopWidth: 1,
    borderTopColor: `${colors.border}40`,
    paddingTop: 16,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '600',
  },
  totalFare: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: '700',
  },
});
