import { Booking, Route, Seat } from '../index';

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
  tripType?: string;
  departureDate?: string;
  returnDate?: string;
  route?: string;
  returnRoute?: string;
  selectedSeats?: string;
  returnSelectedSeats?: string;
  passengers?: string;
}

export interface ValidationResult {
  isValid: boolean;
  booking?: Booking;
  error?: string;
}

export interface ModifyBookingFormData {
  departureDate: string | null;
  returnDate: string | null;
  selectedSeats: Seat[];
  returnSelectedSeats: Seat[];
} 