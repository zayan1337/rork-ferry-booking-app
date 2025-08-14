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
import { useRouter } from 'expo-router';
import {
  User,
  Mail,
  LogOut,
  Settings,
  Bell,
  HelpCircle,
  Shield,
  TrendingUp,
  Users,
  Calendar,
  Award,
  CreditCard,
  BarChart3,
  Clock,
  CheckCircle,
  X,
} from 'lucide-react-native';

import { useAuthStore } from '@/store/authStore';
import Colors from '@/constants/colors';
import Card from '@/components/Card';
import Button from '@/components/Button';
import StatCard from '@/components/StatCard';
import { AgentInfoCard } from '@/components/agent';
import { CreditSummaryCard } from '@/components/agent';
import { SkeletonAgentInfoSection } from '@/components/skeleton';

import { useAgentData } from '@/hooks/useAgentData';
import { useRefreshControl } from '@/hooks/useRefreshControl';
import { formatAgentInitials, formatCurrency } from '@/utils/agentFormatters';
import { getDashboardStats } from '@/utils/agentDashboard';

const { width: screenWidth } = Dimensions.get('window');
const isTablet = screenWidth > 768;

export default function AgentProfileScreen() {
  const router = useRouter();
  const { signOut } = useAuthStore();
  const {
    agent,
    stats,
    localStats,
    creditTransactions,
    bookings,
    clients,
    reset,
    isInitializing,
    isLoadingProfile,
    refreshAgentData,
  } = useAgentData();

  const { isRefreshing, onRefresh } = useRefreshControl({
    onRefresh: refreshAgentData,
  });

  // Use utility function for processing stats (same as dashboard)
  const displayStats = getDashboardStats(stats, localStats);

  const handleSignOut = async () => {
    try {
      reset(); // Clear agent store
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

  const agentInitials = formatAgentInitials(agent);

  // Get recent activity summary
  const recentBookings = bookings.slice(0, 5);
  const todayBookings = bookings.filter(
    booking =>
      new Date(booking.bookingDate).toDateString() === new Date().toDateString()
  );

  const renderProfileHeader = () => (
    <Card variant='elevated' style={styles.profileHeaderCard}>
      <View style={styles.profileHeader}>
        <View style={styles.avatarContainer}>
          <Text style={styles.avatarText}>{agentInitials}</Text>
          <View style={styles.statusIndicator} />
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.name}>{agent?.name || 'Loading...'}</Text>
          <Text style={styles.agentId}>ID: {agent?.agentId || '...'}</Text>
          <Text style={styles.email}>{agent?.email || '...'}</Text>
          <View style={styles.badgeContainer}>
            <View style={styles.activeBadge}>
              <CheckCircle size={12} color='white' />
              <Text style={styles.badgeText}>Active Agent</Text>
            </View>
          </View>
        </View>
      </View>
    </Card>
  );

  const renderStatistics = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Performance Overview</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.statsScrollContainer}
      >
        <StatCard
          title='Total Bookings'
          value={displayStats.totalBookings}
          icon={<Calendar size={20} color={Colors.primary} />}
        />
        <StatCard
          title='Active Bookings'
          value={displayStats.activeBookings}
          icon={<Clock size={20} color={Colors.warning} />}
          color={Colors.warning}
        />
        <StatCard
          title='Completed'
          value={displayStats.completedBookings}
          icon={<CheckCircle size={20} color={Colors.success} />}
          color={Colors.success}
        />
        <StatCard
          title='Cancelled'
          value={displayStats.cancelledBookings}
          icon={<X size={20} color={Colors.error} />}
          color={Colors.error}
        />
        <StatCard
          title='Total Clients'
          value={displayStats.uniqueClients}
          icon={<Users size={20} color={Colors.primary} />}
        />
        <StatCard
          title='Revenue'
          value={formatCurrency(displayStats.totalRevenue)}
          icon={<TrendingUp size={20} color={Colors.primary} />}
        />
        <StatCard
          title='Commission'
          value={formatCurrency(displayStats.totalCommission)}
          icon={<Award size={20} color={Colors.primary} />}
        />
      </ScrollView>
    </View>
  );

  const renderDetailedInfo = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Agent Details</Text>

      <Card variant='outlined' style={styles.detailsCard}>
        <View style={styles.detailsGrid}>
          <View style={styles.detailItem}>
            <User size={18} color={Colors.subtext} />
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Full Name</Text>
              <Text style={styles.detailValue}>{agent?.name}</Text>
            </View>
          </View>

          <View style={styles.detailItem}>
            <Mail size={18} color={Colors.subtext} />
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Email Address</Text>
              <Text style={styles.detailValue}>{agent?.email}</Text>
            </View>
          </View>

          <View style={styles.detailItem}>
            <CreditCard size={18} color={Colors.subtext} />
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Agent ID</Text>
              <Text style={styles.detailValue}>{agent?.agentId}</Text>
            </View>
          </View>

          <View style={styles.detailItem}>
            <BarChart3 size={18} color={Colors.subtext} />
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Discount Rate</Text>
              <Text style={styles.detailValue}>{agent?.discountRate}%</Text>
            </View>
          </View>

          <View style={styles.detailItem}>
            <Award size={18} color={Colors.subtext} />
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Free Tickets</Text>
              <Text style={styles.detailValue}>
                {agent?.freeTicketsRemaining || 0} /{' '}
                {agent?.freeTicketsAllocation || 0}
              </Text>
            </View>
          </View>

          <View style={styles.detailItem}>
            <Calendar size={18} color={Colors.subtext} />
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Today's Bookings</Text>
              <Text style={styles.detailValue}>{todayBookings.length}</Text>
            </View>
          </View>
        </View>
      </Card>
    </View>
  );

  const renderCreditSection = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Credit Management</Text>
      <CreditSummaryCard
        agent={agent}
        transactions={creditTransactions}
        onRequestCredit={() => router.push('/(app)/(agent)/(tabs)/credit')}
      />
    </View>
  );

  const renderQuickActions = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Quick Actions</Text>

      <View style={styles.actionsGrid}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => router.push('/(app)/(agent)/booking/new')}
        >
          <Calendar size={24} color={Colors.primary} />
          <Text style={styles.actionText}>New Booking</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => router.push('/(app)/(agent)/(tabs)/clients')}
        >
          <Users size={24} color={Colors.primary} />
          <Text style={styles.actionText}>Manage Clients</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => router.push('/(app)/(agent)/(tabs)/bookings')}
        >
          <BarChart3 size={24} color={Colors.primary} />
          <Text style={styles.actionText}>View Reports</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => router.push('/(app)/(agent)/(tabs)/credit')}
        >
          <CreditCard size={24} color={Colors.primary} />
          <Text style={styles.actionText}>Credit History</Text>
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

  if ((isInitializing || isLoadingProfile) && !agent) {
    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
      >
        <SkeletonAgentInfoSection delay={0} />
      </ScrollView>
    );
  }

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
      {renderCreditSection()}
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
  agentId: {
    fontSize: 14,
    color: Colors.subtext,
    marginBottom: 2,
  },
  email: {
    fontSize: 14,
    color: Colors.subtext,
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
    color: Colors.subtext,
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
