import { Stack } from 'expo-router';
import Colors from '@/constants/colors';
import { RoleGuard } from '@/components';

export default function CaptainLayout() {
  return (
    <RoleGuard allowedRoles={['captain']}>
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
          name='trip-details/[tripId]'
          options={{
            title: 'Trip Details',
            presentation: 'card',
          }}
        />
      </Stack>
    </RoleGuard>
  );
}
