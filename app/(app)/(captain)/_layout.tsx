import { Stack } from 'expo-router';
import Colors from '@/constants/colors';

export default function CaptainLayout() {
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
    >
      <Stack.Screen name='(tabs)' options={{ headerShown: false }} />
    </Stack>
  );
}
