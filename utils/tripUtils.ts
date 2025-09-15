import {
  Trip,
  TripFormData,
  TripValidationErrors,
  TripFilters,
  Route,
} from '@/types/operations';

/**
 * Validates trip form data
 */
export const validateTripForm = (
  formData: TripFormData
): TripValidationErrors => {
  const errors: TripValidationErrors = {};

  // Route validation
  if (!formData.route_id || formData.route_id.trim().length === 0) {
    errors.route_id = 'Route is required';
  }

  // Vessel validation
  if (!formData.vessel_id || formData.vessel_id.trim().length === 0) {
    errors.vessel_id = 'Vessel is required';
  }

  // Travel date validation
  if (!formData.travel_date || formData.travel_date.trim().length === 0) {
    errors.travel_date = 'Travel date is required';
  } else {
    const travelDate = new Date(formData.travel_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (travelDate < today) {
      errors.travel_date = 'Travel date cannot be in the past';
    }

    // Check if date is too far in the future (1 year)
    const maxDate = new Date();
    maxDate.setFullYear(maxDate.getFullYear() + 1);
    if (travelDate > maxDate) {
      errors.travel_date =
        'Travel date cannot be more than 1 year in the future';
    }
  }

  // Departure time validation
  if (!formData.departure_time || formData.departure_time.trim().length === 0) {
    errors.departure_time = 'Departure time is required';
  } else {
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(formData.departure_time)) {
      errors.departure_time = 'Departure time must be in HH:MM format';
    }
  }

  // Arrival time validation (optional)
  if (formData.arrival_time && formData.arrival_time.trim().length > 0) {
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(formData.arrival_time)) {
      errors.arrival_time = 'Arrival time must be in HH:MM format';
    } else if (formData.departure_time) {
      const depTime = timeToMinutes(formData.departure_time);
      const arrTime = timeToMinutes(formData.arrival_time);

      if (arrTime <= depTime) {
        errors.arrival_time = 'Arrival time must be after departure time';
      }
    }
  }

  // Fare multiplier validation
  if (!formData.fare_multiplier || formData.fare_multiplier <= 0) {
    errors.fare_multiplier = 'Fare multiplier must be greater than 0';
  } else if (formData.fare_multiplier > 5) {
    errors.fare_multiplier = 'Fare multiplier cannot exceed 5x';
  }

  return errors;
};

/**
 * Converts time string to minutes
 */
export const timeToMinutes = (time: string): number => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

/**
 * Converts minutes to time string
 */
export const minutesToTime = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
};

/**
 * Formats trip time for display
 */
export const formatTripTime = (time: string): string => {
  return new Date(`2000-01-01T${time}`).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
};

/**
 * Detects conflicts between trips
 */
export const detectTripConflicts = (trips: Trip[]): Trip[] => {
  const conflicts: Trip[] = [];

  for (let i = 0; i < trips.length; i++) {
    for (let j = i + 1; j < trips.length; j++) {
      const trip1 = trips[i];
      const trip2 = trips[j];

      // Check if same vessel on same date
      if (
        trip1.vessel_id === trip2.vessel_id &&
        trip1.travel_date === trip2.travel_date
      ) {
        conflicts.push(trip1, trip2);
      }
    }
  }

  return conflicts;
};

/**
 * Calculates occupancy percentage
 */
export const calculateOccupancy = (
  bookings: number,
  capacity: number
): number => {
  if (capacity === 0) return 0;
  return Math.round((bookings / capacity) * 100);
};

/**
 * Calculates estimated arrival time based on departure time and route duration
 */
export const calculateEstimatedArrivalTime = (
  departureTime: string,
  routeDuration: string
): string => {
  const depMinutes = timeToMinutes(departureTime);
  const durationMinutes = parseDuration(routeDuration);
  const arrivalMinutes = depMinutes + durationMinutes;

  // Handle next day arrival
  if (arrivalMinutes >= 24 * 60) {
    return minutesToTime(arrivalMinutes - 24 * 60);
  }

  return minutesToTime(arrivalMinutes);
};

