import type { CustomerFAQ } from '@/types/customer';

// Booking steps
export const BOOKING_STEPS = {
  TRIP_TYPE_DATE: 1,
  ROUTE_SELECTION: 2,
  SEAT_SELECTION: 3,
  PASSENGER_DETAILS: 4,
  PAYMENT: 5,
} as const;

// Step labels
export const STEP_LABELS = {
  [BOOKING_STEPS.TRIP_TYPE_DATE]: 'Trip',
  [BOOKING_STEPS.ROUTE_SELECTION]: 'Route',
  [BOOKING_STEPS.SEAT_SELECTION]: 'Seats',
  [BOOKING_STEPS.PASSENGER_DETAILS]: 'Details',
  [BOOKING_STEPS.PAYMENT]: 'Payment',
} as const;

// Trip types
export const TRIP_TYPES = {
  ONE_WAY: 'one_way',
  ROUND_TRIP: 'round_trip',
} as const;

// Payment methods
export const PAYMENT_OPTIONS = [
  { label: 'Bank Transfer', value: 'bank_transfer' },
  { label: 'BML', value: 'bml' },
  { label: 'MIB', value: 'mib' },
  { label: 'Ooredoo', value: 'ooredoo_m_faisa' },
  { label: 'FahiPay', value: 'fahipay' },
] as const;

// Date generation constants
export const DATE_GENERATION = {
  DAYS_AHEAD: 30,
  MIN_ARRIVAL_MINUTES: 30,
} as const;

// Refresh intervals
export const REFRESH_INTERVALS = {
  SEAT_AVAILABILITY: 30000, // 30 seconds
  USER_BOOKINGS: 60000, // 1 minute
} as const;

// Contact information
export const CONTACT_INFO = {
  PHONE: '+9607123456',
  EMAIL: 'support@crystaltransfervaavu.mv',
  SUPPORT_HOURS: '8:00 AM - 8:00 PM, 7 days a week',
} as const;

// FAQ data
export const FAQS: CustomerFAQ[] = [
  {
    question: 'How do I book a ferry ticket?',
    answer:
      "You can book a ferry ticket by going to the 'Book' tab and following the booking process. Select your trip type, dates, route, seats, and complete the payment.",
  },
  {
    question: 'Can I cancel my booking?',
    answer:
      "Yes, you can cancel your booking up to 72 hours before departure. Go to 'My Bookings', select the booking you want to cancel, and tap on 'Cancel Booking'. A 50% cancellation fee will apply.",
  },
  {
    question: 'How do I modify my booking?',
    answer:
      "To modify your booking, go to 'My Bookings', select the booking you want to modify, and tap on 'Modify Booking'. You can change the date or seats if available. Modifications must be made at least 72 hours before departure.",
  },
  {
    question: 'What payment methods are accepted?',
    answer:
      'We accept various payment methods including Bank Transfer, BML, MIB, Ooredoo, and FahiPay.',
  },
  {
    question: 'How do I get my ticket?',
    answer:
      "After successful booking, your e-ticket will be available in the 'My Bookings' section. You can download it or share it directly from the app.",
  },
  {
    question: 'What if I miss my ferry?',
    answer:
      'If you miss your ferry, your ticket will be considered used and no refund will be provided. We recommend arriving at least 30 minutes before departure.',
  },
  {
    question: 'Are there any baggage restrictions?',
    answer:
      'Each passenger is allowed one piece of luggage up to 20kg and one carry-on bag. Additional luggage may incur extra charges.',
  },
  {
    question: 'How early should I arrive before departure?',
    answer:
      'We recommend arriving at least 30 minutes before the scheduled departure time to allow for ticket validation and boarding.',
  },
];

// Booking validation rules
export const VALIDATION_RULES = {
  CANCELLATION_HOURS: 72,
  MODIFICATION_HOURS: 72,
  MAX_LUGGAGE_KG: 20,
  CANCELLATION_FEE_PERCENT: 50,
} as const;
