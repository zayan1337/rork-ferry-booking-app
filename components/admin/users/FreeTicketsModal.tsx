import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TextInput as RNTextInput,
  Keyboard,
  Dimensions,
} from 'react-native';
import {
  Ticket,
  X,
  Plus,
  Minus,
  TrendingUp,
  Info,
  CheckCircle2,
} from 'lucide-react-native';
import { colors } from '@/constants/adminColors';
import { useAlertContext } from '@/components/AlertProvider';
import Button from '@/components/admin/Button';
import { supabase } from '@/utils/supabase';

interface FreeTicketsModalProps {
  userId: string;
  userName: string;
  visible: boolean;
  onClose: () => void;
  onUpdate: () => void;
  currentAllocation: number;
  currentRemaining: number;
}

export default function FreeTicketsModal({
  userId,
  userName,
  visible,
  onClose,
  onUpdate,
  currentAllocation,
  currentRemaining,
}: FreeTicketsModalProps) {
  const { showError, showSuccess } = useAlertContext();
  const [saving, setSaving] = useState(false);

  const handleClose = () => {
    Keyboard.dismiss();
    onClose();
  };
  const [allocation, setAllocation] = useState<string>(
    currentAllocation.toString()
  );
  const [ticketsToAdd, setTicketsToAdd] = useState<string>('0');

  useEffect(() => {
    if (visible) {
      setAllocation(currentAllocation.toString());
      setTicketsToAdd('0');
    }
  }, [visible, currentAllocation]);

  const handleSave = async () => {
    try {
      const newAllocation = parseInt(allocation, 10);
      const addCount = parseInt(ticketsToAdd, 10);

      if (isNaN(newAllocation) || newAllocation < 0) {
        showError('Error', 'Please enter a valid allocation number');
        return;
      }

      if (isNaN(addCount) || addCount < 0) {
        showError('Error', 'Please enter a valid number of tickets to add');
        return;
      }

      // Calculate new remaining: current remaining + tickets to add
      // But don't exceed the new allocation
      const newRemaining = Math.min(currentRemaining + addCount, newAllocation);

      setSaving(true);

      // Update free_tickets_allocation and free_tickets_remaining in user_profiles
      const { error } = await supabase
        .from('user_profiles')
        .update({
          free_tickets_allocation: newAllocation,
          free_tickets_remaining: newRemaining,
        })
        .eq('id', userId);

      if (error) throw error;

      showSuccess(
        'Success',
        `Free tickets updated successfully. ${
          addCount > 0 ? `${addCount} ticket(s) added.` : ''
        }`,
        () => {
          onUpdate();
          handleClose();
        }
      );
    } catch (error: any) {
      console.error('Error updating free tickets:', error);
      showError(
        'Error',
        error?.message || 'Failed to update free tickets. Please try again.'
      );
    } finally {
      setSaving(false);
    }
  };

  const newRemaining =
    parseInt(allocation, 10) >= 0 && parseInt(ticketsToAdd, 10) >= 0
      ? Math.min(
          currentRemaining + parseInt(ticketsToAdd, 10),
          parseInt(allocation, 10)
        )
      : currentRemaining;

  const handleIncrement = (field: 'allocation' | 'ticketsToAdd') => {
    if (field === 'allocation') {
      const current = parseInt(allocation, 10) || 0;
      setAllocation((current + 1).toString());
    } else {
      const current = parseInt(ticketsToAdd, 10) || 0;
      setTicketsToAdd((current + 1).toString());
    }
  };

  const handleDecrement = (field: 'allocation' | 'ticketsToAdd') => {
    if (field === 'allocation') {
      const current = parseInt(allocation, 10) || 0;
      if (current > 0) {
        setAllocation((current - 1).toString());
      }
    } else {
      const current = parseInt(ticketsToAdd, 10) || 0;
      if (current > 0) {
        setTicketsToAdd((current - 1).toString());
      }
    }
  };

  const usagePercentage =
    currentAllocation > 0
      ? Math.round((currentRemaining / currentAllocation) * 100)
      : 0;
  const newUsagePercentage =
    parseInt(allocation, 10) > 0
      ? Math.round((newRemaining / parseInt(allocation, 10)) * 100)
      : 0;

  const hasChanges =
    parseInt(allocation, 10) !== currentAllocation ||
    parseInt(ticketsToAdd, 10) > 0;

  return (
    <Modal
      visible={visible}
      animationType='slide'
      transparent={true}
      {...(Platform.OS === 'ios' && { presentationStyle: 'pageSheet' })}
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <Pressable style={styles.overlay} onPress={handleClose}>
          <View style={styles.modal} onStartShouldSetResponder={() => true}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerContent}>
                <View style={styles.iconContainer}>
                  <Ticket size={22} color={colors.primary} />
                </View>
                <View>
                  <Text style={styles.title}>Manage Free Tickets</Text>
                  <Text style={styles.subtitle}>Agent: {userName}</Text>
                </View>
              </View>
              <Pressable
                onPress={handleClose}
                style={styles.closeButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <X size={20} color={colors.textSecondary} />
              </Pressable>
            </View>

            <ScrollView
              style={styles.content}
              contentContainerStyle={styles.contentContainer}
              showsVerticalScrollIndicator={true}
              keyboardShouldPersistTaps='handled'
              nestedScrollEnabled={true}
              bounces={true}
              scrollEventThrottle={16}
              decelerationRate='normal'
              alwaysBounceVertical={false}
            >
              {/* Current Status Card */}
              <View style={styles.statusCard}>
                <View style={styles.statusHeader}>
                  <TrendingUp size={18} color={colors.textSecondary} />
                  <Text style={styles.statusTitle}>Current Status</Text>
                </View>
                <View style={styles.currentStats}>
                  <View style={styles.statCard}>
                    <Text style={styles.statLabel}>Allocation</Text>
                    <Text style={styles.statValue}>{currentAllocation}</Text>
                  </View>
                  <View style={styles.statCard}>
                    <Text style={styles.statLabel}>Remaining</Text>
                    <Text
                      style={[
                        styles.statValue,
                        currentRemaining === 0 && styles.statValueWarning,
                      ]}
                    >
                      {currentRemaining}
                    </Text>
                  </View>
                  <View style={styles.statCard}>
                    <Text style={styles.statLabel}>Used</Text>
                    <Text style={styles.statValue}>
                      {currentAllocation - currentRemaining}
                    </Text>
                  </View>
                </View>
                <View style={styles.progressContainer}>
                  <View style={styles.progressBar}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: `${usagePercentage}%`,
                          backgroundColor:
                            usagePercentage > 50
                              ? colors.success
                              : usagePercentage > 25
                                ? colors.warning
                                : colors.error,
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.progressText}>
                    {usagePercentage}% remaining
                  </Text>
                </View>
              </View>

              {/* Input Section */}
              <View style={styles.formSection}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Update Settings</Text>
                </View>

                {/* Allocation Input */}
                <View style={styles.inputSection}>
                  <View style={styles.inputHeader}>
                    <Text style={styles.inputLabel}>
                      Free Ticket Limit (Allocation)
                    </Text>
                    <View style={styles.infoTooltip}>
                      <Info size={14} color={colors.textSecondary} />
                    </View>
                  </View>
                  <Text style={styles.inputDescription}>
                    Maximum number of free tickets this agent can have
                  </Text>
                  <View style={styles.numberInputContainer}>
                    <Pressable
                      style={styles.numberButton}
                      onPress={() => handleDecrement('allocation')}
                    >
                      <Minus size={18} color={colors.primary} />
                    </Pressable>
                    <View style={styles.numberInputWrapper}>
                      <RNTextInput
                        value={allocation}
                        onChangeText={text => {
                          const num = text.replace(/[^0-9]/g, '');
                          setAllocation(num);
                        }}
                        keyboardType='number-pad'
                        placeholder='0'
                        placeholderTextColor={colors.textSecondary}
                        style={styles.numberInput}
                      />
                    </View>
                    <Pressable
                      style={styles.numberButton}
                      onPress={() => handleIncrement('allocation')}
                    >
                      <Plus size={18} color={colors.primary} />
                    </Pressable>
                  </View>
                </View>

                {/* Add Tickets Input */}
                <View style={styles.inputSection}>
                  <View style={styles.inputHeader}>
                    <Text style={styles.inputLabel}>Add Free Tickets</Text>
                    <View style={styles.infoTooltip}>
                      <Info size={14} color={colors.textSecondary} />
                    </View>
                  </View>
                  <Text style={styles.inputDescription}>
                    Number of tickets to add to remaining count (will not exceed
                    allocation limit)
                  </Text>
                  <View style={styles.numberInputContainer}>
                    <Pressable
                      style={styles.numberButton}
                      onPress={() => handleDecrement('ticketsToAdd')}
                    >
                      <Minus size={18} color={colors.primary} />
                    </Pressable>
                    <View style={styles.numberInputWrapper}>
                      <RNTextInput
                        value={ticketsToAdd}
                        onChangeText={text => {
                          const num = text.replace(/[^0-9]/g, '');
                          setTicketsToAdd(num);
                        }}
                        keyboardType='number-pad'
                        placeholder='0'
                        placeholderTextColor={colors.textSecondary}
                        style={styles.numberInput}
                      />
                    </View>
                    <Pressable
                      style={styles.numberButton}
                      onPress={() => handleIncrement('ticketsToAdd')}
                    >
                      <Plus size={18} color={colors.primary} />
                    </Pressable>
                  </View>
                </View>
              </View>

              {/* Preview Section */}
              {hasChanges && parseInt(allocation, 10) >= 0 && (
                <View style={styles.previewCard}>
                  <View style={styles.previewHeader}>
                    <CheckCircle2 size={18} color={colors.primary} />
                    <Text style={styles.previewTitle}>Preview Changes</Text>
                  </View>
                  <View style={styles.previewStats}>
                    <View style={styles.previewStatItem}>
                      <Text style={styles.previewStatLabel}>
                        New Allocation
                      </Text>
                      <View style={styles.previewStatValue}>
                        <Text
                          style={[
                            styles.previewStatNumber,
                            parseInt(allocation, 10) !== currentAllocation &&
                              styles.changedValue,
                          ]}
                        >
                          {parseInt(allocation, 10) || 0}
                        </Text>
                        {parseInt(allocation, 10) !== currentAllocation && (
                          <Text style={styles.changeIndicator}>
                            {parseInt(allocation, 10) > currentAllocation
                              ? ' ↗'
                              : ' ↘'}
                          </Text>
                        )}
                      </View>
                    </View>
                    <View style={styles.previewStatItem}>
                      <Text style={styles.previewStatLabel}>New Remaining</Text>
                      <View style={styles.previewStatValue}>
                        <Text
                          style={[
                            styles.previewStatNumber,
                            newRemaining !== currentRemaining &&
                              styles.changedValue,
                          ]}
                        >
                          {newRemaining}
                        </Text>
                        {newRemaining !== currentRemaining && (
                          <Text style={styles.changeIndicator}>
                            {newRemaining > currentRemaining ? ' ↗' : ' ↘'}
                          </Text>
                        )}
                      </View>
                    </View>
                    <View style={styles.previewStatItem}>
                      <Text style={styles.previewStatLabel}>Usage</Text>
                      <Text style={styles.previewStatNumber}>
                        {newUsagePercentage}%
                      </Text>
                    </View>
                  </View>
                  <View style={styles.progressContainer}>
                    <View style={styles.progressBar}>
                      <View
                        style={[
                          styles.progressFill,
                          {
                            width: `${newUsagePercentage}%`,
                            backgroundColor:
                              newUsagePercentage > 50
                                ? colors.success
                                : newUsagePercentage > 25
                                  ? colors.warning
                                  : colors.error,
                          },
                        ]}
                      />
                    </View>
                  </View>
                  {parseInt(ticketsToAdd, 10) > 0 && (
                    <View style={styles.changeNote}>
                      <Plus size={14} color={colors.success} />
                      <Text style={styles.changeNoteText}>
                        Adding {parseInt(ticketsToAdd, 10)} ticket(s) to
                        remaining count
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </ScrollView>

            {/* Footer */}
            <View style={styles.footer}>
              <Button
                title='Cancel'
                variant='outline'
                onPress={handleClose}
                disabled={saving}
                style={styles.cancelButton}
              />
              <Button
                title={saving ? 'Saving...' : 'Save Changes'}
                variant='primary'
                onPress={handleSave}
                disabled={saving || !hasChanges}
                style={styles.saveButton}
              />
            </View>
          </View>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const { height: screenHeight, width: screenWidth } = Dimensions.get('window');

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 24,
    paddingHorizontal: Math.max(20, screenWidth * 0.05),
    width: '100%',
    height: screenHeight * 0.85,
    maxHeight: screenHeight * 0.92,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
    flexDirection: 'column',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
    paddingTop: 0,
    paddingHorizontal: 4,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${colors.primary}15`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  content: {
    flex: 1,
    minHeight: 0,
  },
  contentContainer: {
    paddingBottom: 24,
    paddingHorizontal: 4,
  },
  statusCard: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  currentStats: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.card,
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  statLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: 6,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.primary,
  },
  statValueWarning: {
    color: colors.error,
  },
  progressContainer: {
    marginTop: 8,
  },
  progressBar: {
    height: 8,
    backgroundColor: colors.borderLight,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
    textAlign: 'center',
  },
  formSection: {
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  sectionHeader: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  inputSection: {
    marginBottom: 20,
  },
  inputHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  inputLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  infoTooltip: {
    opacity: 0.6,
  },
  inputDescription: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 12,
    lineHeight: 18,
  },
  numberInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  numberButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  numberInputWrapper: {
    flex: 1,
  },
  numberInput: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
    minHeight: 48,
  },
  previewCard: {
    backgroundColor: `${colors.primary}10`,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    marginHorizontal: 4,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  previewStats: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  previewStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  previewStatLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: 6,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  previewStatValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  previewStatNumber: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.primary,
  },
  changedValue: {
    color: colors.success,
  },
  changeIndicator: {
    fontSize: 16,
    color: colors.success,
    fontWeight: '700',
  },
  changeNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    padding: 12,
    backgroundColor: `${colors.success}15`,
    borderRadius: 8,
  },
  changeNoteText: {
    fontSize: 13,
    color: colors.text,
    fontWeight: '500',
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    paddingTop: 16,
    paddingHorizontal: 4,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
  },
  saveButton: {
    flex: 1,
  },
});
