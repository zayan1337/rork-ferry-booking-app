import React, { memo, useMemo } from 'react';
import { StyleSheet, Text, Pressable, View } from 'react-native';
import { colors } from '@/constants/adminColors';
import { Mail } from 'lucide-react-native';
import StatusBadge from './StatusBadge';
import { UserProfile } from '@/types/userManagement';
import { formatDateInMaldives } from '@/utils/timezoneUtils';

interface UserItemProps {
  user: UserProfile;
  onPress?: () => void;
}

const UserItem = memo(({ user, onPress }: UserItemProps) => {
  const initials = useMemo(() => {
    return user.name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase();
  }, [user.name]);

  const roleColor = useMemo(() => {
    switch (user.role) {
      case 'admin':
        return colors.primary;
      case 'agent':
        return colors.secondary;
      default:
        return colors.textSecondary;
    }
  }, [user.role]);

  const formattedDate = useMemo(() => {
    // Use Maldives timezone for consistent date display
    return formatDateInMaldives(user.created_at, 'short-date');
  }, [user.created_at]);

  return (
    <Pressable style={styles.container} onPress={onPress}>
      <View style={styles.avatarContainer}>
        <Text style={styles.avatarText}>{initials}</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.name}>{user.name}</Text>
          <StatusBadge status={user.status} size='small' />
        </View>

        {user.email && (
          <View style={styles.emailContainer}>
            <Mail size={14} color={colors.textSecondary} />
            <Text style={styles.email}>{user.email}</Text>
          </View>
        )}

        <View style={styles.footer}>
          <View
            style={[styles.roleBadge, { backgroundColor: `${roleColor}20` }]}
          >
            <Text style={[styles.roleText, { color: roleColor }]}>
              {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
            </Text>
          </View>
          <Text style={styles.date}>Joined {formattedDate}</Text>
        </View>
      </View>
    </Pressable>
  );
});

UserItem.displayName = 'UserItem';

export default UserItem;

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
