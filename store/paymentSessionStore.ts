import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type PaymentSessionContext = 'booking' | 'modification';

export interface PaymentSessionDetails {
  bookingId: string;
  // The authenticated user this session belongs to
  userId: string;
  userRole?: string; // e.g. 'customer' | 'agent' | 'admin'
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
      Omit<PaymentSessionDetails, 'bookingId' | 'bookingDetails' | 'userId'>
    >
  ) => void;
  clearSession: () => void;
  validateSession: () => boolean;
  isSessionExpired: () => boolean;
}

export const usePaymentSessionStore = create<PaymentSessionStore>()(
  persist(
    (set, get) => ({
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
      validateSession: () => {
        const { session } = get();
        if (!session) return false;

        // Check if session is expired
        const expiresAt = new Date(session.expiresAt);
        const now = new Date();

        if (now >= expiresAt) {
          // Session expired, clear it
          set({ session: null });
          return false;
        }

        return true;
      },
      isSessionExpired: () => {
        const { session } = get();
        if (!session) return true;

        const expiresAt = new Date(session.expiresAt);
        const now = new Date();

        return now >= expiresAt;
      },
    }),
    {
      name: 'payment-session',
      storage: createJSONStorage(() => AsyncStorage),
      // Validate session on rehydration
      onRehydrateStorage: () => state => {
        if (state?.session) {
          const expiresAt = new Date(state.session.expiresAt);
          const now = new Date();

          if (now >= expiresAt) {
            // Session expired, clear it
            state.clearSession();
          }
        }
      },
    }
  )
);
