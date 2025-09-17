import React from 'react';
import { Tabs } from 'expo-router';
import { View, TouchableOpacity, Alert } from 'react-native';
import { colors } from '@/constants/adminColors';
import { useAdminPermissions } from '@/hooks/useAdminPermissions';
import { usePermissionStore } from '@/store/admin/permissionStore';
import { useAuthStore } from '@/store/authStore';
import NoPermissionsWelcome from '@/components/admin/NoPermissionsWelcome';
import { useDashboardData } from '@/hooks/useDashboardData';
import AuthLoadingScreen from '@/components/AuthLoadingScreen';
import SafeView from '@/components/SafeView';
import { router } from 'expo-router';
import {
  Home,
  CreditCard,
  Settings,
  Ship,
  Users,
  DollarSign,
  MessageSquare,
  User,
  LogOut,
} from 'lucide-react-native';

export default function AdminTabLayout() {
  const { user, signOut } = useAuthStore();
  const {
    canViewDashboard,
    canViewBookings,
    canAccessOperationsTab,
    canAccessUsersTab,
    canAccessFinanceTab,
    canAccessCommunicationsTab,
    canAccessSettingsTab,
    hasAnyPermissions,
    isSuperAdmin,
  } = useAdminPermissions();

  // Check if permission data is still loading
  const { loading, data: permissions, adminUsers } = usePermissionStore();
  const { adminName, adminRole } = useDashboardData();

  // More robust loading check - ensure we have both permission data and admin user data
  const isDataLoading =
    loading.fetchAll || permissions.length === 0 || adminUsers.length === 0;

  // Additional check to ensure user data is properly loaded
  const currentAdminUser = user?.profile?.id
    ? adminUsers.find(u => u.id === user.profile?.id)
    : null;
  const isUserDataLoaded = user?.profile?.id
    ? currentAdminUser !== undefined
    : true;

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
          backgroundColor: colors.card,
        }}
        onPress={handleProfilePress}
        accessibilityRole='button'
        accessibilityLabel='Profile'
      >
        <User size={20} color={colors.text} />
      </TouchableOpacity>
      <TouchableOpacity
        style={{
          padding: 8,
          borderRadius: 8,
          backgroundColor: colors.card,
        }}
        onPress={handleLogout}
        accessibilityRole='button'
        accessibilityLabel='Logout'
      >
        <LogOut size={20} color={colors.danger} />
      </TouchableOpacity>
    </View>
  );

  // Show loading screen while data is being fetched
  // Allow super admins to bypass loading if basic user data is available
  const shouldShowLoading =
    (isDataLoading || !isUserDataLoaded) && !isSuperAdmin;

  if (shouldShowLoading) {
    return (
      <SafeView>
        <AuthLoadingScreen />
      </SafeView>
    );
  }

  // Only show no permissions screen if:
  // 1. User is authenticated and has profile ID
  // 2. All data is fully loaded (permissions, admin users, and user-specific data)
  // 3. User actually has no permissions
  if (user?.profile?.id && !hasAnyPermissions()) {
    return (
      <SafeView backgroundColor={colors.backgroundSecondary}>
        <View
          style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}
        >
          <NoPermissionsWelcome
            adminName={adminName}
            adminRole={adminRole}
            isSuperAdmin={isSuperAdmin}
          />
        </View>
      </SafeView>
    );
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
        headerStyle: {
          backgroundColor: colors.background,
        },
        headerTintColor: colors.text,
        headerTitleStyle: {
          fontWeight: '600',
        },
        headerRight: renderHeaderRight,
      }}
    >
      <Tabs.Screen
        name='index'
        options={{
          title: 'Dashboard',
          href: canViewDashboard() ? undefined : null,
          tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name='bookings'
        options={{
          title: 'Bookings',
          href: canViewBookings() ? undefined : null,
          tabBarIcon: ({ color, size }) => (
            <CreditCard size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name='operations'
        options={{
          title: 'Operations',
          href: canAccessOperationsTab() ? undefined : null,
          tabBarIcon: ({ color, size }) => <Ship size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name='users'
        options={{
          title: 'Users',
          href: canAccessUsersTab() ? undefined : null,
          tabBarIcon: ({ color, size }) => <Users size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name='finance'
        options={{
          title: 'Finance',
          href: canAccessFinanceTab() ? undefined : null,
          tabBarIcon: ({ color, size }) => (
            <DollarSign size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name='communications'
        options={{
          title: 'Communications',
          href: canAccessCommunicationsTab() ? undefined : null,
          tabBarIcon: ({ color, size }) => (
            <MessageSquare size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name='settings'
        options={{
          title: 'Settings',
          href: canAccessSettingsTab() ? undefined : null,
          tabBarIcon: ({ color, size }) => (
            <Settings size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
