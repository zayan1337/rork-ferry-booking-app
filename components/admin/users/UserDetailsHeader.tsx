import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { User, Mail, Shield, Users, Ship } from 'lucide-react-native';
import { colors } from '@/constants/adminColors';
import { UserProfile } from '@/types/userManagement';

interface UserDetailsHeaderProps {
  user: UserProfile;
}

export default function UserDetailsHeader({ user }: UserDetailsHeaderProps) {
  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return <Shield size={20} color={colors.warning} />;
      case 'agent':
        return <Users size={20} color={colors.info} />;
      case 'customer':
        return <User size={20} color={colors.primary} />;
      case 'passenger':
        return <User size={20} color={colors.success} />;
      case 'captain':
        return <Ship size={20} color={colors.primary} />;
      default:
        return <User size={20} color={colors.textSecondary} />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return colors.success;
      case 'inactive':
        return colors.textSecondary;
      case 'suspended':
        return colors.warning;
      default:
        return colors.textSecondary;
    }
  };

  return (
    <View style={styles.header}>
      <View style={styles.headerLeft}>
        <View style={styles.userIcon}>{getRoleIcon(user.role)}</View>
        <View style={styles.headerContent}>
          <Text style={styles.userName}>{user.name}</Text>
          <View style={styles.userInfo}>
            <Mail size={16} color={colors.textSecondary} />
            <Text style={styles.userEmail}>{user.email}</Text>
          </View>
        </View>
      </View>
      <View
        style={[
          styles.statusBadge,
          user.status === 'active'
            ? styles.statusActive
            : styles.statusInactive,
        ]}
      >
        <View
          style={[
            styles.statusDot,
            { backgroundColor: getStatusColor(user.status) },
          ]}
        />
        <Text
          style={[
            styles.statusText,
            user.status === 'active'
              ? styles.statusTextActive
              : styles.statusTextInactive,
          ]}
        >
          {user.status?.charAt(0).toUpperCase() + user.status?.slice(1)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.card,
    padding: 24,
    borderRadius: 16,
    marginBottom: 24,
    shadowColor: colors.shadowMedium,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  userIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  headerContent: {
    flex: 1,
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 6,
    lineHeight: 30,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  userEmail: {
    fontSize: 15,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 6,
  },
  statusActive: {
    backgroundColor: colors.successLight,
  },
  statusInactive: {
    backgroundColor: colors.backgroundTertiary,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  statusTextActive: {
    color: colors.success,
  },
  statusTextInactive: {
    color: colors.textSecondary,
  },
});
