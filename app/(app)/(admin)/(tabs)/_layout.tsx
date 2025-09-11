import React from 'react';
import { Tabs } from 'expo-router';
import {
  StyleSheet,
  TouchableOpacity,
  View,
  Alert,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/constants/adminColors';
import { useAuthStore } from '@/store/authStore';
import { useAdminPermissions } from '@/hooks/useAdminPermissions';
import { usePermissionStore } from '@/store/admin/permissionStore';
import { router } from 'expo-router';
import NoPermissionsWelcome from '@/components/admin/NoPermissionsWelcome';
import { useDashboardData } from '@/hooks/useDashboardData';
import AuthLoadingScreen from '@/components/AuthLoadingScreen';
import {
  Home,
  CreditCard,
  Settings,
  Ship,
  Users,
  User,
  LogOut,
  DollarSign,
  MessageSquare,
} from 'lucide-react-native';

const { width: screenWidth } = Dimensions.get('window');

export default function TabLayout() {
  const isTablet = screenWidth >= 768;
  const isSmallScreen = screenWidth < 480;
  const insets = useSafeAreaInsets();
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
    <View style={styles.headerRightContainer}>
      <TouchableOpacity
        style={styles.headerButton}
        onPress={handleProfilePress}
        accessibilityRole='button'
        accessibilityLabel='Profile'
      >
        <User size={20} color={colors.text} />
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.headerButton}
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
    return <AuthLoadingScreen />;
  }

  // Only show no permissions screen if:
  // 1. User is authenticated and has profile ID
  // 2. All data is fully loaded (permissions, admin users, and user-specific data)
  // 3. User actually has no permissions
  if (user?.profile?.id && !hasAnyPermissions()) {
    return (
      <View style={styles.noPermissionsContainer}>
        <NoPermissionsWelcome
          adminName={adminName}
          adminRole={adminRole}
          isSuperAdmin={isSuperAdmin}
        />
      </View>
    );
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: [
          styles.tabBar,
          {
            paddingBottom: Math.max(insets.bottom, 6),
            paddingTop: 6,
          },
        ],
        tabBarLabelStyle: styles.tabBarLabel,
        headerStyle: styles.header,
        headerTitleStyle: styles.headerTitle,
        headerShadowVisible: false,
        headerRight: renderHeaderRight,
        tabBarHideOnKeyboard: true,
        tabBarItemStyle: styles.tabBarItem,
      }}
    >
      {/* Dashboard Tab */}
      <Tabs.Screen
        name='index'
        options={{
          title: 'Dashboard',
          href: canViewDashboard() ? undefined : null,
          tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
        }}
      />

      {/* Bookings Tab */}
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

      {/* Operations Tab */}
      <Tabs.Screen
        name='operations'
        options={{
          title: isSmallScreen ? 'Ops' : 'Operations',
          href: canAccessOperationsTab() ? undefined : null,
          tabBarIcon: ({ color, size }) => <Ship size={size} color={color} />,
        }}
      />

      {/* Users Tab */}
      <Tabs.Screen
        name='users'
        options={{
          title: 'Users',
          href: canAccessUsersTab() ? undefined : null,
          tabBarIcon: ({ color, size }) => <Users size={size} color={color} />,
        }}
      />

      {/* Finance Tab */}
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

      {/* Communications Tab */}
      <Tabs.Screen
        name='communications'
        options={{
          title: isSmallScreen ? 'Comms' : 'Communications',
          href: canAccessCommunicationsTab() ? undefined : null,
          tabBarIcon: ({ color, size }) => (
            <MessageSquare size={size} color={color} />
          ),
        }}
      />

      {/* Settings Tab */}
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

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.card,
    borderTopColor: colors.border,
    borderTopWidth: 1,
  },
  tabBarItem: {
    paddingVertical: 4,
  },
  tabBarLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  header: {
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: `${colors.border}30`,
    elevation: 0,
    shadowOpacity: 0,
  },
  headerTitle: {
    fontWeight: '700',
    color: colors.text,
    fontSize: 18,
  },
  headerRightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginRight: 12,
  },
  headerButton: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: colors.card,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    borderWidth: 1,
    borderColor: `${colors.border}60`,
  },
  noPermissionsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.backgroundSecondary,
  },
});
