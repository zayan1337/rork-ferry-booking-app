export type User = {
  id: string;
  fullName: string;
  mobileNumber: string;
  email: string;
  dateOfBirth: string;
  username: string;
};

export interface Island {
  id: string;
  name: string;
  zone: 'A' | 'B';
}

export interface Route {
  id: string;
  fromIsland: Island;
  toIsland: Island;
  baseFare: number;
  duration?: string; // Optional since it's not in DB
}

export interface Seat {
  id: string;
  number: string;
  rowNumber: number;
  isWindow: boolean;
  isAisle: boolean;
  isAvailable: boolean;
  isSelected?: boolean;
}

export interface Passenger {
  id?: string;
  fullName: string;
  idNumber?: string;
  specialAssistance?: string;
}

export type BookingStatus = 'reserved' | 'pending_payment' | 'confirmed' | 'checked_in' | 'completed' | 'modified' | 'cancelled';

export type PaymentMethod = 'bank_transfer' | 'bml' | 'mib' | 'ooredoo_m_faisa' | 'fahipay' | 'wallet';

export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded' | 'partially_refunded';

export type Booking = {
  id: string;
  bookingNumber: string;
  tripType: 'one_way' | 'round_trip';
  departureDate: string;
  departureTime: string;
  returnDate?: string;
  returnTime?: string;
  route: Route;
  returnRoute?: Route;
  seats: Seat[];
  returnSeats?: Seat[];
  passengers: Passenger[];
  totalFare: number;
  status: BookingStatus;
  qrCodeUrl?: string;
  checkInStatus: boolean;
  createdAt: string;
  updatedAt: string;
  vessel: {
    id: string;
    name: string;
  };
  payment?: {
    method: PaymentMethod;
    status: PaymentStatus;
  };
  bookingType?: 'customer' | 'agent';
  clientName?: string;
  clientEmail?: string;
  clientPhone?: string;
  agentId?: string | null;
  isAgentBooking?: boolean;
};

export * from './components';
export * from './auth';
export * from './pages';
export * from './database';
export * from './store';
export * from './booking';
export * from './customer';