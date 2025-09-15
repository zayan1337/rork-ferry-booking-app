import { supabase } from './supabase';
import type { Seat } from '@/types';

export interface TempSeatReservationResult {
  success: boolean;
  message: string;
  expiry?: string;
  reason?: 'confirmed_booking' | 'temp_reserved' | 'expired';
}

export interface SeatConfirmationResult {
  success: boolean;
  confirmed_count: number;
  failed_seats: string[];
  total_requested: number;
}

export interface RealtimeSeatStatus {
  seat_id: string;
  seat_number: string;
  row_number: number;
  is_window: boolean;
  is_aisle: boolean;
  seat_type: string;
  seat_class: string;
  is_disabled: boolean;
  is_premium: boolean;
  price_multiplier: number;
  position_x: number;
  position_y: number;
  is_available: boolean;
  is_confirmed: boolean;
  is_temp_reserved: boolean;
  temp_reserved_by?: string;
  temp_expiry?: string;
  booking_id?: string;
}

/**
 * Generate a unique session ID for the current user session
 */
export const generateSessionId = (): string => {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Global session ID for React Native (persists during app session)
let globalSessionId: string | null = null;

/**
 * Get or create session ID for React Native
 */
export const getSessionId = (): string => {
  if (!globalSessionId) {
    globalSessionId = generateSessionId();
  }
  return globalSessionId;
};

/**
 * Temporarily reserve a seat for the current user
 */
export const tempReserveSeat = async (
  tripId: string,
  seatId: string,
  expiryMinutes: number = 10
): Promise<TempSeatReservationResult> => {
  try {
    console.log('Attempting to reserve seat:', { tripId, seatId, expiryMinutes });
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User must be authenticated to reserve seats');
    }

    const sessionId = getSessionId();
    console.log('Using session ID:', sessionId);

    const { data, error } = await supabase.rpc('temp_reserve_seat', {
      p_trip_id: tripId,
      p_seat_id: seatId,
      p_user_id: user.id,
      p_session_id: sessionId,
      p_expiry_minutes: expiryMinutes,
    });

    if (error) {
      console.error('Database error temporarily reserving seat:', error);
      return {
        success: false,
        message: error.message || 'Failed to reserve seat. Please try again.',
      };
    }

    console.log('Seat reservation result:', data);
    return data as TempSeatReservationResult;
  } catch (error: any) {
    console.error('Error in tempReserveSeat:', error);
    return {
      success: false,
      message: error.message || 'Failed to reserve seat',
    };
  }
};

/**
 * Release a temporary seat reservation
 */
export const releaseTempSeatReservation = async (
  tripId: string,
  seatId: string
): Promise<TempSeatReservationResult> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User must be authenticated');
    }

    const sessionId = getSessionId();

    const { data, error } = await supabase.rpc('release_temp_seat_reservation', {
      p_trip_id: tripId,
      p_seat_id: seatId,
      p_user_id: user.id,
      p_session_id: sessionId,
    });

    if (error) {
      console.error('Error releasing seat reservation:', error);
      return {
        success: false,
        message: 'Failed to release seat reservation',
      };
    }

    return data as TempSeatReservationResult;
  } catch (error: any) {
    console.error('Error in releaseTempSeatReservation:', error);
    return {
      success: false,
      message: error.message || 'Failed to release seat reservation',
    };
  }
};

/**
 * Get real-time seat status for a trip
 */
export const getTripSeatStatus = async (
  tripId: string
): Promise<RealtimeSeatStatus[]> => {
  try {
    // First, try to clean up expired reservations (non-blocking)
    try {
      await supabase.rpc('safe_cleanup_expired_reservations');
    } catch (cleanupError) {
      // Ignore cleanup errors to prevent blocking the main operation
      console.warn('Cleanup warning (non-critical):', cleanupError);
    }

    const { data, error } = await supabase.rpc('get_trip_seat_status', {
      p_trip_id: tripId,
    });

    if (error) {
      console.error('Error getting trip seat status:', error);
      return [];
    }

    return data as RealtimeSeatStatus[];
  } catch (error: any) {
    console.error('Error in getTripSeatStatus:', error);
    return [];
  }
};

/**
 * Confirm seat reservations during booking
 */
export const confirmSeatReservations = async (
  tripId: string,
  seatIds: string[],
  bookingId: string
): Promise<SeatConfirmationResult> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User must be authenticated');
    }

    const sessionId = getSessionId();

    const { data, error } = await supabase.rpc('confirm_seat_reservations', {
      p_trip_id: tripId,
      p_seat_ids: seatIds,
      p_booking_id: bookingId,
      p_user_id: user.id,
      p_session_id: sessionId,
    });

    if (error) {
      console.error('Error confirming seat reservations:', error);
      throw new Error('Failed to confirm seat reservations');
    }

    return data as SeatConfirmationResult;
  } catch (error: any) {
    console.error('Error in confirmSeatReservations:', error);
    throw error;
  }
};

/**
 * Convert RealtimeSeatStatus to Seat type
 */
