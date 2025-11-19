import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { colors } from '@/constants/adminColors';
import { Shield, User, CheckCircle2, ChevronRight } from 'lucide-react-native';
import { router } from 'expo-router';
import { useAuthStore } from '@/store/authStore';
import { useAdminStore } from '@/store/admin/adminStore';
import { useAlertContext } from '@/components/AlertProvider';
import Button from './Button';
import { LinearGradient } from 'expo-linear-gradient';

interface NoPermissionsWelcomeProps {
  adminName?: string;
  adminRole?: string;
  isSuperAdmin?: boolean;
}

export default function NoPermissionsWelcome({
  adminName,
  adminRole,
}: NoPermissionsWelcomeProps) {
  const { user } = useAuthStore();
  const { createPermissionRequestAlert } = useAdminStore();
  const { showSuccess, showError } = useAlertContext();

  const displayName = adminName || user?.profile?.full_name || 'Administrator';
  const displayRole =
    adminRole || user?.profile?.role || 'System Administrator';

  const handleRequestPermissions = async () => {
    try {
      const userId = user?.profile?.id;
      if (!userId) {
        showError('Error', 'User ID not found. Please try again.');
        return;
      }

      // Create the permission request alert
      await createPermissionRequestAlert(displayName, displayRole, userId);

      // Show success message
      showSuccess(
        'Request Submitted',
        'Your permission request has been submitted. A super admin will review your request shortly.'
      );

      // Navigate to settings with alerts tab open
      router.push('./settings?tab=alerts' as any);
    } catch (error) {
      console.error('Error creating permission request:', error);
      showError(
        'Error',
        'Failed to submit permission request. Please try again or contact support.'
      );
    }
  };

  const handleContactSupport = () => {
    router.push('../support' as any);
  };

  const handleViewProfile = () => {
    router.push('../modal' as any);
  };

  const getPermissionSuggestions = () => {
    const suggestions = [];

    if (
      displayRole.toLowerCase().includes('customer service') ||
      displayRole.toLowerCase().includes('support')
    ) {
      suggestions.push(
        {
          label: 'Booking Management',
          description: 'View and manage customer bookings',
          color: colors.success,
        },
        {
          label: 'Customer Support',
          description: 'Help customers with their accounts',
          color: colors.info,
        },
        {
          label: 'Communications',
          description: 'Send notifications to customers',
          color: colors.warning,
        }
      );
    } else if (
      displayRole.toLowerCase().includes('operations') ||
      displayRole.toLowerCase().includes('manager')
    ) {
      suggestions.push(
        {
          label: 'Route Management',
          description: 'Manage ferry routes and schedules',
          color: colors.primary,
        },
        {
          label: 'Vessel Management',
          description: 'Monitor and manage vessels',
          color: colors.success,
        },
        {
          label: 'Trip Operations',
          description: 'Oversee trip operations',
          color: colors.info,
        }
      );
    } else if (
      displayRole.toLowerCase().includes('finance') ||
      displayRole.toLowerCase().includes('accounting')
    ) {
      suggestions.push(
        {
          label: 'Payment Management',
          description: 'Handle payments and transactions',
          color: colors.success,
        },
        {
          label: 'Wallet Management',
          description: 'Manage user wallets and balances',
          color: colors.primary,
        },
        {
          label: 'Financial Reports',
          description: 'Generate financial reports',
          color: colors.warning,
        }
      );
    } else {
      suggestions.push(
        {
          label: 'Dashboard Access',
          description: 'View system overview and statistics',
          color: colors.primary,
        },
        {
          label: 'Booking Access',
          description: 'View and manage bookings',
          color: colors.success,
        },
        {
          label: 'User Management',
          description: 'Manage user accounts',
          color: colors.info,
        }
      );
    }

    return suggestions;
  };

  const suggestions = getPermissionSuggestions();

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <LinearGradient
        colors={[`${colors.primary}0D`, `${colors.primary}00`]}
        style={styles.heroCard}
      >
        <View style={styles.heroIcon}>
          <Shield size={36} color={colors.primary} />
        </View>
        <Text style={styles.title}>{`Welcome, ${displayName}!`}</Text>
        <Text style={styles.subtitle}>
          Your account is being configured for optimal access.
        </Text>

        <View style={styles.userChip}>
          <View style={styles.avatar}>
            <User size={18} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.userName}>{displayName}</Text>
            <Text style={styles.userRole}>{displayRole}</Text>
          </View>
          <View style={styles.statusBadge}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>Active</Text>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.permissionsCard}>
        <Text style={styles.sectionTitle}>Recommended Permissions</Text>
        <Text style={styles.sectionSubtitle}>
          Based on your role, you might need these permissions:
        </Text>
        <View style={{ gap: 12 }}>
          {suggestions.map((suggestion, index) => (
            <View key={index} style={styles.permissionRow}>
              <View
                style={[
                  styles.permissionIcon,
                  { backgroundColor: `${suggestion.color}15` },
                ]}
              >
                <Shield size={18} color={suggestion.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.permissionTitle}>{suggestion.label}</Text>
                <Text style={styles.permissionDescription}>
                  {suggestion.description}
                </Text>
              </View>
              <ChevronRight size={18} color={colors.textSecondary} />
            </View>
          ))}
        </View>
      </View>

      <View style={styles.actionsCard}>
        <Button
          title='Request Permissions'
          onPress={handleRequestPermissions}
          style={styles.primaryButton}
          icon={React.createElement(CheckCircle2, { size: 18, color: 'white' })}
        />

        <View style={styles.secondaryRow}>
          <Pressable
            style={styles.secondaryAction}
            onPress={handleContactSupport}
          >
            <Text style={styles.secondaryActionText}>Contact Support</Text>
          </Pressable>

          <Pressable style={styles.secondaryAction} onPress={handleViewProfile}>
            <Text style={styles.secondaryActionText}>View Profile</Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
  },
  scrollContent: {
    gap: 16,
  },
  heroCard: {
    borderRadius: 24,
    padding: 20,
    backgroundColor: colors.card,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 6,
    gap: 16,
  },
  heroIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.card,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  userChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    padding: 12,
    gap: 12,
    backgroundColor: colors.card,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: `${colors.primary}12`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  userRole: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.success,
  },
  statusText: {
    fontSize: 12,
    color: colors.success,
    fontWeight: '600',
  },
  permissionsCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 20,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  permissionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 14,
    gap: 12,
    backgroundColor: colors.backgroundSecondary,
  },
  permissionIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: 'center',
    alignItems: 'center',
  },
  permissionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  permissionDescription: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  actionsCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 20,
    gap: 16,
  },
  primaryButton: {
    borderRadius: 14,
  },
  secondaryRow: {
    flexDirection: 'row',
    gap: 12,
  },
  secondaryAction: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: colors.backgroundSecondary,
  },
  secondaryActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
});
