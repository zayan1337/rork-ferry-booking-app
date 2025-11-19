import React from 'react';
import { Stack } from 'expo-router';
import { colors } from '@/constants/adminColors';
import { RoleGuard } from '@/components';
// import RoleGuard from '@/components/RoleGuard';

export default React.memo(function AdminLayout() {
  return (
    <RoleGuard allowedRoles={['admin']}>
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: colors.background,
          },
          headerTintColor: colors.text,
          headerTitleStyle: {
            fontWeight: '600',
            fontSize: 18,
          },
          headerShadowVisible: false,
        }}
      >
        <Stack.Screen name='(tabs)' options={{ headerShown: false }} />
        <Stack.Screen
          name='booking/[id]'
          options={{
            title: 'Booking Details',
            presentation: 'card',
          }}
        />
        <Stack.Screen
          name='booking/new'
          options={{
            title: 'New Booking',
            presentation: 'card',
          }}
        />
        <Stack.Screen
          name='vessel/[id]'
          options={{
            title: 'Vessel Details',
            presentation: 'card',
          }}
        />
        <Stack.Screen
          name='vessel/new'
          options={{
            title: 'New Vessel',
            presentation: 'card',
          }}
        />
        <Stack.Screen
          name='user/[id]'
          options={{
            title: 'User Details',
            presentation: 'card',
          }}
        />
        <Stack.Screen
          name='user/new'
          options={{
            title: 'New User',
            presentation: 'card',
          }}
        />
        <Stack.Screen
          name='trip/[id]'
          options={{
            title: 'Trip Details',
            presentation: 'card',
          }}
        />
        <Stack.Screen
          name='trip/new'
          options={{
            title: 'New Trip',
            presentation: 'card',
          }}
        />
        <Stack.Screen
          name='reports/[type]'
          options={{
            title: 'Report Details',
            presentation: 'card',
          }}
        />
        <Stack.Screen
          name='wallet-detail'
          options={{
            title: 'Wallet Details',
            presentation: 'card',
          }}
        />
        <Stack.Screen
          name='payment-detail'
          options={{
            title: 'Payment Details',
            presentation: 'card',
          }}
        />
        <Stack.Screen
          name='support'
          options={{
            title: 'Contact Support',
            presentation: 'card',
          }}
        />
      </Stack>
    </RoleGuard>
  );
});
