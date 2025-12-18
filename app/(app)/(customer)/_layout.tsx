import React from 'react';
import { Stack } from 'expo-router';
import Colors from '@/constants/colors';
import { RoleGuard } from '@/components';

export default function CustomerLayout() {
  return (
    <RoleGuard allowedRoles={['customer']}>
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: Colors.card,
          },
          headerTintColor: Colors.text,
          headerTitleStyle: {
            fontWeight: '600',
          },
          headerBackTitle: '',
        }}
      >
        <Stack.Screen name='(tabs)' options={{ headerShown: false }} />
        <Stack.Screen
          name='booking-details/[id]'
          options={{
            title: 'Booking Details',
            presentation: 'card',
          }}
        />
        <Stack.Screen
          name='modify-booking/[id]'
          options={{
            title: 'Modify Booking',
            presentation: 'card',
          }}
        />
        <Stack.Screen
          name='cancel-booking/[id]'
          options={{
            title: 'Cancel Booking',
            presentation: 'card',
          }}
        />
        <Stack.Screen
          name='validate-ticket'
          options={{
            title: 'Validate Ticket',
            presentation: 'modal',
          }}
        />
        <Stack.Screen
          name='payment-success'
          options={{
            title: 'Payment Status',
            presentation: 'modal',
            headerBackVisible: false,
          }}
        />
      </Stack>
    </RoleGuard>
  );
}
