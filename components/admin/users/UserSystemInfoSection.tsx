import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '@/constants/adminColors';
import { UserProfile } from '@/types/userManagement';

interface UserSystemInfoSectionProps {
  user: UserProfile;
}

export default function UserSystemInfoSection({
  user,
}: UserSystemInfoSectionProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>System Information</Text>

      <View style={styles.systemInfo}>
        <View style={styles.systemRow}>
          <Text style={styles.systemLabel}>User ID</Text>
          <Text style={styles.systemValue} selectable>
            {user.id}
          </Text>
        </View>

        {user.created_at && (
          <View style={styles.systemRow}>
            <Text style={styles.systemLabel}>Created Date</Text>
            <Text style={styles.systemValue}>
              {formatDate(user.created_at)}
            </Text>
          </View>
        )}

        {user.last_login && (
          <View style={styles.systemRow}>
            <Text style={styles.systemLabel}>Last Login</Text>
            <Text style={styles.systemValue}>
              {formatDate(user.last_login)}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
    shadowColor: colors.shadowMedium,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 20,
    lineHeight: 24,
  },
  systemInfo: {
    gap: 16,
  },
  systemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  systemLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '600',
    flex: 1,
  },
  systemValue: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
    flex: 2,
    textAlign: 'right',
    lineHeight: 18,
  },
});
