import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { colors } from '@/constants/adminColors';
import {
  Mail,
  User,
  Shield,
  CheckCircle,
  XCircle,
  Edit2,
  Trash2,
  Bell,
  BellOff,
} from 'lucide-react-native';
import { OperationTeamMember } from '@/hooks/useOperationTeamManagement';

interface OperationTeamItemProps {
  member: OperationTeamMember;
  onEdit: (member: OperationTeamMember) => void;
  onDelete: (id: string) => void;
  onToggleActive: (id: string, isActive: boolean) => void;
  onToggleReceiveManifests: (id: string, receiveManifests: boolean) => void;
  canManage: boolean;
}

export default function OperationTeamItem({
  member,
  onEdit,
  onDelete,
  onToggleActive,
  onToggleReceiveManifests,
  canManage,
}: OperationTeamItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleDelete = () => {
    Alert.alert(
      'Delete Team Member',
      `Are you sure you want to remove ${member.full_name} from the operation team?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => onDelete(member.id),
        },
      ]
    );
  };

  const handleToggleActive = () => {
    const newStatus = !member.is_active;
    Alert.alert(
      `${newStatus ? 'Activate' : 'Deactivate'} Member`,
      `Are you sure you want to ${newStatus ? 'activate' : 'deactivate'} ${member.full_name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: () => onToggleActive(member.id, newStatus),
        },
      ]
    );
  };

  const handleToggleManifests = () => {
    const newStatus = !member.receive_manifests;
    Alert.alert(
      `${newStatus ? 'Enable' : 'Disable'} Manifest Delivery`,
      `Are you sure you want to ${newStatus ? 'enable' : 'disable'} manifest delivery for ${member.full_name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: () => onToggleReceiveManifests(member.id, newStatus),
        },
      ]
    );
  };

  return (
    <TouchableOpacity
      style={[styles.container, !member.is_active && styles.inactiveContainer]}
      onPress={() => setIsExpanded(!isExpanded)}
      activeOpacity={0.7}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.iconContainer}>
            <User
              size={20}
              color={member.is_active ? colors.primary : colors.textSecondary}
            />
          </View>
          <View style={styles.headerInfo}>
            <Text
              style={[styles.name, !member.is_active && styles.inactiveName]}
            >
              {member.full_name}
            </Text>
            <View style={styles.emailRow}>
              <Mail size={12} color={colors.textSecondary} />
              <Text style={styles.email}>{member.email}</Text>
            </View>
          </View>
        </View>

        <View style={styles.headerRight}>
          <View
            style={[
              styles.statusBadge,
              member.is_active ? styles.activeBadge : styles.inactiveBadge,
            ]}
          >
            {member.is_active ? (
              <CheckCircle size={12} color={colors.success} />
            ) : (
              <XCircle size={12} color={colors.error} />
            )}
            <Text
              style={[
                styles.statusText,
                member.is_active ? styles.activeText : styles.inactiveText,
              ]}
            >
              {member.is_active ? 'Active' : 'Inactive'}
            </Text>
          </View>
        </View>
      </View>

      {/* Details (when expanded) */}
      {isExpanded && (
        <View style={styles.details}>
          {/* Role */}
          <View style={styles.detailRow}>
            <View style={styles.detailLabel}>
              <Shield size={16} color={colors.textSecondary} />
              <Text style={styles.detailLabelText}>Role</Text>
            </View>
            <Text style={styles.detailValue}>{member.role}</Text>
          </View>

          {/* Manifest Status */}
          <View style={styles.detailRow}>
            <View style={styles.detailLabel}>
              {member.receive_manifests ? (
                <Bell size={16} color={colors.success} />
              ) : (
                <BellOff size={16} color={colors.textSecondary} />
              )}
              <Text style={styles.detailLabelText}>Receives Manifests</Text>
            </View>
            <Text
              style={[
                styles.detailValue,
                member.receive_manifests
                  ? styles.successText
                  : styles.warningText,
              ]}
            >
              {member.receive_manifests ? 'Yes' : 'No'}
            </Text>
          </View>

          {/* Added Date */}
          <View style={styles.detailRow}>
            <Text style={styles.detailLabelText}>Added</Text>
            <Text style={styles.detailValue}>
              {new Date(member.created_at).toLocaleDateString()}
            </Text>
          </View>

          {/* Actions */}
          {canManage && (
            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.actionButton, styles.editButton]}
                onPress={() => onEdit(member)}
              >
                <Edit2 size={16} color={colors.primary} />
                <Text style={styles.editButtonText}>Edit</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, styles.toggleButton]}
                onPress={handleToggleManifests}
              >
                {member.receive_manifests ? (
                  <BellOff size={16} color={colors.warning} />
                ) : (
                  <Bell size={16} color={colors.success} />
                )}
                <Text style={styles.toggleButtonText}>
                  {member.receive_manifests
                    ? 'Disable Manifests'
                    : 'Enable Manifests'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, styles.toggleButton]}
                onPress={handleToggleActive}
              >
                {member.is_active ? (
                  <XCircle size={16} color={colors.error} />
                ) : (
                  <CheckCircle size={16} color={colors.success} />
                )}
                <Text style={styles.toggleButtonText}>
                  {member.is_active ? 'Deactivate' : 'Activate'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, styles.deleteButton]}
                onPress={handleDelete}
              >
                <Trash2 size={16} color={colors.error} />
                <Text style={styles.deleteButtonText}>Delete</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  inactiveContainer: {
    opacity: 0.6,
    backgroundColor: colors.backgroundSecondary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerInfo: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  inactiveName: {
    color: colors.textSecondary,
  },
  emailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  email: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  headerRight: {
    marginLeft: 12,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  activeBadge: {
    backgroundColor: colors.successLight,
  },
  inactiveBadge: {
    backgroundColor: colors.errorLight,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  activeText: {
    color: colors.success,
  },
  inactiveText: {
    color: colors.error,
  },
  details: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailLabelText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },
  successText: {
    color: colors.success,
  },
  warningText: {
    color: colors.warning,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  editButton: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.primary,
  },
  toggleButton: {
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  toggleButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },
  deleteButton: {
    borderColor: colors.error,
    backgroundColor: colors.errorLight,
  },
  deleteButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.error,
  },
});
