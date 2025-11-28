import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { usePaymentSessionStore } from '@/store/paymentSessionStore';

/**
 * Hook to validate payment session on app resume and clear expired sessions
 */
export function usePaymentSessionValidator() {
  const { session, validateSession, clearSession, isSessionExpired } =
    usePaymentSessionStore();
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    // Validate session on mount
    if (session && !validateSession()) {
      // Session was cleared by validation
      return;
    }

    // Listen for app state changes
    const subscription = AppState.addEventListener(
      'change',
      (nextAppState: AppStateStatus) => {
        // When app comes to foreground, validate session
        if (
          appStateRef.current.match(/inactive|background/) &&
          nextAppState === 'active'
        ) {
          if (session) {
            if (isSessionExpired()) {
              // Session expired while app was in background
              clearSession();
            } else {
              // Validate session is still valid
              validateSession();
            }
          }
        }
        appStateRef.current = nextAppState;
      }
    );

    return () => {
      subscription.remove();
    };
  }, [session, validateSession, clearSession, isSessionExpired]);
}
