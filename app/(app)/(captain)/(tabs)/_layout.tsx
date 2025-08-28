import React from 'react';
import { Tabs } from 'expo-router';
import {
  StyleSheet,
  TouchableOpacity,
  View,
  Alert,
  Dimensions,
} from 'react-native';
import { useAuthStore } from '@/store/authStore';
import { router } from 'expo-router';
import { User, LogOut, UserCheck } from 'lucide-react-native';
import Colors from '@/constants/colors';

const { width: screenWidth } = Dimensions.get('window');

export default function CaptainTabLayout() {
  const isTablet = screenWidth >= 768;
  const isSmallScreen = screenWidth < 480;

  const iconSize = isSmallScreen ? 18 : isTablet ? 22 : 20;
  const { user, signOut } = useAuthStore();

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
        <User size={20} color={Colors.text} />
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.headerButton}
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
        tabBarInactiveTintColor: Colors.textSecondary,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabBarLabel,
        headerStyle: styles.header,
        headerTitleStyle: styles.headerTitle,
        headerShadowVisible: false,
        headerRight: renderHeaderRight,
        tabBarHideOnKeyboard: true,
      }}
    >
      {/* Profile Tab */}
      <Tabs.Screen
        name='profile'
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <View
              style={[
                styles.iconContainer,
                focused && styles.iconContainerFocused,
              ]}
            >
              <User size={iconSize} color={color} />
            </View>
          ),
        }}
      />

      {/* Check-in Tab */}
      <Tabs.Screen
        name='checkin'
        options={{
          title: 'Check-in',
          tabBarIcon: ({ color, focused }) => (
            <View
              style={[
                styles.iconContainer,
                focused && styles.iconContainerFocused,
              ]}
            >
              <UserCheck size={iconSize} color={color} />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: Colors.card,
    borderTopColor: Colors.border,
    paddingTop: 8,
    paddingHorizontal: 4,
    shadowColor: '#000',
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
    backgroundColor: `${Colors.primary}15`,
  },
  header: {
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: `${Colors.border}30`,
    elevation: 0,
    shadowOpacity: 0,
  },
  headerTitle: {
    fontWeight: '700',
    color: Colors.text,
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
    backgroundColor: Colors.card,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    borderWidth: 1,
    borderColor: `${Colors.border}60`,
  },
});
