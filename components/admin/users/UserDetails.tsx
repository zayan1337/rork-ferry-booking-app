import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Dimensions,
} from "react-native";
import { colors } from "@/constants/adminColors";
import { UserProfile } from "@/types/userManagement";
import {
  formatUserDisplayName,
  formatActivityLevel,
  formatEngagementScore,
  calculateUserAge,
} from "@/utils/userManagementUtils";
import Button from "@/components/admin/Button";
import StatCard from "@/components/admin/StatCard";
import StatusBadge from "@/components/admin/StatusBadge";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Shield,
  Activity,
  Edit,
  Archive,
  AlertTriangle,
  CheckCircle,
  Crown,
  UserCheck,
  Clock,
  BarChart3,
  TrendingUp,
  DollarSign,
  Users,
  Star,
  Eye,
  Settings,
  Home,
  Contact,
} from "lucide-react-native";

interface UserDetailsProps {
  user: UserProfile;
  onEdit?: () => void;
  onArchive?: () => void;
  onViewActivity?: () => void;
  onViewPermissions?: () => void;
  onViewBookings?: () => void;
  showActions?: boolean;
}

const { width: screenWidth } = Dimensions.get("window");

export default function UserDetails({
  user,
  onEdit,
  onArchive,
  onViewActivity,
  onViewPermissions,
  onViewBookings,
  showActions = true,
}: UserDetailsProps) {
  const isTablet = screenWidth >= 768;

  const handleArchive = () => {
    Alert.alert(
      "Archive User",
      `Are you sure you want to archive "${user.name}"? This will disable their account.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Archive",
          style: "destructive",
          onPress: onArchive,
        },
      ]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return colors.success;
      case "inactive":
        return colors.warning;
      case "suspended":
        return colors.danger;
      default:
        return colors.textSecondary;
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "admin":
        return <Crown size={16} color={colors.danger} />;
      case "agent":
        return <UserCheck size={16} color={colors.primary} />;
      case "customer":
        return <User size={16} color={colors.secondary} />;
      default:
        return <User size={16} color={colors.textSecondary} />;
    }
  };

  const getActivityLevelColor = (level: string) => {
    switch (level) {
      case "high":
        return colors.success;
      case "medium":
        return colors.warning;
      case "low":
        return colors.danger;
      default:
        return colors.textSecondary;
    }
  };

  const userAge = user.date_of_birth ? calculateUserAge(user) : null;
  const activityLevelData = formatActivityLevel(
    user.statistics?.activity_level || 0
  );
  const engagementScoreData = formatEngagementScore(
    user.statistics?.engagement_score || 0
  );

  const stats = [
    {
      title: "Total Bookings",
      value: user.statistics?.total_bookings?.toString() || "0",
      subtitle: "All time",
      icon: <BarChart3 size={20} color={colors.primary} />,
      trend:
        user.statistics?.total_bookings && user.statistics.total_bookings > 0
          ? "+"
          : "",
    },
    {
      title: "Total Spent",
      value: `MVR ${user.statistics?.total_spent || 0}`,
      subtitle: "All time",
      icon: <DollarSign size={20} color={colors.success} />,
      trend:
        user.statistics?.total_spent && user.statistics.total_spent > 0
          ? "+"
          : "",
    },
    {
      title: "Activity Level",
      value: activityLevelData.label,
      subtitle: "Current status",
      icon: <Activity size={20} color={activityLevelData.color} />,
      trend:
        user.statistics?.activity_level && user.statistics.activity_level > 50
          ? "+"
          : "",
    },
    {
      title: "Engagement",
      value: engagementScoreData.percentage,
      subtitle: "User score",
      icon: <TrendingUp size={20} color={engagementScoreData.color} />,
      trend:
        user.statistics?.engagement_score &&
        user.statistics.engagement_score > 70
          ? "+"
          : "",
    },
  ];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.title}>{formatUserDisplayName(user)}</Text>
          <Text style={styles.subtitle}>{user.email}</Text>
          <View style={styles.statusContainer}>
            <StatusBadge status={user.status} />
            <View style={styles.roleContainer}>
              {getRoleIcon(user.role)}
              <Text style={styles.roleText}>{user.role}</Text>
            </View>
          </View>
        </View>
        {showActions && (
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.iconButton} onPress={onEdit}>
              <Edit size={20} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconButton} onPress={handleArchive}>
              <Archive size={20} color={colors.danger} />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Basic Information */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Basic Information</Text>
        <View style={styles.infoGrid}>
          <View style={styles.infoItem}>
            <View style={styles.infoIcon}>
              <User size={16} color={colors.primary} />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Full Name</Text>
              <Text style={styles.infoValue}>{user.name}</Text>
            </View>
          </View>

          <View style={styles.infoItem}>
            <View style={styles.infoIcon}>
              <Mail size={16} color={colors.primary} />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{user.email}</Text>
            </View>
          </View>

          <View style={styles.infoItem}>
            <View style={styles.infoIcon}>
              <Phone size={16} color={colors.primary} />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Phone</Text>
              <Text style={styles.infoValue}>
                {user.mobile_number || "Not provided"}
              </Text>
            </View>
          </View>

          {user.date_of_birth && (
            <View style={styles.infoItem}>
              <View style={styles.infoIcon}>
                <Calendar size={16} color={colors.primary} />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Date of Birth</Text>
                <Text style={styles.infoValue}>
                  {new Date(user.date_of_birth).toLocaleDateString()}
                  {userAge && ` (${userAge} years old)`}
                </Text>
              </View>
            </View>
          )}

          <View style={styles.infoItem}>
            <View style={styles.infoIcon}>
              <Calendar size={16} color={colors.primary} />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Member Since</Text>
              <Text style={styles.infoValue}>
                {new Date(user.created_at).toLocaleDateString()}
              </Text>
            </View>
          </View>

          <View style={styles.infoItem}>
            <View style={styles.infoIcon}>
              <Clock size={16} color={colors.primary} />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Last Active</Text>
              <Text style={styles.infoValue}>
                {user.last_active_at
                  ? new Date(user.last_active_at).toLocaleDateString()
                  : "Never"}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Statistics */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>User Statistics</Text>
        <View style={[styles.statsGrid, isTablet && styles.statsGridTablet]}>
          {stats.map((stat, index) => (
            <StatCard
              key={index}
              title={stat.title}
              value={stat.value}
              subtitle={stat.subtitle}
              icon={stat.icon}
              trend={stat.trend}
            />
          ))}
        </View>
      </View>

      {/* Address Information */}
      {user.address && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Address Information</Text>
          <View style={styles.addressContainer}>
            <View style={styles.addressIcon}>
              <Home size={20} color={colors.primary} />
            </View>
            <View style={styles.addressContent}>
              <Text style={styles.addressText}>
                {user.address.street}
                {user.address.island && `, ${user.address.island}`}
                {user.address.atoll && `, ${user.address.atoll}`}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Emergency Contact */}
      {user.emergency_contact && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Emergency Contact</Text>
          <View style={styles.contactGrid}>
            <View style={styles.contactItem}>
              <View style={styles.contactIcon}>
                <Contact size={16} color={colors.primary} />
              </View>
              <View style={styles.contactContent}>
                <Text style={styles.contactLabel}>Name</Text>
                <Text style={styles.contactValue}>
                  {user.emergency_contact.name}
                </Text>
              </View>
            </View>

            <View style={styles.contactItem}>
              <View style={styles.contactIcon}>
                <Phone size={16} color={colors.primary} />
              </View>
              <View style={styles.contactContent}>
                <Text style={styles.contactLabel}>Phone</Text>
                <Text style={styles.contactValue}>
                  {user.emergency_contact.phone}
                </Text>
              </View>
            </View>

            <View style={styles.contactItem}>
              <View style={styles.contactIcon}>
                <Users size={16} color={colors.primary} />
              </View>
              <View style={styles.contactContent}>
                <Text style={styles.contactLabel}>Relationship</Text>
                <Text style={styles.contactValue}>
                  {user.emergency_contact.relationship}
                </Text>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* Preferences */}
      {user.preferences && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferences</Text>
          <View style={styles.preferencesContainer}>
            <View style={styles.preferenceItem}>
              <Text style={styles.preferenceLabel}>Email Notifications</Text>
              <View
                style={[
                  styles.preferenceIndicator,
                  user.preferences.email_notifications &&
                    styles.preferenceEnabled,
                ]}
              >
                <Text
                  style={[
                    styles.preferenceText,
                    user.preferences.email_notifications &&
                      styles.preferenceTextEnabled,
                  ]}
                >
                  {user.preferences.email_notifications
                    ? "Enabled"
                    : "Disabled"}
                </Text>
              </View>
            </View>

            <View style={styles.preferenceItem}>
              <Text style={styles.preferenceLabel}>SMS Notifications</Text>
              <View
                style={[
                  styles.preferenceIndicator,
                  user.preferences.sms_notifications &&
                    styles.preferenceEnabled,
                ]}
              >
                <Text
                  style={[
                    styles.preferenceText,
                    user.preferences.sms_notifications &&
                      styles.preferenceTextEnabled,
                  ]}
                >
                  {user.preferences.sms_notifications ? "Enabled" : "Disabled"}
                </Text>
              </View>
            </View>

            {user.preferences.language && (
              <View style={styles.preferenceItem}>
                <Text style={styles.preferenceLabel}>Language</Text>
                <Text style={styles.preferenceValue}>
                  {user.preferences.language}
                </Text>
              </View>
            )}
          </View>
        </View>
      )}

      {/* Action Buttons */}
      {showActions && (
        <View style={styles.actionContainer}>
          {onViewActivity && (
            <Button
              title="View Activity"
              variant="outline"
              onPress={onViewActivity}
              icon={<Activity size={18} color={colors.primary} />}
              style={styles.actionButton}
            />
          )}
          {onViewPermissions && (
            <Button
              title="Permissions"
              variant="outline"
              onPress={onViewPermissions}
              icon={<Shield size={18} color={colors.primary} />}
              style={styles.actionButton}
            />
          )}
          {onViewBookings && (
            <Button
              title="View Bookings"
              variant="outline"
              onPress={onViewBookings}
              icon={<BarChart3 size={18} color={colors.primary} />}
              style={styles.actionButton}
            />
          )}
          {onEdit && (
            <Button
              title="Edit User"
              variant="primary"
              onPress={onEdit}
              icon={<Edit size={18} color="#FFFFFF" />}
              style={styles.actionButton}
            />
          )}
        </View>
      )}

      {/* Warnings */}
      {user.status === "suspended" && (
        <View style={styles.warningContainer}>
          <AlertTriangle size={16} color={colors.danger} />
          <Text style={styles.warningText}>
            This user account is suspended. They cannot access the system until
            reactivated.
          </Text>
        </View>
      )}

      {user.status === "inactive" && (
        <View style={styles.infoContainer}>
          <CheckCircle size={16} color={colors.warning} />
          <Text style={styles.infoText}>
            This user account is inactive. They may have limited access to
            features.
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 24,
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  roleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.primary + "10",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  roleText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  headerActions: {
    flexDirection: "row",
    gap: 8,
  },
  iconButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  section: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.text,
    marginBottom: 16,
  },
  infoGrid: {
    gap: 12,
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  infoIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary + "10",
    alignItems: "center",
    justifyContent: "center",
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  statsGridTablet: {
    gap: 16,
  },
  addressContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  addressIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary + "10",
    alignItems: "center",
    justifyContent: "center",
  },
  addressContent: {
    flex: 1,
  },
  addressText: {
    fontSize: 16,
    color: colors.text,
    lineHeight: 24,
  },
  contactGrid: {
    gap: 12,
  },
  contactItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  contactIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary + "10",
    alignItems: "center",
    justifyContent: "center",
  },
  contactContent: {
    flex: 1,
  },
  contactLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  contactValue: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
  },
  preferencesContainer: {
    gap: 12,
  },
  preferenceItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border + "30",
  },
  preferenceLabel: {
    fontSize: 14,
    color: colors.text,
  },
  preferenceIndicator: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: colors.danger + "10",
  },
  preferenceEnabled: {
    backgroundColor: colors.success + "10",
  },
  preferenceText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.danger,
  },
  preferenceTextEnabled: {
    color: colors.success,
  },
  preferenceValue: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
  },
  actionContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 8,
  },
  actionButton: {
    flex: 1,
    minWidth: "45%",
  },
  warningContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.danger + "10",
    borderWidth: 1,
    borderColor: colors.danger + "30",
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
  },
  warningText: {
    fontSize: 14,
    color: colors.danger,
    flex: 1,
  },
  infoContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.warning + "10",
    borderWidth: 1,
    borderColor: colors.warning + "30",
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
  },
  infoText: {
    fontSize: 14,
    color: colors.warning,
    flex: 1,
  },
});
