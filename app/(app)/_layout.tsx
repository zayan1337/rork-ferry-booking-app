import { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import { useAuthStore } from '@/store/authStore';
import Colors from '@/constants/colors';

export default function AppLayout() {
  const { isAuthenticated, isLoading, user } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    // If user is not authenticated and we're not loading, redirect to auth
    if (!isAuthenticated && !isLoading) {
      router.replace('/(auth)');
      return;
    }
  }, [isAuthenticated, isLoading, router]);

  // If user is not authenticated, show nothing while redirecting
  if (!isAuthenticated) {
    return null;
  }

  // Determine initial route based on user role
  const getInitialRouteName = () => {
    if (!user?.profile) {
      return "(customer)"; // Default to customer if profile not loaded
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