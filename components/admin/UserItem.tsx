import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors } from '@/constants/adminColors';
import { Mail } from 'lucide-react-native';
import StatusBadge from './StatusBadge';
import { UserProfile } from '@/types/userManagement';

interface UserItemProps {
  user: UserProfile;
  onPress?: () => void;
}

export default function UserItem({ user, onPress }: UserItemProps) {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase();
  };

  const getRoleColor = () => {
    switch (user.role) {
      case 'admin':
        return colors.primary;
      case 'agent':
        return colors.secondary;
      default:
        return colors.textSecondary;
    }
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.avatarContainer}>
        <Text style={styles.avatarText}>{getInitials(user.name)}</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.name}>{user.name}</Text>
          <StatusBadge status={user.status} size='small' />
        </View>

        <View style={styles.emailContainer}>
          <Mail size={14} color={colors.textSecondary} />
          <Text style={styles.email}>{user.email}</Text>
        </View>

        <View style={styles.footer}>
          <View
            style={[
              styles.roleBadge,
              { backgroundColor: `${getRoleColor()}20` },
            ]}
          >
            <Text style={[styles.roleText, { color: getRoleColor() }]}>
              {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
            </Text>
          </View>
          <Text style={styles.date}>
            Joined {new Date(user.created_at).toLocaleDateString()}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 1,
  },
  avatarContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.primary,
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  emailContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  email: {
    fontSize: 14,
    color: colors.textSecondary,
    marginLeft: 6,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  roleText: {
    fontSize: 12,
    fontWeight: '600',
  },
  date: {
    fontSize: 12,
    color: colors.textSecondary,
  },
});
