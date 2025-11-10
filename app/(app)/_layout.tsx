import { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import { useAuthStore } from '@/store/authStore';
import Colors from '@/constants/colors';
import AuthLoadingScreen from '@/components/AuthLoadingScreen';

export default function AppLayout() {
  const { isAuthenticated, user, isRehydrated, preventRedirect } =
    useAuthStore();
  const router = useRouter();

  useEffect(() => {
    // If user is not authenticated and we're not loading, redirect to auth
    // But only if preventRedirect is false
    if (!isAuthenticated && isRehydrated && !preventRedirect) {
      // Use setTimeout to ensure the navigation stack is ready
      setTimeout(() => {
        try {
          router.replace('/(auth)' as any);
        } catch (error) {
          // Fallback: try to navigate to auth screen
          router.push('/(auth)' as any);
        }
      }, 100);
    }
  }, [isAuthenticated, router, isRehydrated, preventRedirect]);

  // Show loading while waiting for auth state or profile data
  if (!isRehydrated) {
    return <AuthLoadingScreen message='Loading app data...' />;
  }

  if (!isAuthenticated) {
    return <AuthLoadingScreen message='Redirecting to login...' />;
  }

  if (!user?.profile?.role) {
    return <AuthLoadingScreen message='Loading your profile...' />;
  }

  // Determine initial route based on user role
  const getInitialRouteName = () => {
    if (!user?.profile) {
      return '(customer)';
    }

    switch (user.profile.role) {
      case 'admin':
        return '(admin)';
      case 'captain':
        return '(captain)';
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
      <Stack.Screen name='(captain)' options={{ headerShown: false }} />
      <Stack.Screen
        name='terms-and-conditions'
        options={{
          title: 'Terms & Conditions',
          headerShown: true,
        }}
      />
    </Stack>
  );
}
