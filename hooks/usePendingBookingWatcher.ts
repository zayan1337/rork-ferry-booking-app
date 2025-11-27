import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/utils/supabase';

type BookingStatusType =
  | 'pending_payment'
  | 'cancelled'
  | 'confirmed'
  | 'completed'
  | 'departed'
  | 'arrived'
  | null;

interface PendingBookingWatcherOptions {
  bookingId?: string;
  enabled?: boolean;
  intervalMs?: number;
}

export const usePendingBookingWatcher = ({
  bookingId,
  enabled = true,
  intervalMs = 3000,
}: PendingBookingWatcherOptions) => {
  const [status, setStatus] = useState<BookingStatusType>(null);
  const [isLoading, setIsLoading] = useState(false);
  const lastStatusRef = useRef<BookingStatusType>(null);

  useEffect(() => {
    if (!bookingId || !enabled) {
      setStatus(null);
      setIsLoading(false);
      lastStatusRef.current = null;
      return;
    }

    let isMounted = true;
    let interval: ReturnType<typeof setInterval> | null = null;

    const fetchStatus = async () => {
      try {
        const { data, error } = await supabase
          .from('bookings')
          .select('status')
          .eq('id', bookingId)
          .single();

        if (!isMounted || error || !data) {
          if (error) {
            console.error('usePendingBookingWatcher fetch error:', error);
          }
          return;
        }

        if (lastStatusRef.current !== data.status) {
          lastStatusRef.current = data.status as BookingStatusType;
          setStatus(lastStatusRef.current);
        } else if (!status) {
          // Ensure status is set on first fetch even if unchanged
          setStatus(data.status as BookingStatusType);
        }
      } catch (err) {
        if (isMounted) {
          console.error('usePendingBookingWatcher unexpected error:', err);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    setIsLoading(true);
    fetchStatus();
    interval = setInterval(fetchStatus, intervalMs);

    return () => {
      isMounted = false;
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [bookingId, enabled, intervalMs]);

  return { status, isLoading };
};
