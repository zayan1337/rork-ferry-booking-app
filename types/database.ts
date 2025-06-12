import type { Island, BookingStatus, PaymentStatus, PaymentMethod } from './index';

export interface DBPassenger {
    id?: string;
    passenger_name: string;
    passenger_contact_number: string;
    special_assistance_request?: string;
    seat_id?: string;
}

export interface DBBooking {
    id: string;
    booking_number: string;
    trip_id: string;
    is_round_trip: boolean;
    return_booking_id?: string;
    status: BookingStatus;
    total_fare: number;
    payment_status: PaymentStatus;
    payment_method?: PaymentMethod;
    created_at: string;
    updated_at: string;
    trip: {
        id: string;
        route: {
            id: string;
            from_island: Island;
            to_island: Island;
            base_fare: number;
            duration: string;
        };
        travel_date: string;
        departure_time: string;
        vessel: {
            name: string;
        };
    };
    passengers: DBPassenger[];
}

export interface DBVessel {
    id: string;
    name: string;
    seating_capacity: number;
    is_active: boolean;
}

export interface DBTrip {
    id: string;
    route_id: string;
    travel_date: string;
    departure_time: string;
    vessel_id: string;
    vessel_name: string;
    available_seats: number;
    is_active: boolean;
}

export interface DBSeatReservation {
    id: string;
    trip_id: string;
    seat_id: string;
    booking_id?: string;
    is_available: boolean;
    is_reserved: boolean;
    reservation_expiry?: string;
} 