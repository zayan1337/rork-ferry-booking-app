import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Pressable,
  ScrollView,
  RefreshControl,
  Animated,
  Easing,
  Linking,
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
  Phone,
  Ticket,
  ScanLine,
  Grid3X3,
  AlertCircle,
} from 'lucide-react-native';

import { useCaptainStore } from '@/store/captainStore';
import { useAuthStore } from '@/store/authStore';
import { CaptainTrip, CaptainRouteStop } from '@/types/captain';
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
    fetchTripById,
    fetchTripPassengers,
    closeCheckin,
    updateTripStatus,
    fetchTripStops,
    fetchPassengersForStop,
    moveToNextStop,
    completeStopBoarding,
    processMultiStopCheckIn,
    sendManifest,
  } = useCaptainStore();

  const [trip, setTrip] = useState<CaptainTrip | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [allSeats, setAllSeats] = useState<any[]>([]);
  const [loadingSeats, setLoadingSeats] = useState(false);

  // Multi-stop state
  const [routeStops, setRouteStops] = useState<CaptainRouteStop[]>([]);
  const [selectedStopId, setSelectedStopId] = useState<string | null>(null);
  const [loadingStops, setLoadingStops] = useState(false);

  // New multi-stop workflow state
  const [currentStop, setCurrentStop] = useState<any>(null);
  const [stopPassengers, setStopPassengers] = useState<any[]>([]);

  // Bulk check-in state
  const [selectedPassengers, setSelectedPassengers] = useState<Set<string>>(
    new Set()
  );
  const [bulkCheckInMode, setBulkCheckInMode] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'checked_in' | 'pending'>(
    'all'
  );

  // Animated value for refresh icon rotation
  const rotateAnim = useRef(new Animated.Value(0)).current;

  // Animate refresh icon when refreshing
  useEffect(() => {
    if (refreshing) {
      Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ).start();
    } else {
      rotateAnim.setValue(0);
    }
  }, [refreshing, rotateAnim]);

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

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
      // Check if trip exists in store
      const existingTrip = trips.find(t => t.id === tripId);

      if (!existingTrip) {
        // If trip not in store, fetch it individually
        await fetchTripById(tripId);
      }

      // Always fetch passengers for this trip
      await fetchTripPassengers(tripId);
    } catch (error) {
      console.error('Error loading trip data:', error);
    }
  }, [tripId, trips, fetchTripById, fetchTripPassengers]);

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

  // Load multi-stop data for all trips
  useEffect(() => {
    if (tripId) {
      loadMultiStopData();
    }
  }, [tripId]);

  // Load multi-stop data with enhanced workflow
  const loadMultiStopData = useCallback(async () => {
    if (!tripId) return;

    setLoadingStops(true);
    try {
      const stops = await fetchTripStops(tripId);

      setRouteStops(stops);

      // Find the correct current stop based on workflow
      let selectedStop = null;

      // 1. First, check if there's a stop with status 'boarding' or 'arrived'
      const activeBoardingStop = stops.find(
        stop => stop.status === 'boarding' || stop.status === 'arrived'
      );
      if (activeBoardingStop) {
        selectedStop = activeBoardingStop;
      } else {
        // 2. Check if all pickup stops are completed
        const pickupStops = stops.filter(
          s => s.stop_type === 'pickup' || s.stop_type === 'both'
        );
        const allPickupsCompleted = pickupStops.every(s => s.is_completed);

        if (allPickupsCompleted) {
          // 3. Find first incomplete dropoff stop
          selectedStop = stops.find(
            s =>
              (s.stop_type === 'dropoff' || s.stop_type === 'both') &&
              !s.is_completed
          );
        } else {
          // 4. Find first incomplete pickup stop
          selectedStop = stops.find(s => !s.is_completed);
        }
      }

      // 5. Fallback to first stop if nothing found
      if (!selectedStop) {
        selectedStop = stops[0];
      }

      if (selectedStop) {
        setSelectedStopId(selectedStop.id);
        setCurrentStop(selectedStop);

        // Load passengers for current stop
        // Note: Simplified for now as fetchPassengersForStop uses different parameters
        // You can enhance this based on your needs
      }
    } catch (error) {
      console.error(
        '[loadMultiStopData] Error loading multi-stop data:',
        error
      );
    } finally {
      setLoadingStops(false);
    }
  }, [tripId, fetchTripStops]);

  // Get smart button state based on current stop and trip status
  const getButtonState = useCallback(() => {
    if (!currentStop || !trip || !routeStops.length) return null;

    // Hide button if trip is already completed
    if (trip.status === 'completed') return null;

    const stopType = currentStop.stop_type || 'both';
    const status = currentStop.status || 'pending';
    const isLastStop = currentStop.stop_sequence === trip.total_stops;

    // Check if ALL pickup stops are completed
    const allPickupStopsCompleted = routeStops
      .filter(s => s.stop_type === 'pickup' || s.stop_type === 'both')
      .every(s => s.is_completed);

    // If all pickups completed, find FIRST incomplete dropoff (not next one)
    if (allPickupStopsCompleted) {
      // Check if current stop is a dropoff that has arrived
      const isCurrentDropoff =
        currentStop.stop_type === 'dropoff' || currentStop.stop_type === 'both';

      if (isCurrentDropoff && status === 'arrived') {
        // At a dropoff stop that we've arrived at
        if (isLastStop) {
          return {
            text: `Complete Trip at ${currentStop.island.name}`,
            action: 'complete_trip',
            variant: 'destructive' as const,
          };
        }

        // Find next incomplete stop
        const nextStop = routeStops.find(
          s => s.stop_sequence > currentStop.stop_sequence && !s.is_completed
        );

        if (nextStop) {
          if (nextStop.stop_sequence === trip.total_stops) {
            return {
              text: `Complete Trip at ${nextStop.island.name}`,
              action: 'complete_trip',
              variant: 'destructive' as const,
            };
          }
          return {
            text: `Arrive at ${nextStop.island.name}`,
            action: 'arrive',
            variant: 'primary' as const,
          };
        }
      }

      // Find the FIRST incomplete dropoff stop (not the next one after current)
      const firstIncompleteDropoff = routeStops.find(
        s =>
          (s.stop_type === 'dropoff' || s.stop_type === 'both') &&
          !s.is_completed
      );

      if (firstIncompleteDropoff) {
        // Check if this is the last stop
        if (firstIncompleteDropoff.stop_sequence === trip.total_stops) {
          return {
            text: `Complete Trip at ${firstIncompleteDropoff.island.name}`,
            action: 'complete_trip',
            variant: 'destructive' as const,
          };
        }

        return {
          text: `Arrive at ${firstIncompleteDropoff.island.name}`,
          action: 'arrive',
          variant: 'primary' as const,
        };
      }

      // If no incomplete dropoff found, check if current stop is a dropoff
      if (
        currentStop.stop_type === 'dropoff' ||
        currentStop.stop_type === 'both'
      ) {
        // If we're at the last stop, show complete trip
        if (isLastStop) {
          return {
            text: `Complete Trip at ${currentStop.island.name}`,
            action: 'complete_trip',
            variant: 'destructive' as const,
          };
        }

        // If we're at a dropoff but not the last, show arrive at next stop
        const nextStop = routeStops.find(
          s => s.stop_sequence > currentStop.stop_sequence && !s.is_completed
        );

        if (nextStop) {
          return {
            text: `Arrive at ${nextStop.island.name}`,
            action: 'arrive',
            variant: 'primary' as const,
          };
        }
      }

      // All stops completed
      return {
        text: 'Complete Trip',
        action: 'complete_trip',
        variant: 'destructive' as const,
      };
    }

    // Check if there are any more pickup stops ahead
    const hasMorePickupStops = routeStops.some(
      s =>
        s.stop_sequence > currentStop.stop_sequence &&
        (s.stop_type === 'pickup' || s.stop_type === 'both') &&
        !s.is_completed
    );

    // Check if this is a pickup stop
    const isPickupStop = stopType === 'pickup' || stopType === 'both';

    // PICKUP STOP WORKFLOW
    if (isPickupStop) {
      // 1. Start Boarding
      if (status === 'pending' || status === 'arrived') {
        return {
          text: `Start Boarding at ${currentStop.island.name}`,
          action: 'start_boarding',
          variant: 'primary' as const,
        };
      }

      // 2. After boarding started, show Depart button
      if (status === 'boarding') {
        return {
          text: `Depart from ${currentStop.island.name}`,
          action: 'depart',
          variant: 'destructive' as const,
        };
      }

      // 3. After departed, check if more pickup stops exist
      if (status === 'departed' || status === 'completed') {
        if (hasMorePickupStops) {
          const nextPickupStop = routeStops.find(
            s =>
              s.stop_sequence > currentStop.stop_sequence &&
              (s.stop_type === 'pickup' || s.stop_type === 'both') &&
              !s.is_completed
          );
          return {
            text: `Arrive at ${nextPickupStop?.island.name || 'Next Stop'}`,
            action: 'arrive',
            variant: 'primary' as const,
          };
        } else {
          // No more pickup stops, move to first dropoff
          const firstDropoff = routeStops.find(
            s =>
              (s.stop_type === 'dropoff' || s.stop_type === 'both') &&
              !s.is_completed
          );
          if (firstDropoff) {
            return {
              text: `Arrive at ${firstDropoff.island.name}`,
              action: 'arrive',
              variant: 'primary' as const,
            };
          }
        }
      }
    }

    return null;
  }, [currentStop, trip, routeStops]);

  // Handle button press
  const handleButtonPress = useCallback(async () => {
    const buttonState = getButtonState();
    if (!buttonState || !tripId || !user?.id || !currentStop) return;

    try {
      switch (buttonState.action) {
        case 'start_boarding':
          await handleStartBoarding();
          break;
        case 'depart':
          await handleDepart();
          break;
        case 'arrive':
          await handleArrive();
          break;
        case 'send_manifest':
          await handleSendManifest();
          break;
        case 'complete_trip':
          await handleCompleteTrip();
          break;
      }
    } catch (error) {
      console.error('Error handling button press:', error);
      Alert.alert('Error', 'An error occurred. Please try again.');
    }
  }, [getButtonState, tripId, user?.id, currentStop]);

  // Action handlers
  const handleStartBoarding = async () => {
    if (!currentStop || !tripId) return;

    Alert.alert(
      'Start Boarding',
      `Allow passengers to board at ${currentStop.island.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Start Boarding',
          onPress: async () => {
            try {
              // First, check if trip progress is initialized
              const { data: progressCheck, error: checkError } = await supabase
                .from('trip_stop_progress')
                .select('id, status, stop_id')
                .eq('trip_id', tripId);

              // If no progress exists, initialize it first
              if (!progressCheck || progressCheck.length === 0) {
                const { data: initData, error: initError } = await supabase.rpc(
                  'initialize_trip_stop_progress',
                  {
                    p_trip_id: tripId,
                    p_captain_id: user?.id,
                  }
                );

                if (initError) {
                  console.error('Error initializing trip progress:', initError);
                  Alert.alert(
                    'Error',
                    `Failed to initialize trip progress: ${initError.message}`
                  );
                  return;
                }
              }

              // Now update stop status to 'boarding'
              // FIXED: Use stop_id (route_stops.id) not currentStop.id (trip_stop_progress.id)
              const { data: updateData, error: updateError } =
                await supabase.rpc('update_stop_status', {
                  p_trip_id: tripId,
                  p_stop_id: currentStop.stop_id, // FIXED: Use stop_id
                  p_status: 'boarding',
                  p_captain_id: user?.id,
                });

              if (updateError) {
                console.error('Error starting boarding:', updateError);
                Alert.alert(
                  'Error',
                  `Failed to start boarding: ${updateError.message}`
                );
                return;
              }

              if (!updateData) {
                Alert.alert(
                  'Error',
                  'Failed to update stop status. Please try again.'
                );
                return;
              }

              // Update trip status to 'boarding'
              const { error: tripUpdateError } = await supabase
                .from('trips')
                .update({
                  status: 'boarding',
                  current_stop_sequence: currentStop.stop_sequence,
                  current_stop_id: currentStop.stop_id,
                  trip_progress_status: 'boarding_in_progress',
                  updated_at: new Date().toISOString(),
                })
                .eq('id', tripId);

              if (tripUpdateError) {
                console.error('Error updating trip status:', tripUpdateError);
                Alert.alert('Error', 'Failed to update trip status');
                return;
              }

              // Optimistic UI Update: Update local state immediately
              if (trip) {
                setTrip({
                  ...trip,
                  status: 'boarding',
                  current_stop_sequence: currentStop.stop_sequence,
                  current_stop_id: currentStop.stop_id,
                } as CaptainTrip);
              }

              // Update route stops state immediately
              setRouteStops(prevStops =>
                prevStops.map(stop =>
                  stop.stop_id === currentStop.stop_id
                    ? { ...stop, status: 'boarding', is_current_stop: true }
                    : { ...stop, is_current_stop: false }
                )
              );

              // Update current stop state
              setCurrentStop((prev: any) => ({
                ...prev,
                status: 'boarding',
                is_current_stop: true,
              }));

              // Reload data in background (non-blocking)
              Promise.all([loadMultiStopData(), loadTripData()]).catch(err => {
                console.error('Error reloading data:', err);
              });
            } catch (err: any) {
              console.error('Unexpected error:', err);
              Alert.alert(
                'Error',
                `An unexpected error occurred: ${err.message || 'Unknown error'}`
              );
            }
          },
        },
      ]
    );
  };

  const handleDepart = async () => {
    if (!currentStop || !tripId) return;

    Alert.alert('Depart', `Ready to depart from ${currentStop.island.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Depart',
        style: 'destructive',
        onPress: async () => {
          try {
            // Update stop status to 'departed'
            const { data, error } = await supabase.rpc('update_stop_status', {
              p_trip_id: tripId,
              p_stop_id: currentStop.stop_id, // FIXED: Use stop_id
              p_status: 'departed',
              p_captain_id: user?.id,
            });

            if (!error && data) {
              // Determine if there are more pickup stops
              const remainingPickups = routeStops.filter(
                s =>
                  s.stop_sequence > currentStop.stop_sequence &&
                  (s.stop_type === 'pickup' || s.stop_type === 'both') &&
                  !s.is_completed
              );

              const newTripStatus =
                remainingPickups.length > 0 ? 'boarding' : 'departed';
              const newProgressStatus =
                remainingPickups.length > 0
                  ? 'boarding_in_progress'
                  : 'in_transit';

              // Update trip status
              const { error: tripUpdateError } = await supabase
                .from('trips')
                .update({
                  status: newTripStatus,
                  trip_progress_status: newProgressStatus,
                  updated_at: new Date().toISOString(),
                })
                .eq('id', tripId);

              if (tripUpdateError) {
                console.error('Error updating trip status:', tripUpdateError);
                Alert.alert('Error', 'Failed to update trip status');
                return;
              }

              // Optimistic UI Update: Update local state immediately
              if (trip) {
                setTrip({
                  ...trip,
                  status: newTripStatus,
                } as CaptainTrip);
              }

              // Update route stops state immediately
              setRouteStops(prevStops =>
                prevStops.map(stop =>
                  stop.stop_id === currentStop.stop_id
                    ? { ...stop, status: 'departed', is_completed: true }
                    : stop
                )
              );

              // Update current stop state
              setCurrentStop((prev: any) => ({
                ...prev,
                status: 'departed',
                is_completed: true,
              }));

              // Send manifest in background if this was the last pickup stop
              if (remainingPickups.length === 0) {
                sendManifest(tripId, currentStop.id).catch(manifestError => {
                  console.error('Error sending manifest:', manifestError);
                });
              }

              // Reload data in background (non-blocking)
              Promise.all([loadMultiStopData(), loadTripData()]).catch(err => {
                console.error('Error reloading data:', err);
              });
            } else {
              console.error('Error departing:', error);
              Alert.alert(
                'Error',
                'Failed to depart: ' + (error?.message || 'Unknown error')
              );
            }
          } catch (err) {
            console.error('Unexpected error:', err);
            Alert.alert('Error', 'An unexpected error occurred');
          }
        },
      },
    ]);
  };

  const handleArrive = async () => {
    if (!tripId) return;

    // Determine which stop we're arriving at
    let targetStop = null;

    // Check if all pickup stops are completed
    const pickupStops = routeStops.filter(
      s => s.stop_type === 'pickup' || s.stop_type === 'both'
    );
    const allPickupsCompleted = pickupStops.every(s => s.is_completed);

    if (allPickupsCompleted) {
      // Find first incomplete dropoff
      targetStop = routeStops.find(
        s =>
          (s.stop_type === 'dropoff' || s.stop_type === 'both') &&
          !s.is_completed
      );
    } else {
      // Find next incomplete pickup
      targetStop = routeStops.find(
        s =>
          s.stop_sequence > (currentStop?.stop_sequence || 0) &&
          (s.stop_type === 'pickup' || s.stop_type === 'both') &&
          !s.is_completed
      );
    }

    if (!targetStop) return;

    Alert.alert('Arrive at Next Stop', `Arrive at ${targetStop.island.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Arrive',
        onPress: async () => {
          try {
            // Use the move_to_next_stop RPC function
            const { data, error } = await supabase.rpc('move_to_next_stop', {
              p_trip_id: tripId,
              p_captain_id: user?.id,
            });

            if (!error && data && data.success) {
              // Optimistic UI Update: advance stops
              if (targetStop) {
                const prevCurrent = routeStops.find(s => s.is_current_stop);

                setRouteStops(prevStops =>
                  prevStops.map(stop => {
                    if (prevCurrent && stop.stop_id === prevCurrent.stop_id) {
                      // Previous current becomes completed
                      return {
                        ...stop,
                        status: 'completed',
                        is_completed: true,
                        is_current_stop: false,
                      } as any;
                    }
                    if (stop.stop_id === targetStop.stop_id) {
                      // Target becomes arrived/current
                      return {
                        ...stop,
                        status: 'arrived',
                        is_current_stop: true,
                      } as any;
                    }
                    return { ...stop, is_current_stop: false } as any;
                  })
                );

                setCurrentStop({
                  ...targetStop,
                  status: 'arrived',
                  is_current_stop: true,
                });

                // Update trip progress sequence optimistically
                if (trip) {
                  setTrip({
                    ...trip,
                    current_stop_sequence: targetStop.stop_sequence,
                  } as CaptainTrip);
                }
              }

              // Reload data in background (non-blocking)
              Promise.all([loadMultiStopData(), loadTripData()])
                .then(() => {
                  // Check completion after reload to ensure accuracy
                  if (data.is_completed) {
                    Alert.alert(
                      'Trip Completed',
                      data.message || 'Trip completed successfully!',
                      [{ text: 'OK', onPress: () => router.back() }]
                    );
                  }
                })
                .catch(err => {
                  console.error('Error reloading data:', err);
                });
            } else {
              console.error('Error arriving:', error || data);
              Alert.alert(
                'Error',
                data?.message ||
                  error?.message ||
                  'Failed to arrive at next stop'
              );
            }
          } catch (err) {
            console.error('Error in handleArrive:', err);
            Alert.alert('Error', 'Failed to arrive at next stop');
          }
        },
      },
    ]);
  };

  const handleSendManifest = async () => {
    if (!currentStop || !tripId) return;

    Alert.alert(
      'Send Manifest',
      'Send passenger manifest to operations team?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send Manifest',
          onPress: async () => {
            const success = await sendManifest(tripId, currentStop.id);

            if (success) {
              await loadMultiStopData();
              await loadTripData();
            } else {
              Alert.alert('Error', 'Failed to send manifest');
            }
          },
        },
      ]
    );
  };

  const handleCompleteTrip = async () => {
    if (!tripId || !trip) return;

    // Find the last stop
    const lastStop = routeStops.find(s => s.stop_sequence === trip.total_stops);

    if (!lastStop) {
      Alert.alert('Error', 'Could not find final stop');
      return;
    }

    Alert.alert(
      'Complete Trip',
      `Mark this trip as completed? This will close the trip.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Complete Trip',
          style: 'destructive',
          onPress: async () => {
            try {
              // Mark the last stop as arrived (if not already)
              if (!lastStop.is_completed) {
                const { data: arriveData, error: arriveError } =
                  await supabase.rpc('update_stop_status', {
                    p_trip_id: tripId,
                    p_stop_id: lastStop.stop_id,
                    p_status: 'arrived',
                    p_captain_id: user?.id,
                  });

                if (arriveError || !arriveData) {
                  console.error(
                    'Error marking last stop as arrived:',
                    arriveError
                  );
                  Alert.alert('Error', 'Failed to update last stop');
                  return;
                }
              }

              // Mark final stop as completed
              const { data: stopData, error: stopError } = await supabase.rpc(
                'update_stop_status',
                {
                  p_trip_id: tripId,
                  p_stop_id: lastStop.stop_id,
                  p_status: 'completed',
                  p_captain_id: user?.id,
                }
              );

              if (stopError || !stopData) {
                console.error('Error updating stop status:', stopError);
                Alert.alert('Error', 'Failed to complete stop');
                return;
              }

              // Update trip status to 'completed'
              const success = await updateTripStatus(tripId, 'completed');

              if (success) {
                Alert.alert(
                  'Trip Completed',
                  'Trip has been marked as completed successfully.',
                  [{ text: 'OK', onPress: () => router.back() }]
                );
              } else {
                Alert.alert('Error', 'Failed to complete trip');
              }
            } catch (error) {
              console.error('Error completing trip:', error);
              Alert.alert('Error', 'Failed to complete trip');
            }
          },
        },
      ]
    );
  };

  // Handle completing stop boarding
  const handleCompleteStopBoarding = useCallback(
    async (stopId: string) => {
      if (!user?.id) return;

      const success = await completeStopBoarding(stopId, user.id);
      if (success) {
        await loadMultiStopData();
        await loadTripData();
      }
    },
    [user?.id, completeStopBoarding, loadMultiStopData, loadTripData]
  );

  // Bulk check-in handlers
  const togglePassengerSelection = (passengerId: string) => {
    const newSelection = new Set(selectedPassengers);
    if (newSelection.has(passengerId)) {
      newSelection.delete(passengerId);
    } else {
      newSelection.add(passengerId);
    }
    setSelectedPassengers(newSelection);
  };

  // Select/deselect all passengers that belong to the same booking
  const togglePassengerSelectionByBooking = (bookingId: string) => {
    // Only consider pending passengers for selection
    const relatedPendingIds = activePassengers
      .filter(p => p.booking_id === bookingId && !p.check_in_status)
      .map(p => p.id);

    if (relatedPendingIds.length === 0) return;

    setSelectedPassengers(prev => {
      const allAlreadySelected = relatedPendingIds.every(id => prev.has(id));
      const next = new Set(prev);
      if (allAlreadySelected) {
        relatedPendingIds.forEach(id => next.delete(id));
      } else {
        relatedPendingIds.forEach(id => next.add(id));
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    // Only select passengers who are not checked in
    const pendingPassengers = activePassengers.filter(p => !p.check_in_status);

    if (
      selectedPassengers.size === pendingPassengers.length &&
      pendingPassengers.length > 0
    ) {
      setSelectedPassengers(new Set());
    } else {
      const allPendingIds = new Set(pendingPassengers.map(p => p.id));
      setSelectedPassengers(allPendingIds);
    }
  };

  const handleBulkCheckIn = async () => {
    if (selectedPassengers.size === 0) {
      Alert.alert('No Selection', 'Please select passengers to check in.');
      return;
    }

    const selectedCount = selectedPassengers.size;

    // Get the list of selected passengers
    const selectedList = activePassengers.filter(p =>
      selectedPassengers.has(p.id)
    );

    // Compute number of unique bookings represented in the selection
    const selectedBookingIds = Array.from(
      new Set(selectedList.map(p => p.booking_id))
    );
    const selectedBookingCount = selectedBookingIds.length;

    Alert.alert(
      'Bulk Check-in',
      `Check in ${selectedBookingCount} booking${selectedBookingCount > 1 ? 's' : ''}?\n\nPassengers: ${selectedList.map(p => p.passenger_name).join(', ')}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Check In',
          onPress: async () => {
            try {
              let successCount = 0;
              let errorCount = 0;
              const processedBookingIds = new Set<string>();

              for (const passenger of selectedList) {
                // Skip if we've already processed this booking
                // (in case multiple passengers share the same booking)
                if (processedBookingIds.has(passenger.booking_id)) {
                  continue;
                }

                try {
                  const { error } = await supabase
                    .from('bookings')
                    .update({
                      check_in_status: true,
                      checked_in_at: new Date().toISOString(),
                      checked_in_by: user?.id,
                    })
                    .eq('id', passenger.booking_id);

                  if (!error) {
                    successCount++;
                    processedBookingIds.add(passenger.booking_id);
                  } else {
                    errorCount++;
                    console.error(
                      `Error checking in ${passenger.passenger_name}:`,
                      error
                    );
                  }
                } catch (err) {
                  errorCount++;
                  console.error(
                    `Exception checking in ${passenger.passenger_name}:`,
                    err
                  );
                }
              }

              // Clear selection
              setSelectedPassengers(new Set());
              setBulkCheckInMode(false);

              // Reload data
              await loadTripData();

              // Show result
              if (errorCount === 0) {
                Alert.alert(
                  'Success',
                  `Successfully checked in ${successCount} booking${successCount > 1 ? 's' : ''}.`
                );
              } else {
                Alert.alert(
                  'Partial Success',
                  `Checked in ${successCount} booking${successCount > 1 ? 's' : ''}. ${errorCount} failed.`
                );
              }
            } catch (err) {
              console.error('Bulk check-in error:', err);
              Alert.alert('Error', 'Failed to check in passengers.');
            }
          },
        },
      ]
    );
  };

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

  // Resolve passenger contact number (passenger first, then booking owner)
  const getPassengerContact = (p: any): string => {
    const contact = (p?.passenger_contact_number || '').trim();
    if (contact) return contact;
    const fallback = (p?.client_phone || '').trim();
    return fallback;
  };

  // Filter passengers based on active tab
  const filteredPassengers =
    activeTab === 'checked_in'
      ? checkedInPassengers
      : activeTab === 'pending'
        ? activePassengers.filter(p => !p.check_in_status)
        : activePassengers;

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
                {routeStops.length > 0
                  ? `${routeStops[0].island.name} → ${routeStops[routeStops.length - 1].island.name}`
                  : `${trip.from_island_name} → ${trip.to_island_name}`}
              </Text>
            </View>
          </View>
        </View>
      </Card>

      {/* Route Progress */}
      {trip && (
        <Card style={styles.multiStopCard}>
          <View style={styles.multiStopHeader}>
            <View style={styles.multiStopIcon}>
              <MapPin size={20} color={Colors.primary} />
            </View>
            <Text style={styles.multiStopTitle}>Route Progress</Text>
            {trip.current_stop_sequence && trip.total_stops && (
              <Text style={styles.multiStopProgress}>
                Stop {trip.current_stop_sequence} of {trip.total_stops}
              </Text>
            )}
          </View>

          {loadingStops ? (
            <View style={styles.loadingStopsContainer}>
              <ActivityIndicator size='small' color={Colors.primary} />
              <Text style={styles.loadingStopsText}>Loading stops...</Text>
            </View>
          ) : (
            <View style={styles.stopsContainer}>
              {routeStops.map((stop, index) => {
                // Determine stop type for display
                const stopType = stop.stop_type || 'both';
                const isPickup = stopType === 'pickup' || stopType === 'both';
                const isDropoff = stopType === 'dropoff' || stopType === 'both';

                return (
                  <View key={stop.id} style={styles.stopItem}>
                    <View style={styles.stopIndicator}>
                      <View
                        style={[
                          styles.stopDot,
                          {
                            backgroundColor: stop.is_current_stop
                              ? Colors.primary
                              : stop.is_completed
                                ? Colors.success
                                : Colors.border,
                          },
                        ]}
                      >
                        {/* Show P/D/B indicator inside dot */}
                        <Text style={styles.stopTypeIndicator}>
                          {isPickup && isDropoff ? 'B' : isPickup ? 'P' : 'D'}
                        </Text>
                      </View>
                      {index < routeStops.length - 1 && (
                        <View
                          style={[
                            styles.stopLine,
                            {
                              backgroundColor: stop.is_completed
                                ? Colors.success
                                : Colors.border,
                            },
                          ]}
                        />
                      )}
                    </View>
                    <View style={styles.stopInfo}>
                      <Text
                        style={[
                          styles.stopName,
                          {
                            color: stop.is_current_stop
                              ? Colors.primary
                              : stop.is_completed
                                ? Colors.success
                                : Colors.text,
                          },
                        ]}
                      >
                        {stop.island.name}
                      </Text>
                      <View style={styles.stopMetaRow}>
                        <Text style={styles.stopSequence}>
                          Stop {stop.stop_sequence}
                        </Text>
                        <View
                          style={[
                            styles.stopTypeBadge,
                            {
                              backgroundColor:
                                isPickup && isDropoff
                                  ? `${Colors.warning}20`
                                  : isPickup
                                    ? `${Colors.success}20`
                                    : `${Colors.error}20`,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.stopTypeBadgeText,
                              {
                                color:
                                  isPickup && isDropoff
                                    ? Colors.warning
                                    : isPickup
                                      ? Colors.success
                                      : Colors.error,
                              },
                            ]}
                          >
                            {isPickup && isDropoff
                              ? 'Pickup & Dropoff'
                              : isPickup
                                ? 'Pickup'
                                : 'Dropoff'}
                          </Text>
                        </View>
                      </View>
                      {stop.is_current_stop && (
                        <Text style={styles.currentStopText}>
                          📍 Current Stop
                        </Text>
                      )}
                      {stop.is_completed && (
                        <Text style={styles.completedStopText}>
                          ✓ Completed
                        </Text>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          {/* Smart Multi-stop Action Button */}
          {trip.total_stops && trip.total_stops > 1 && getButtonState() && (
            <View style={styles.multiStopActions}>
              <Button
                title={getButtonState()!.text}
                onPress={handleButtonPress}
                variant={getButtonState()!.variant as any}
              />
            </View>
          )}
        </Card>
      )}

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
            {/* <Button
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
            /> */}
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
              <Animated.View style={{ transform: [{ rotate: spin }] }}>
                <RefreshCw size={16} color={Colors.primary} />
              </Animated.View>
            </Pressable>
          </View>
        </View>

        {/* Compact Bulk Actions Bar */}
        {trip.status === 'boarding' &&
          (() => {
            const pendingPassengers = activePassengers.filter(
              p => !p.check_in_status
            );
            const allPendingSelected =
              selectedPassengers.size === pendingPassengers.length &&
              pendingPassengers.length > 0;

            return selectedPassengers.size > 0 ? (
              <View style={styles.bulkActionsBarCompact}>
                <Pressable
                  style={styles.compactButton}
                  onPress={toggleSelectAll}
                >
                  <CheckCircle
                    size={16}
                    color={
                      allPendingSelected ? Colors.primary : Colors.textSecondary
                    }
                  />
                </Pressable>
                <Text style={styles.selectedCountTextCompact}>
                  {selectedPassengers.size} selected
                </Text>
                <Pressable
                  style={styles.bulkCheckInButtonCompact}
                  onPress={handleBulkCheckIn}
                >
                  <UserCheck size={14} color='white' />
                  <Text style={styles.bulkCheckInButtonTextCompact}>
                    Check In
                  </Text>
                </Pressable>
              </View>
            ) : (
              <Pressable
                style={styles.selectAllButtonCompact}
                onPress={toggleSelectAll}
              >
                <CheckCircle size={14} color={Colors.textSecondary} />
                <Text style={styles.selectAllTextCompact}>Select All</Text>
              </Pressable>
            );
          })()}

        {/* Compact Passenger Filter Tabs */}
        <View style={styles.passengerTabsCompact}>
          <Pressable
            style={[
              styles.passengerTabCompact,
              activeTab === 'all' && styles.activeTabCompact,
            ]}
            onPress={() => setActiveTab('all')}
          >
            <Text
              style={[
                styles.passengerTabTextCompact,
                activeTab === 'all' && styles.activeTabTextCompact,
              ]}
            >
              All {totalPassengers}
            </Text>
          </Pressable>
          <Pressable
            style={[
              styles.passengerTabCompact,
              activeTab === 'checked_in' && styles.activeTabCompact,
            ]}
            onPress={() => setActiveTab('checked_in')}
          >
            <Text
              style={[
                styles.passengerTabTextCompact,
                activeTab === 'checked_in' && styles.activeTabTextCompact,
              ]}
            >
              Checked {checkedInCount}
            </Text>
          </Pressable>
          <Pressable
            style={[
              styles.passengerTabCompact,
              activeTab === 'pending' && styles.activeTabCompact,
            ]}
            onPress={() => setActiveTab('pending')}
          >
            <Text
              style={[
                styles.passengerTabTextCompact,
                activeTab === 'pending' && styles.activeTabTextCompact,
              ]}
            >
              Pending {remainingToCheckIn}
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
        ) : filteredPassengers.length === 0 ? (
          <View style={styles.emptyPassengers}>
            <Users size={32} color={Colors.textSecondary} />
            <Text style={styles.emptyPassengersText}>
              {activeTab === 'checked_in'
                ? 'No checked-in passengers'
                : activeTab === 'pending'
                  ? 'No pending passengers'
                  : 'No passengers found'}
            </Text>
          </View>
        ) : (
          <View style={styles.passengerList}>
            {filteredPassengers.map(passenger => (
              <Pressable
                key={passenger.id}
                style={[
                  styles.passengerItem,
                  passenger.check_in_status && styles.passengerItemCheckedIn,
                ]}
                onPress={() => {
                  // Toggle selection when tapping the card (only if boarding and not checked in)
                  if (
                    trip.status === 'boarding' &&
                    !passenger.check_in_status
                  ) {
                    togglePassengerSelectionByBooking(passenger.booking_id);
                  }
                }}
              >
                {/* Left Section: Checkbox and Seat */}
                <View style={styles.passengerLeftSection}>
                  {trip.status === 'boarding' && !passenger.check_in_status ? (
                    <View
                      style={[
                        styles.checkboxNew,
                        selectedPassengers.has(passenger.id) &&
                          styles.checkboxNewSelected,
                      ]}
                    >
                      {selectedPassengers.has(passenger.id) && (
                        <CheckCircle size={18} color='white' />
                      )}
                    </View>
                  ) : passenger.check_in_status ? (
                    <View style={styles.checkIconContainer}>
                      <CheckCircle size={22} color={Colors.success} />
                    </View>
                  ) : null}

                  <View style={styles.seatBadgeNew}>
                    <Text style={styles.seatNumberLarge}>
                      {passenger.seat_number || '--'}
                    </Text>
                  </View>
                </View>

                {/* Main Content */}
                <View style={styles.passengerMainContent}>
                  <View style={styles.passengerTopRow}>
                    <Text
                      style={[
                        styles.passengerNameNew,
                        passenger.check_in_status &&
                          styles.passengerNameCheckedIn,
                      ]}
                    >
                      {passenger.passenger_name}
                    </Text>
                    {passenger.check_in_status ? (
                      <View style={styles.statusBadgeSuccess}>
                        <Text style={styles.statusBadgeSuccessText}>
                          Checked In
                        </Text>
                      </View>
                    ) : (
                      <View style={styles.statusBadgePending}>
                        <Text style={styles.statusBadgePendingText}>
                          Pending
                        </Text>
                      </View>
                    )}
                  </View>

                  <Text style={styles.bookingNumberSmall}>
                    {passenger.booking_number}
                  </Text>

                  {/* Contact Number (clickable) */}
                  {(() => {
                    const phone = getPassengerContact(passenger);
                    if (!phone) return null;
                    return (
                      <Pressable
                        style={styles.contactRow}
                        onPress={() => Linking.openURL(`tel:${phone}`)}
                      >
                        <Phone size={12} color={Colors.textSecondary} />
                        <Text style={styles.contactText}>{phone}</Text>
                      </Pressable>
                    );
                  })()}

                  {/* ID Number */}
                  {passenger.passenger_id_proof ? (
                    <Text style={styles.contactText}>
                      ID: {passenger.passenger_id_proof}
                    </Text>
                  ) : null}

                  {passenger.special_assistance_request && (
                    <View style={styles.specialAssistanceNew}>
                      <AlertCircle size={14} color={Colors.error} />
                      <Text style={styles.specialAssistanceTextNew}>
                        {passenger.special_assistance_request}
                      </Text>
                    </View>
                  )}
                </View>
              </Pressable>
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
    gap: 8,
  },
  passengerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: Colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  // New Improved Passenger Item Styles
  passengerItemCheckedIn: {
    opacity: 0.7,
    backgroundColor: `${Colors.success}05`,
  },
  passengerLeftSection: {
    alignItems: 'center',
    marginRight: 16,
    gap: 8,
  },
  checkboxNew: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxNewSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary,
  },
  checkIconContainer: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  seatBadgeNew: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 48,
    alignItems: 'center',
  },
  seatNumberLarge: {
    fontSize: 16,
    fontWeight: '700',
    color: 'white',
  },
  passengerMainContent: {
    flex: 1,
    gap: 6,
  },
  passengerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  passengerNameNew: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    flex: 1,
    marginRight: 8,
  },
  passengerNameCheckedIn: {
    color: Colors.textSecondary,
  },
  statusBadgeSuccess: {
    backgroundColor: `${Colors.success}15`,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeSuccessText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.success,
  },
  statusBadgePending: {
    backgroundColor: `${Colors.warning}15`,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgePendingText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.warning,
  },
  bookingNumberSmall: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontFamily: 'monospace',
  },
  specialAssistanceNew: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: `${Colors.error}08`,
    borderLeftWidth: 3,
    borderLeftColor: Colors.error,
    borderRadius: 4,
    padding: 8,
    gap: 6,
  },
  specialAssistanceTextNew: {
    fontSize: 12,
    color: Colors.error,
    fontWeight: '500',
    flex: 1,
    flexWrap: 'wrap',
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  contactText: {
    fontSize: 12,
    color: Colors.textSecondary,
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
  // Multi-stop styles
  multiStopCard: {
    marginBottom: 16,
  },
  multiStopHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  multiStopIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: `${Colors.primary}20`,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  multiStopTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    flex: 1,
  },
  multiStopProgress: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '600',
  },
  loadingStopsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  loadingStopsText: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginLeft: 8,
  },
  stopsContainer: {
    marginBottom: 16,
  },
  stopItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  stopIndicator: {
    alignItems: 'center',
    marginRight: 16,
  },
  stopDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: Colors.card,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stopTypeIndicator: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  stopLine: {
    width: 2,
    height: 24,
    marginTop: 4,
  },
  stopInfo: {
    flex: 1,
  },
  stopName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  stopMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  stopSequence: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  stopTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  stopTypeBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  currentStopText: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '600',
  },
  completedStopText: {
    fontSize: 12,
    color: Colors.success,
    fontWeight: '600',
  },
  multiStopActions: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  // Compact Bulk Actions Styles
  bulkActionsBarCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: Colors.surface,
    borderRadius: 8,
    marginBottom: 8,
  },
  compactButton: {
    padding: 4,
  },
  selectedCountTextCompact: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text,
    flex: 1,
  },
  bulkCheckInButtonCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  bulkCheckInButtonTextCompact: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
  },
  selectAllButtonCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: Colors.surface,
    borderRadius: 6,
    marginBottom: 8,
  },
  selectAllTextCompact: {
    fontSize: 11,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  // Compact Tabs Styles
  passengerTabsCompact: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 12,
  },
  passengerTabCompact: {
    flex: 1,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  activeTabCompact: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  passengerTabTextCompact: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  activeTabTextCompact: {
    color: 'white',
  },
});
