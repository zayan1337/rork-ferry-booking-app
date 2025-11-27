import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type PaymentSessionContext = 'booking' | 'modification';

export interface PaymentSessionDetails {
  bookingId: string;
  bookingDetails: {
    bookingNumber: string;
    route: string;
    travelDate: string;
    amount: number;
    currency: string;
    passengerCount: number;
  };
  context: PaymentSessionContext;
  originalBookingId?: string;
  tripInfo?: {
    travelDate: string;
    departureTime: string;
  };
  sessionData?: {
    sessionId: string;
    sessionUrl: string;
    redirectUrl: string;
  } | null;
  startedAt: string;
  expiresAt: string;
}

interface PaymentSessionStore {
  session: PaymentSessionDetails | null;
  setSession: (session: PaymentSessionDetails) => void;
  updateSession: (
    updates: Partial<
      Omit<PaymentSessionDetails, 'bookingId' | 'bookingDetails'>
    >
  ) => void;
  clearSession: () => void;
}

export const usePaymentSessionStore = create<PaymentSessionStore>()(
  persist(
    set => ({
      session: null,
      setSession: session => set({ session }),
      updateSession: updates =>
        set(state =>
          state.session
            ? {
                session: {
                  ...state.session,
                  ...updates,
                },
              }
            : state
        ),
      clearSession: () => set({ session: null }),
    }),
    {
      name: 'payment-session',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
