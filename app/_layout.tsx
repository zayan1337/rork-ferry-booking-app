import React, { useEffect, useState, useRef, useMemo } from 'react';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useFonts } from 'expo-font';
import { Stack, router, usePathname } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useAuthStore } from '../store/authStore';
import * as Linking from 'expo-linking';
import SafeView from '../components/SafeView';
import { AuthLoadingScreen } from '@/components';
import { AlertProvider } from '@/components/AlertProvider';
// import CustomSplashScreen from '../components/SplashScreen';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    ...FontAwesome.font,
  });

  useEffect(() => {
    if (error) {
      throw error;
    }
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return <RootLayoutNav />;
}

function RootLayoutNav() {
  const {
    checkAuth,
    isAuthenticated,
    user,
    error,
    isRehydrated,
    preventRedirect,
    isGuestMode,
  } = useAuthStore();
  const [authChecked, setAuthChecked] = useState(false);
  useEffect(() => {
    // Only check auth once on startup and when rehydrated
    if (!authChecked && isRehydrated) {
      const initAuth = async () => {
        try {
          await checkAuth();
        } catch (error) {
          console.error('Auth initialization error:', error);
        } finally {
          setAuthChecked(true);
        }
      };
      initAuth();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authChecked, isRehydrated]);
  // Note: checkAuth is a stable Zustand function, no need to include in deps

  // Handle deep linking for payment success
  useEffect(() => {
    const handleDeepLink = (url: string) => {
      if (
        url.includes(
          process.env.EXPO_PUBLIC_MIB_RETURN_URL ||
            'crystaltransfervaavu://payment-success'
        )
      ) {
        try {
          const urlObj = new URL(url);
          const bookingId = urlObj.searchParams.get('bookingId');
          const result = urlObj.searchParams.get('result');
          const sessionId = urlObj.searchParams.get('session.id');

          if (bookingId && result) {
            // Navigate to payment success page
            router.push({
              pathname: '/(app)/(customer)/payment-success',
              params: {
                bookingId,
                result,
                sessionId: sessionId || '',
              },
            });
          }
        } catch (error) {
          // Error handling payment deep link
          console.error('❌ Error handling payment deep link:', {
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined,
            url,
          });
        }
      }
    };

    // Handle initial URL if app was opened via deep link
    Linking.getInitialURL().then(url => {
      if (url) {
        handleDeepLink(url);
      }
    });

    // Listen for incoming links when app is already running
    const subscription = Linking.addEventListener('url', ({ url }) => {
      handleDeepLink(url);
    });

    return () => {
      subscription?.remove();
    };
  }, []);

  // Determine if user has valid profile after authentication
  // Memoize to prevent unnecessary re-computations and re-renders
  const hasValidProfile = useMemo(
    () => isAuthenticated && user?.profile && user.profile.is_active,
    [isAuthenticated, user?.profile?.is_active]
  );

  const pathname = usePathname();
  // Track previous target route to avoid duplicate navigation calls
  const previousTarget = useRef<string | null>(null);
  // Track if navigation is in progress to prevent multiple navigations
  const isNavigatingRef = useRef(false);

  // Handle navigation when authentication state changes
  useEffect(() => {
    if (
      !authChecked ||
      !isRehydrated ||
      preventRedirect ||
      isNavigatingRef.current
    ) {
      return;
    }

    const shouldGoToApp = (hasValidProfile ?? false) || isGuestMode;
    const targetRoute = shouldGoToApp ? '/(app)' : '/(auth)';
    const isAlreadyOnTarget = shouldGoToApp
      ? pathname.startsWith('/(app)')
      : pathname.startsWith('/(auth)');

    if (isAlreadyOnTarget || previousTarget.current === targetRoute) {
      return;
    }

    previousTarget.current = targetRoute;
    isNavigatingRef.current = true;

    const timer = setTimeout(() => {
      try {
        router.replace(targetRoute as any);
        // Reset navigation flag after a delay to allow navigation to complete
        setTimeout(() => {
          isNavigatingRef.current = false;
        }, 500);
      } catch (error) {
        console.error('Navigation error:', error);
        isNavigatingRef.current = false;
      }
    }, 100);

    return () => {
      clearTimeout(timer);
    };
  }, [
    hasValidProfile,
    authChecked,
    isRehydrated,
    pathname,
    preventRedirect,
    isGuestMode,
  ]);

  // Show loading screen only during initial app startup (rehydration and initial auth check)
  // Don't show loading during user login - that should only show in the button
  if (!isRehydrated || !authChecked) {
    return <AuthLoadingScreen message='Initializing app...' />;
  }

  return (
    <AlertProvider>
      <SafeView edges={[]}>
        <StatusBar style='dark' />
        <Stack
          screenOptions={{
            headerShown: false,
            gestureEnabled: false,
            animationTypeForReplace: 'push',
          }}
          initialRouteName={hasValidProfile || isGuestMode ? '(app)' : '(auth)'}
        >
          <Stack.Screen name='(auth)' />
          <Stack.Screen name='(app)' />
        </Stack>
      </SafeView>
    </AlertProvider>
  );
}
