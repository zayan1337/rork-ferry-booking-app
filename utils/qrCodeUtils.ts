import type { Booking, Agent } from '@/types/agent';
import type { Route, Seat, Passenger, Trip } from '@/types';
import { supabase } from './supabase';

/**
 * Parse booking QR code data
 * @param qrCodeUrl - QR code URL or data string
 * @returns Parsed QR code data or null if invalid
 */
export const parseBookingQrCode = (qrCodeUrl: string): any | null => {
    try {
        if (!qrCodeUrl) return null;

        // Handle new URL format (https://api.qrserver.com/v1/create-qr-code/...)
        if (qrCodeUrl.startsWith('https://api.qrserver.com/v1/create-qr-code/')) {
            const url = new URL(qrCodeUrl);
            const dataParam = url.searchParams.get('data');
            if (dataParam) {
                const decodedData = decodeURIComponent(dataParam);
                // For the new format, just return the booking number
                if (decodedData.startsWith('Booking: ')) {
                    return {
                        bookingNumber: decodedData.replace('Booking: ', ''),
                        type: 'simple-booking',
                        format: 'url'
                    };
                }
            }
            return null;
        }

        // Handle legacy JSON format
        let qrData;
        if (qrCodeUrl.startsWith('{')) {
            qrData = JSON.parse(qrCodeUrl);
        } else {
            // If it's a URL with JSON data, extract the data parameter
            try {
                const url = new URL(qrCodeUrl);
                const dataParam = url.searchParams.get('data');
                if (dataParam) {
                    qrData = JSON.parse(decodeURIComponent(dataParam));
                } else {
                    qrData = JSON.parse(qrCodeUrl);
                }
            } catch {
                // If URL parsing fails, try parsing as direct JSON
                qrData = JSON.parse(qrCodeUrl);
            }
        }

        return qrData;
    } catch (error) {
        console.error('Error parsing booking QR code:', error);
        return null;
    }
};

/**
 * Get QR code display data for a booking
 * @param booking - Booking object
 * @returns Formatted QR code display data or null
 */
export const getQrCodeDisplayData = (booking: Booking) => {
    try {
        if (!booking.qrCodeUrl) return null;

        const qrData = parseBookingQrCode(booking.qrCodeUrl);
        if (!qrData) return null;

        // Handle new simple URL format
        if (qrData.format === 'url') {
            return {
                bookingNumber: qrData.bookingNumber || booking.bookingNumber,
                tripType: booking.tripType || 'N/A',
                route: `${booking.origin || 'Unknown'} → ${booking.destination || 'Unknown'}`,
                departureDate: booking.departureDate || 'N/A',
                departureTime: booking.departureTime || 'N/A',
                passengers: booking.passengerCount || 'N/A',
                seats: 'N/A', // Simple format doesn't include seat details
                clientName: booking.clientName || 'Unknown',
                agentName: 'Unknown Agent',
                totalFare: booking.totalAmount || 0,
                timestamp: booking.bookingDate || new Date().toISOString(),
                isAgentBooking: true, // Assume agent booking for simple format
                isReturnTrip: false,
            };
        }

        // Handle legacy JSON format
        return {
            bookingNumber: qrData.bookingNumber || booking.bookingNumber,
            tripType: qrData.type || booking.tripType,
            route: qrData.route || `${booking.origin} → ${booking.destination}`,
            departureDate: qrData.departureDate || booking.departureDate,
            departureTime: qrData.departureTime || booking.departureTime,
            passengers: qrData.passengers || booking.passengerCount,
            seats: Array.isArray(qrData.seats) ? qrData.seats.join(', ') : 'N/A',
            clientName: qrData.clientName || booking.clientName,
            agentName: qrData.agentName || 'Unknown Agent',
            totalFare: qrData.totalFare || booking.totalAmount,
            timestamp: qrData.timestamp || booking.bookingDate,
            isAgentBooking: qrData.type?.includes('agent-booking') || false,
            isReturnTrip: qrData.type === 'agent-booking-return' || false,
        };
    } catch (error) {
        console.error('Error extracting QR code display data:', error);
        return null;
    }
};

/**
 * Generate unified QR code data for bookings
 * @param booking - Booking object
 * @param passengers - Passengers array
 * @param selectedSeats - Selected seats array
 * @param trip - Trip object
 * @param route - Route object
 * @param type - QR code type
 * @param additionalData - Additional data to include
 * @returns QR code data string
 */
