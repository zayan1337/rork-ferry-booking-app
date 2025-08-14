import React from 'react';
import { Tabs } from 'expo-router';
import {
  Platform,
  StyleSheet,
  TouchableOpacity,
  View,
  Alert,
  Dimensions,
} from 'react-native';
import { colors } from '@/constants/adminColors';
import { useAuthStore } from '@/store/authStore';
import { useAdminPermissions } from '@/hooks/useAdminPermissions';
import { usePermissionStore } from '@/store/admin/permissionStore';
import { router } from 'expo-router';
import NoPermissionsWelcome from '@/components/admin/NoPermissionsWelcome';
import { useDashboardData } from '@/hooks/useDashboardData';
import {
  Home,
  CreditCard,
  Settings,
  Ship,
  MapPin,
  Users,
  User,
  LogOut,
  DollarSign,
  MessageSquare,
  Activity,
} from 'lucide-react-native';

const { width: screenWidth } = Dimensions.get('window');

export default function TabLayout() {
  const isTablet = screenWidth >= 768;
  const isSmallScreen = screenWidth < 480;

  const iconSize = isSmallScreen ? 18 : isTablet ? 22 : 20;
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
  const { loading } = usePermissionStore();
  const { adminName, adminRole } = useDashboardData();

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

  // If admin has no permissions and data is loaded, show welcome message
  // Wait for authentication and permission data to load before showing welcome screen
  if (user?.profile?.id && !loading.fetchAll && !hasAnyPermissions()) {
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
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabBarLabel,
        headerStyle: styles.header,
        headerTitleStyle: styles.headerTitle,
        headerShadowVisible: false,
        headerRight: renderHeaderRight,
        tabBarHideOnKeyboard: true,
      }}
    >
      {/* Dashboard Tab */}
      <Tabs.Screen
        name='index'
        options={{
          title: 'Dashboard',
          href: canViewDashboard() ? undefined : null,
          tabBarIcon: ({ color, focused }) => (
            <View
              style={[
                styles.iconContainer,
                focused && styles.iconContainerFocused,
              ]}
            >
              <Home size={iconSize} color={color} />
            </View>
          ),
        }}
      />

      {/* Bookings Tab */}
      <Tabs.Screen
        name='bookings'
        options={{
          title: 'Bookings',
          href: canViewBookings() ? undefined : null,
          tabBarIcon: ({ color, focused }) => (
            <View
              style={[
                styles.iconContainer,
                focused && styles.iconContainerFocused,
              ]}
            >
              <CreditCard size={iconSize} color={color} />
            </View>
          ),
        }}
      />

      {/* Operations Tab */}
      <Tabs.Screen
        name='operations'
        options={{
          title: isSmallScreen ? 'Ops' : 'Operations',
          href: canAccessOperationsTab() ? undefined : null,
          tabBarIcon: ({ color, focused }) => (
            <View
              style={[
                styles.iconContainer,
                focused && styles.iconContainerFocused,
              ]}
            >
              <Ship size={iconSize} color={color} />
            </View>
          ),
        }}
      />

      {/* Users Tab */}
      <Tabs.Screen
        name='users'
        options={{
          title: 'Users',
          href: canAccessUsersTab() ? undefined : null,
          tabBarIcon: ({ color, focused }) => (
            <View
              style={[
                styles.iconContainer,
                focused && styles.iconContainerFocused,
              ]}
            >
              <Users size={iconSize} color={color} />
            </View>
          ),
        }}
      />

      {/* Finance Tab */}
      <Tabs.Screen
        name='finance'
        options={{
          title: 'Finance',
          href: canAccessFinanceTab() ? undefined : null,
          tabBarIcon: ({ color, focused }) => (
            <View
              style={[
                styles.iconContainer,
                focused && styles.iconContainerFocused,
              ]}
            >
              <DollarSign size={iconSize} color={color} />
            </View>
          ),
        }}
      />

      {/* Communications Tab */}
      <Tabs.Screen
        name='communications'
        options={{
          title: isSmallScreen ? 'Comms' : 'Communications',
          href: canAccessCommunicationsTab() ? undefined : null,
          tabBarIcon: ({ color, focused }) => (
            <View
              style={[
                styles.iconContainer,
                focused && styles.iconContainerFocused,
              ]}
            >
              <MessageSquare size={iconSize} color={color} />
            </View>
          ),
        }}
      />

      {/* Settings Tab */}
      <Tabs.Screen
        name='settings'
        options={{
          title: 'Settings',
          href: canAccessSettingsTab() ? undefined : null,
          tabBarIcon: ({ color, focused }) => (
            <View
              style={[
                styles.iconContainer,
                focused && styles.iconContainerFocused,
              ]}
            >
              <Settings size={iconSize} color={color} />
            </View>
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
    paddingTop: 8,
    paddingHorizontal: 4,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 8,
  },
  tabBarLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  iconContainer: {
    padding: 6,
    borderRadius: 10,
    minWidth: 30,
    minHeight: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainerFocused: {
    backgroundColor: colors.primary + '15',
  },
  header: {
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border + '30',
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
    borderColor: colors.border + '60',
  },
  noPermissionsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.backgroundSecondary,
  },
});
