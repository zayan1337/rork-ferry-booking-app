import React from 'react';
import { Tabs } from 'expo-router';
import { View, TouchableOpacity, Alert } from 'react-native';
import { User, UserCheck, LogOut } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useAuthStore } from '@/store/authStore';
import { router } from 'expo-router';

export default function CaptainTabLayout() {
  const { signOut } = useAuthStore();

  // Header button handlers
  const handleProfilePress = () => {
    router.push('../modal');
  };

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
      <TouchableOpacity
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
      </TouchableOpacity>
      <TouchableOpacity
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
      </TouchableOpacity>
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
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
        headerStyle: {
          backgroundColor: Colors.card,
        },
        headerTintColor: Colors.text,
        headerTitleStyle: {
          fontWeight: '600',
        },
        headerRight: renderHeaderRight,
      }}
    >
      <Tabs.Screen
        name='profile'
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <User size={size} color={color} />,
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
    </Tabs>
  );
}