export const generateUnifiedQrCode = (
    booking: any,
    passengers: Passenger[],
    selectedSeats: Seat[],
    trip: Trip,
    route: Route,
    type: string,
    additionalData?: any
): string => {
    try {
        const qrCodeData = {
            bookingNumber: booking.booking_number,
            bookingId: booking.id,
            tripId: trip.id,
            departureDate: trip.travel_date || booking.travel_date,
            departureTime: trip.departure_time,
            passengers: passengers.length,
            seats: selectedSeats.map(seat => seat.number),
            totalFare: booking.total_fare,
            timestamp: new Date().toISOString(),
            type: type,
            // Additional data for different booking types
            ...additionalData
        };

        return JSON.stringify(qrCodeData);
    } catch (error) {
        console.error('Error generating unified QR code data:', error);
        return '';
    }
};

/**
 * Update booking with QR code data in database
 * @param bookingId - Booking ID
 * @param qrCodeData - QR code data string
 * @param maxRetries - Maximum number of retry attempts
 * @returns Promise<boolean> - Success status
 */
export const updateBookingWithQrCode = async (
    bookingId: string,
    qrCodeData: string,
    maxRetries: number = 3
): Promise<boolean> => {
    let success = false;
    let attempts = 0;

    while (!success && attempts < maxRetries) {
        attempts++;

        try {
            const { data, error } = await supabase
                .from('bookings')
                .update({ qr_code_url: qrCodeData })
                .eq('id', bookingId)
                .select('id, qr_code_url, booking_number');

            if (error) {
                console.error(`QR code update attempt ${attempts} failed:`, error);
                if (attempts < maxRetries) {
                    await new Promise(resolve => setTimeout(resolve, 500 * attempts));
                }
            } else {
                success = true;
                console.log(`QR code updated successfully for booking:`, bookingId);

                // Verify the QR code was stored
                await new Promise(resolve => setTimeout(resolve, 200));

                const { data: verifyData, error: verifyError } = await supabase
                    .from('bookings')
                    .select('qr_code_url')
                    .eq('id', bookingId)
                    .single();

                if (verifyError || !verifyData.qr_code_url) {
                    console.error('QR code verification failed:', verifyError);
                    success = false;
                }
            }
        } catch (error) {
            console.error(`QR code update exception attempt ${attempts}:`, error);
            if (attempts < maxRetries) {
                await new Promise(resolve => setTimeout(resolve, 500 * attempts));
            }
        }
    }

    return success;
};

/**
 * Validate QR code data structure
 * @param qrCodeData - QR code data object
 * @returns True if valid, false otherwise
 */
export const validateQrCodeData = (qrCodeData: any): boolean => {
    try {
        // Check required fields
        const requiredFields = [
            'bookingNumber',
            'bookingId',
            'tripId',
            'departureDate',
            'type'
        ];

        for (const field of requiredFields) {
            if (!qrCodeData[field]) {
                console.warn(`Missing required QR code field: ${field}`);
                return false;
            }
        }

        // Validate booking type
        const validTypes = ['agent-booking', 'agent-booking-return', 'customer-booking'];
        if (!validTypes.includes(qrCodeData.type)) {
            console.warn(`Invalid QR code type: ${qrCodeData.type}`);
            return false;
        }

        // Validate timestamp format
        if (qrCodeData.timestamp && isNaN(Date.parse(qrCodeData.timestamp))) {
            console.warn('Invalid timestamp in QR code data');
            return false;
        }

        return true;
    } catch (error) {
        console.error('Error validating QR code data:', error);
        return false;
    }
};

/**
 * Generate QR code data for agent bookings
 * @param booking - Booking object
 * @param agent - Agent object
 * @param type - QR code type
 * @returns QR code data string
 */
export const generateAgentQrCodeData = (booking: any, agent: Agent, type: string = 'agent-booking'): string => {
    try {
        // Match user booking structure with agent-specific additions
        const qrCodeData = {
            bookingNumber: booking.booking_number || booking.bookingNumber,
            bookingId: booking.id,
            tripId: booking.trip_id || booking.tripId,
            departureDate: booking.travel_date || booking.departureDate,
            departureTime: booking.departure_time || booking.departureTime,
            passengers: booking.passengers?.length || booking.passengerCount || 0,
            seats: booking.seats || [],
            totalFare: booking.total_fare || booking.totalAmount || 0,
            timestamp: new Date().toISOString(),
            // Agent-specific additional fields
            clientName: booking.clientName || booking.client?.name || 'Unknown Client',
            agentId: agent.id,
            agentName: agent.name || agent.email,
            type: type
        };

        return JSON.stringify(qrCodeData);
    } catch (error) {
        console.error('Error generating agent QR code data:', error);
        return '';
    }
}; 