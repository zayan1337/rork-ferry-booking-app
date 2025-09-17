import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Alert,
  ScrollView,
  RefreshControl,
  Dimensions,
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
  Calendar,
  CheckCircle,
  Clock,
  Anchor,
} from 'lucide-react-native';

import { useAuthStore } from '@/store/authStore';
import { router } from 'expo-router';
import Colors from '@/constants/colors';
import Card from '@/components/Card';
import Button from '@/components/Button';
import StatCard from '@/components/StatCard';

const { width: screenWidth } = Dimensions.get('window');
const isTablet = screenWidth > 768;

export default function CaptainProfileScreen() {
  const { user, signOut } = useAuthStore();
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  const handleSignOut = async () => {
    try {
      await signOut();
      // Navigation will be handled by the app layout
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to log out?', [
      {
        text: 'Cancel',
        style: 'cancel',
      },
      {
        text: 'Logout',
        onPress: handleSignOut,
        style: 'destructive',
      },
    ]);
  };

  const onRefresh = React.useCallback(async () => {
    setIsRefreshing(true);
    // Add any refresh logic here
    setTimeout(() => {
      setIsRefreshing(false);
    }, 1000);
  }, []);

  // Get captain initials
  const getCaptainInitials = () => {
    if (user?.profile?.full_name) {
      const names = user.profile.full_name.split(' ');
      return names.length >= 2
        ? `${names[0][0]}${names[1][0]}`.toUpperCase()
        : names[0].slice(0, 2).toUpperCase();
    }
    return 'CA';
  };

  const renderProfileHeader = () => (
    <Card variant='elevated' style={styles.profileHeaderCard}>
      <View style={styles.profileHeader}>
        <View style={styles.avatarContainer}>
          <Text style={styles.avatarText}>{getCaptainInitials()}</Text>
          <View style={styles.statusIndicator} />
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.name}>
            {user?.profile?.full_name || 'Captain'}
          </Text>
          <Text style={styles.role}>Ferry Captain</Text>
          <Text style={styles.email}>
            {user?.profile?.email || user?.email || '...'}
          </Text>
          <View style={styles.badgeContainer}>
            <View style={styles.activeBadge}>
              <CheckCircle size={12} color='white' />
              <Text style={styles.badgeText}>Active Captain</Text>
            </View>
          </View>
        </View>
      </View>
    </Card>
  );

  const renderStatistics = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Today's Overview</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.statsScrollContainer}
      >
        <StatCard
          title='Trips Today'
          value='0'
          icon={<Ship size={20} color={Colors.primary} />}
        />
        <StatCard
          title='Passengers'
          value='0'
          icon={<User size={20} color={Colors.primary} />}
        />
        <StatCard
          title='Check-ins'
          value='0'
          icon={<CheckCircle size={20} color={Colors.success} />}
          color={Colors.success}
        />
        <StatCard
          title='On Time'
          value='100%'
          icon={<Clock size={20} color={Colors.warning} />}
          color={Colors.warning}
        />
      </ScrollView>
    </View>
  );

  const renderDetailedInfo = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Captain Details</Text>

      <Card variant='outlined' style={styles.detailsCard}>
        <View style={styles.detailsGrid}>
          <View style={styles.detailItem}>
            <User size={18} color={Colors.textSecondary} />
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Full Name</Text>
              <Text style={styles.detailValue}>
                {user?.profile?.full_name || 'Not set'}
              </Text>
            </View>
          </View>

          <View style={styles.detailItem}>
            <Mail size={18} color={Colors.textSecondary} />
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Email Address</Text>
              <Text style={styles.detailValue}>
                {user?.profile?.email || user?.email || 'Not set'}
              </Text>
            </View>
          </View>

          <View style={styles.detailItem}>
            <Anchor size={18} color={Colors.textSecondary} />
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Role</Text>
              <Text style={styles.detailValue}>Ferry Captain</Text>
            </View>
          </View>

          <View style={styles.detailItem}>
            <Ship size={18} color={Colors.textSecondary} />
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Current Vessel</Text>
              <Text style={styles.detailValue}>Not assigned</Text>
            </View>
          </View>

          <View style={styles.detailItem}>
            <Calendar size={18} color={Colors.textSecondary} />
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Today's Schedule</Text>
              <Text style={styles.detailValue}>No trips scheduled</Text>
            </View>
          </View>
        </View>
      </Card>
    </View>
  );

  const renderQuickActions = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Quick Actions</Text>

      <View style={styles.actionsGrid}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => {
            // Navigate to check-in tab
            router.push('/(captain)/(tabs)/checkin');
          }}
        >
          <CheckCircle size={24} color={Colors.primary} />
          <Text style={styles.actionText}>Check-in Passengers</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => {
            // View today's schedule
          }}
        >
          <Calendar size={24} color={Colors.primary} />
          <Text style={styles.actionText}>Today's Schedule</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => {
            // View vessel status
          }}
        >
          <Ship size={24} color={Colors.primary} />
          <Text style={styles.actionText}>Vessel Status</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => {
            // Emergency contacts
          }}
        >
          <HelpCircle size={24} color={Colors.error} />
          <Text style={styles.actionText}>Emergency</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderSettings = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Settings & Support</Text>

      <Card variant='outlined' style={styles.settingsCard}>
        <TouchableOpacity style={styles.settingRow}>
          <Settings size={20} color={Colors.primary} />
          <Text style={styles.settingText}>Account Settings</Text>
        </TouchableOpacity>

        <View style={styles.settingDivider} />

        <TouchableOpacity style={styles.settingRow}>
          <Bell size={20} color={Colors.primary} />
          <Text style={styles.settingText}>Notifications</Text>
        </TouchableOpacity>

        <View style={styles.settingDivider} />

        <TouchableOpacity style={styles.settingRow}>
          <Shield size={20} color={Colors.primary} />
          <Text style={styles.settingText}>Privacy & Security</Text>
        </TouchableOpacity>

        <View style={styles.settingDivider} />

        <TouchableOpacity style={styles.settingRow}>
          <HelpCircle size={20} color={Colors.primary} />
          <Text style={styles.settingText}>Help & Support</Text>
        </TouchableOpacity>
      </Card>
    </View>
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={onRefresh}
          colors={[Colors.primary]}
          tintColor={Colors.primary}
        />
      }
    >
      {renderProfileHeader()}
      {renderStatistics()}
      {renderDetailedInfo()}
      {renderQuickActions()}
      {renderSettings()}

      {/* Logout Button */}
      <Button
        title='Log Out'
        onPress={handleLogout}
        variant='outline'
        icon={<LogOut size={20} color={Colors.primary} />}
        style={styles.logoutButton}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 16,
  },
  profileHeaderCard: {
    marginBottom: 24,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
  },
  statusIndicator: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Colors.success,
    borderWidth: 2,
    borderColor: 'white',
  },
  profileInfo: {
    flex: 1,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 4,
  },
  role: {
    fontSize: 16,
    color: Colors.primary,
    fontWeight: '600',
    marginBottom: 2,
  },
  email: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  badgeContainer: {
    flexDirection: 'row',
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.success,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  statsScrollContainer: {
    paddingRight: 16,
  },
  detailsCard: {
    padding: 0,
  },
  detailsGrid: {
    padding: 16,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  detailContent: {
    marginLeft: 12,
    flex: 1,
  },
  detailLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 16,
    color: Colors.text,
    fontWeight: '500',
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionButton: {
    width: isTablet ? '22%' : '48%',
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  actionText: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
    textAlign: 'center',
  },
  settingsCard: {
    padding: 0,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  settingText: {
    marginLeft: 12,
    fontSize: 16,
    color: Colors.text,
  },
  settingDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginLeft: 48,
  },
  logoutButton: {
    marginTop: 8,
    marginBottom: 24,
  },
});
