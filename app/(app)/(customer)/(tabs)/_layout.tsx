import React from 'react';
import { Tabs, router } from 'expo-router';
import {
  Home,
  Ticket,
  ClipboardList,
  User,
  HelpCircle,
  LogIn,
} from 'lucide-react-native';
import { View, Pressable, Text, StyleSheet } from 'react-native';
import Colors from '@/constants/colors';
import { useAuthStore } from '@/store/authStore';

export default function TabLayout() {
  const { isGuestMode } = useAuthStore();

  const renderHeaderRight = () => {
    if (!isGuestMode) {
      return null;
    }

    return (
      <Pressable
        style={styles.loginButton}
        onPress={() => router.push('/(auth)')}
        android_ripple={{ color: Colors.highlight }}
      >
        {({ pressed }) => (
          <View
            style={[styles.loginButtonContent, pressed && { opacity: 0.7 }]}
          >
            <LogIn size={18} color={Colors.primary} />
            <Text style={styles.loginButtonText}>Login</Text>
          </View>
        )}
      </Pressable>
    );
  };

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
        headerRight: renderHeaderRight,
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

const styles = StyleSheet.create({
  loginButton: {
    marginRight: 16,
    borderRadius: 8,
    overflow: 'hidden',
  },
  loginButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: Colors.highlight,
    borderRadius: 8,
  },
  loginButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
});
