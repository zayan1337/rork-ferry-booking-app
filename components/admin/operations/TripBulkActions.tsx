import React from 'react';
import { StyleSheet, View, Pressable, Text, Alert } from 'react-native';
import { colors } from '@/constants/adminColors';
import { Download, Clock, X, CheckCircle, Calendar } from 'lucide-react-native';

export interface BulkAction {
  key: string;
  label: string;
  icon: React.ReactNode;
  color?: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
  confirmationTitle?: string;
  confirmationMessage?: string;
}

interface TripBulkActionsProps {
  selectedCount: number;
  totalCount: number;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onBulkAction: (actionKey: string) => void;
  canManageTrips?: boolean;
  isVisible?: boolean;
}

export default function TripBulkActions({
  selectedCount,
  totalCount,
  onSelectAll,
  onClearSelection,
  onBulkAction,
  canManageTrips = false,
  isVisible = true,
}: TripBulkActionsProps) {
  const handleBulkAction = (action: BulkAction) => {
    if (action.confirmationTitle && action.confirmationMessage) {
      Alert.alert(action.confirmationTitle, action.confirmationMessage, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          style: action.variant === 'danger' ? 'destructive' : 'default',
          onPress: () => onBulkAction(action.key),
        },
      ]);
    } else {
      onBulkAction(action.key);
    }
  };

  const getBulkActions = (): BulkAction[] => {
    const actions: BulkAction[] = [
      {
        key: 'export',
        label: 'Export',
        icon: <Download size={16} color={colors.primary} />,
        variant: 'outline',
      },
    ];

    if (canManageTrips) {
      actions.push(
        {
          key: 'reschedule',
          label: 'Reschedule',
          icon: <Calendar size={16} color={colors.warning} />,
          variant: 'outline',
          confirmationTitle: 'Reschedule Trips',
          confirmationMessage: `Are you sure you want to reschedule ${selectedCount} trip(s)?`,
        },
        {
          key: 'delay',
          label: 'Mark Delayed',
          icon: <Clock size={16} color={colors.warning} />,
          variant: 'outline',
          confirmationTitle: 'Mark as Delayed',
          confirmationMessage: `Mark ${selectedCount} trip(s) as delayed?`,
        },
        {
          key: 'complete',
          label: 'Mark Complete',
          icon: <CheckCircle size={16} color={colors.success} />,
          variant: 'outline',
          confirmationTitle: 'Mark as Completed',
          confirmationMessage: `Mark ${selectedCount} trip(s) as completed?`,
        },
        {
          key: 'cancel',
          label: 'Cancel',
          icon: <X size={16} color={colors.danger} />,
          variant: 'danger',
          color: colors.danger,
          confirmationTitle: 'Cancel Trips',
          confirmationMessage: `Are you sure you want to cancel ${selectedCount} trip(s)? This action cannot be undone.`,
        }
      );
    }

    return actions;
  };

  if (!isVisible || selectedCount === 0) {
    return null;
  }

  const bulkActions = getBulkActions();

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.selectionInfo}>
          <Text style={styles.selectionText}>
            {selectedCount} trip{selectedCount !== 1 ? 's' : ''} selected
          </Text>
          <View style={styles.selectionActions}>
            {selectedCount < totalCount && (
              <Pressable onPress={onSelectAll} style={styles.selectAllButton}>
                <Text style={styles.selectAllText}>
                  Select All ({totalCount})
                </Text>
              </Pressable>
            )}
            <Pressable onPress={onClearSelection} style={styles.clearButton}>
              <Text style={styles.clearText}>Clear</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.actionsContainer}>
          {bulkActions.map(action => (
            <Pressable
              key={action.key}
              style={[
                styles.actionButton,
                action.variant === 'danger' && styles.dangerButton,
              ]}
              onPress={() => handleBulkAction(action)}
            >
              {action.icon}
              <Text
                style={[
                  styles.actionButtonText,
                  action.variant === 'danger' && styles.dangerButtonText,
                ]}
              >
                {action.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: `${colors.primary}15`,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: `${colors.primary}30`,
  },
  content: {
    gap: 12,
  },
  selectionInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectionText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  selectionActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  selectAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: `${colors.primary}20`,
  },
  selectAllText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '500',
  },
  clearButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: `${colors.textSecondary}20`,
  },
  clearText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  actionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 6,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  dangerButton: {
    backgroundColor: `${colors.danger}10`,
    borderColor: `${colors.danger}40`,
  },
  actionButtonText: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
  },
  dangerButtonText: {
    color: colors.danger,
  },
});