export const convertToSeatType = (
  realtimeStatus: RealtimeSeatStatus,
  currentUserId?: string
): Seat => {
  const isCurrentUserTempReservation = 
    realtimeStatus.is_temp_reserved && 
    realtimeStatus.temp_reserved_by === currentUserId;

  return {
    id: realtimeStatus.seat_id,
    number: realtimeStatus.seat_number,
    rowNumber: realtimeStatus.row_number,
    isWindow: realtimeStatus.is_window,
    isAisle: realtimeStatus.is_aisle,
    isAvailable: realtimeStatus.is_available || isCurrentUserTempReservation,
    isSelected: isCurrentUserTempReservation, // Mark as selected if current user has temp reservation
    seatType: realtimeStatus.seat_type as 'standard' | 'premium' | 'crew' | 'disabled' | undefined,
    seatClass: (realtimeStatus.seat_class as 'economy' | 'business' | 'first') || 'economy',
    isDisabled: realtimeStatus.is_disabled || false,
    isPremium: realtimeStatus.is_premium || false,
    priceMultiplier: realtimeStatus.price_multiplier || 1.0,
    positionX: realtimeStatus.position_x || realtimeStatus.row_number || 1,
    positionY: realtimeStatus.position_y || 1,
    isConfirmed: realtimeStatus.is_confirmed,
    isTempReserved: realtimeStatus.is_temp_reserved,
    tempReservedBy: realtimeStatus.temp_reserved_by,
    tempExpiry: realtimeStatus.temp_expiry,
    isCurrentUserReservation: isCurrentUserTempReservation,
  };
};

/**
 * Subscribe to real-time seat updates for a trip
 */
export const subscribeToSeatUpdates = (
  tripId: string,
  callback: (payload: any) => void
) => {
  const channel = supabase
    .channel(`seat_updates_${tripId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'seat_reservations',
        filter: `trip_id=eq.${tripId}`,
      },
      callback
    )
    .subscribe();

  return channel;
};

/**
 * Unsubscribe from seat updates
 */
export const unsubscribeFromSeatUpdates = (channel: any) => {
  if (channel) {
    supabase.removeChannel(channel);
  }
};

/**
 * Batch reserve multiple seats
 */
export const batchReserveSeats = async (
  tripId: string,
  seatIds: string[],
  expiryMinutes: number = 10
): Promise<{ success: string[]; failed: { seatId: string; reason: string }[] }> => {
  const results = await Promise.allSettled(
    seatIds.map(seatId => tempReserveSeat(tripId, seatId, expiryMinutes))
  );

  const success: string[] = [];
  const failed: { seatId: string; reason: string }[] = [];

  results.forEach((result, index) => {
    const seatId = seatIds[index];
    if (result.status === 'fulfilled' && result.value.success) {
      success.push(seatId);
    } else {
      const reason = result.status === 'fulfilled' 
        ? result.value.message 
        : 'Request failed';
      failed.push({ seatId, reason });
    }
  });

  return { success, failed };
};

/**
 * Batch release multiple seats
 */
export const batchReleaseSeats = async (
  tripId: string,
  seatIds: string[]
): Promise<{ success: string[]; failed: { seatId: string; reason: string }[] }> => {
  const results = await Promise.allSettled(
    seatIds.map(seatId => releaseTempSeatReservation(tripId, seatId))
  );

  const success: string[] = [];
  const failed: { seatId: string; reason: string }[] = [];

  results.forEach((result, index) => {
    const seatId = seatIds[index];
    if (result.status === 'fulfilled' && result.value.success) {
      success.push(seatId);
    } else {
      const reason = result.status === 'fulfilled' 
        ? result.value.message 
        : 'Request failed';
      failed.push({ seatId, reason });
    }
  });

  return { success, failed };
};

/**
 * Extend temporary reservation for seats
 */
export const extendSeatReservations = async (
  tripId: string,
  seatIds: string[],
  expiryMinutes: number = 10
): Promise<void> => {
  // Re-reserve seats to extend their expiry
  await batchReserveSeats(tripId, seatIds, expiryMinutes);
};

/**
 * Check if user has any temporary reservations for a trip
 */
export const getUserTempReservations = async (
  tripId: string
): Promise<RealtimeSeatStatus[]> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const allSeats = await getTripSeatStatus(tripId);
    return allSeats.filter(seat => 
      seat.is_temp_reserved && seat.temp_reserved_by === user.id
    );
  } catch (error) {
    console.error('Error getting user temp reservations:', error);
    return [];
  }
};

/**
 * Clean up all temporary reservations for current user session
 */
export const cleanupUserTempReservations = async (tripId: string): Promise<void> => {
  try {
    const userReservations = await getUserTempReservations(tripId);
    const seatIds = userReservations.map(seat => seat.seat_id);
    
    if (seatIds.length > 0) {
      await batchReleaseSeats(tripId, seatIds);
    }
  } catch (error) {
    console.error('Error cleaning up user temp reservations:', error);
  }
};
