import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  StatusBar,
} from 'react-native';
import { colors } from '@/constants/adminColors';
import {
  Shield,
  User,
  MessageSquare,
  HelpCircle,
  ArrowRight,
  Crown,
  Phone,
  Mail,
  ExternalLink,
} from 'lucide-react-native';
import { router } from 'expo-router';
import { useAuthStore } from '@/store/authStore';
import Button from './Button';

const { width: screenWidth } = Dimensions.get('window');

interface NoPermissionsWelcomeProps {
  adminName?: string;
  adminRole?: string;
  isSuperAdmin?: boolean;
}

export default function NoPermissionsWelcome({
  adminName,
  adminRole,
  isSuperAdmin = false,
}: NoPermissionsWelcomeProps) {
  const { user } = useAuthStore();
  const isTablet = screenWidth >= 768;

  const displayName = adminName || user?.profile?.full_name || 'Administrator';
  const displayRole =
    adminRole || user?.profile?.role || 'System Administrator';

  const handleContactSupport = () => {
    router.push('../modal' as any);
  };

  const handleViewProfile = () => {
    router.push('../modal' as any);
  };

  const handleRequestPermissions = () => {
    handleContactSupport();
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
    <View style={styles.container}>
      <StatusBar barStyle='dark-content' backgroundColor={colors.background} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Main Welcome Card */}
        <View style={styles.mainCard}>
          <View style={styles.iconContainer}>
            {isSuperAdmin ? (
              <Crown size={40} color={colors.warning} />
            ) : (
              <Shield size={40} color={colors.primary} />
            )}
          </View>

          <Text style={styles.title}>
            {isSuperAdmin
              ? 'Welcome, Super Administrator!'
              : `Welcome, ${displayName}!`}
          </Text>

          <Text style={styles.subtitle}>
            {isSuperAdmin
              ? 'You have full system access with comprehensive privileges.'
              : 'Your account is being configured for optimal access.'}
          </Text>

          {isSuperAdmin && (
            <View style={styles.badge}>
              <Crown size={14} color={colors.warning} />
              <Text style={styles.badgeText}>Super Administrator</Text>
            </View>
          )}
        </View>

        {/* User Info Card */}
        <View style={styles.userCard}>
          <View style={styles.userHeader}>
            <View style={styles.avatar}>
              <User size={20} color={colors.primary} />
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{displayName}</Text>
              <Text style={styles.userRole}>{displayRole}</Text>
            </View>
            <View style={styles.status}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>Active</Text>
            </View>
          </View>
        </View>

        {/* Permissions Section */}
        <View style={styles.permissionsSection}>
          <Text style={styles.sectionTitle}>Recommended Permissions</Text>
          <Text style={styles.sectionSubtitle}>
            Based on your role, you might need these permissions:
          </Text>

          <View style={styles.permissionsGrid}>
            {suggestions.map((suggestion, index) => (
              <View key={index} style={styles.permissionCard}>
                <View
                  style={[
                    styles.permissionIcon,
                    { backgroundColor: `${suggestion.color}15` },
                  ]}
                >
                  <Shield size={16} color={suggestion.color} />
                </View>
                <View>
                  <Text style={styles.permissionTitle}>{suggestion.label}</Text>
                  <Text style={styles.permissionDescription}>
                    {suggestion.description}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          <Button
            title='Request Permissions'
            onPress={handleRequestPermissions}
            style={styles.primaryButton}
            icon={React.createElement(Shield, { size: 16, color: 'white' })}
          />

          <View style={styles.secondaryButtons}>
            <Button
              title='Contact Support'
              onPress={handleContactSupport}
              variant='outline'
              style={styles.secondaryButton}
              icon={React.createElement(MessageSquare, {
                size: 16,
                color: colors.primary,
              })}
            />
            <Button
              title='View Profile'
              onPress={handleViewProfile}
              style={styles.secondaryButton}
              variant='outline'
              icon={React.createElement(User, {
                size: 16,
                color: colors.primary,
              })}
            />
          </View>
        </View>

        {/* Help Section */}
        <View style={styles.helpCard}>
          <View style={styles.helpHeader}>
            <HelpCircle size={20} color={colors.warning} />
            <Text style={styles.helpTitle}>Need Assistance?</Text>
          </View>

          <View style={styles.helpOptions}>
            <TouchableOpacity
              style={styles.helpOption}
              onPress={handleContactSupport}
            >
              <Phone size={14} color={colors.primary} />
              <Text style={styles.helpOptionText}>Call Support</Text>
              <ArrowRight size={14} color={colors.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.helpOption}
              onPress={handleContactSupport}
            >
              <Mail size={14} color={colors.primary} />
              <Text style={styles.helpOptionText}>Email Support</Text>
              <ArrowRight size={14} color={colors.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.helpOption}
              onPress={handleContactSupport}
            >
              <ExternalLink size={14} color={colors.primary} />
              <Text style={styles.helpOptionText}>Documentation</Text>
              <ArrowRight size={14} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Ferry Booking System • Admin Panel
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 40,
    paddingBottom: 40,
  },
  mainCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: `${colors.border}70`,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: `${colors.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 30,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 400,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${colors.warning}15`,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: `${colors.warning}30`,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.warning,
    marginLeft: 6,
  },
  userCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: `${colors.border}80`,
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${colors.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  userRole: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  status: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.success,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    color: colors.success,
    fontWeight: '500',
  },
  permissionsSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 16,
    lineHeight: 20,
  },
  permissionsGrid: {
    gap: 12,
  },
  permissionCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: `${colors.border}80`,
  },
  permissionIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  permissionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  permissionDescription: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  actionsContainer: {
    marginBottom: 24,
    gap: 12,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
  },
  secondaryButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  secondaryButton: {
    flex: 1,
  },
  helpCard: {
    backgroundColor: `${colors.warning}08`,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: `${colors.warning}20`,
  },
  helpHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  helpTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginLeft: 8,
  },
  helpOptions: {
    gap: 8,
  },
  helpOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: colors.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: `${colors.border}20`,
  },
  helpOptionText: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    marginLeft: 8,
  },
  footer: {
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: `${colors.border}20`,
  },
  footerText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
});
