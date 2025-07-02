import { useEffect, useState } from 'react';
import { Stack, useRouter } from 'expo-router';
import { useAuthStore } from '@/store/authStore';
import Colors from '@/constants/colors';
import AuthLoadingScreen from '@/components/AuthLoadingScreen';

export default function AppLayout() {
  const { isAuthenticated, isLoading, user, isRehydrated } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    // If user is not authenticated and we're not loading, redirect to auth
    if (!isAuthenticated && !isLoading && isRehydrated) {
      router.replace('/(auth)' as any);
    }
  }, [isAuthenticated, isLoading, router, isRehydrated]);

  // Show loading while waiting for auth data to load
  if (!isRehydrated || !isAuthenticated || isLoading || !user?.profile) {
    return (
      <AuthLoadingScreen
        message={
          !isRehydrated ? "Loading app data..." :
            !isAuthenticated ? "Redirecting to login..." :
              isLoading ? "Loading your account..." :
                "Setting up your profile..."
        }
      />
    );
  }

  // Determine initial route based on user role
  const getInitialRouteName = () => {
    if (!user?.profile) {
      return "(customer)";
    }

    switch (user.profile.role) {
      case 'agent':
      case 'admin':
      case 'captain':
        return "(agent)";
      case 'customer':
      default:
        return "(customer)";
    }
  };

  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: Colors.card,
        },
        headerTintColor: Colors.text,
        headerTitleStyle: {
          fontWeight: '600',
        },
      }}
      initialRouteName={getInitialRouteName()}
    >
      <Stack.Screen name="(customer)" options={{ headerShown: false }} />
      <Stack.Screen name="(agent)" options={{ headerShown: false }} />
    </Stack>
  );
}