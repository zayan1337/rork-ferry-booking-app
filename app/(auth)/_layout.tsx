import { Stack } from 'expo-router';
import Colors from '@/constants/colors';

export default function AuthLayout() {
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
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen
        name='index'
        options={{
          title: 'Login',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name='register'
        options={{
          title: 'Create Account',
        }}
      />
    </Stack>
  );
}
