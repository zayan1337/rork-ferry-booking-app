import React from 'react';
import { Tabs, useRouter } from 'expo-router';
import { Pressable } from 'react-native';
import {
  Home,
  Users,
  CreditCard,
  BarChart,
  Settings,
  Plus,
} from 'lucide-react-native';
import Colors from '@/constants/colors';

export default function AgentTabLayout() {
  const router = useRouter();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.inactive,
        tabBarStyle: {
          backgroundColor: Colors.card,
          borderTopColor: Colors.border,
        },
        headerStyle: {
          backgroundColor: Colors.background,
        },
        headerTintColor: Colors.text,
        headerTitleStyle: {
          fontWeight: '600',
        },
        tabBarHideOnKeyboard: true,
      }}
    >
      <Tabs.Screen
        name='index'
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
          headerRight: () => (
            <Pressable
              style={{
                marginRight: 16,
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: Colors.primary,
                justifyContent: 'center',
                alignItems: 'center',
              }}
              onPress={() => router.push('../agent-booking/new' as any)}
            >
              <Plus size={20} color='white' />
            </Pressable>
          ),
        }}
      />
      <Tabs.Screen
        name='bookings'
        options={{
          title: 'Bookings',
          tabBarIcon: ({ color, size }) => (
            <BarChart size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name='clients'
        options={{
          title: 'Clients',
          tabBarIcon: ({ color, size }) => <Users size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name='credit'
        options={{
          title: 'Credit',
          tabBarIcon: ({ color, size }) => (
            <CreditCard size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name='profile'
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <Settings size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
