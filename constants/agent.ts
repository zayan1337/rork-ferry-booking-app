// Agent Portal Constants

// Booking steps for agent portal
export const AGENT_BOOKING_STEPS = {
  ISLAND_DATE_SELECTION: 1,
  TRIP_SELECTION: 2,
  CLIENT_SELECTION: 3,
  SEAT_SELECTION: 4,
  PASSENGER_DETAILS: 5,
  PAYMENT: 6,
} as const;

// Step labels for agent portal
export const AGENT_STEP_LABELS = {
  [AGENT_BOOKING_STEPS.ISLAND_DATE_SELECTION]: 'Route & Date',
  [AGENT_BOOKING_STEPS.TRIP_SELECTION]: 'Select Trip',
  [AGENT_BOOKING_STEPS.CLIENT_SELECTION]: 'Client',
  [AGENT_BOOKING_STEPS.SEAT_SELECTION]: 'Seats',
  [AGENT_BOOKING_STEPS.PASSENGER_DETAILS]: 'Details',
  [AGENT_BOOKING_STEPS.PAYMENT]: 'Payment',
} as const;

// Trip types (same as customer)
export const AGENT_TRIP_TYPES = {
  ONE_WAY: 'one_way',
  ROUND_TRIP: 'round_trip',
} as const;

// Payment options for agents
export const AGENT_PAYMENT_OPTIONS = [
  { label: 'Credit', value: 'credit' },
  { label: 'MIB', value: 'mib' },
  { label: 'Free', value: 'free' },
] as const;

// Booking buffer minutes (same as customer)
export const AGENT_BOOKING_BUFFER_MINUTES = 10;

// Refresh intervals
export const AGENT_REFRESH_INTERVALS = {
  SEAT_AVAILABILITY: 30000, // 30 seconds
  BOOKINGS: 60000, // 1 minute
} as const;
