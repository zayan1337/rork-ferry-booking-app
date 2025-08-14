import { useEffect, useState } from 'react';
import { Stack, useRouter } from 'expo-router';
import { useAuthStore } from '@/store/authStore';
import Colors from '@/constants/colors';
import AuthLoadingScreen from '@/components/AuthLoadingScreen';

export default function AppLayout() {
  const { isAuthenticated, isLoading, user, isRehydrated, preventRedirect } =
    useAuthStore();
  const router = useRouter();

  useEffect(() => {
    // If user is not authenticated and we're not loading, redirect to auth
    // But only if preventRedirect is false
    if (!isAuthenticated && !isLoading && isRehydrated && !preventRedirect) {
      // Use setTimeout to ensure the navigation stack is ready
      setTimeout(() => {
        try {
          router.replace('/(auth)' as any);
        } catch (error) {
          console.log('Navigation error during logout:', error);
          // Fallback: try to navigate to auth screen
          router.push('/(auth)' as any);
        }
      }, 100);
    }
  }, [isAuthenticated, isLoading, router, isRehydrated, preventRedirect]);

  // Show loading while waiting for auth data to load
  if (!isRehydrated || !isAuthenticated || isLoading) {
    return (
      <AuthLoadingScreen
        message={
          !isRehydrated
            ? 'Loading app data...'
            : !isAuthenticated
              ? 'Redirecting to login...'
              : isLoading
                ? 'Loading your account...'
                : 'Setting up your profile...'
        }
      />
    );
  }

  // Determine initial route based on user role
  const getInitialRouteName = () => {
    if (!user?.profile) {
      return '(customer)';
    }

    switch (user.profile.role) {
      case 'admin':
      case 'captain':
        return '(admin)';
      case 'agent':
        return '(agent)';
      case 'customer':
      default:
        return '(customer)';
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
      <Stack.Screen name='(customer)' options={{ headerShown: false }} />
      <Stack.Screen name='(agent)' options={{ headerShown: false }} />
      <Stack.Screen name='(admin)' options={{ headerShown: false }} />
    </Stack>
  );
}
