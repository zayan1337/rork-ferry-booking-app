import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { colors } from '@/constants/adminColors';
import { useAlertContext } from '@/components/AlertProvider';
import { useTripManagement } from '@/hooks/useTripManagement';
import { useRouteManagement } from '@/hooks/useRouteManagement';
import { useVesselManagement } from '@/hooks/useVesselManagement';
import { useUserStore } from '@/store/admin/userStore';
import { AdminManagement } from '@/types';
import { supabase } from '@/utils/supabase';
import {
  Calendar,
  Clock,
  MapPin,
  Ship,
  AlertCircle,
  Save,
  RotateCcw,
  Info,
  Activity,
  Settings,
  Users,
  RefreshCw,
  DollarSign,
  Edit,
} from 'lucide-react-native';

// Components
import TextInput from '@/components/admin/TextInput';
import Button from '@/components/admin/Button';
import Dropdown from '@/components/admin/Dropdown';
import DatePicker from '@/components/admin/DatePicker';
import TimePicker from '@/components/admin/TimePicker';
import Switch from '@/components/admin/Switch';
import TripRouteInfo from '@/components/admin/trips/TripRouteInfo';
import TripFareEditor from '@/components/admin/trips/TripFareEditor';
import { getMultiStopRoute } from '@/utils/multiStopRouteUtils';
import type {
  RouteSegmentFare,
  TripFareOverride,
} from '@/types/multiStopRoute';

type TripFormData = AdminManagement.TripFormData;

interface TripFormProps {
  tripId?: string;
  onSave?: (trip: TripFormData) => void;
  onCancel?: () => void;
  initialData?: {
    route_id?: string;
    vessel_id?: string;
  };
}

interface FormData {
  route_id: string;
  vessel_id: string;
  travel_date: string;
  departure_time: string;
  arrival_time?: string;
  status:
    | 'scheduled'
    | 'boarding'
    | 'departed'
    | 'arrived'
    | 'cancelled'
    | 'delayed'
    | 'completed';
  fare_multiplier: number;
  captain_id?: string;
  is_active: boolean;
  // Note: delay_reason, weather_conditions, notes, and crew_ids are not in the trips table
  // These fields are kept for UI purposes but not sent to database
  delay_reason?: string;
  weather_conditions?: string;
  notes?: string;
  crew_ids?: string[];
}

interface ValidationErrors {
  route_id?: string;
  vessel_id?: string;
  travel_date?: string;
  departure_time?: string;
  arrival_time?: string;
  status?: string;
  delay_reason?: string;
  fare_multiplier?: string;
  weather_conditions?: string;
  captain_id?: string;
  crew_ids?: string;
  notes?: string;
  general?: string;
}

// Helper function to format time from database (HH:MM:SS or HH:MM) to HH:MM
const formatTimeForForm = (time: string | undefined): string => {
  if (!time) return '';
  // Remove seconds if present (HH:MM:SS -> HH:MM)
  return time.substring(0, 5);
};