/**
 * Parses duration string to minutes
 */
export const parseDuration = (duration: string): number => {
  const durationRegex = /^(?:(\d+)h\s*)?(?:(\d+)m)?$/;
  const match = duration.match(durationRegex);

  if (!match) return 0;

  const hours = match[1] ? parseInt(match[1]) : 0;
  const minutes = match[2] ? parseInt(match[2]) : 0;

  return hours * 60 + minutes;
};

/**
 * Formats trip status for display
 */
export const formatTripStatus = (
  status: string
): { label: string; color: string } => {
  const statusMap = {
    scheduled: { label: 'Scheduled', color: '#3B82F6' },
    boarding: { label: 'Boarding', color: '#F59E0B' },
    departed: { label: 'Departed', color: '#10B981' },
    arrived: { label: 'Arrived', color: '#059669' },
    cancelled: { label: 'Cancelled', color: '#EF4444' },
    delayed: { label: 'Delayed', color: '#F59E0B' },
  };

  return (
    statusMap[status as keyof typeof statusMap] || {
      label: status,
      color: '#6B7280',
    }
  );
};

/**
 * Gets trip occupancy percentage
 */
export const getTripOccupancy = (trip: Trip): number => {
  const totalSeats = trip.vessel?.seating_capacity || 0;
  const bookedSeats = trip.booked_seats || 0;

  if (totalSeats === 0) return 0;
  return Math.round((bookedSeats / totalSeats) * 100);
};

/**
 * Gets trip occupancy level
 */
export const getTripOccupancyLevel = (
  trip: Trip
): 'low' | 'medium' | 'high' | 'full' => {
  const occupancy = getTripOccupancy(trip);

  if (occupancy >= 100) return 'full';
  if (occupancy >= 80) return 'high';
  if (occupancy >= 50) return 'medium';
  return 'low';
};

/**
 * Calculates trip revenue
 */
export const calculateTripRevenue = (trip: Trip, route: Route): number => {
  const bookedSeats = trip.booked_seats || 0;
  const baseFare = route.base_fare || 0;
  const fareMultiplier = trip.fare_multiplier || 1;

  return bookedSeats * baseFare * fareMultiplier;
};

/**
 * Filters trips based on criteria
 */
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
      const tripTime = timeToMinutes(trip.departure_time);
      const fromTime = timeToMinutes(filters.departure_time_range.from);
      const toTime = timeToMinutes(filters.departure_time_range.to);

      if (tripTime < fromTime || tripTime > toTime) {
        return false;
      }
    }

    return true;
  });
};

/**
 * Searches trips by text
 */
export const searchTrips = (trips: Trip[], searchTerm: string): Trip[] => {
  if (!searchTerm.trim()) return trips;

  const term = searchTerm.toLowerCase().trim();

  return trips.filter(
    trip =>
      trip.routeName?.toLowerCase().includes(term) ||
      trip.vesselName?.toLowerCase().includes(term) ||
      trip.travel_date.includes(term) ||
      trip.departure_time.includes(term) ||
      trip.status.toLowerCase().includes(term) ||
      trip.notes?.toLowerCase().includes(term)
  );
};

/**
 * Gets trip performance metrics
 */
export const getTripPerformanceMetrics = (trip: Trip, route: Route) => {
  const occupancy = getTripOccupancy(trip);
  const revenue = calculateTripRevenue(trip, route);
  const isOnTime = trip.status !== 'delayed' && trip.status !== 'cancelled';

  return {
    occupancyRate: occupancy,
    revenue,
    isOnTime,
    profitability:
      occupancy >= 60
        ? 'profitable'
        : occupancy >= 40
          ? 'marginal'
          : 'unprofitable',
    efficiency: isOnTime ? (occupancy / 100) * 100 : (occupancy / 100) * 80, // Penalty for delays
  };
};

/**
 * Validates trip conflicts (same vessel, same time)
 */
