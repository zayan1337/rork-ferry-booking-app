import { AdminManagement } from '@/types';

type Trip = AdminManagement.Trip;
type TripFormData = AdminManagement.TripFormData;
type TripStats = AdminManagement.TripStats;
type TripFilters = AdminManagement.TripFilters;
type ValidationResult = AdminManagement.ValidationResult;

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

export const validateTripForm = (
  data: Partial<TripFormData>
): ValidationResult => {
  const errors: Record<string, string> = {};

  // Route validation
  if (!data.route_id?.trim()) {
    errors.route_id = 'Route is required';
  }

  // Vessel validation
  if (!data.vessel_id?.trim()) {
    errors.vessel_id = 'Vessel is required';
  }

  // Travel date validation
  if (!data.travel_date?.trim()) {
    errors.travel_date = 'Travel date is required';
  } else {
    const travelDate = new Date(data.travel_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (travelDate < today) {
      errors.travel_date = 'Travel date cannot be in the past';
    }
  }

  // Departure time validation
  if (!data.departure_time?.trim()) {
    errors.departure_time = 'Departure time is required';
  }

  // Fare multiplier validation
  if (data.fare_multiplier !== undefined) {
    if (data.fare_multiplier < 0.1) {
      errors.fare_multiplier = 'Fare multiplier must be at least 0.1';
    } else if (data.fare_multiplier > 5.0) {
      errors.fare_multiplier = 'Fare multiplier cannot exceed 5.0';
    }
  }

  // Notes validation
  if (data.notes && data.notes.length > 1000) {
    errors.notes = 'Notes must be less than 1000 characters';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

// ============================================================================
// SEARCH AND FILTER FUNCTIONS
// ============================================================================

export const searchTrips = (trips: Trip[], query: string): Trip[] => {
  if (!query.trim()) return trips;

  const searchTerm = query.toLowerCase().trim();
  return trips.filter(
    trip =>
      trip.route_name?.toLowerCase().includes(searchTerm) ||
      trip.vessel_name?.toLowerCase().includes(searchTerm) ||
      trip.from_island_name?.toLowerCase().includes(searchTerm) ||
      trip.to_island_name?.toLowerCase().includes(searchTerm) ||
      trip.status.toLowerCase().includes(searchTerm) ||
      trip.travel_date.includes(searchTerm) ||
      trip.departure_time.includes(searchTerm) ||
      (trip.delay_reason &&
        trip.delay_reason.toLowerCase().includes(searchTerm)) ||
      (trip.notes && trip.notes.toLowerCase().includes(searchTerm))
  );
};

export const filterTrips = (trips: Trip[], filters: TripFilters): Trip[] => {
  return trips.filter(trip => {
    // Status filter
    if (
      filters.status &&
      filters.status !== 'all' &&
      trip.status !== filters.status
    ) {
      return false;
    }

    // Route filter
    if (filters.route_id && trip.route_id !== filters.route_id) {
      return false;
    }

    // Vessel filter
    if (filters.vessel_id && trip.vessel_id !== filters.vessel_id) {
      return false;
    }

    // Date range filter
    if (filters.date_range) {
      const tripDate = new Date(trip.travel_date);
      const fromDate = new Date(filters.date_range.from);
      const toDate = new Date(filters.date_range.to);

      if (tripDate < fromDate || tripDate > toDate) {
        return false;
      }
    }

    // Departure time range filter
    if (filters.departure_time_range) {
      const tripTime = trip.departure_time;
      if (
        tripTime < filters.departure_time_range.from ||
        tripTime > filters.departure_time_range.to
      ) {
        return false;
      }
    }

    // Occupancy range filter
    if (filters.occupancy_range) {
      const occupancy = trip.occupancy_rate || 0;
      if (
        occupancy < filters.occupancy_range.min ||
        occupancy > filters.occupancy_range.max
      ) {
        return false;
      }
    }

    // Fare range filter
    if (filters.fare_range && trip.base_fare) {
      const totalFare = trip.base_fare * trip.fare_multiplier;
      if (
        totalFare < filters.fare_range.min ||
        totalFare > filters.fare_range.max
      ) {
        return false;
      }
    }

    // Has bookings filter
    if (filters.has_bookings !== undefined) {
      const hasBookings = (trip.confirmed_bookings || 0) > 0;
      if (hasBookings !== filters.has_bookings) {
        return false;
      }
    }

    // Performance rating filter
    if (filters.performance_rating !== undefined) {
      const rating = getTripPerformanceRating(trip);
      if (rating !== filters.performance_rating) {
        return false;
      }
    }

    // Date filters
    if (
      filters.created_after &&
      new Date(trip.created_at) < new Date(filters.created_after)
    ) {
      return false;
    }

    if (
      filters.created_before &&
      new Date(trip.created_at) > new Date(filters.created_before)
    ) {
      return false;
    }

    return true;
  });
};

export const filterTripsByStatus = (
  trips: Trip[],
  status: string | null
): Trip[] => {
  if (!status || status === 'all') return trips;
  return trips.filter(trip => trip.status === status);
};

export const filterTripsByRoute = (
  trips: Trip[],
  routeId: string | null
): Trip[] => {
  if (!routeId) return trips;
  return trips.filter(trip => trip.route_id === routeId);
};

export const filterTripsByVessel = (
  trips: Trip[],
  vesselId: string | null
): Trip[] => {
  if (!vesselId) return trips;
  return trips.filter(trip => trip.vessel_id === vesselId);
};

export const filterTripsByDate = (
  trips: Trip[],
  date: string | null
): Trip[] => {
  if (!date) return trips;
  return trips.filter(trip => trip.travel_date === date);
};

// ============================================================================
// SORTING FUNCTIONS
// ============================================================================

export const sortTrips = (
  trips: Trip[],
  sortBy:
    | 'travel_date'
    | 'departure_time'
    | 'status'
    | 'available_seats'
    | 'booked_seats'
    | 'created_at'
    | 'fare_multiplier',
  sortOrder: 'asc' | 'desc'
): Trip[] => {
  return [...trips].sort((a, b) => {
    let aValue: any;
    let bValue: any;

    switch (sortBy) {
      case 'travel_date':
        aValue = new Date(a.travel_date).getTime();
        bValue = new Date(b.travel_date).getTime();
        break;
      case 'departure_time':
        aValue = a.departure_time;
        bValue = b.departure_time;
        break;
      case 'status':
        aValue = a.status;
        bValue = b.status;
        break;
      case 'available_seats':
        aValue = a.available_seats;
        bValue = b.available_seats;
        break;
      case 'booked_seats':
        aValue = a.booked_seats;
        bValue = b.booked_seats;
        break;
      case 'fare_multiplier':
        aValue = a.fare_multiplier;
        bValue = b.fare_multiplier;
        break;
      case 'created_at':
        aValue = new Date(a.created_at).getTime();
        bValue = new Date(b.created_at).getTime();
        break;
      default:
        aValue = new Date(a.travel_date).getTime();
        bValue = new Date(b.travel_date).getTime();
    }

    if (sortOrder === 'asc') {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });
};

// ============================================================================
// STATISTICS FUNCTIONS
// ============================================================================

export const calculateTripStats = (trips: Trip[]): TripStats => {
  const total = trips.length;
  const active = trips.filter(trip => trip.is_active).length;
  const inactive = total - active;

  // Status counts
  const scheduled = trips.filter(trip => trip.status === 'scheduled').length;
  const inProgress = trips.filter(
    trip => trip.status === 'boarding' || trip.status === 'departed'
  ).length;
  const completed = trips.filter(trip => trip.status === 'arrived').length;
  const cancelled = trips.filter(trip => trip.status === 'cancelled').length;
  const delayed = trips.filter(trip => trip.status === 'delayed').length;

  // Today's trips
  const today = new Date().toISOString().split('T')[0];
  const todayTrips = trips.filter(trip => trip.travel_date === today).length;

  // Calculate aggregations
  let totalRevenue = 0;
  let totalOccupancy = 0;
  let tripsWithOccupancy = 0;
  let totalBookings = 0;
  let totalPassengers = 0;
  let onTimeTrips = 0;

  trips.forEach(trip => {
    const fare = (trip.base_fare || 0) * trip.fare_multiplier;
    totalRevenue += fare * (trip.confirmed_bookings || trip.booked_seats || 0);
    totalBookings += trip.confirmed_bookings || 0;
    totalPassengers += trip.booked_seats || 0;

    if (trip.occupancy_rate && trip.occupancy_rate > 0) {
      totalOccupancy += trip.occupancy_rate;
      tripsWithOccupancy++;
    }

    if (trip.status !== 'delayed' && trip.status !== 'cancelled') {
      onTimeTrips++;
    }
  });

  // Calculate averages
  const averageOccupancy =
    tripsWithOccupancy > 0 ? totalOccupancy / tripsWithOccupancy : 0;
  const onTimePerformance = total > 0 ? (onTimeTrips / total) * 100 : 0;
  const avgFare =
    total > 0
      ? trips.reduce(
          (sum, trip) => sum + (trip.base_fare || 0) * trip.fare_multiplier,
          0
        ) / total
      : 0;

  // Find top performers
  let topTripByRevenue: { trip: string; revenue: number } | undefined;
  let topTripByOccupancy: { trip: string; occupancy: number } | undefined;

  if (total > 0) {
    const tripRevenues = trips.map(trip => ({
      trip: `${trip.route_name || 'Unknown Route'} - ${trip.travel_date} ${trip.departure_time}`,
      revenue:
        (trip.base_fare || 0) *
        trip.fare_multiplier *
        (trip.confirmed_bookings || trip.booked_seats || 0),
    }));
    topTripByRevenue = tripRevenues.reduce((max, current) =>
      current.revenue > max.revenue ? current : max
    );

    const tripOccupancies = trips
      .filter(trip => trip.occupancy_rate)
      .map(trip => ({
        trip: `${trip.route_name || 'Unknown Route'} - ${trip.travel_date} ${trip.departure_time}`,
        occupancy: trip.occupancy_rate || 0,
      }));
    if (tripOccupancies.length > 0) {
      topTripByOccupancy = tripOccupancies.reduce((max, current) =>
        current.occupancy > max.occupancy ? current : max
      );
    }
  }

  // Route with most trips
  const routeTripCounts: Record<string, number> = {};
  trips.forEach(trip => {
    const routeName = trip.route_name || 'Unknown Route';
    routeTripCounts[routeName] = (routeTripCounts[routeName] || 0) + 1;
  });
  const topRouteByTrips =
    Object.keys(routeTripCounts).length > 0
      ? Object.entries(routeTripCounts).reduce(
          (max, [route, trips]) => (trips > max.trips ? { route, trips } : max),
          { route: '', trips: 0 }
        )
      : undefined;

  return {
    total,
    active,
    inactive,
    scheduled,
    inProgress,
    completed,
    cancelled,
    delayed,
    averageOccupancy,
    totalRevenue,
    todayTrips,
    onTimePerformance,
    avgFare,
    totalBookings,
    totalPassengers,
    topTripByRevenue,
    topTripByOccupancy,
    topRouteByTrips,
  };
};

export const getTripPerformanceRating = (
  trip: Trip
): 'excellent' | 'good' | 'fair' | 'poor' => {
  const occupancy = trip.occupancy_rate || 0;
  const isOnTime = trip.status !== 'delayed' && trip.status !== 'cancelled';

  if (occupancy >= 80 && isOnTime) return 'excellent';
  if (occupancy >= 60 && isOnTime) return 'good';
  if (occupancy >= 40 || isOnTime) return 'fair';
  return 'poor';
};

export const getTripPerformanceColor = (rating: string): string => {
  switch (rating) {
    case 'excellent':
      return '#10B981'; // Green
    case 'good':
      return '#3B82F6'; // Blue
    case 'fair':
      return '#F59E0B'; // Yellow
    case 'poor':
      return '#EF4444'; // Red
    default:
      return '#6B7280'; // Gray
  }
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export const getTripsByStatus = (trips: Trip[], status: string): Trip[] => {
  return trips.filter(trip => trip.status === status);
};

export const getTripsByRoute = (trips: Trip[], routeId: string): Trip[] => {
  return trips.filter(trip => trip.route_id === routeId);
};

export const getTripsByVessel = (trips: Trip[], vesselId: string): Trip[] => {
  return trips.filter(trip => trip.vessel_id === vesselId);
};

export const formatTripName = (trip: Trip): string => {
  const routeName =
    trip.route_name ||
    `${trip.from_island_name || 'Unknown'} → ${trip.to_island_name || 'Unknown'}`;
  return `${routeName} - ${trip.travel_date} ${trip.departure_time}`;
};

export const formatTripDuration = (trip: Trip): string => {
  if (trip.estimated_duration) {
    return trip.estimated_duration.includes('min') ||
      trip.estimated_duration.includes('hour')
      ? trip.estimated_duration
      : `${trip.estimated_duration} min`;
  }
  return 'N/A';
};

export const formatCurrency = (amount: number): string => {
  return `MVR ${amount.toLocaleString()}`;
};

export const formatPercentage = (value: number): string => {
  return `${value.toFixed(1)}%`;
};

export const getOccupancyLevel = (
  trip: Trip
): 'low' | 'medium' | 'high' | 'full' => {
  const occupancy = trip.occupancy_rate || 0;
  if (occupancy >= 100) return 'full';
  if (occupancy >= 80) return 'high';
  if (occupancy >= 50) return 'medium';
  return 'low';
};

export const getStatusColor = (status: string): string => {
  switch (status) {
    case 'scheduled':
      return '#3B82F6'; // blue
    case 'boarding':
      return '#F59E0B'; // yellow
    case 'departed':
      return '#10B981'; // green
    case 'arrived':
      return '#059669'; // dark green
    case 'cancelled':
      return '#EF4444'; // red
    case 'delayed':
      return '#F59E0B'; // yellow
    default:
      return '#6B7280'; // gray
  }
};

export const getOccupancyColor = (level: string): string => {
  switch (level) {
    case 'full':
      return '#DC2626'; // red
    case 'high':
      return '#10B981'; // green
    case 'medium':
      return '#F59E0B'; // yellow
    case 'low':
      return '#6B7280'; // gray
    default:
      return '#6B7280'; // gray
  }
};

// ============================================================================
// FORM HELPERS
// ============================================================================

export const createEmptyTripForm = (): TripFormData => ({
  route_id: '',
  vessel_id: '',
  travel_date: '',
  departure_time: '',
  arrival_time: '',
  status: 'scheduled',
  fare_multiplier: 1.0,
  notes: '',
  is_active: true,
});

export const tripToFormData = (trip: Trip): TripFormData => ({
  route_id: trip.route_id,
  vessel_id: trip.vessel_id,
  travel_date: trip.travel_date,
  departure_time: trip.departure_time,
  arrival_time: trip.arrival_time,
  status: trip.status,
  fare_multiplier: trip.fare_multiplier,
  weather_conditions: trip.weather_conditions,
  captain_id: trip.captain_id,
  crew_ids: trip.crew_ids,
  notes: trip.notes,
  is_active: trip.is_active,
});

// ============================================================================
// COMPARISON FUNCTIONS
// ============================================================================

export const compareTrips = (a: Trip, b: Trip): boolean => {
  return (
    a.id === b.id &&
    a.route_id === b.route_id &&
    a.vessel_id === b.vessel_id &&
    a.travel_date === b.travel_date &&
    a.departure_time === b.departure_time &&
    a.status === b.status &&
    a.fare_multiplier === b.fare_multiplier &&
    a.is_active === b.is_active
  );
};

export const getTripChanges = (
  original: Trip,
  updated: Partial<TripFormData>
): Partial<TripFormData> => {
  const changes: Partial<TripFormData> = {};

  if (
    updated.route_id !== undefined &&
    updated.route_id !== original.route_id
  ) {
    changes.route_id = updated.route_id;
  }

  if (
    updated.vessel_id !== undefined &&
    updated.vessel_id !== original.vessel_id
  ) {
    changes.vessel_id = updated.vessel_id;
  }

  if (
    updated.travel_date !== undefined &&
    updated.travel_date !== original.travel_date
  ) {
    changes.travel_date = updated.travel_date;
  }

  if (
    updated.departure_time !== undefined &&
    updated.departure_time !== original.departure_time
  ) {
    changes.departure_time = updated.departure_time;
  }

  if (
    updated.arrival_time !== undefined &&
    updated.arrival_time !== original.arrival_time
  ) {
    changes.arrival_time = updated.arrival_time;
  }

  if (updated.status !== undefined && updated.status !== original.status) {
    changes.status = updated.status;
  }

  if (
    updated.fare_multiplier !== undefined &&
    updated.fare_multiplier !== original.fare_multiplier
  ) {
    changes.fare_multiplier = updated.fare_multiplier;
  }

  if (updated.notes !== undefined && updated.notes !== original.notes) {
    changes.notes = updated.notes;
  }

  if (
    updated.is_active !== undefined &&
    updated.is_active !== original.is_active
  ) {
    changes.is_active = updated.is_active;
  }

  return changes;
};

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

export const isTripTimeConflict = (
  tripData: TripFormData,
  existingTrips: Trip[],
  currentTripId?: string
): { hasConflict: boolean; conflictingTrip?: Trip } => {
  const conflict = existingTrips.find(
    trip =>
      trip.id !== currentTripId &&
      trip.route_id === tripData.route_id &&
      trip.travel_date === tripData.travel_date &&
      trip.departure_time === tripData.departure_time &&
      trip.vessel_id === tripData.vessel_id &&
      trip.is_active
  );

  return {
    hasConflict: !!conflict,
    conflictingTrip: conflict,
  };
};

export const getTripsForDate = (trips: Trip[], date: string): Trip[] => {
  return trips.filter(trip => trip.travel_date === date && trip.is_active);
};

export const getAvailableVesselsForDate = (
  trips: Trip[],
  allVessels: any[],
  date: string,
  time: string
): any[] => {
  const busyVesselIds = trips
    .filter(
      trip =>
        trip.travel_date === date &&
        trip.departure_time === time &&
        trip.is_active
    )
    .map(trip => trip.vessel_id);

  return allVessels.filter(
    vessel =>
      vessel.is_active &&
      vessel.status === 'active' &&
      !busyVesselIds.includes(vessel.id)
  );
};

// ============================================================================
// EXPORT FUNCTIONS
// ============================================================================

export const exportTripData = (trips: Trip[]) => {
  return trips.map(trip => ({
    route: trip.route_name || 'Unknown Route',
    vessel: trip.vessel_name || 'Unknown Vessel',
    travel_date: trip.travel_date,
    departure_time: trip.departure_time,
    arrival_time: trip.arrival_time || 'N/A',
    status: trip.status,
    available_seats: trip.available_seats,
    booked_seats: trip.booked_seats,
    occupancy: formatPercentage(trip.occupancy_rate || 0),
    fare_multiplier: trip.fare_multiplier,
    revenue: formatCurrency(
      (trip.base_fare || 0) *
        trip.fare_multiplier *
        (trip.confirmed_bookings || trip.booked_seats || 0)
    ),
    created: new Date(trip.created_at).toLocaleDateString(),
    id: trip.id,
  }));
};

// ============================================================================
// ANALYTICS FUNCTIONS
// ============================================================================

export const getTripOccupancyTrend = (
  trips: Trip[]
): 'up' | 'down' | 'stable' => {
  // This would need historical data - placeholder implementation
  return 'stable';
};

export const getTripRevenueGrowth = (trips: Trip[]): number => {
  // This would need historical data - placeholder implementation
  return 0;
};

export const getBestPerformingTime = (trips: Trip[]): string => {
  const timeSlots: Record<string, { count: number; totalOccupancy: number }> =
    {};

  trips.forEach(trip => {
    const timeSlot = trip.departure_time.substring(0, 2) + ':00';
    if (!timeSlots[timeSlot]) {
      timeSlots[timeSlot] = { count: 0, totalOccupancy: 0 };
    }
    timeSlots[timeSlot].count++;
    timeSlots[timeSlot].totalOccupancy += trip.occupancy_rate || 0;
  });

  let bestTime = '';
  let bestPerformance = 0;

  Object.entries(timeSlots).forEach(([time, data]) => {
    const avgOccupancy = data.totalOccupancy / data.count;
    if (avgOccupancy > bestPerformance) {
      bestPerformance = avgOccupancy;
      bestTime = time;
    }
  });

  return bestTime || '08:00';
};

// ============================================================================
// TRIP GENERATION FUNCTIONS
// ============================================================================

export interface TripGenerationRequest {
  route_id: string;
  vessel_id: string;
  start_date: string;
  end_date: string;
  selected_days: number[]; // 0 = Sunday, 1 = Monday, etc.
  time_slots: string[];
  fare_multiplier: number;
  vessel_capacity?: number;
}

export interface GeneratedTrip {
  route_id: string;
  vessel_id: string;
  travel_date: string;
  departure_time: string;
  available_seats: number;
  fare_multiplier: number;
  status: 'scheduled';
  is_active: boolean;
}

export const generateTripsForSchedule = (
  request: TripGenerationRequest
): GeneratedTrip[] => {
  const {
    route_id,
    vessel_id,
    start_date,
    end_date,
    selected_days,
    time_slots,
    fare_multiplier,
    vessel_capacity = 50,
  } = request;

  const trips: GeneratedTrip[] = [];
  const startDate = new Date(start_date);
  const endDate = new Date(end_date);

  // Iterate through each date in the range
  for (
    let currentDate = new Date(startDate);
    currentDate <= endDate;
    currentDate.setDate(currentDate.getDate() + 1)
  ) {
    const dayOfWeek = currentDate.getDay(); // 0 = Sunday, 1 = Monday, etc.

    // Check if this day is selected
    if (selected_days.includes(dayOfWeek)) {
      const travelDate = currentDate.toISOString().split('T')[0];

      // Generate trips for each time slot on this day
      time_slots.forEach(timeSlot => {
        trips.push({
          route_id,
          vessel_id,
          travel_date: travelDate,
          departure_time: timeSlot,
          available_seats: vessel_capacity,
          fare_multiplier,
          status: 'scheduled',
          is_active: true,
        });
      });
    }
  }

  return trips;
};

export const detectTripConflicts = (
  newTrips: GeneratedTrip[],
  existingTrips: Trip[]
): {
  conflicts: { trip: GeneratedTrip; conflictWith: Trip }[];
  safeTrips: GeneratedTrip[];
} => {
  const conflicts: { trip: GeneratedTrip; conflictWith: Trip }[] = [];
  const safeTrips: GeneratedTrip[] = [];

  newTrips.forEach(newTrip => {
    // Check for the actual database unique constraint: (route_id, travel_date, departure_time, vessel_id)
    const conflict = existingTrips.find(
      existing =>
        existing.route_id === newTrip.route_id &&
        existing.travel_date === newTrip.travel_date &&
        existing.departure_time === newTrip.departure_time &&
        existing.vessel_id === newTrip.vessel_id &&
        existing.is_active &&
        existing.status !== 'cancelled'
    );

    if (conflict) {
      conflicts.push({ trip: newTrip, conflictWith: conflict });
    } else {
      safeTrips.push(newTrip);
    }
  });

  return { conflicts, safeTrips };
};

export const getCommonTimeSlots = (): {
  label: string;
  value: string;
  category: string;
}[] => {
  return [
    // Morning slots
    { label: '6:00 AM', value: '06:00', category: 'Morning' },
    { label: '6:30 AM', value: '06:30', category: 'Morning' },
    { label: '7:00 AM', value: '07:00', category: 'Morning' },
    { label: '7:30 AM', value: '07:30', category: 'Morning' },
    { label: '8:00 AM', value: '08:00', category: 'Morning' },
    { label: '8:30 AM', value: '08:30', category: 'Morning' },
    { label: '9:00 AM', value: '09:00', category: 'Morning' },
    { label: '9:30 AM', value: '09:30', category: 'Morning' },
    { label: '10:00 AM', value: '10:00', category: 'Morning' },
    { label: '10:30 AM', value: '10:30', category: 'Morning' },
    { label: '11:00 AM', value: '11:00', category: 'Morning' },
    { label: '11:30 AM', value: '11:30', category: 'Morning' },

    // Afternoon slots
    { label: '12:00 PM', value: '12:00', category: 'Afternoon' },
    { label: '12:30 PM', value: '12:30', category: 'Afternoon' },
    { label: '1:00 PM', value: '13:00', category: 'Afternoon' },
    { label: '1:30 PM', value: '13:30', category: 'Afternoon' },
    { label: '2:00 PM', value: '14:00', category: 'Afternoon' },
    { label: '2:30 PM', value: '14:30', category: 'Afternoon' },
    { label: '3:00 PM', value: '15:00', category: 'Afternoon' },
    { label: '3:30 PM', value: '15:30', category: 'Afternoon' },
    { label: '4:00 PM', value: '16:00', category: 'Afternoon' },
    { label: '4:30 PM', value: '16:30', category: 'Afternoon' },
    { label: '5:00 PM', value: '17:00', category: 'Afternoon' },
    { label: '5:30 PM', value: '17:30', category: 'Afternoon' },

    // Evening slots
    { label: '6:00 PM', value: '18:00', category: 'Evening' },
    { label: '6:30 PM', value: '18:30', category: 'Evening' },
    { label: '7:00 PM', value: '19:00', category: 'Evening' },
    { label: '7:30 PM', value: '19:30', category: 'Evening' },
    { label: '8:00 PM', value: '20:00', category: 'Evening' },
    { label: '8:30 PM', value: '20:30', category: 'Evening' },
    { label: '9:00 PM', value: '21:00', category: 'Evening' },
    { label: '9:30 PM', value: '21:30', category: 'Evening' },
  ];
};

export const getDaysOfWeek = (): {
  label: string;
  value: number;
  short: string;
}[] => {
  return [
    { label: 'Sunday', value: 0, short: 'Sun' },
    { label: 'Monday', value: 1, short: 'Mon' },
    { label: 'Tuesday', value: 2, short: 'Tue' },
    { label: 'Wednesday', value: 3, short: 'Wed' },
    { label: 'Thursday', value: 4, short: 'Thu' },
    { label: 'Friday', value: 5, short: 'Fri' },
    { label: 'Saturday', value: 6, short: 'Sat' },
  ];
};

export const getNextWeekdaysOnly = (): number[] => {
  return [1, 2, 3, 4, 5]; // Monday to Friday
};

export const getWeekendOnly = (): number[] => {
  return [0, 6]; // Sunday and Saturday
};

export const formatDateForDisplay = (dateString: string): string => {
  try {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateString;
  }
};

export const calculateTripCount = (
  request: Partial<TripGenerationRequest>
): number => {
  if (
    !request.start_date ||
    !request.end_date ||
    !request.selected_days ||
    !request.time_slots
  ) {
    return 0;
  }

  const startDate = new Date(request.start_date);
  const endDate = new Date(request.end_date);
  let matchingDays = 0;

  for (
    let currentDate = new Date(startDate);
    currentDate <= endDate;
    currentDate.setDate(currentDate.getDate() + 1)
  ) {
    const dayOfWeek = currentDate.getDay();
    if (request.selected_days.includes(dayOfWeek)) {
      matchingDays++;
    }
  }

  return matchingDays * request.time_slots.length;
};

export const getDateRange = (
  startDate: string,
  endDate: string
): {
  dates: string[];
  totalDays: number;
  weekdays: number;
  weekends: number;
} => {
  const dates: string[] = [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  let weekdays = 0;
  let weekends = 0;

  for (
    let currentDate = new Date(start);
    currentDate <= end;
    currentDate.setDate(currentDate.getDate() + 1)
  ) {
    const dateStr = currentDate.toISOString().split('T')[0];
    dates.push(dateStr);

    const dayOfWeek = currentDate.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      weekends++;
    } else {
      weekdays++;
    }
  }

  return {
    dates,
    totalDays: dates.length,
    weekdays,
    weekends,
  };
};

export const validateTripGenerationRequest = (
  request: Partial<TripGenerationRequest>
): {
  isValid: boolean;
  errors: Record<string, string>;
} => {
  const errors: Record<string, string> = {};

  if (!request.route_id) {
    errors.route_id = 'Route is required';
  }

  if (!request.vessel_id) {
    errors.vessel_id = 'Vessel is required';
  }

  if (!request.start_date) {
    errors.start_date = 'Start date is required';
  }

  if (!request.end_date) {
    errors.end_date = 'End date is required';
  }

  if (request.start_date && request.end_date) {
    const startDate = new Date(request.start_date);
    const endDate = new Date(request.end_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (startDate < today) {
      errors.start_date = 'Start date cannot be in the past';
    }

    if (endDate < startDate) {
      errors.end_date = 'End date must be after start date';
    }

    // Limit to 1 year in advance
    const oneYearFromNow = new Date();
    oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);

    if (endDate > oneYearFromNow) {
      errors.end_date = 'End date cannot be more than 1 year in advance';
    }
  }

  if (!request.selected_days || request.selected_days.length === 0) {
    errors.selected_days = 'At least one day must be selected';
  }

  if (!request.time_slots || request.time_slots.length === 0) {
    errors.time_slots = 'At least one time slot must be selected';
  } else {
    // Validate time slot format
    const invalidTimeSlots = request.time_slots.filter(slot => {
      return !/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(slot);
    });
    if (invalidTimeSlots.length > 0) {
      errors.time_slots = `Invalid time format: ${invalidTimeSlots.join(', ')}. Use HH:MM format.`;
    }
  }

  if (
    request.fare_multiplier &&
    (request.fare_multiplier < 0.1 || request.fare_multiplier > 5.0)
  ) {
    errors.fare_multiplier = 'Fare multiplier must be between 0.1 and 5.0';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};
