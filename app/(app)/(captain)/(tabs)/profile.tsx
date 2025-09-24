import React, { useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Alert,
  ScrollView,
  RefreshControl,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import {
  User,
  Mail,
  LogOut,
  Settings,
  Bell,
  HelpCircle,
  Shield,
  Ship,
  CheckCircle,
  Clock,
  Anchor,
  Phone,
  Award,
  TrendingUp,
} from 'lucide-react-native';
import { Stack, useFocusEffect } from 'expo-router';

import { useAuthStore } from '@/store/authStore';
import { useCaptainStore } from '@/store/captainStore';
import { router } from 'expo-router';
import Colors from '@/constants/colors';
import Card from '@/components/Card';
import Button from '@/components/Button';
import StatCard from '@/components/StatCard';

const { width: screenWidth } = Dimensions.get('window');
const isTablet = screenWidth > 768;

export default function CaptainProfileScreen() {
  const { user, signOut } = useAuthStore();
  const {
    profile,
    dashboardStats,
    loading,
    error,
    fetchProfile,
    fetchTodayTrips,
    fetchDashboardStats,
  } = useCaptainStore();

  const handleRefresh = useCallback(async () => {
    await Promise.all([
      fetchProfile(),
      fetchTodayTrips(),
      fetchDashboardStats(),
    ]);
  }, [fetchProfile, fetchTodayTrips, fetchDashboardStats]);

  useFocusEffect(
    useCallback(() => {
      handleRefresh();
    }, [handleRefresh])
  );

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: () => signOut(),
      },
    ]);
  };

  const handleNavigation = (screen: string) => {
    router.push(screen as any);
  };

  if (loading.profile) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl
          refreshing={loading.profile}
          onRefresh={handleRefresh}
          colors={[Colors.primary]}
          tintColor={Colors.primary}
        />
      }
    >
      <Stack.Screen options={{ title: 'Settings' }} />

      {/* Profile Header */}
      <Card style={styles.profileCard}>
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <User size={32} color={Colors.primary} />
            </View>
            <View style={styles.statusBadge}>
              <CheckCircle size={12} color={Colors.success} />
            </View>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>
              {profile?.full_name || user?.email || 'Captain'}
            </Text>
            <Text style={styles.profileRole}>Ferry Captain</Text>
            <View style={styles.profileMeta}>
              <Mail size={14} color={Colors.textSecondary} />
              <Text style={styles.profileEmail}>
                {profile?.email || user?.email}
              </Text>
            </View>
            {profile?.mobile_number && (
              <View style={styles.profileMeta}>
                <Phone size={14} color={Colors.textSecondary} />
                <Text style={styles.profilePhone}>{profile.mobile_number}</Text>
              </View>
            )}
          </View>
        </View>
      </Card>

      {/* Today's Performance */}
      <Card style={styles.performanceCard}>
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderIcon}>
            <TrendingUp size={20} color={Colors.primary} />
          </View>
          <Text style={styles.cardTitle}>Today's Performance</Text>
        </View>
        {loading.stats ? (
          <View style={styles.loadingStats}>
            <ActivityIndicator size='small' color={Colors.primary} />
            <Text style={styles.loadingStatsText}>
              Loading performance data...
            </Text>
          </View>
        ) : (
          <View style={styles.statsGrid}>
            <View style={styles.statCardWrapper}>
              <StatCard
                title='Trips'
                value={dashboardStats?.todayTrips?.toString() || '0'}
                icon={<Ship size={16} color={Colors.primary} />}
                color={Colors.primary}
              />
            </View>
            <View style={styles.statCardWrapper}>
              <StatCard
                title='Passengers'
                value={dashboardStats?.totalPassengers?.toString() || '0'}
                icon={<User size={16} color={Colors.success} />}
                color={Colors.success}
              />
            </View>
            <View style={styles.statCardWrapper}>
              <StatCard
                title='On Time'
                value={`${dashboardStats?.onTimePercentage || 100}%`}
                icon={<Clock size={16} color={Colors.warning} />}
                color={Colors.warning}
              />
            </View>
            <View style={styles.statCardWrapper}>
              <StatCard
                title='Checked In'
                value={dashboardStats?.checkedInPassengers?.toString() || '0'}
                icon={<Award size={16} color={Colors.success} />}
                color={Colors.success}
              />
            </View>
          </View>
        )}
      </Card>

      {/* Quick Actions */}
      <Card style={styles.actionsCard}>
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderIcon}>
            <Settings size={20} color={Colors.primary} />
          </View>
          <Text style={styles.cardTitle}>Quick Actions</Text>
        </View>
        <View style={styles.actionsList}>
          <TouchableOpacity
            style={styles.actionItem}
            onPress={() => handleNavigation('/(captain)/(tabs)/')}
          >
            <View style={styles.actionIcon}>
              <Anchor size={20} color={Colors.primary} />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Dashboard</Text>
              <Text style={styles.actionSubtitle}>View today's overview</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionItem}
            onPress={() => handleNavigation('/(captain)/(tabs)/trips')}
          >
            <View style={styles.actionIcon}>
              <Ship size={20} color={Colors.primary} />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>My Trips</Text>
              <Text style={styles.actionSubtitle}>Manage assigned trips</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionItem}
            onPress={() => handleNavigation('/(captain)/(tabs)/checkin')}
          >
            <View style={styles.actionIcon}>
              <CheckCircle size={20} color={Colors.success} />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Check-in</Text>
              <Text style={styles.actionSubtitle}>Scan passenger tickets</Text>
            </View>
          </TouchableOpacity>
        </View>
      </Card>

      {/* Settings */}
      <Card style={styles.settingsCard}>
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderIcon}>
            <Settings size={20} color={Colors.primary} />
          </View>
          <Text style={styles.cardTitle}>Settings & Support</Text>
        </View>
        <View style={styles.settingsList}>
          <TouchableOpacity style={styles.settingItem}>
            <Bell size={20} color={Colors.textSecondary} />
            <Text style={styles.settingText}>Notifications</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingItem}>
            <Shield size={20} color={Colors.textSecondary} />
            <Text style={styles.settingText}>Privacy & Security</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingItem}>
            <HelpCircle size={20} color={Colors.textSecondary} />
            <Text style={styles.settingText}>Help & Support</Text>
          </TouchableOpacity>
        </View>
      </Card>

      {/* Sign Out */}
      <View style={styles.signOutContainer}>
        <Button
          title='Sign Out'
          variant='outline'
          onPress={handleSignOut}
          icon={<LogOut size={18} color={Colors.error} />}
          style={styles.signOutButton}
          textStyle={{ color: Colors.error }}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  loadingText: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  profileCard: {
    marginBottom: 16,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 16,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: `${Colors.primary}20`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.card,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 4,
  },
  profileRole: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '600',
    marginBottom: 8,
  },
  profileMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginLeft: 8,
  },
  profilePhone: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginLeft: 8,
  },
  performanceCard: {
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardHeaderIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: `${Colors.primary}20`,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: isTablet ? 16 : 8,
  },
  statCardWrapper: {
    width: isTablet ? '22%' : '48%',
    marginBottom: 12,
  },
  loadingStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
  },
  loadingStatsText: {
    marginLeft: 12,
    fontSize: 14,
    color: Colors.textSecondary,
  },
  actionsCard: {
    marginBottom: 16,
  },
  actionsList: {
    gap: 0,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${Colors.primary}10`,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 2,
  },
  actionSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  settingsCard: {
    marginBottom: 16,
  },
  settingsList: {
    gap: 0,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  settingText: {
    fontSize: 16,
    color: Colors.text,
    marginLeft: 16,
  },
  signOutContainer: {
    marginTop: 16,
  },
  signOutButton: {
    borderColor: Colors.error,
  },
});