export const validateTripConflicts = (
  formData: TripFormData,
  existingTrips: Trip[],
  currentTripId?: string
): { hasConflict: boolean; conflictingTrip?: Trip } => {
  const conflictingTrip = existingTrips.find(
    trip =>
      trip.id !== currentTripId &&
      trip.vessel_id === formData.vessel_id &&
      trip.travel_date === formData.travel_date &&
      trip.departure_time === formData.departure_time &&
      trip.status !== 'cancelled'
  );

  return {
    hasConflict: !!conflictingTrip,
    conflictingTrip,
  };
};

/**
 * Suggests optimal departure times based on existing trips
 */
export const suggestDepartureTimes = (
  routeId: string,
  vesselId: string,
  travelDate: string,
  existingTrips: Trip[]
): string[] => {
  const busyTimes = existingTrips
    .filter(
      trip =>
        trip.route_id === routeId &&
        trip.vessel_id === vesselId &&
        trip.travel_date === travelDate &&
        trip.status !== 'cancelled'
    )
    .map(trip => timeToMinutes(trip.departure_time));

  const suggestions: string[] = [];
  const standardTimes = [
    '06:00',
    '07:00',
    '08:00',
    '09:00',
    '10:00',
    '11:00',
    '12:00',
    '13:00',
    '14:00',
    '15:00',
    '16:00',
    '17:00',
    '18:00',
    '19:00',
    '20:00',
  ];

  for (const time of standardTimes) {
    const minutes = timeToMinutes(time);
    const hasConflict = busyTimes.some(
      busyTime => Math.abs(minutes - busyTime) < 60 // 1 hour buffer
    );

    if (!hasConflict) {
      suggestions.push(time);
    }
  }

  return suggestions.slice(0, 5); // Return top 5 suggestions
};

/**
 * Calculates trip turnaround time
 */
export const calculateTripTurnaroundTime = (
  trip: Trip,
  route: Route
): number => {
  const routeDuration = parseDuration(route.duration || '1h');
  const bufferTime = 30; // 30 minutes buffer for boarding/disembarking

  return routeDuration + bufferTime;
};

/**
 * Gets weather impact on trip
 */
export const getWeatherImpact = (
  weatherConditions?: string
): {
  impact: 'none' | 'low' | 'medium' | 'high';
  recommendation: string;
} => {
  if (!weatherConditions) {
    return { impact: 'none', recommendation: 'No weather data available' };
  }

  const conditions = weatherConditions.toLowerCase();

  if (
    conditions.includes('storm') ||
    conditions.includes('heavy rain') ||
    conditions.includes('rough seas')
  ) {
    return {
      impact: 'high',
      recommendation: 'Consider cancelling or postponing trip',
    };
  }

  if (
    conditions.includes('rain') ||
    conditions.includes('wind') ||
    conditions.includes('choppy')
  ) {
    return {
      impact: 'medium',
      recommendation: 'Monitor conditions closely and inform passengers',
    };
  }

  if (conditions.includes('cloudy') || conditions.includes('light wind')) {
    return {
      impact: 'low',
      recommendation: 'Normal operations with extra caution',
    };
  }

  return { impact: 'none', recommendation: 'Good conditions for travel' };
};

/**
 * Formats trip display information
 */
export const formatTripDisplay = (
  trip: Trip
): {
  displayName: string;
  timeRange: string;
  occupancyDisplay: string;
  statusDisplay: { label: string; color: string };
} => {
  const status = formatTripStatus(trip.status);
  const occupancy = getTripOccupancy(trip);
  const occupancyLevel = getTripOccupancyLevel(trip);

  return {
    displayName: `${trip.routeName} - ${trip.vesselName}`,
    timeRange: `${trip.departure_time} - ${trip.arrival_time}`,
    occupancyDisplay: `${trip.bookings}/${trip.capacity} (${occupancy}%)`,
    statusDisplay: status,
  };
};

// All functions are already exported individually above
