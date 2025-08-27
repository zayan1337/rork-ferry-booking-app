import React, { useEffect, useState } from 'react';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useFonts } from 'expo-font';
import { Stack, router } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useAuthStore } from '../store/authStore';
import * as Linking from 'expo-linking';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    ...FontAwesome.font,
  });

  useEffect(() => {
    if (error) {
      console.error(error);
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
  const { checkAuth, isAuthenticated, isLoading, user, error, isRehydrated } =
    useAuthStore();
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
  }, [checkAuth, authChecked, isRehydrated]);

  // Handle deep linking for payment success
  useEffect(() => {
    const handleDeepLink = (url: string) => {
      console.log('🔗 Deep link received:', {
        url,
        timestamp: new Date().toISOString(),
      });

      if (url.includes('rork-ferry://payment-success')) {
        console.log('💳 Payment success deep link detected');

        try {
          const urlObj = new URL(url);
          const bookingId = urlObj.searchParams.get('bookingId');
          const result = urlObj.searchParams.get('result');
          const sessionId = urlObj.searchParams.get('session.id');
          const allParams = Object.fromEntries(urlObj.searchParams.entries());

          console.log('📋 Deep link parameters extracted:', {
            bookingId,
            result,
            sessionId,
            allParams,
            url,
          });

          if (bookingId && result) {
            console.log(
              '✅ Valid payment deep link - navigating to payment success page'
            );

            // Navigate to payment success page
            router.push({
              pathname: '/(app)/(customer)/payment-success',
              params: {
                bookingId,
                result,
                sessionId: sessionId || '',
              },
            });
          } else {
            console.error(
              '❌ Invalid payment deep link - missing required parameters:',
              {
                hasBookingId: !!bookingId,
                hasResult: !!result,
                url,
              }
            );
          }
        } catch (error) {
          console.error('❌ Error handling payment deep link:', {
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined,
            url,
          });
        }
      } else {
        console.log('🔗 Non-payment deep link received:', url);
      }
    };

    console.log('🚀 Setting up deep link handlers...');

    // Handle initial URL if app was opened via deep link
    Linking.getInitialURL().then(url => {
      if (url) {
        console.log('📱 App opened with initial deep link:', url);
        handleDeepLink(url);
      } else {
        console.log('📱 App opened without deep link');
      }
    });

    // Listen for incoming links when app is already running
    const subscription = Linking.addEventListener('url', ({ url }) => {
      console.log('📲 Deep link received while app running:', url);
      handleDeepLink(url);
    });

    return () => {
      console.log('🧹 Cleaning up deep link listeners');
      subscription?.remove();
    };
  }, []);

  // Show loading screen while checking authentication or rehydrating
  if (!isRehydrated || !authChecked || isLoading) {
    return null; // Keep splash screen visible
  }

  // Determine if user has valid profile after authentication
  const hasValidProfile =
    isAuthenticated && user?.profile && user.profile.is_active;

  return (
    <>
      <StatusBar style='dark' />
      <Stack
        screenOptions={{
          headerShown: false,
          gestureEnabled: false,
          animationTypeForReplace: 'push',
        }}
        initialRouteName={hasValidProfile ? '(app)' : '(auth)'}
      >
        <Stack.Screen name='(auth)' />
        <Stack.Screen name='(app)' />
      </Stack>
    </>
  );
}
