import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Pressable,
  ScrollView,
  RefreshControl,
} from 'react-native';
import {
  Stack,
  useLocalSearchParams,
  useFocusEffect,
  router,
} from 'expo-router';
import {
  ArrowLeft,
  Users,
  CheckCircle,
  UserCheck,
  Clock,
  MapPin,
  Ship,
  Calendar,
  RefreshCw,
  ClipboardList,
  Ticket,
  ScanLine,
  Grid3X3,
  AlertCircle,
  Info,
  Phone,
  Mail,
} from 'lucide-react-native';

import { useCaptainStore } from '@/store/captainStore';
import { useAuthStore } from '@/store/authStore';
import { CaptainTrip } from '@/types/captain';
import { Seat } from '@/types';
import Colors from '@/constants/colors';
import Card from '@/components/Card';
import Button from '@/components/Button';
import { formatSimpleDate } from '@/utils/dateUtils';
import { formatTripTime } from '@/utils/tripUtils';
import { supabase } from '@/utils/supabase';

export default function CaptainTripDetailsScreen() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const { user } = useAuthStore();
  const {
    trips,
    passengers,
    loading,
    error,
    fetchTodayTrips,
    fetchTripPassengers,
    closeCheckin,
    updateTripStatus,
  } = useCaptainStore();

  const [trip, setTrip] = useState<CaptainTrip | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [allSeats, setAllSeats] = useState<any[]>([]);
  const [loadingSeats, setLoadingSeats] = useState(false);

  // Find the trip from trips
  useEffect(() => {
    if (tripId && trips.length > 0) {
      const foundTrip = trips.find(t => t.id === tripId);
      setTrip(foundTrip || null);
    }
  }, [tripId, trips]);

  // Fetch all seats for the vessel
  const fetchAllSeats = useCallback(async () => {
    if (!trip?.vessel_id) return;

    setLoadingSeats(true);
    try {
      // Get all seats for this vessel
      const { data: vesselSeats, error: seatsError } = await supabase
        .from('seats')
        .select(
          `
          id,
          seat_number,
          row_number,
          is_window,
          is_aisle,
          seat_type,
          seat_class,
          is_disabled,
          position_x,
          position_y
        `
        )
        .eq('vessel_id', trip.vessel_id)
        .order('row_number', { ascending: true })
        .order('position_x', { ascending: true });

      if (seatsError) throw seatsError;

      // Get seat reservations for this trip
      const { data: seatReservations, error: reservationsError } =
        await supabase
          .from('seat_reservations')
          .select(
            `
          seat_id,
          is_available,
          is_reserved,
          booking_id
        `
          )
          .eq('trip_id', tripId);

      if (reservationsError) throw reservationsError;

      // Create a map of seat reservations
      const reservationMap = new Map();
      (seatReservations || []).forEach((reservation: any) => {
        reservationMap.set(reservation.seat_id, reservation);
      });

      // Create a map of passenger seat assignments (only active bookings)
      const passengerSeatMap = new Map();
      const activeBookingPassengers = passengers.filter(
        p =>
          p.booking_status &&
          ['confirmed', 'checked_in', 'completed'].includes(p.booking_status)
      );

      activeBookingPassengers.forEach(passenger => {
        if (passenger.seat_number && passenger.seat_number !== 'Not assigned') {
          const seatNumber = passenger.seat_number.trim().toUpperCase();
          passengerSeatMap.set(seatNumber, {
            isBooked: true,
            isCheckedIn: passenger.check_in_status,
            passengerName: passenger.passenger_name,
          });
        }
      });

      // Process all seats with their status
      const processedSeats: Seat[] = (vesselSeats || []).map((seat: any) => {
        const reservation = reservationMap.get(seat.id);
        const seatNumberNormalized = seat.seat_number.trim().toUpperCase();
        const passengerInfo = passengerSeatMap.get(seatNumberNormalized);

        let isAvailable = true;
        let seatStatus = 'available';

        if (passengerInfo?.isBooked) {
          isAvailable = false;
          seatStatus = passengerInfo.isCheckedIn ? 'checked_in' : 'booked';
        } else if (reservation && !reservation.is_available) {
          isAvailable = false;
          seatStatus = 'booked';
        }

        return {
          id: seat.id,
          number: seatNumberNormalized,
          rowNumber: seat.row_number,
          isWindow: seat.is_window,
          isAisle: seat.is_aisle,
          isAvailable,
          seatType: seat.seat_type,
          seatClass: seat.seat_class,
          isDisabled: seat.is_disabled,
          positionX: seat.position_x,
          positionY: seat.position_y,
          // Custom properties for captain view
          seatStatus,
          passengerInfo,
        };
      });

      setAllSeats(processedSeats);
    } catch (error) {
      console.error('Error fetching seats:', error);
    } finally {
      setLoadingSeats(false);
    }
  }, [trip?.vessel_id, tripId, passengers]);

  // Load trip data
  const loadTripData = useCallback(async () => {
    if (!tripId) return;

    try {
      await Promise.all([fetchTodayTrips(), fetchTripPassengers(tripId)]);
    } catch (error) {
      console.error('Error loading trip data:', error);
    }
  }, [tripId, fetchTodayTrips, fetchTripPassengers]);

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadTripData();
    setRefreshing(false);
  }, [loadTripData]);

  // Fetch seats when trip or passengers change
  useEffect(() => {
    if (trip && passengers.length >= 0) {
      fetchAllSeats();
    }
  }, [trip, passengers, fetchAllSeats]);

  // Load data on focus
  useFocusEffect(
    useCallback(() => {
      loadTripData();
    }, [loadTripData])
  );

  // Remove this function from here - it will be moved below

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
        return Colors.primary;
      case 'boarding':
        return Colors.warning;
      case 'departed':
        return Colors.primary;
      case 'arrived':
        return Colors.success;
      case 'completed':
        return Colors.success;
      case 'cancelled':
        return Colors.error;
      case 'delayed':
        return Colors.error;
      default:
        return Colors.textSecondary;
    }
  };

  // Loading state
  if (loading.trips && !trip) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size='large' color={Colors.primary} />
        <Text style={styles.loadingText}>Loading trip details...</Text>
      </View>
    );
  }

  // Trip not found
  if (!trip) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Trip not found</Text>
        <Button title='Go Back' onPress={() => router.back()} />
      </View>
    );
  }

  // Filter only active bookings (exclude cancelled)
  const activePassengers = passengers.filter(
    p =>
      p.booking_status &&
      ['confirmed', 'checked_in', 'completed'].includes(p.booking_status)
  );
  const checkedInPassengers = activePassengers.filter(p => p.check_in_status);
  const totalPassengers = activePassengers.length;
  const checkedInCount = checkedInPassengers.length;
  const remainingToCheckIn = totalPassengers - checkedInCount;
  const checkInProgress =
    totalPassengers > 0 ? (checkedInCount / totalPassengers) * 100 : 0;

  // Handle close check-in
  const handleCloseCheckIn = () => {
    if (!trip || !tripId) return;

    // Check if check-in is already closed
    if (trip.is_checkin_closed) {
      Alert.alert(
        'Check-in Already Closed',
        'Check-in has already been closed for this trip.'
      );
      return;
    }

    Alert.alert(
      'Close Check-in',
      `Are you sure you want to close check-in for this trip?\n\n• A passenger manifest will be generated\n• No more passengers can check-in\n• Operation team will be notified via email\n\nPassengers: ${totalPassengers}\nChecked-in: ${checkedInCount}\nNo-show: ${remainingToCheckIn}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Close Check-in',
          style: 'destructive',
          onPress: async () => {
            try {
              const success = await closeCheckin({
                trip_id: tripId,
                captain_notes: `Trip completed with ${checkedInCount}/${totalPassengers} passengers checked-in.`,
                weather_conditions: '',
                delay_reason: '',
                actual_departure_time: new Date().toISOString(),
              });
              if (success) {
                Alert.alert(
                  'Check-in Closed Successfully',
                  `✅ Check-in has been closed\n✅ Passenger manifest generated\n✅ Operation team notified\n\nTotal passengers: ${totalPassengers}\nChecked-in: ${checkedInCount}\nNo-show: ${remainingToCheckIn}`,
                  [{ text: 'OK', onPress: () => router.back() }]
                );
              } else {
                Alert.alert(
                  'Error',
                  'Failed to close check-in. Please try again.'
                );
              }
            } catch (error) {
              console.error('Error closing check-in:', error);
              Alert.alert(
                'Error',
                'Failed to close check-in. Please try again.'
              );
            }
          },
        },
      ]
    );
  };

  // Helper function to get seat style based on status
  const getSeatStyle = (seat: Seat) => {
    if (seat.isDisabled || seat.seatType === 'disabled') {
      return styles.disabledSeat;
    }

    if (seat.seatType === 'crew') {
      return styles.crewSeat;
    }

    if (seat.seatType === 'premium') {
      return styles.premiumSeat;
    }

    // Use custom seatStatus for captain view
    const seatStatus = (seat as any).seatStatus;
    switch (seatStatus) {
      case 'checked_in':
        return styles.checkedInSeat;
      case 'booked':
        return styles.bookedSeat;
      case 'available':
      default:
        return styles.availableSeat;
    }
  };

  // Generate seat layout by rows (similar to SeatSelector)
  const generateSeatLayout = () => {
    if (!allSeats || allSeats.length === 0) return [];

    // Group seats by row number
    const seatsByRow = new Map<number, Seat[]>();
    allSeats.forEach(seat => {
      const rowNumber = seat.rowNumber;
      if (!seatsByRow.has(rowNumber)) {
        seatsByRow.set(rowNumber, []);
      }
      seatsByRow.get(rowNumber)!.push(seat);
    });

    // Sort rows and create layout
    const sortedRows = Array.from(seatsByRow.keys()).sort((a, b) => a - b);

    return sortedRows.map(rowNumber => {
      const rowSeats = seatsByRow.get(rowNumber) || [];
      rowSeats.sort((a, b) => (a.positionX || 0) - (b.positionX || 0));

      // Create seat groups with aisles based on isAisle property
      const seatGroups: Seat[][] = [];
      let currentGroup: Seat[] = [];

      rowSeats.forEach((seat, index) => {
        currentGroup.push(seat);

        // Check if there should be an aisle after this seat
        const nextSeat = rowSeats[index + 1];
        if (seat.isAisle && nextSeat) {
          seatGroups.push([...currentGroup]);
          currentGroup = [];
        } else if (
          nextSeat &&
          (nextSeat.positionX || 0) > (seat.positionX || 0) + 1
        ) {
          // Fallback: check for gaps in position
          seatGroups.push([...currentGroup]);
          currentGroup = [];
        }
      });

      if (currentGroup.length > 0) {
        seatGroups.push(currentGroup);
      }

      return {
        rowNumber,
        seatGroups,
        rowSeats,
      };
    });
  };

  // Render complete seating layout
  const renderSeatingLayout = () => {
    if (loadingSeats) {
      return (
        <View style={styles.loadingSeatsContainer}>
          <ActivityIndicator size='large' color={Colors.primary} />
          <Text style={styles.loadingSeatsText}>Loading seat layout...</Text>
        </View>
      );
    }

    if (!allSeats || allSeats.length === 0) {
      return (
        <View style={styles.noSeatsContainer}>
          <Text style={styles.noSeatsText}>No seat layout available</Text>
        </View>
      );
    }

    const seatLayout = generateSeatLayout();

    return (
      <View style={styles.ferryContainer}>
        {/* Ferry Label */}
        <View style={styles.ferryLabel}>
          <Text style={styles.ferryLabelText}>BOW</Text>
        </View>

        {/* Seat Layout */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.seatLayoutScroll}
          contentContainerStyle={styles.seatLayoutContent}
        >
          <View style={styles.ferryBody}>
            {seatLayout.map((rowData, rowIndex) => (
              <View key={rowData.rowNumber} style={styles.ferryRow}>
                {/* Row Number */}
                <View style={styles.rowLabelContainer}>
                  <Text style={styles.rowLabel}>{rowData.rowNumber}</Text>
                </View>

                {/* Seat Groups with Aisles */}
                <View style={styles.seatGroupsContainer}>
                  {rowData.seatGroups.map((group, groupIndex) => (
                    <React.Fragment key={groupIndex}>
                      <View style={styles.seatGroup}>
                        {group.map(seat => (
                          <View
                            key={seat.id}
                            style={[styles.seat, getSeatStyle(seat)]}
                          >
                            <Text style={styles.seatNumber}>{seat.number}</Text>
                            {seat.isWindow && (
                              <View style={styles.windowIndicator} />
                            )}
                          </View>
                        ))}
                      </View>
                      {groupIndex < rowData.seatGroups.length - 1 && (
                        <View style={styles.aisle} />
                      )}
                    </React.Fragment>
                  ))}
                </View>
              </View>
            ))}
          </View>
        </ScrollView>

        {/* Ferry Label */}
        <View style={styles.ferryLabel}>
          <Text style={styles.ferryLabelText}>STERN</Text>
        </View>
      </View>
    );
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          colors={[Colors.primary]}
          tintColor={Colors.primary}
        />
      }
    >
      <Stack.Screen
        options={{
          title: trip?.route_name || 'Trip Details',
          headerLeft: () => (
            <Pressable onPress={() => router.back()} style={styles.backButton}>
              <ArrowLeft size={24} color={Colors.primary} />
            </Pressable>
          ),
        }}
      />

      {/* Trip Info Card */}
      <Card style={styles.tripCard}>
        <View style={styles.tripHeader}>
          <View style={styles.tripIcon}>
            <Ship size={24} color={Colors.primary} />
          </View>
          <View style={styles.tripInfo}>
            <Text style={styles.tripTitle}>{trip.route_name}</Text>
            <Text style={styles.tripSubtitle}>{trip.vessel_name}</Text>
          </View>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: `${getStatusColor(trip.status)}20` },
            ]}
          >
            <Text
              style={[
                styles.statusText,
                { color: getStatusColor(trip.status) },
              ]}
            >
              {trip.status.toUpperCase()}
            </Text>
          </View>
        </View>

        <View style={styles.tripDetails}>
          <View style={styles.detailRow}>
            <View style={styles.detailItem}>
              <Calendar size={16} color={Colors.textSecondary} />
              <Text style={styles.detailText}>
                {formatSimpleDate(trip.travel_date)}
              </Text>
            </View>
            <View style={styles.detailItem}>
              <Clock size={16} color={Colors.textSecondary} />
              <Text style={styles.detailText}>
                {formatTripTime(trip.departure_time)}
              </Text>
            </View>
          </View>
          <View style={styles.detailRow}>
            <View style={styles.detailItem}>
              <MapPin size={16} color={Colors.textSecondary} />
              <Text style={styles.detailText}>
                {trip.from_island_name} → {trip.to_island_name}
              </Text>
            </View>
          </View>
        </View>
      </Card>

      {/* Passenger Summary */}
      <Card style={styles.summaryCard}>
        <View style={styles.summaryHeader}>
          <View style={styles.summaryIcon}>
            <Users size={20} color={Colors.primary} />
          </View>
          <Text style={styles.summaryTitle}>Passenger Summary</Text>
        </View>

        <View style={styles.summaryStats}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{totalPassengers}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: Colors.success }]}>
              {checkedInCount}
            </Text>
            <Text style={styles.statLabel}>Checked In</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: Colors.warning }]}>
              {remainingToCheckIn}
            </Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{trip.available_seats}</Text>
            <Text style={styles.statLabel}>Available</Text>
          </View>
        </View>

        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${checkInProgress}%`,
                  backgroundColor: Colors.success,
                },
              ]}
            />
          </View>
          <Text style={styles.progressText}>
            {Math.round(checkInProgress)}% Checked In
          </Text>
        </View>
      </Card>

      {/* Seat Availability Overview */}
      <Card style={styles.seatCard}>
        <View style={styles.seatHeader}>
          <View style={styles.seatIcon}>
            <Grid3X3 size={20} color={Colors.primary} />
          </View>
          <Text style={styles.seatTitle}>Seat Availability</Text>
        </View>

        <View style={styles.seatOverview}>
          <View style={styles.seatSummaryGrid}>
            <View style={styles.seatSummaryItem}>
              <View
                style={[
                  styles.seatIndicator,
                  { backgroundColor: Colors.success },
                ]}
              />
              <Text style={styles.seatSummaryLabel}>Booked & Checked In</Text>
              <Text style={styles.seatSummaryValue}>{checkedInCount}</Text>
            </View>
            <View style={styles.seatSummaryItem}>
              <View
                style={[
                  styles.seatIndicator,
                  { backgroundColor: Colors.warning },
                ]}
              />
              <Text style={styles.seatSummaryLabel}>
                Booked (Not Checked In)
              </Text>
              <Text style={styles.seatSummaryValue}>{remainingToCheckIn}</Text>
            </View>
            <View style={styles.seatSummaryItem}>
              <View
                style={[
                  styles.seatIndicator,
                  { backgroundColor: Colors.border },
                ]}
              />
              <Text style={styles.seatSummaryLabel}>Available</Text>
              <Text style={styles.seatSummaryValue}>
                {trip.available_seats}
              </Text>
            </View>
          </View>

          <View style={styles.capacityInfo}>
            <View style={styles.capacityRow}>
              <Text style={styles.capacityLabel}>Total Capacity:</Text>
              <Text style={styles.capacityValue}>{trip.capacity} seats</Text>
            </View>
            <View style={styles.capacityRow}>
              <Text style={styles.capacityLabel}>Occupancy Rate:</Text>
              <Text style={[styles.capacityValue, { color: Colors.primary }]}>
                {Math.round((totalPassengers / (trip.capacity || 1)) * 100)}%
              </Text>
            </View>
          </View>
        </View>

        {/* Complete Vessel Seating Layout */}
        <View style={styles.seatingLayout}>
          <Text style={styles.seatingLayoutTitle}>Complete Vessel Layout</Text>
          <Text style={styles.seatingSubtitle}>
            All seats with current booking status
          </Text>

          {/* Legend */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.legendContainer}
            contentContainerStyle={styles.legendContent}
          >
            <View style={styles.legendItem}>
              <View style={[styles.legendBox, styles.availableSeat]} />
              <Text style={styles.legendText}>Available</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendBox, styles.bookedSeat]} />
              <Text style={styles.legendText}>Booked</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendBox, styles.checkedInSeat]} />
              <Text style={styles.legendText}>Checked In</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendBox, styles.premiumSeat]} />
              <Text style={styles.legendText}>Premium</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendBox, styles.crewSeat]} />
              <Text style={styles.legendText}>Crew</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendBox, styles.disabledSeat]} />
              <Text style={styles.legendText}>Disabled</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={styles.windowIndicator} />
              <Text style={styles.legendText}>Window</Text>
            </View>
          </ScrollView>

          {renderSeatingLayout()}
        </View>
      </Card>

      {/* Actions */}
      {trip.status === 'boarding' && (
        <Card style={styles.actionsCard}>
          <View style={styles.actionsHeader}>
            <Text style={styles.actionsTitle}>Trip Actions</Text>
          </View>
          <View style={styles.actionButtons}>
            <Button
              title='Scan QR Code'
              variant='outline'
              onPress={() => {
                router.push('/(captain)/(tabs)/checkin' as any);
              }}
              icon={<ScanLine size={18} color={Colors.primary} />}
              style={styles.actionButton}
            />
            <Button
              title={
                trip.is_checkin_closed ? 'Check-in Closed' : 'Close Check-in'
              }
              variant={trip.is_checkin_closed ? 'outline' : 'primary'}
              disabled={trip.is_checkin_closed}
              onPress={handleCloseCheckIn}
              icon={
                trip.is_checkin_closed ? (
                  <CheckCircle size={18} color={Colors.success} />
                ) : (
                  <ClipboardList size={18} color={Colors.primary} />
                )
              }
              style={styles.actionButton}
            />
          </View>
        </Card>
      )}

      {/* Enhanced Passenger List */}
      <Card style={styles.passengerCard}>
        <View style={styles.passengerHeader}>
          <View style={styles.passengerIcon}>
            <Ticket size={20} color={Colors.primary} />
          </View>
          <Text style={styles.passengerTitle}>Passenger Manifest</Text>
          <View style={styles.passengerHeaderActions}>
            <View style={styles.passengerCount}>
              <Text style={styles.passengerCountText}>{totalPassengers}</Text>
            </View>
            <Pressable style={styles.refreshButton} onPress={handleRefresh}>
              <RefreshCw size={16} color={Colors.primary} />
            </Pressable>
          </View>
        </View>

        {/* Passenger Filter Tabs */}
        <View style={styles.passengerTabs}>
          <Pressable style={[styles.passengerTab, styles.activeTab]}>
            <Text style={[styles.passengerTabText, styles.activeTabText]}>
              All ({totalPassengers})
            </Text>
          </Pressable>
          <Pressable style={styles.passengerTab}>
            <Text style={styles.passengerTabText}>
              Checked In ({checkedInCount})
            </Text>
          </Pressable>
          <Pressable style={styles.passengerTab}>
            <Text style={styles.passengerTabText}>
              Pending ({remainingToCheckIn})
            </Text>
          </Pressable>
        </View>

        {loading.passengers ? (
          <View style={styles.loadingPassengers}>
            <ActivityIndicator size='small' color={Colors.primary} />
            <Text style={styles.loadingPassengersText}>
              Loading passengers...
            </Text>
          </View>
        ) : activePassengers.length === 0 ? (
          <View style={styles.emptyPassengers}>
            <Users size={32} color={Colors.textSecondary} />
            <Text style={styles.emptyPassengersText}>No passengers found</Text>
          </View>
        ) : (
          <View style={styles.passengerList}>
            {activePassengers.map(passenger => (
              <View key={passenger.id} style={styles.passengerItem}>
                <View style={styles.passengerInfo}>
                  <View style={styles.passengerItemHeader}>
                    <View style={styles.passengerNameSection}>
                      <Text style={styles.passengerName}>
                        {passenger.passenger_name}
                      </Text>
                      <View style={styles.seatBadge}>
                        <Text style={styles.seatBadgeText}>
                          {passenger.seat_number || 'No Seat'}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.passengerStatus}>
                      {passenger.check_in_status ? (
                        <View style={styles.passengerStatusBadge}>
                          <CheckCircle size={14} color={Colors.success} />
                          <Text
                            style={[
                              styles.passengerStatusText,
                              { color: Colors.success },
                            ]}
                          >
                            Checked In
                          </Text>
                        </View>
                      ) : (
                        <View style={styles.passengerStatusBadge}>
                          <AlertCircle size={14} color={Colors.warning} />
                          <Text
                            style={[
                              styles.passengerStatusText,
                              { color: Colors.warning },
                            ]}
                          >
                            Pending
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>

                  <View style={styles.passengerDetails}>
                    <View style={styles.passengerDetailRow}>
                      <Info size={12} color={Colors.textSecondary} />
                      <Text style={styles.passengerDetail}>
                        Booking: {passenger.booking_number}
                      </Text>
                    </View>
                    {passenger.passenger_contact_number && (
                      <View style={styles.passengerDetailRow}>
                        <Phone size={12} color={Colors.textSecondary} />
                        <Text style={styles.passengerDetail}>
                          {passenger.passenger_contact_number}
                        </Text>
                      </View>
                    )}
                    {passenger.client_email && (
                      <View style={styles.passengerDetailRow}>
                        <Mail size={12} color={Colors.textSecondary} />
                        <Text style={styles.passengerDetail}>
                          {passenger.client_email}
                        </Text>
                      </View>
                    )}
                    {passenger.special_assistance_request && (
                      <View style={styles.specialAssistance}>
                        <AlertCircle size={12} color={Colors.warning} />
                        <Text style={styles.specialAssistanceText}>
                          Special Assistance:{' '}
                          {passenger.special_assistance_request}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>

                {!passenger.check_in_status && trip.status === 'boarding' && (
                  <Pressable
                    style={styles.checkInButton}
                    onPress={() => {
                      Alert.alert(
                        'Check In Passenger',
                        `Check in ${passenger.passenger_name}?\n\nSeat: ${passenger.seat_number || 'Not assigned'}\nBooking: ${passenger.booking_number}`,
                        [
                          { text: 'Cancel', style: 'cancel' },
                          {
                            text: 'Check In',
                            onPress: () => {
                              // TODO: Implement manual check-in functionality
                              Alert.alert(
                                'Info',
                                'Manual check-in feature coming soon. Please use QR scanner.'
                              );
                            },
                          },
                        ]
                      );
                    }}
                  >
                    <UserCheck size={16} color={Colors.primary} />
                    <Text style={styles.checkInButtonText}>Check In</Text>
                  </Pressable>
                )}
              </View>
            ))}
          </View>
        )}
      </Card>
    </ScrollView>
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
  backButton: {
    padding: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: Colors.textSecondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
    padding: 32,
  },
  errorText: {
    fontSize: 18,
    color: Colors.error,
    marginBottom: 24,
    textAlign: 'center',
  },
  tripCard: {
    marginBottom: 16,
  },
  tripHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  tripIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: `${Colors.primary}20`,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  tripInfo: {
    flex: 1,
  },
  tripTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 4,
  },
  tripSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  tripDetails: {
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    gap: 24,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    color: Colors.text,
  },
  summaryCard: {
    marginBottom: 16,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  summaryIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: `${Colors.primary}20`,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
  summaryStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  progressContainer: {
    marginTop: 8,
  },
  progressBar: {
    height: 8,
    backgroundColor: Colors.border,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  actionsCard: {
    marginBottom: 16,
  },
  actionsHeader: {
    marginBottom: 16,
  },
  actionsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
  },
  passengerCard: {
    marginBottom: 16,
  },
  passengerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  passengerIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: `${Colors.primary}20`,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  passengerTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
  refreshButton: {
    padding: 8,
  },
  loadingPassengers: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  loadingPassengersText: {
    marginLeft: 12,
    fontSize: 14,
    color: Colors.textSecondary,
  },
  emptyPassengers: {
    alignItems: 'center',
    padding: 32,
  },
  emptyPassengersText: {
    marginTop: 12,
    fontSize: 16,
    color: Colors.textSecondary,
  },
  passengerList: {
    gap: 0,
  },
  passengerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  passengerInfo: {
    flex: 1,
  },
  passengerItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  passengerName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  passengerStatus: {
    marginLeft: 12,
  },
  passengerDetails: {
    gap: 4,
  },
  passengerDetail: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  checkInButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: `${Colors.primary}10`,
    borderRadius: 8,
    marginLeft: 16,
  },
  checkInButtonText: {
    marginLeft: 8,
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '600',
  },
  // Seat Availability Styles
  seatCard: {
    marginBottom: 16,
  },
  seatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  seatIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: `${Colors.primary}20`,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  seatTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
  seatOverview: {
    marginBottom: 20,
  },
  seatSummaryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  seatSummaryItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    backgroundColor: Colors.surface,
    borderRadius: 8,
    marginHorizontal: 4,
  },
  seatIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginBottom: 8,
  },
  seatSummaryLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 4,
  },
  seatSummaryValue: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  capacityInfo: {
    backgroundColor: Colors.surface,
    borderRadius: 8,
    padding: 12,
  },
  capacityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  capacityLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  capacityValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  // Seating Layout Styles
  seatingLayout: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  seatingLayoutTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
    textAlign: 'center',
  },
  seatingSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
    fontStyle: 'italic',
  },
  noSeatsContainer: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
    backgroundColor: Colors.surface,
    borderRadius: 8,
    marginBottom: 16,
  },
  noSeatsText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontStyle: 'italic',
  },
  loadingSeatsContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  loadingSeatsText: {
    marginTop: 12,
    fontSize: 14,
    color: Colors.textSecondary,
  },
  // Ferry Layout Styles (similar to SeatSelector)
  legendContainer: {
    marginBottom: 16,
  },
  legendContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  legendBox: {
    width: 16,
    height: 16,
    borderRadius: 4,
    marginRight: 6,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  legendText: {
    fontSize: 12,
    color: Colors.text,
  },
  ferryContainer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  ferryLabel: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    backgroundColor: Colors.primary,
    borderRadius: 8,
    marginVertical: 8,
  },
  ferryLabelText: {
    fontSize: 12,
    fontWeight: '700',
    color: 'white',
    textAlign: 'center',
  },
  seatLayoutScroll: {
    maxHeight: 400,
  },
  seatLayoutContent: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ferryBody: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  ferryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  rowLabelContainer: {
    width: 24,
    marginRight: 12,
  },
  rowLabel: {
    fontSize: 10,
    color: Colors.textSecondary,
    textAlign: 'center',
    fontWeight: '600',
  },
  seatGroupsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  seatGroup: {
    flexDirection: 'row',
  },
  aisle: {
    width: 16,
    height: 1,
    backgroundColor: Colors.border,
    marginHorizontal: 8,
  },
  seat: {
    width: 32,
    height: 28,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 1,
    borderWidth: 1,
    borderColor: Colors.border,
    position: 'relative',
  },
  seatNumber: {
    fontSize: 9,
    fontWeight: '600',
    color: Colors.text,
  },
  windowIndicator: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primary,
  },
  // Seat Status Styles
  availableSeat: {
    backgroundColor: Colors.card,
    borderColor: Colors.border,
  },
  bookedSeat: {
    backgroundColor: Colors.warning,
    borderColor: Colors.warning,
  },
  checkedInSeat: {
    backgroundColor: Colors.success,
    borderColor: Colors.success,
  },
  premiumSeat: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  crewSeat: {
    backgroundColor: Colors.textSecondary,
    borderColor: Colors.textSecondary,
  },
  disabledSeat: {
    backgroundColor: Colors.border,
    borderColor: Colors.border,
    opacity: 0.5,
  },
  // Enhanced Passenger List Styles
  passengerHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  passengerCount: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 24,
    alignItems: 'center',
  },
  passengerCountText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '700',
  },
  passengerTabs: {
    flexDirection: 'row',
    marginBottom: 16,
    backgroundColor: Colors.surface,
    borderRadius: 8,
    padding: 4,
  },
  passengerTab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: Colors.primary,
  },
  passengerTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  activeTabText: {
    color: 'white',
  },
  passengerNameSection: {
    flex: 1,
  },
  seatBadge: {
    backgroundColor: Colors.surface,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  seatBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.primary,
  },
  passengerStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  passengerStatusText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  passengerDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  specialAssistance: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${Colors.warning}10`,
    borderRadius: 4,
    padding: 6,
    marginTop: 4,
  },
  specialAssistanceText: {
    fontSize: 12,
    color: Colors.warning,
    fontWeight: '500',
    marginLeft: 4,
    flex: 1,
  },
});
