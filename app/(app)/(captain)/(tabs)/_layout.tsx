import React from 'react';
import { Tabs } from 'expo-router';
import { View, Pressable, Alert } from 'react-native';
import { UserCheck, LogOut, Home, Ship, Settings } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useAuthStore } from '@/store/authStore';

export default function CaptainTabLayout() {
  const { signOut } = useAuthStore();

  // Header button handlers
  // const handleProfilePress = () => {
  //   router.push('../modal');
  // };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          try {
            await signOut();
          } catch (error) {
            console.error('Logout error:', error);
          }
        },
      },
    ]);
  };

  const renderHeaderRight = () => (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginRight: 12,
      }}
    >
      {/* <Pressable
        style={{
          padding: 8,
          borderRadius: 8,
          backgroundColor: Colors.card,
        }}
        onPress={handleProfilePress}
        accessibilityRole='button'
        accessibilityLabel='Profile'
      >
        <User size={20} color={Colors.text} />
      </Pressable> */}
      <Pressable
        style={{
          padding: 8,
          borderRadius: 8,
          backgroundColor: Colors.card,
        }}
        onPress={handleLogout}
        accessibilityRole='button'
        accessibilityLabel='Logout'
      >
        <LogOut size={20} color={Colors.error} />
      </Pressable>
    </View>
  );

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
          title: 'Dashboard',
          tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name='trips'
        options={{
          title: 'My Trips',
          tabBarIcon: ({ color, size }) => <Ship size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name='checkin'
        options={{
          title: 'Check-in',
          tabBarIcon: ({ color, size }) => (
            <UserCheck size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name='profile'
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size }) => (
            <Settings size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
