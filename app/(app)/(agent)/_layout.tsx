import React from 'react';
import { Stack } from 'expo-router';
import Colors from '@/constants/colors';
import { RoleGuard } from '@/components';

export default function AgentLayout() {
  return (
    <RoleGuard allowedRoles={['agent']}>
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: Colors.background,
          },
          headerTintColor: Colors.text,
          headerTitleStyle: {
            fontWeight: '600',
          },
        }}
      >
        <Stack.Screen name='(tabs)' options={{ headerShown: false }} />
        <Stack.Screen
          name='agent-booking/[id]'
          options={{
            title: 'Booking Details',
            presentation: 'card',
          }}
        />
        <Stack.Screen
          name='agent-booking/new'
          options={{
            title: 'New Booking',
            presentation: 'card',
          }}
        />
        <Stack.Screen
          name='agent-cancel-booking/[id]'
          options={{
            title: 'Cancel Booking',
            presentation: 'card',
          }}
        />
        <Stack.Screen
          name='agent-modify-booking/[id]'
          options={{
            title: 'Modify Booking',
            presentation: 'card',
          }}
        />
        <Stack.Screen
          name='client/[id]'
          options={{
            title: 'Client Details',
            presentation: 'card',
          }}
        />
        <Stack.Screen
          name='client/add'
          options={{
            title: 'Add Client',
            presentation: 'card',
          }}
        />
        <Stack.Screen
          name='payment-success'
          options={{
            title: 'Payment Status',
            presentation: 'card',
            headerBackVisible: false,
          }}
        />
      </Stack>
    </RoleGuard>
  );
}