// Helper function to format time for display (12-hour format with AM/PM)
const formatTimeDisplay = (time: string): string => {
  if (!time) return '';
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours, 10);
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${displayHour}:${minutes} ${period}`;
};

// Helper function to calculate duration between two times
const calculateDuration = (
  departureTime: string,
  arrivalTime: string
): string => {
  if (!departureTime || !arrivalTime) return '';

  const [depHours, depMinutes] = departureTime.split(':').map(Number);
  const [arrHours, arrMinutes] = arrivalTime.split(':').map(Number);

  const depTotalMinutes = depHours * 60 + depMinutes;
  const arrTotalMinutes = arrHours * 60 + arrMinutes;

  // Handle next day arrival
  let diffMinutes = arrTotalMinutes - depTotalMinutes;
  if (diffMinutes < 0) {
    diffMinutes += 24 * 60; // Add 24 hours
  }

  const hours = Math.floor(diffMinutes / 60);
  const minutes = diffMinutes % 60;

  if (hours === 0) {
    return `${minutes}m`;
  } else if (minutes === 0) {
    return `${hours}h`;
  } else {
    return `${hours}h ${minutes}m`;
  }
};

// Helper function to generate quick arrival time suggestions
const generateQuickArrivalTimes = (
  departureTime: string
): { value: string; label: string }[] => {
  const [hours, minutes] = departureTime.split(':').map(Number);
  const suggestions: { value: string; label: string }[] = [];

  // Common ferry trip durations: 30min, 1h, 1h30min, 2h, 3h
  const durations = [
    { minutes: 30, label: '30 min' },
    { minutes: 60, label: '1 hour' },
    { minutes: 90, label: '1.5 hours' },
    { minutes: 120, label: '2 hours' },
    { minutes: 180, label: '3 hours' },
  ];

  durations.forEach(({ minutes: duration, label }) => {
    let arrHours = hours;
    let arrMinutes = minutes + duration;

    // Handle hour overflow
    while (arrMinutes >= 60) {
      arrMinutes -= 60;
      arrHours += 1;
    }

    // Handle day overflow
    if (arrHours >= 24) {
      arrHours -= 24;
    }

    const arrTime = `${String(arrHours).padStart(2, '0')}:${String(
      arrMinutes
    ).padStart(2, '0')}`;
    suggestions.push({ value: arrTime, label });
  });

  return suggestions;
};

export default function TripForm({
  tripId,
  onSave,
  onCancel,
  initialData,
}: TripFormProps) {
  const { showError, showSuccess, showConfirmation, showInfo } =
    useAlertContext();
  const {
    trips,
    getById,
    create,
    update,
    loading: tripLoading,
  } = useTripManagement();
  const { routes, loadAll: loadRoutes } = useRouteManagement();
  const { vessels, loadAll: loadVessels } = useVesselManagement();
  const { users, fetchAll: fetchUsers } = useUserStore();

  // Find current trip data for editing
  const currentTrip = tripId ? getById(tripId) : null;

  const [formData, setFormData] = useState<FormData>({
    route_id: currentTrip?.route_id || initialData?.route_id || '',
    vessel_id: currentTrip?.vessel_id || initialData?.vessel_id || '',
    travel_date: currentTrip?.travel_date || '',
    departure_time: formatTimeForForm(currentTrip?.departure_time) || '',
    arrival_time: formatTimeForForm(currentTrip?.arrival_time) || '',
    status: currentTrip?.status || 'scheduled',
    delay_reason: currentTrip?.delay_reason || '',
    fare_multiplier: currentTrip?.fare_multiplier || 1.0,
    weather_conditions: currentTrip?.weather_conditions || '',
    captain_id: currentTrip?.captain_id || '',
    crew_ids: currentTrip?.crew_ids || [],
    notes: currentTrip?.notes || '',
    is_active: currentTrip?.is_active ?? true,
  });

  const [validationErrors, setValidationErrors] = useState<ValidationErrors>(
    {}
  );
  const [loading, setLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [fareMultiplierDisplay, setFareMultiplierDisplay] =
    useState<string>('');

  // Vessel change detection and seat rearrangement
  const [originalVesselId, setOriginalVesselId] = useState<string | null>(null);
  const [vesselChangeDetected, setVesselChangeDetected] = useState(false);
  const [existingBookings, setExistingBookings] = useState<any[]>([]);
  const [seatRearrangementStatus, setSeatRearrangementStatus] = useState<
    'idle' | 'analyzing' | 'rearranging' | 'completed' | 'error'
  >('idle');
  const [rearrangementPreview, setRearrangementPreview] = useState<any[]>([]);
  const [vesselValidationStatus, setVesselValidationStatus] = useState<
    'idle' | 'valid' | 'invalid' | 'checking'
  >('idle');
  const [vesselValidationMessage, setVesselValidationMessage] = useState<
    string | null
  >(null);

  // Fare editing state
  const [showFareEditor, setShowFareEditor] = useState(false);
  const [routeSegmentFares, setRouteSegmentFares] = useState<
    RouteSegmentFare[]
  >([]);
  const [tripFareOverrides, setTripFareOverrides] = useState<
    TripFareOverride[]
  >([]);
  const [loadingSegmentData, setLoadingSegmentData] = useState(false);
  const [initialDataLoaded, setInitialDataLoaded] = useState(false);

  const normalizeTimeString = (time?: string | null) => {
    if (!time) return null;
    const trimmed = time.trim();
    if (!trimmed) return null;
    return trimmed.length >= 5 ? trimmed.substring(0, 5) : trimmed;
  };

  const timeStringToMinutes = (time?: string | null) => {
    const sanitized = normalizeTimeString(time);
    if (!sanitized) return null;
    const [hours, minutes] = sanitized.split(':').map(Number);
    if (isNaN(hours) || isNaN(minutes)) return null;
    return hours * 60 + minutes;
  };

  const getPassengerCount = useCallback(() => {
    if (existingBookings.length > 0) {
      return existingBookings.reduce(
        (total, booking) => total + (booking.passengers?.length || 0),
        0
      );
    }
    if (
      currentTrip?.booked_seats !== undefined &&
      currentTrip?.booked_seats !== null
    ) {
      return Number(currentTrip.booked_seats) || 0;
    }
    return 0;
  }, [existingBookings, currentTrip?.booked_seats]);

  const fetchExistingBookings = useCallback(async () => {
    if (!tripId) return [];
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select(
          `
              id,
              booking_number,
              status,
              total_fare,
              passengers (
                id,
                passenger_name,
                seat_id,
                seats (
                  id,
                  seat_number,
                  row_number,
                  is_window,
                  is_aisle
                )
              )
            `
        )
        .eq('trip_id', tripId)
        .in('status', ['confirmed', 'checked_in', 'completed']);

      if (error) {
        console.error('Error fetching existing bookings:', error);
        return [];
      }

      const safeBookings = data || [];
      setExistingBookings(safeBookings);
      return safeBookings;
    } catch (error) {
      console.error('Error fetching existing bookings:', error);
      return [];
    }
  }, [tripId]);

  interface VesselConflictResult {
    conflict: boolean;
    tripId?: string;
    departure_time?: string;
    arrival_time?: string;
  }

  const hasVesselScheduleConflict = useCallback(
    async (
      vesselId: string,
      travelDate?: string,
      departureTime?: string,
      arrivalTime?: string | null
    ): Promise<VesselConflictResult> => {
      if (!travelDate || !departureTime) {
        return { conflict: false };
      }

      try {
        let query = supabase
          .from('trips')
          .select('id, departure_time, arrival_time')
          .eq('vessel_id', vesselId)
          .eq('travel_date', travelDate);

        if (currentTrip?.id) {
          query = query.neq('id', currentTrip.id);
        }

        const { data, error } = await query;

        if (error) {
          console.error('Error checking vessel conflicts:', error);
          return { conflict: false };
        }

        if (!data || data.length === 0) {
          return { conflict: false };
        }

        const candidateStart =
          timeStringToMinutes(departureTime) ??
          timeStringToMinutes('00:00') ??
          0;
        const candidateEnd =
          timeStringToMinutes(arrivalTime) ?? candidateStart + 120;

        const conflictingTrip = data.find(trip => {
          const otherStart =
            timeStringToMinutes(trip.departure_time) ??
            timeStringToMinutes('00:00') ??
            0;
          const otherEnd =
            timeStringToMinutes(trip.arrival_time) ?? otherStart + 120;
          return candidateStart < otherEnd && otherStart < candidateEnd;
        });

        if (conflictingTrip) {
          return {
            conflict: true,
            tripId: conflictingTrip.id,
            departure_time: conflictingTrip.departure_time,
            arrival_time: conflictingTrip.arrival_time,
          };
        }

        return { conflict: false };
      } catch (error) {
        console.error('Error checking vessel conflicts:', error);
        return { conflict: false };
      }
    },
    [currentTrip?.id]
  );

  const validateVesselChange = useCallback(
    async (
      nextVesselId: string
    ): Promise<{ valid: boolean; error?: string }> => {
      if (!nextVesselId) {
        return { valid: false, error: 'Please select a vessel.' };
      }

      const travelDate = formData.travel_date || currentTrip?.travel_date;
      const departureTime =
        formData.departure_time ||
        formatTimeForForm(currentTrip?.departure_time);
      const arrivalTime =
        formData.arrival_time || formatTimeForForm(currentTrip?.arrival_time);

      const currentStatus = formData.status || currentTrip?.status;
      if (
        currentStatus &&
        ['departed', 'boarding', 'completed'].includes(currentStatus)
      ) {
        return {
          valid: false,
          error:
            'Cannot change vessel for trips that have departed, are boarding, or already completed.',
        };
      }

      if (travelDate && departureTime) {
        const normalizedDeparture = normalizeTimeString(departureTime);
        if (normalizedDeparture) {
          const departureDateTime = new Date(
            `${travelDate}T${normalizedDeparture}:00`
          );
          if (!isNaN(departureDateTime.valueOf())) {
            const now = new Date();
            if (departureDateTime.getTime() <= now.getTime()) {
              return {
                valid: false,
                error:
                  'Cannot change vessel for trips that have already departed.',
              };
            }
          }
        }
      }

      const newVessel = vessels?.find(vessel => vessel.id === nextVesselId);
      if (!newVessel) {
        return { valid: false, error: 'Selected vessel is not available.' };
      }

      if (!newVessel.is_active) {
        return {
          valid: false,
          error: 'Selected vessel is inactive. Please choose another vessel.',
        };
      }

      const passengerCount = getPassengerCount();
      if (
        newVessel.seating_capacity &&
        passengerCount > newVessel.seating_capacity
      ) {
        return {
          valid: false,
          error: `Selected vessel has ${newVessel.seating_capacity} seats but ${passengerCount} passengers are booked.`,
        };
      }

      if (travelDate && departureTime) {
        const conflictResult = await hasVesselScheduleConflict(
          nextVesselId,
          travelDate,
          normalizeTimeString(departureTime) || departureTime,
          normalizeTimeString(arrivalTime || undefined) || arrivalTime
        );
        if (conflictResult.conflict) {
          return {
            valid: false,
            error: `Selected vessel is already assigned to Trip #${conflictResult.tripId} on ${travelDate} at ${formatTimeDisplay(
              normalizeTimeString(conflictResult.departure_time) ||
                conflictResult.departure_time ||
                '00:00'
            )}.`,
          };
        }
      }

      return { valid: true };
    },
    [
      currentTrip,
      formData.arrival_time,
      formData.departure_time,
      formData.status,
      formData.travel_date,
      getPassengerCount,
      hasVesselScheduleConflict,
      vessels,
    ]
  );

  const handleVesselSelection = useCallback(
    async (value: string) => {
      if (value === formData.vessel_id) {
        return;
      }

      if (!tripId) {
        setFormData(prev => ({ ...prev, vessel_id: value }));
        return;
      }

      setVesselValidationStatus('checking');
      setVesselValidationMessage(null);

      const validation = await validateVesselChange(value);
      if (!validation.valid) {
        setVesselValidationStatus('invalid');
        setVesselValidationMessage(validation.error || null);
        if (validation.error) {
          showError('Cannot Change Vessel', validation.error);
        }
        return;
      }

      setVesselValidationStatus('valid');
      const count = getPassengerCount();
      if (count > 0) {
        setVesselValidationMessage(
          `Ready to transfer ${count} passenger${count === 1 ? '' : 's'} to the new vessel.`
        );
      } else {
        setVesselValidationMessage('Vessel selection looks good.');
      }

      setFormData(prev => ({ ...prev, vessel_id: value }));
    },
    [
      formData.vessel_id,
      getPassengerCount,
      showError,
      tripId,
      validateVesselChange,
    ]
  );

  // Initialize fare multiplier display value
  useEffect(() => {
    if (fareMultiplierDisplay === '') {
      setFareMultiplierDisplay(formData.fare_multiplier.toString());
    }
  }, [formData.fare_multiplier]);

  // Load routes, vessels, and users on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        await Promise.all([loadRoutes(), loadVessels(), fetchUsers()]);
        setInitialDataLoaded(true);
      } catch (error) {
        console.error('Error loading initial data:', error);
        setInitialDataLoaded(true); // Set to true even on error to prevent infinite loading
      }
    };

    loadData();
  }, []);

  useEffect(() => {
    if (tripId) {
      fetchExistingBookings();
    }
  }, [fetchExistingBookings, tripId]);

  // Load segment data when route changes
  useEffect(() => {
    if (formData.route_id) {
      loadSegmentData(formData.route_id);
    } else {
      setRouteSegmentFares([]);
      setTripFareOverrides([]);
    }
  }, [formData.route_id]);

  // Initialize original vessel ID for change detection
  useEffect(() => {
    if (currentTrip?.vessel_id && !originalVesselId) {
      setOriginalVesselId(currentTrip.vessel_id);
    }
  }, [currentTrip?.vessel_id, originalVesselId]);

  // Load segment data for fare editing
  const loadSegmentData = async (routeId: string) => {
    setLoadingSegmentData(true);
    try {
      const multiRoute = await getMultiStopRoute(routeId);

      if (multiRoute && multiRoute.segment_fares) {
        setRouteSegmentFares(multiRoute.segment_fares);
      } else {
        setRouteSegmentFares([]);
      }

      // Load existing trip fare overrides if editing
      if (tripId) {
        const { data: overrides, error } = await supabase
          .from('trip_fare_overrides')
          .select('*')
          .eq('trip_id', tripId);

        if (error) {
          console.error('Error loading trip fare overrides:', error);
        } else {
          setTripFareOverrides(overrides || []);
        }
      }
    } catch (error) {
      console.error('Error loading segment data:', error);
    } finally {
      setLoadingSegmentData(false);
    }
  };

  // Fare editing handlers
  const handleOpenFareEditor = () => {
    setShowFareEditor(true);
  };

  const handleSaveFareOverrides = async (overrides: TripFareOverride[]) => {
    try {
      if (tripId) {
        // Delete existing overrides
        await supabase
          .from('trip_fare_overrides')
          .delete()
          .eq('trip_id', tripId);

        // Insert new overrides
        if (overrides.length > 0) {
          const { error } = await supabase.from('trip_fare_overrides').insert(
            overrides.map(o => ({
              trip_id: tripId,
              from_stop_id: o.from_stop_id,
              to_stop_id: o.to_stop_id,
              override_fare_amount: o.override_fare_amount,
              reason: o.reason,
            }))
          );

          if (error) throw error;
        }
      }

      setTripFareOverrides(overrides);
      setShowFareEditor(false);
      showSuccess('Success', 'Fare overrides saved successfully');
    } catch (error) {
      console.error('Error saving fare overrides:', error);
      showError('Error', 'Failed to save fare overrides');
    }
  };

  const handleCancelFareEditor = () => {
    setShowFareEditor(false);
  };

  // Generate seat rearrangement preview
  const generateSeatRearrangementPreview = useCallback(
    async (bookings: any[]) => {
      try {
        setSeatRearrangementStatus('analyzing');

        // Get new vessel's seats
        const { data: newVesselSeats, error: seatsError } = await supabase
          .from('seats')
          .select('*')
          .eq('vessel_id', formData.vessel_id)
          .order('row_number', { ascending: true })
          .order('seat_number', { ascending: true });

        if (seatsError) {
          console.error('Error fetching new vessel seats:', seatsError);
          setSeatRearrangementStatus('error');
          return;
        }

        if (!newVesselSeats || newVesselSeats.length === 0) {
          setSeatRearrangementStatus('error');
          return;
        }

        // Extract all passengers from bookings
        const allPassengers = bookings.flatMap(
          booking =>
            booking.passengers?.map((passenger: any) => ({
              ...passenger,
              booking_id: booking.id,
              booking_number: booking.booking_number,
            })) || []
        );

        // Generate rearrangement mapping
        const rearrangement = generateSeatMapping(
          allPassengers,
          newVesselSeats
        );
        setRearrangementPreview(rearrangement);
        setSeatRearrangementStatus('completed');
      } catch (error) {
        console.error('Error generating seat rearrangement preview:', error);
        setSeatRearrangementStatus('error');
      }
    },
    [formData.vessel_id]
  );

  // Generate intelligent seat mapping
  const generateSeatMapping = useCallback(
    (passengers: any[], newVesselSeats: any[]) => {
      const rearrangement: any[] = [];

      if (!newVesselSeats || newVesselSeats.length === 0) {
        return rearrangement;
      }

      const rowSeatMap = new Map<
        number,
        {
          id: string;
          seat_number: string;
          row_number: number;
          is_window: boolean;
          is_aisle: boolean;
        }[]
      >();

      newVesselSeats.forEach(seat => {
        const row = seat.row_number || 0;
        if (!rowSeatMap.has(row)) {
          rowSeatMap.set(row, []);
        }
        rowSeatMap.get(row)?.push(seat);
      });

      const sortedRowNumbers = Array.from(rowSeatMap.keys()).sort(
        (a, b) => a - b
      );
      sortedRowNumbers.forEach(row => {
        rowSeatMap.get(row)?.sort((a, b) => {
          const seatA = a.seat_number || '';
          const seatB = b.seat_number || '';
          if (a.is_window && !b.is_window) return -1;
          if (!a.is_window && b.is_window) return 1;
          if (a.is_aisle && !b.is_aisle) return -1;
          if (!a.is_aisle && b.is_aisle) return 1;
          return seatA.localeCompare(seatB, undefined, { numeric: true });
        });
      });

      const passengersByBooking = passengers.reduce(
        (acc: Record<string, any[]>, passenger: any) => {
          const bookingId = passenger.booking_id || passenger.id;
          if (!acc[bookingId]) {
            acc[bookingId] = [];
          }
          acc[bookingId].push(passenger);
          return acc;
        },
        {}
      );

      const sortPassengersBySeatPreference = (list: any[]) => {
        return [...list].sort((a, b) => {
          const seatA = a.seats;
          const seatB = b.seats;
          if (seatA?.row_number !== seatB?.row_number) {
            return (seatA?.row_number || 0) - (seatB?.row_number || 0);
          }
          if (seatA?.is_window && !seatB?.is_window) return -1;
          if (!seatA?.is_window && seatB?.is_window) return 1;
          if (seatA?.is_aisle && !seatB?.is_aisle) return -1;
          if (!seatA?.is_aisle && seatB?.is_aisle) return 1;
          return (seatA?.seat_number || '').localeCompare(
            seatB?.seat_number || '',
            undefined,
            { numeric: true }
          );
        });
      };

      const bookingGroups = Object.entries(passengersByBooking).map(
        ([bookingId, passengerList]) => {
          const sorted = sortPassengersBySeatPreference(passengerList);
          const preferredRows = Array.from(
            new Set(
              sorted
                .map(p => p.seats?.row_number)
                .filter(row => typeof row === 'number')
            )
          ) as number[];

          return {
            bookingId,
            passengers: sorted,
            preferredRows: preferredRows.length > 0 ? preferredRows : [],
          };
        }
      );

      bookingGroups.sort((a, b) => {
        const rowA = a.preferredRows[0] ?? Infinity;
        const rowB = b.preferredRows[0] ?? Infinity;
        if (rowA !== rowB) return rowA - rowB;
        return a.bookingId.localeCompare(b.bookingId);
      });

      const findRowWithSeats = (
        size: number,
        targetRows: number[]
      ): { row: number; seats: any[] } | null => {
        const tried = new Set<number>();
        for (const row of targetRows) {
          if (tried.has(row)) continue;
          tried.add(row);

          const seats = rowSeatMap.get(row);
          if (seats && seats.length >= size) {
            return { row, seats: seats.splice(0, size) };
          }
        }

        for (const row of sortedRowNumbers) {
          if (tried.has(row)) continue;
          const seats = rowSeatMap.get(row);
          if (seats && seats.length >= size) {
            return { row, seats: seats.splice(0, size) };
          }
        }

        const pooled: any[] = [];
        for (const row of sortedRowNumbers) {
          const seats = rowSeatMap.get(row);
          while (seats && seats.length && pooled.length < size) {
            pooled.push(seats.shift());
          }
          if (pooled.length === size) {
            return { row, seats: pooled };
          }
        }

        return pooled.length
          ? {
              row: pooled[0]?.row_number || sortedRowNumbers[0],
              seats: pooled,
            }
          : null;
      };

      bookingGroups.forEach(group => {
        const allocation = findRowWithSeats(
          group.passengers.length,
          group.preferredRows
        );

        if (!allocation) {
          return;
        }

        allocation.seats.forEach((seat, index) => {
          const passenger = group.passengers[index];
          if (!passenger) return;

          rearrangement.push({
            passenger_id: passenger.id,
            passenger_name: passenger.passenger_name,
            booking_id: passenger.booking_id,
            booking_number: passenger.booking_number,
            old_seat: {
              id: passenger.seat_id,
              number: passenger.seats?.seat_number,
              row: passenger.seats?.row_number,
              is_window: passenger.seats?.is_window,
              is_aisle: passenger.seats?.is_aisle,
            },
            new_seat: {
              id: seat.id,
              number: seat.seat_number,
              row: seat.row_number,
              is_window: seat.is_window,
              is_aisle: seat.is_aisle,
            },
            status: 'pending',
          });
        });
      });

      return rearrangement;
    },
    []
  );

  // Apply seat rearrangement
  const cleanupOldSeatReservations = useCallback(async () => {
    if (!tripId || !originalVesselId) return;
    try {
      const { data: oldSeats, error } = await supabase
        .from('seats')
        .select('id')
        .eq('vessel_id', originalVesselId);

      if (error) {
        console.error('Error fetching old vessel seats:', error);
        return;
      }

      if (!oldSeats || oldSeats.length === 0) {
        return;
      }

      await supabase
        .from('seat_reservations')
        .delete()
        .eq('trip_id', tripId)
        .in(
          'seat_id',
          oldSeats.map(seat => seat.id)
        );
    } catch (error) {
      console.error('Error cleaning up old seat reservations:', error);
    }
  }, [originalVesselId, tripId]);

  // Perform the actual seat rearrangement
  const performSeatRearrangement = useCallback(
    async (options?: { silent?: boolean }) => {
      try {
        // Update seat reservations for each passenger
        for (const rearrangement of rearrangementPreview) {
          const { error } = await supabase
            .from('seat_reservations')
            .update({
              seat_id: rearrangement.new_seat.id,
              is_available: false,
              is_reserved: true,
            })
            .eq('trip_id', tripId)
            .eq('seat_id', rearrangement.old_seat.id);

          if (error) {
            console.error('Error updating seat reservation:', error);
            continue;
          }

          // Update passenger's seat assignment
          const { error: passengerError } = await supabase
            .from('passengers')
            .update({
              seat_id: rearrangement.new_seat.id,
            })
            .eq('id', rearrangement.passenger_id);

          if (passengerError) {
            console.error('Error updating passenger seat:', passengerError);
          }
        }

        await cleanupOldSeatReservations();
        setSeatRearrangementStatus('completed');

        if (!options?.silent) {
          showSuccess(
            'Seat Rearrangement Complete',
            `Successfully rearranged ${rearrangementPreview.length} passengers to new vessel seats.`
          );
        }
      } catch (error) {
        console.error('Error applying seat rearrangement:', error);
        setSeatRearrangementStatus('error');
        if (!options?.silent) {
          showError(
            'Error',
            'Failed to apply seat rearrangement. Please try again.'
          );
        } else {
          throw error;
        }
      }
    },
    [
      cleanupOldSeatReservations,
      rearrangementPreview,
      showError,
      showSuccess,
      tripId,
    ]
  );

  // Detect vessel changes and fetch existing bookings
  useEffect(() => {
    const detectVesselChange = async () => {
      if (!tripId || !formData.vessel_id || !originalVesselId) return;

      if (formData.vessel_id !== originalVesselId) {
        setVesselChangeDetected(true);
        setSeatRearrangementStatus('analyzing');

        try {
          const bookings =
            existingBookings.length > 0
              ? existingBookings
              : await fetchExistingBookings();

          // Generate seat rearrangement preview
          if (bookings && bookings.length > 0) {
            await generateSeatRearrangementPreview(bookings);
          } else {
            setSeatRearrangementStatus('completed');
          }
        } catch (error) {
          console.error('Error analyzing vessel change:', error);
          setSeatRearrangementStatus('error');
        }
      } else {
        setVesselChangeDetected(false);
        setSeatRearrangementStatus('idle');
        setRearrangementPreview([]);
        setVesselValidationStatus('idle');
        setVesselValidationMessage(null);
      }
    };

    // Add a small delay to prevent rapid fire calls
    const timeoutId = setTimeout(detectVesselChange, 300);
    return () => clearTimeout(timeoutId);
  }, [
    existingBookings.length,
    fetchExistingBookings,
    formData.vessel_id,
    generateSeatRearrangementPreview,
    originalVesselId,
    tripId,
  ]);

  // Track form changes
  useEffect(() => {
    if (currentTrip) {
      const hasFormChanges =
        formData.route_id !== (currentTrip.route_id || '') ||
        formData.vessel_id !== (currentTrip.vessel_id || '') ||
        formData.travel_date !== (currentTrip.travel_date || '') ||
        formData.departure_time !== (currentTrip.departure_time || '') ||
        formData.arrival_time !== (currentTrip.arrival_time || '') ||
        formData.status !== (currentTrip.status || 'scheduled') ||
        formData.delay_reason !== (currentTrip.delay_reason || '') ||
        formData.fare_multiplier !== (currentTrip.fare_multiplier || 1.0) ||
        formData.weather_conditions !==
          (currentTrip.weather_conditions || '') ||
        formData.captain_id !== (currentTrip.captain_id || '') ||
        JSON.stringify(formData.crew_ids) !==
          JSON.stringify(currentTrip.crew_ids || []) ||
        formData.notes !== (currentTrip.notes || '') ||
        formData.is_active !== (currentTrip.is_active ?? true);
      setHasChanges(hasFormChanges);
    } else {
      // For new trips, check if any field has been filled
      const hasAnyData = Object.values(formData).some(
        value =>
          value !== '' &&
          value !== 1.0 &&
          value !== true &&
          (Array.isArray(value) ? value.length > 0 : true)
      );
      setHasChanges(hasAnyData);
    }
  }, [formData, currentTrip]);

  const validateForm = (): boolean => {
    const errors: ValidationErrors = {};

    if (!formData.route_id) {
      errors.route_id = 'Route is required';
    } else {
      // Validate UUID format for route_id
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(formData.route_id)) {
        errors.route_id =
          'Invalid route selection. Please select a valid route.';
      }
    }

    if (!formData.vessel_id) {
      errors.vessel_id = 'Vessel is required';
    } else {
      // Validate UUID format for vessel_id
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(formData.vessel_id)) {
        errors.vessel_id =
          'Invalid vessel selection. Please select a valid vessel.';
      }
    }

    if (!formData.travel_date) {
      errors.travel_date = 'Travel date is required';
    } else {
      // Validate date is not in the past
      const selectedDate = new Date(formData.travel_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (selectedDate < today) {
        errors.travel_date = 'Travel date cannot be in the past';
      }
    }

    if (!formData.departure_time) {
      errors.departure_time = 'Departure time is required';
    } else {
      // Validate time format - accept both HH:MM and HH:MM:SS formats
      const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/;
      if (!timeRegex.test(formData.departure_time)) {
        errors.departure_time =
          'Invalid time format. Use HH:MM format (e.g., 14:30)';
      } else {
        // Additional validation: ensure time is valid
        const timeParts = formData.departure_time.split(':');
        const hours = parseInt(timeParts[0]);
        const minutes = parseInt(timeParts[1]);
        if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
          errors.departure_time =
            'Invalid time. Hours must be 00-23, minutes must be 00-59';
        }
      }
    }

    if (formData.arrival_time) {
      // Validate arrival time format - accept both HH:MM and HH:MM:SS formats
      const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/;
      if (!timeRegex.test(formData.arrival_time)) {
        errors.arrival_time =
          'Invalid time format. Use HH:MM format (e.g., 16:30)';
      } else {
        // Additional validation: ensure time is valid
        const timeParts = formData.arrival_time.split(':');
        const hours = parseInt(timeParts[0]);
        const minutes = parseInt(timeParts[1]);
        if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
          errors.arrival_time =
            'Invalid time. Hours must be 00-23, minutes must be 00-59';
        }
      }
    }

    if (
      formData.arrival_time &&
      formData.departure_time &&
      !errors.arrival_time &&
      !errors.departure_time
    ) {
      // Validate arrival time is after departure time
      // Ensure both times are in HH:MM:SS format for comparison
      const departureFormatted =
        formData.departure_time.length === 5
          ? `${formData.departure_time}:00`
          : formData.departure_time;
      const arrivalFormatted =
        formData.arrival_time.length === 5
          ? `${formData.arrival_time}:00`
          : formData.arrival_time;

      const departureTime = new Date(`2000-01-01T${departureFormatted}`);
      const arrivalTime = new Date(`2000-01-01T${arrivalFormatted}`);

      if (arrivalTime <= departureTime) {
        errors.arrival_time = 'Arrival time must be after departure time';
      }
    }

    if (formData.fare_multiplier <= 0) {
      errors.fare_multiplier = 'Fare multiplier must be greater than 0';
    }

    if (formData.fare_multiplier > 10) {
      errors.fare_multiplier = 'Fare multiplier cannot exceed 10';
    }

    // Validate captain_id UUID format if provided
    if (formData.captain_id) {
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(formData.captain_id)) {
        errors.captain_id =
          'Invalid captain selection. Please select a valid captain.';
      }
    }

    // Note: delay_reason validation removed as it's not in the trips table
    // These fields are kept for UI purposes but not validated for database

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    const vesselChanged = Boolean(
      tripId &&
        originalVesselId &&
        formData.vessel_id &&
        formData.vessel_id !== originalVesselId
    );

    if (vesselChanged && formData.vessel_id) {
      const validation = await validateVesselChange(formData.vessel_id);
      if (!validation.valid) {
        const message =
          validation.error ||
          'Cannot change vessel with the current configuration.';
        setValidationErrors(prev => ({ ...prev, general: message }));
        showError('Cannot Change Vessel', message);
        return;
      }

      if (seatRearrangementStatus === 'analyzing') {
        showInfo(
          'Analyzing Bookings',
          'Seat rearrangement is still being analyzed. Please wait a moment and try again.'
        );
        return;
      }

      const bookings =
        existingBookings.length > 0
          ? existingBookings
          : await fetchExistingBookings();

      if (bookings.length > 0) {
        if (
          seatRearrangementStatus !== 'completed' ||
          rearrangementPreview.length === 0
        ) {
          await generateSeatRearrangementPreview(bookings);
        }

        showInfo(
          'Transferring Passengers',
          `Moving ${passengerCount} passenger${
            passengerCount === 1 ? '' : 's'
          } to ${selectedVessel?.name || 'the new vessel'}...`
        );
        setSeatRearrangementStatus('rearranging');
        try {
          await performSeatRearrangement({ silent: true });
        } catch (error) {
          console.error('Automatic seat transfer failed:', error);
          setSeatRearrangementStatus('error');
          showError(
            'Seat Transfer Failed',
            'Unable to transfer passengers to the new vessel. Please review seat rearrangement.'
          );
          return;
        }
      }
    }

    await performTripUpdate();
  };

  const performTripUpdate = async () => {
    setLoading(true);
    try {
      // Get vessel capacity for available_seats
      const selectedVessel = vessels?.find(v => v.id === formData.vessel_id);
      const vesselCapacity = selectedVessel?.seating_capacity || 50; // Default fallback
      const passengerCount = getPassengerCount();
      const availableSeats = Math.max(vesselCapacity - passengerCount, 0);

      const tripFormData: TripFormData = {
        route_id: formData.route_id,
        vessel_id: formData.vessel_id,
        travel_date: formData.travel_date,
        departure_time: formData.departure_time,
        arrival_time: formData.arrival_time?.trim() || undefined,
        status: formData.status,
        fare_multiplier: formData.fare_multiplier,
        captain_id: formData.captain_id?.trim() || undefined,
        is_active: formData.is_active,
        available_seats: availableSeats,
        // Note: delay_reason, weather_conditions, notes, and crew_ids are not in the trips table
        // These fields need to be handled separately or added to the database schema
      };

      if (currentTrip) {
        try {
          await update(currentTrip.id, tripFormData);
          showSuccess('Success', 'Trip updated successfully');
        } catch (updateError: any) {
          // Handle PGRST204 error specifically
          if (
            updateError.message.includes('PGRST204') ||
            updateError.message.includes(
              'No data returned from update operation'
            )
          ) {
            // The update might have succeeded but no data was returned
            // Try to refresh the trip data to confirm
            try {
              const refreshedTrip = await getById(currentTrip.id);
              if (refreshedTrip) {
                showSuccess('Success', 'Trip updated successfully (verified)');
              } else {
                // If refresh fails, try one more time with a delay
                await new Promise(resolve => setTimeout(resolve, 1000));
                const retryTrip = await getById(currentTrip.id);
                if (retryTrip) {
                  showSuccess(
                    'Success',
                    'Trip updated successfully (verified on retry)'
                  );
                } else {
                  throw new Error('Unable to verify trip update');
                }
              }
            } catch (refreshError) {
              throw updateError; // Re-throw original error if refresh fails
            }
          } else {
            throw updateError; // Re-throw other errors
          }
        }
      } else {
        // Create the trip
        // Note: create function actually returns the created trip data despite type definition
        const createdTrip = (await create(tripFormData)) as any;

        // Pass the created trip ID to onSave callback
        // Let the parent component (new.tsx) handle success message and navigation
        if (onSave) {
          // createdTrip should have an id field from the database insert
          const tripId = createdTrip?.id || null;

          if (tripId) {
            // Reset form to empty state after successful creation
            setFormData({
              route_id: initialData?.route_id || '',
              vessel_id: initialData?.vessel_id || '',
              travel_date: '',
              departure_time: '',
              arrival_time: '',
              status: 'scheduled',
              delay_reason: '',
              fare_multiplier: 1.0,
              weather_conditions: '',
              captain_id: '',
              crew_ids: [],
              notes: '',
              is_active: true,
            });
            setValidationErrors({});
            setHasChanges(false);

            // Type assertion for the callback with id
            onSave({ ...tripFormData, id: tripId } as any);
          } else {
            onSave(tripFormData);
          }
        } else {
          // If no onSave callback, show success here
          showSuccess('Success', 'Trip created successfully!');
        }
        return; // Exit early for new trips
      }

      if (onSave) {
        onSave(tripFormData);
      }

      if (
        currentTrip &&
        formData.vessel_id &&
        currentTrip.vessel_id !== formData.vessel_id
      ) {
        setOriginalVesselId(formData.vessel_id);
        setVesselChangeDetected(false);
        setVesselValidationStatus('idle');
        setVesselValidationMessage(null);
      }
    } catch (error) {
      console.error('Error saving trip:', error);

      // Handle specific database constraint errors
      let errorMessage = 'Failed to save trip. Please try again.';

      if (error instanceof Error) {
        // Check for specific database errors
        if (
          error.message.includes('PGRST204') ||
          error.message.includes('No data returned from update operation')
        ) {
          errorMessage =
            'Trip update completed but no data was returned. The trip may have been updated successfully.';
        } else if (
          error.message.includes('duplicate key value') ||
          error.message.includes('unique constraint')
        ) {
          errorMessage =
            'A trip with the same details already exists. Please check your input.';
        } else if (error.message.includes('foreign key constraint')) {
          errorMessage =
            'Invalid route or vessel selection. Please check your selections.';
        } else if (error.message.includes('check constraint')) {
          errorMessage =
            'Invalid data provided. Please check your input values.';
        } else if (error.message.includes('not null constraint')) {
          errorMessage =
            'Required fields are missing. Please fill in all required fields.';
        } else if (
          error.message.includes('permission denied') ||
          error.message.includes('insufficient_privilege')
        ) {
          errorMessage =
            'You do not have permission to update this trip. Please contact an administrator.';
        } else if (
          error.message.includes('connection') ||
          error.message.includes('network')
        ) {
          errorMessage =
            'Network connection error. Please check your internet connection and try again.';
        } else if (
          error.message.includes('invalid input syntax for type time')
        ) {
          errorMessage =
            'Invalid time format. Please ensure times are in HH:MM format (e.g., 14:30).';
        } else if (
          error.message.includes('time') &&
          error.message.includes('format')
        ) {
          errorMessage =
            'Time format error. Please check your departure and arrival times.';
        } else if (
          error.message.includes('invalid input syntax for type uuid')
        ) {
          errorMessage =
            'Invalid ID format. Please refresh the page and try again.';
        } else if (
          error.message.includes('uuid') &&
          error.message.includes('invalid')
        ) {
          errorMessage =
            'Invalid selection format. Please refresh the page and try again.';
        } else if (error.message.includes('foreign key constraint')) {
          errorMessage =
            'Invalid selection. The selected route, vessel, or captain may no longer exist.';
        } else {
          errorMessage = error.message;
        }
      }

      setValidationErrors({ general: errorMessage });
      showError('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (hasChanges) {
      showConfirmation(
        'Unsaved Changes',
        'You have unsaved changes. Are you sure you want to cancel?',
        onCancel || (() => {}),
        undefined,
        true // Mark as destructive action
      );
    } else {
      onCancel?.();
    }
  };

  const handleReset = () => {
    if (currentTrip) {
      setFormData({
        route_id: currentTrip.route_id || '',
        vessel_id: currentTrip.vessel_id || '',
        travel_date: currentTrip.travel_date || '',
        departure_time: formatTimeForForm(currentTrip.departure_time) || '',
        arrival_time: formatTimeForForm(currentTrip.arrival_time) || '',
        status: currentTrip.status || 'scheduled',
        delay_reason: currentTrip.delay_reason || '',
        fare_multiplier: currentTrip.fare_multiplier || 1.0,
        weather_conditions: currentTrip.weather_conditions || '',
        captain_id: currentTrip.captain_id || '',
        crew_ids: currentTrip.crew_ids || [],
        notes: currentTrip.notes || '',
        is_active: currentTrip.is_active ?? true,
      });
    } else {
      setFormData({
        route_id: initialData?.route_id || '',
        vessel_id: initialData?.vessel_id || '',
        travel_date: '',
        departure_time: '',
        arrival_time: '',
        status: 'scheduled',
        delay_reason: '',
        fare_multiplier: 1.0,
        weather_conditions: '',
        captain_id: '',
        crew_ids: [],
        notes: '',
        is_active: true,
      });
    }
    setValidationErrors({});
    setHasChanges(false);
  };

  const getStatusDescription = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'Trip is planned and ready for boarding';
      case 'boarding':
        return 'Passengers are currently boarding the vessel';
      case 'departed':
        return 'Trip has left the origin and is in transit';
      case 'arrived':
        return 'Trip has reached its destination';
      case 'cancelled':
        return 'Trip has been cancelled';
      case 'delayed':
        return 'Trip is delayed from its scheduled time';
      default:
        return '';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
        return colors.info;
      case 'boarding':
        return colors.warning;
      case 'departed':
        return colors.primary;
      case 'arrived':
        return colors.success;
      case 'cancelled':
        return colors.error;
      case 'delayed':
        return colors.warning;
      default:
        return colors.textSecondary;
    }
  };

  // Safely generate route options
  const routeOptions = useMemo(() => {
    if (!routes || routes.length === 0) return [];
    return routes.map(route => ({
      label:
        route.name ||
        `${route.from_island_name || 'Unknown'} → ${route.to_island_name || 'Unknown'}`,
      value: route.id,
    }));
  }, [routes]);

  // Safely generate vessel options
  const vesselOptions = useMemo(() => {
    if (!vessels || vessels.length === 0) return [];
    return vessels
      .filter(vessel => vessel.is_active)
      .map(vessel => ({
        label: `${vessel.name} (${vessel.seating_capacity || 0} seats)`,
        value: vessel.id,
      }));
  }, [vessels]);

  const statusOptions = [
    { label: 'Scheduled', value: 'scheduled' },
    { label: 'Boarding', value: 'boarding' },
    { label: 'Departed', value: 'departed' },
    { label: 'Arrived', value: 'arrived' },
    { label: 'Cancelled', value: 'cancelled' },
    { label: 'Delayed', value: 'delayed' },
  ];

  const captainOptions = [
    { label: 'No Captain Assigned', value: '' },
    ...(users || [])
      .filter(user => user.role === 'captain' && user.status === 'active')
      .map(captain => ({
        label: captain.name || captain.email,
        value: captain.id,
      })),
  ];

  const selectedVessel = useMemo(() => {
    if (!formData.vessel_id) return null;
    return vessels?.find(vessel => vessel.id === formData.vessel_id) || null;
  }, [formData.vessel_id, vessels]);

  const passengerCount = getPassengerCount();
  const capacityRemaining = selectedVessel
    ? Math.max(selectedVessel.seating_capacity - passengerCount, 0)
    : null;

  if (loading || tripLoading.data || !initialDataLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size='large' color={colors.primary} />
        <Text style={styles.loadingText}>
          {loading || tripLoading.data
            ? 'Loading trip data...'
            : 'Loading routes and vessels...'}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Header (scrolls with content like other forms) */}
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <Calendar size={24} color={colors.primary} />
          </View>
          <View style={styles.headerContent}>
            <Text style={styles.title}>
              {currentTrip ? 'Edit Trip' : 'Create New Trip'}
            </Text>
            <Text style={styles.subtitle}>
              {currentTrip
                ? 'Update trip information and settings'
                : 'Add a new ferry trip to the system'}
            </Text>
          </View>
        </View>
        {/* Route & Vessel Selection */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderIcon}>
              <MapPin size={20} color={colors.primary} />
            </View>
            <Text style={styles.sectionTitle}>Route & Vessel</Text>
          </View>

          <View style={styles.formGroup}>
            <Dropdown
              label='Route'
              value={formData.route_id}
              onValueChange={(value: string) =>
                setFormData(prev => ({ ...prev, route_id: value }))
              }
              options={routeOptions}
              placeholder='Select route'
              error={validationErrors.route_id}
              required
            />
          </View>

          {/* Show multi-stop route info if applicable */}
          {formData.route_id && (
            <TripRouteInfo
              routeId={formData.route_id}
              showOverrideOption={routeSegmentFares.length > 0}
              onOverrideFares={handleOpenFareEditor}
            />
          )}

          {/* Fare editing section */}
          {routeSegmentFares.length > 0 && (
            <View style={styles.fareSection}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionHeaderIcon}>
                  <DollarSign size={20} color={colors.primary} />
                </View>
                <Text style={styles.sectionTitle}>Segment Fares</Text>
              </View>

              <View style={styles.fareInfo}>
                <Text style={styles.fareInfoText}>
                  {routeSegmentFares.length} segment
                  {routeSegmentFares.length > 1 ? 's' : ''} configured
                  {tripFareOverrides.length > 0 && (
                    <Text style={styles.overrideText}>
                      {' '}
                      ({tripFareOverrides.length} overridden)
                    </Text>
                  )}
                </Text>

                <Pressable
                  style={styles.editFaresButton}
                  onPress={handleOpenFareEditor}
                >
                  <Edit size={14} color='#FFFFFF' />
                  <Text style={styles.editFaresText}>Edit Fares</Text>
                </Pressable>
              </View>
            </View>
          )}

          <View style={styles.formGroup}>
            <Dropdown
              label='Vessel'
              value={formData.vessel_id}
              onValueChange={handleVesselSelection}
              options={vesselOptions}
              placeholder='Select vessel'
              error={validationErrors.vessel_id}
              required
            />
          </View>

          {vesselValidationMessage && (
            <Text
              style={[
                styles.vesselValidationText,
                vesselValidationStatus === 'invalid'
                  ? styles.validationErrorText
                  : styles.validationSuccessText,
              ]}
            >
              {vesselValidationMessage}
            </Text>
          )}

          {/* Route Preview */}
          {formData.route_id && formData.vessel_id && (
            <View style={styles.routePreview}>
              <View style={styles.routePreviewIcon}>
                <Ship size={16} color={colors.primary} />
              </View>
              <View style={styles.routePreviewContent}>
                <Text style={styles.routePreviewText}>
                  {routes?.find(r => r.id === formData.route_id)?.name ||
                    'Selected Route'}{' '}
                  • {selectedVessel?.name || 'Selected Vessel'}
                </Text>
                {selectedVessel && (
                  <Text style={styles.capacityText}>
                    Passenger load: {passengerCount}/
                    {selectedVessel.seating_capacity} · Remaining:{' '}
                    {capacityRemaining}
                  </Text>
                )}
              </View>
            </View>
          )}

          {/* Vessel Change Detection and Seat Rearrangement */}
          {vesselChangeDetected && (
            <View style={styles.vesselChangeContainer}>
              <View style={styles.vesselChangeHeader}>
                <View style={styles.vesselChangeIcon}>
                  <RefreshCw size={20} color={colors.warning} />
                </View>
                <View style={styles.vesselChangeContent}>
                  <Text style={styles.vesselChangeTitle}>
                    Vessel Change Detected
                  </Text>
                  <Text style={styles.vesselChangeSubtitle}>
                    {existingBookings.length} existing booking(s) found.
                    Automatic seat rearrangement is available.
                  </Text>
                </View>
              </View>

              {/* Seat Rearrangement Status */}
              {seatRearrangementStatus === 'analyzing' && (
                <View style={styles.rearrangementStatus}>
                  <View style={styles.rearrangementStatusIcon}>
                    <RefreshCw size={16} color={colors.info} />
                  </View>
                  <Text style={styles.rearrangementStatusText}>
                    Analyzing existing bookings and generating seat mapping...
                  </Text>
                </View>
              )}

              {seatRearrangementStatus === 'completed' &&
                rearrangementPreview.length > 0 && (
                  <View style={styles.rearrangementPreview}>
                    <View style={styles.previewHeader}>
                      <View style={styles.previewIcon}>
                        <Users size={16} color={colors.primary} />
                      </View>
                      <Text style={styles.previewTitle}>
                        Seat Rearrangement Preview
                      </Text>
                    </View>

                    <Text style={styles.previewSubtitle}>
                      {rearrangementPreview.length} passengers will be
                      automatically reassigned to new vessel seats.
                    </Text>

                    {/* Show first few rearrangements as preview */}
                    {rearrangementPreview.slice(0, 3).map((item, index) => (
                      <View key={index} style={styles.rearrangementItem}>
                        <Text style={styles.passengerName}>
                          {item.passenger_name}
                        </Text>
                        <View style={styles.seatChange}>
                          <Text style={styles.seatChangeText}>
                            Seat {item.old_seat.number} → Seat{' '}
                            {item.new_seat.number}
                          </Text>
                          <Text style={styles.seatChangeDetails}>
                            Row {item.old_seat.row} → Row {item.new_seat.row}
                          </Text>
                        </View>
                      </View>
                    ))}

                    {rearrangementPreview.length > 3 && (
                      <Text style={styles.morePassengers}>
                        +{rearrangementPreview.length - 3} more passengers
                      </Text>
                    )}
                  </View>
                )}

              {seatRearrangementStatus === 'error' && (
                <View style={styles.errorStatus}>
                  <View style={styles.rearrangementErrorIcon}>
                    <AlertCircle size={16} color={colors.error} />
                  </View>
                  <Text style={styles.rearrangementErrorText}>
                    Failed to analyze seat rearrangement. Please check vessel
                    configuration.
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Schedule */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderIcon}>
              <Clock size={20} color={colors.primary} />
            </View>
            <Text style={styles.sectionTitle}>Schedule</Text>
          </View>

          <View style={styles.formGroup}>
            <DatePicker
              label='Travel Date'
              value={formData.travel_date}
              onChange={(value: string) =>
                setFormData(prev => ({ ...prev, travel_date: value }))
              }
              placeholder='Select travel date'
              error={validationErrors.travel_date}
              required
            />
          </View>

          {/* Improved Time Selection */}
          <View style={styles.timeSelectionContainer}>
            <View style={styles.timeSelectionHeader}>
              <Text style={styles.timeSelectionTitle}>Trip Times</Text>
              {formData.departure_time && formData.arrival_time && (
                <View style={styles.durationBadge}>
                  <Clock size={12} color={colors.primary} />
                  <Text style={styles.durationText}>
                    {calculateDuration(
                      formData.departure_time,
                      formData.arrival_time
                    )}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.timeInputsRow}>
              {/* Departure Time */}
              <View style={styles.timeInputWrapper}>
                <View style={styles.timeInputHeader}>
                  <Text style={styles.timeInputLabel}>Departure</Text>
                  {validationErrors.departure_time && (
                    <Text style={styles.timeErrorIndicator}>⚠</Text>
                  )}
                </View>
                <TimePicker
                  value={formData.departure_time}
                  onChange={time =>
                    setFormData(prev => ({ ...prev, departure_time: time }))
                  }
                  placeholder='Select time'
                  error={validationErrors.departure_time}
                  required
                  compact
                />
                {formData.departure_time && (
                  <Text style={styles.timeDisplayText}>
                    {formatTimeDisplay(formData.departure_time)}
                  </Text>
                )}
              </View>

              {/* Arrow Connector */}
              <View style={styles.timeConnector}>
                <View style={styles.timeConnectorLine} />
                <View style={styles.timeConnectorArrow}>
                  <Text style={styles.timeConnectorArrowText}>→</Text>
                </View>
                <View style={styles.timeConnectorLine} />
              </View>

              {/* Arrival Time */}
              <View style={styles.timeInputWrapper}>
                <View style={styles.timeInputHeader}>
                  <Text style={styles.timeInputLabel}>Arrival</Text>
                  {validationErrors.arrival_time && (
                    <Text style={styles.timeErrorIndicator}>⚠</Text>
                  )}
                </View>
                <TimePicker
                  value={formData.arrival_time || ''}
                  onChange={time =>
                    setFormData(prev => ({ ...prev, arrival_time: time }))
                  }
                  placeholder='Select time'
                  error={validationErrors.arrival_time}
                  compact
                />
                {formData.arrival_time && (
                  <Text style={styles.timeDisplayText}>
                    {formatTimeDisplay(formData.arrival_time)}
                  </Text>
                )}
              </View>
            </View>

            {/* Quick Time Suggestions */}
            {formData.departure_time && !formData.arrival_time && (
              <View style={styles.quickTimeSuggestions}>
                <Text style={styles.quickTimeLabel}>
                  Quick arrival suggestions:
                </Text>
                <View style={styles.quickTimeButtons}>
                  {generateQuickArrivalTimes(formData.departure_time).map(
                    (suggestion, index) => (
                      <Pressable
                        key={index}
                        style={styles.quickTimeButton}
                        onPress={() =>
                          setFormData(prev => ({
                            ...prev,
                            arrival_time: suggestion.value,
                          }))
                        }
                      >
                        <Text style={styles.quickTimeButtonText}>
                          {suggestion.label}
                        </Text>
                      </Pressable>
                    )
                  )}
                </View>
              </View>
            )}

            {/* Validation Messages */}
            {validationErrors.departure_time && (
              <Text style={styles.timeErrorText}>
                {validationErrors.departure_time}
              </Text>
            )}
            {validationErrors.arrival_time && (
              <Text style={styles.timeErrorText}>
                {validationErrors.arrival_time}
              </Text>
            )}
          </View>
        </View>

        {/* Trip Details */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderIcon}>
              <Activity size={20} color={colors.primary} />
            </View>
            <Text style={styles.sectionTitle}>Trip Details</Text>
          </View>

          <View style={styles.formGroup}>
            <Dropdown
              label='Status'
              value={formData.status}
              onValueChange={(value: string) =>
                setFormData(prev => ({ ...prev, status: value as any }))
              }
              options={statusOptions}
              placeholder='Select status'
              error={validationErrors.status}
            />
          </View>

          <View style={styles.formGroup}>
            <Dropdown
              label='Captain'
              value={formData.captain_id || ''}
              onValueChange={(value: string) =>
                setFormData(prev => ({ ...prev, captain_id: value }))
              }
              options={captainOptions}
              placeholder='Select captain (optional)'
              error={validationErrors.captain_id}
            />
          </View>

          {/* Status Description */}
          {formData.status && (
            <View
              style={[
                styles.statusDescription,
                {
                  backgroundColor: `${getStatusColor(formData.status)}10`,
                  borderLeftColor: getStatusColor(formData.status),
                },
              ]}
            >
              <View
                style={[
                  styles.statusDescriptionIcon,
                  {
                    backgroundColor: `${getStatusColor(formData.status)}20`,
                  },
                ]}
              >
                <Info size={16} color={getStatusColor(formData.status)} />
              </View>
              <Text
                style={[
                  styles.statusDescriptionText,
                  {
                    color: getStatusColor(formData.status),
                  },
                ]}
              >
                {getStatusDescription(formData.status)}
              </Text>
            </View>
          )}

          <View style={styles.formRow}>
            <View style={styles.formHalf}>
              <TextInput
                label='Fare Multiplier'
                value={fareMultiplierDisplay}
                onChangeText={text => {
                  setFareMultiplierDisplay(text);
                  if (text === '') {
                    // User cleared the field - keep 1.0 internally for calculations
                    setFormData(prev => ({
                      ...prev,
                      fare_multiplier: 1.0,
                    }));
                  } else if (text === '.') {
                    // Don't update if just a decimal point
                    return;
                  } else {
                    const numericValue = parseFloat(text);
                    if (!isNaN(numericValue)) {
                      // Allow zero to be entered (validation will catch it)
                      setFormData(prev => ({
                        ...prev,
                        fare_multiplier: numericValue,
                      }));
                    }
                  }
                }}
                placeholder='1.0'
                keyboardType='numeric'
                error={validationErrors.fare_multiplier}
                required
              />
            </View>
          </View>

          {formData.status === 'delayed' && (
            <View style={styles.formGroup}>
              <TextInput
                label='Delay Reason'
                value={formData.delay_reason || ''}
                onChangeText={text =>
                  setFormData(prev => ({ ...prev, delay_reason: text }))
                }
                placeholder='Enter reason for delay'
                multiline
                numberOfLines={2}
                error={validationErrors.delay_reason}
              />
            </View>
          )}
        </View>

        {/* Settings */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderIcon}>
              <Settings size={20} color={colors.primary} />
            </View>
            <Text style={styles.sectionTitle}>Settings</Text>
          </View>

          <View style={styles.switchContainer}>
            <Switch
              label='Active Trip'
              value={formData.is_active}
              onValueChange={value =>
                setFormData(prev => ({ ...prev, is_active: value }))
              }
              description={
                formData.is_active
                  ? 'Trip is active and available for booking'
                  : 'Trip is inactive and hidden from booking'
              }
            />
          </View>
        </View>

        {/* Error Display */}
        {validationErrors.general && (
          <View style={styles.errorContainer}>
            <View style={styles.errorIcon}>
              <AlertCircle size={16} color={colors.error} />
            </View>
            <Text style={styles.errorText}>{validationErrors.general}</Text>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <Button
            title={currentTrip ? 'Update Trip' : 'Create Trip'}
            onPress={handleSubmit}
            loading={loading}
            disabled={
              loading ||
              (vesselChangeDetected && vesselValidationStatus === 'invalid') ||
              seatRearrangementStatus === 'analyzing'
            }
            variant='primary'
            icon={<Save size={18} color={colors.white} />}
          />

          {onCancel && (
            <Button
              title='Cancel'
              onPress={handleCancel}
              variant='outline'
              disabled={loading}
            />
          )}

          {hasChanges && (
            <Button
              title='Reset'
              onPress={handleReset}
              variant='ghost'
              disabled={loading}
              icon={<RotateCcw size={18} color={colors.textSecondary} />}
            />
          )}
        </View>

        {/* Unsaved Changes Indicator */}
        {hasChanges && (
          <View style={styles.statusContainer}>
            <View style={styles.statusIcon}>
              <AlertCircle size={14} color={colors.warning} />
            </View>
            <Text style={styles.statusText}>You have unsaved changes</Text>
          </View>
        )}
      </ScrollView>

      {/* Fare Editor Modal */}
      <TripFareEditor
        routeSegmentFares={routeSegmentFares}
        existingOverrides={tripFareOverrides}
        onSave={handleSaveFareOverrides}
        onCancel={handleCancelFareEditor}
        visible={showFareEditor}
        title={tripId ? 'Edit Trip Fares' : 'Set Trip Fares'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    fontSize: 16,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    padding: 12,
    borderRadius: 16,
    marginBottom: 24,
    shadowColor: colors.shadowMedium,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  headerIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
    lineHeight: 28,
  },
  subtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    lineHeight: 20,
    fontWeight: '500',
  },
  section: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 12,
    marginBottom: 20,
    shadowColor: colors.shadowMedium,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 12,
  },
  sectionHeaderIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    lineHeight: 24,
  },
  formGroup: {
    marginBottom: 20,
  },
  formRow: {
    flexDirection: 'row',
    gap: 16,
  },
  formHalf: {
    flex: 1,
  },
  routePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: `${colors.primary}10`,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  routePreviewIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: `${colors.primary}20`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  routePreviewContent: {
    flex: 1,
  },
  routePreviewText: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 18,
    color: colors.primary,
  },
  capacityText: {
    marginTop: 4,
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  statusDescription: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderLeftWidth: 3,
  },
  statusDescriptionIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusDescriptionText: {
    fontSize: 13,
    flex: 1,
    fontWeight: '600',
    lineHeight: 18,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.errorLight,
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: colors.error,
  },
  errorIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: `${colors.error}20`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    fontSize: 14,
    color: colors.error,
    flex: 1,
    fontWeight: '600',
    lineHeight: 18,
  },
  buttonContainer: {
    gap: 16,
    marginBottom: 20,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.warningLight,
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: colors.warning,
  },
  statusIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: `${colors.warning}20`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusText: {
    fontSize: 13,
    color: colors.warning,
    fontWeight: '600',
  },
  switchContainer: {
    marginBottom: 8,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  // Vessel change detection styles
  vesselChangeContainer: {
    backgroundColor: colors.warningLight,
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
    borderLeftWidth: 4,
    borderLeftColor: colors.warning,
  },
  vesselChangeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  vesselChangeIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: `${colors.warning}20`,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  vesselChangeContent: {
    flex: 1,
  },
  vesselChangeTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.warning,
    marginBottom: 4,
  },
  vesselChangeSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  vesselValidationText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: -12,
    marginBottom: 12,
  },
  validationErrorText: {
    color: colors.error,
  },
  validationSuccessText: {
    color: colors.success,
  },
  // Rearrangement status styles
  rearrangementStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${colors.info}10`,
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  rearrangementStatusIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: `${colors.info}20`,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rearrangementStatusText: {
    fontSize: 14,
    color: colors.info,
    fontWeight: '600',
    flex: 1,
  },
  // Rearrangement preview styles
  rearrangementPreview: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  previewIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  previewSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 16,
    lineHeight: 18,
  },
  rearrangementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  passengerName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
  },
  seatChange: {
    alignItems: 'flex-end',
  },
  seatChangeText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  seatChangeDetails: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  morePassengers: {
    fontSize: 13,
    color: colors.textSecondary,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 8,
  },
  // Error status styles
  errorStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.errorLight,
    padding: 12,
    borderRadius: 8,
  },
  rearrangementErrorIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: `${colors.error}20`,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rearrangementErrorText: {
    fontSize: 14,
    color: colors.error,
    fontWeight: '600',
    flex: 1,
  },
  // Fare editing styles
  fareSection: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  fareInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  fareInfoText: {
    fontSize: 14,
    color: colors.text,
    flex: 1,
  },
  overrideText: {
    color: colors.warning,
    fontWeight: '600',
  },
  editFaresButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  editFaresText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  // Improved Time Selection Styles
  timeSelectionContainer: {
    marginTop: 8,
  },
  timeSelectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  timeSelectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  durationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  durationText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  timeInputsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  timeInputWrapper: {
    flex: 1,
    minWidth: 0,
  },
  timeInputHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  timeInputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  timeErrorIndicator: {
    fontSize: 16,
    color: colors.error,
  },
  timeDisplayText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '500',
    marginTop: 6,
    textAlign: 'center',
  },
  timeConnector: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 28,
    width: 40,
  },
  timeConnectorLine: {
    width: 1,
    height: 12,
    backgroundColor: colors.border,
  },
  timeConnectorArrow: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  timeConnectorArrowText: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: '700',
  },
  quickTimeSuggestions: {
    marginTop: 16,
    padding: 12,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  quickTimeLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 10,
  },
  quickTimeButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  quickTimeButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  quickTimeButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  timeErrorText: {
    fontSize: 12,
    color: colors.error,
    marginTop: 4,
    marginLeft: 4,
  },
});
