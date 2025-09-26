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
          headerShown: false,
        }}
      />
      <Stack.Screen
        name='terms-and-conditions'
        options={{
          title: 'Terms & Conditions',
          headerShown: true,
        }}
      />
      <Stack.Screen
        name='forgotPassword'
        options={{
          title: 'Reset Password',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name='otp-verification'
        options={{
          title: 'Verify Code',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name='new-password'
        options={{
          title: 'New Password',
          headerShown: false,
        }}
      />
    </Stack>
  );
}
