import type { Booking, Route, Seat, PaymentMethod } from '../index';

export type { PaymentMethod };

export interface BookingFormData {
  tripType: 'one_way' | 'round_trip';
  departureDate: string | null;
  returnDate: string | null;
  route: Route | null;
  returnRoute: Route | null;
  selectedSeats: Seat[];
  returnSelectedSeats: Seat[];
  passengers: PassengerFormData[];
  totalFare: number;
}

export interface PassengerFormData {
  fullName: string;
  idNumber: string;
  specialAssistance?: string;
}

export interface BookingFormErrors {
  [key: string]: string | undefined;
  date?: string;
  trip?: string;
  seats?: string;
  reason?: string;
  paymentMethod?: string;
  payment?: string;
  accountNumber?: string;
  accountName?: string;
  bankName?: string;
}

export interface ValidationResult {
  isValid: boolean;
  booking: Booking | null;
  message: string;
  isOwnBooking?: boolean;
}

export interface ModifyBookingFormData {
  departureDate: string | null;
  returnDate: string | null;
  selectedSeats: Seat[];
  returnSelectedSeats: Seat[];
}

export interface BankDetails {
  accountNumber: string;
  accountName: string;
  bankName: string;
}

export interface ModifyBookingData {
  newTripId: string;
  newDate: string | null;
  selectedSeats: Seat[];
  modificationReason: string;
  fareDifference: number;
  paymentMethod: PaymentMethod;
  bankAccountDetails: BankDetails | null;
  boardingStopId?: string;
  destinationStopId?: string;
  boardingStopSequence?: number;
  destinationStopSequence?: number;
  segmentFare?: number;
}

export interface CancelBookingData {
  reason: string;
  bankDetails: BankDetails;
}

export interface BookingEligibility {
  isModifiable: boolean;
  isCancellable: boolean;
  message?: string;
  hoursUntilDeparture: number;
}
