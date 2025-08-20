import React, { useEffect, useState } from 'react';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useAuthStore } from '../store/authStore';

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
