import React from 'react';
import { Tabs } from 'expo-router';
import {
  Home,
  Ticket,
  ClipboardList,
  User,
  HelpCircle,
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useAuthStore } from '@/store/authStore';

export default function TabLayout() {
  const { isGuestMode } = useAuthStore();

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
          backgroundColor: Colors.card,
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
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name='book'
        options={{
          title: 'Book',
          tabBarIcon: ({ color, size }) => <Ticket size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name='bookings'
        options={{
          title: 'My Bookings',
          tabBarIcon: ({ color, size }) => (
            <ClipboardList size={size} color={color} />
          ),
          href: isGuestMode ? null : undefined,
          tabBarItemStyle: isGuestMode ? { display: 'none' } : undefined,
        }}
      />
      <Tabs.Screen
        name='profile'
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <User size={size} color={color} />,
          href: undefined,
        }}
      />
      <Tabs.Screen
        name='support'
        options={{
          title: 'Support',
          tabBarIcon: ({ color, size }) => (
            <HelpCircle size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
