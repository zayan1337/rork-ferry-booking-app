export type User = {
  id: string;
  fullName: string;
  mobileNumber: string;
  email: string;
  dateOfBirth: string;
  username: string;
};

export type Island = {
  id: string;
  name: string;
  zone: string;
};

export type Route = {
  id: string;
  fromIsland: Island;
  toIsland: Island;
  baseFare: number;
  duration: string;
};

export type Seat = {
  id: string;
  number: string;
  isAvailable: boolean;
  isSelected?: boolean;
};

export type Passenger = {
  fullName: string;
  idNumber?: string;
  specialAssistance?: string;
};

export type BookingStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled';

export type PaymentMethod = 'bank_transfer' | 'bml' | 'mib' | 'ooredoo' | 'fahipay';

export type PaymentStatus = 'paid' | 'pending' | 'failed';

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
  paymentStatus: PaymentStatus;
  paymentMethod?: PaymentMethod;
  createdAt: string;
};