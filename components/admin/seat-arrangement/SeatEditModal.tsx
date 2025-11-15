import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  TextInput as RNTextInput,
  Dimensions,
} from 'react-native';
import { colors } from '@/constants/adminColors';
import { useAlertContext } from '@/components/AlertProvider';
import { AdminManagement } from '@/types';
import Switch from '@/components/admin/Switch';
import {
  X,
  User,
  Crown,
  Anchor,
  UserCheck,
  Trash2,
  Save,
  DollarSign,
  Square,
  ArrowRight,
  Check,
} from 'lucide-react-native';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

type Seat = AdminManagement.Seat;

interface SeatEditModalProps {
  seat: Seat | null;
  visible: boolean;
  onSave: (seat: Seat) => void;
  onDelete?: (seatId: string) => void;
  onCancel: () => void;
}

// Constants for seat types and classes
const SEAT_TYPES = [
  { type: 'standard', label: 'Standard', icon: User, color: '#10b981' },
  { type: 'premium', label: 'Premium', icon: Crown, color: '#3b82f6' },
  { type: 'crew', label: 'Crew', icon: Anchor, color: '#f59e0b' },
  { type: 'disabled', label: 'Disabled', icon: UserCheck, color: '#ef4444' },
] as const;

const SEAT_FEATURES = [
  { key: 'is_window', label: 'Window Seat', description: 'Seat by the window' },
  { key: 'is_aisle', label: 'Aisle Seat', description: 'Seat next to aisle' },
  {
    key: 'is_disabled',
    label: 'Disabled Access',
    description: 'Wheelchair accessible',
  },
] as const;

export default function SeatEditModal({
  seat,
  visible,
  onSave,
  onDelete,
  onCancel,
}: SeatEditModalProps) {
  const { showError, showConfirmation } = useAlertContext();
  const [editedSeat, setEditedSeat] = useState<Seat | null>(null);
  const [isNewSeat, setIsNewSeat] = useState(false);

  useEffect(() => {
    if (seat) {
      setEditedSeat({ ...seat });
      setIsNewSeat(!seat.id);
    } else {
      setEditedSeat(null);
      setIsNewSeat(false);
    }
  }, [seat]);

  if (!editedSeat) return null;

  const handleSave = () => {
    // Validate required fields
    if (!editedSeat.seat_number.trim()) {
      showError('Error', 'Seat number is required');
      return;
    }

    if (editedSeat.row_number <= 0 || (editedSeat.position_x || 1) <= 0) {
      showError('Error', 'Row and column numbers must be greater than 0');
      return;
    }

    // Ensure is_premium is correctly set based on seat type and class
    const finalSeat = {
      ...editedSeat,
      is_premium:
        editedSeat.seat_type === 'premium' ||
        editedSeat.seat_class === 'business' ||
        editedSeat.seat_class === 'first',
    };

    onSave(finalSeat);
  };

  const handleDelete = () => {
    showConfirmation(
      'Delete Seat',
      `Are you sure you want to delete seat ${editedSeat.seat_number}?`,
      () => {
        if (onDelete && editedSeat.id) {
          onDelete(editedSeat.id);
        }
        onCancel();
      },
      undefined,
      true // Mark as destructive action
    );
  };

  const handleCancel = () => {
    setEditedSeat(null);
    setIsNewSeat(false);
    onCancel();
  };

  const updateSeat = (updates: Partial<Seat>) => {
    if (editedSeat) {
      setEditedSeat({ ...editedSeat, ...updates });
    }
  };

  const getSeatTypeData = (type: string) => {
    return SEAT_TYPES.find(t => t.type === type) || SEAT_TYPES[0];
  };

  // Reusable components
  const InfoField = ({
    label,
    value,
    editable = false,
    onChangeText,
    placeholder,
    keyboardType = 'default',
  }: {
    label: string;
    value: string;
    editable?: boolean;
    onChangeText?: (text: string) => void;
    placeholder?: string;
    keyboardType?: 'default' | 'numeric';
  }) => (
    <View style={styles.infoItem}>
      <Text style={styles.infoLabel}>{label}</Text>
      {editable ? (
        <CustomTextInput
          style={styles.textInput}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          keyboardType={keyboardType}
        />
      ) : (
        <Text style={styles.infoValue}>{value}</Text>
      )}
    </View>
  );

  const SelectionGrid = ({
    items,
    selectedValue,
    onSelect,
    getItemColor,
    renderIcon,
  }: {
    items: readonly any[];
    selectedValue: string;
    onSelect: (value: string) => void;
    getItemColor?: (item: any) => string;
    renderIcon?: (item: any) => React.ReactNode;
  }) => (
    <View style={styles.selectionGrid}>
      {items.map(item => {
        const value = item.type || item.class;
        const label = item.label;
        const isSelected =
          selectedValue === value ||
          (!selectedValue && value === items[0].type) ||
          value === items[0].class;

        return (
          <Pressable
            key={value}
            style={[
              styles.selectionOption,
              isSelected && styles.selectionOptionSelected,
            ]}
            onPress={() => onSelect(value)}
          >
            {renderIcon && renderIcon(item)}
            <Text
              style={[
                styles.selectionOptionText,
                isSelected && styles.selectionOptionTextSelected,
              ]}
            >
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );

  const FeatureSwitch = ({
    feature,
    description,
  }: {
    feature: { key: string; label: string; description: string };
    description?: string;
  }) => (
    <View style={styles.featureItem}>
      <View style={styles.featureInfo}>
        <Text style={styles.featureLabel}>{feature.label}</Text>
        {description && (
          <Text style={styles.featureDescription}>{description}</Text>
        )}
      </View>
      <Switch
        label=''
        value={editedSeat[feature.key as keyof Seat] as boolean}
        onValueChange={value => updateSeat({ [feature.key]: value })}
      />
    </View>
  );

  const currentTypeData = getSeatTypeData(editedSeat.seat_type);

  return (
    <Modal
      visible={visible}
      animationType='slide'
      presentationStyle='pageSheet'
      onRequestClose={handleCancel}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Pressable style={styles.modalCloseButton} onPress={handleCancel}>
            <X size={24} color={colors.text} />
          </Pressable>

          <View style={styles.modalTitleContainer}>
            <Text style={styles.modalTitle}>
              Edit Seat {seat?.seat_number || 'Unknown'}
            </Text>
            <Text style={styles.modalSubtitle}>Modify seat configuration</Text>
          </View>

          <View style={styles.modalHeaderSpacer} />
        </View>

        <ScrollView
          style={styles.modalScrollView}
          contentContainerStyle={styles.modalScrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.modalContentContainer}>
            {/* Seat Identity - Only show if editable */}
            {isNewSeat && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Seat Position</Text>
                <View style={styles.compactRow}>
                  <View style={styles.compactField}>
                    <Text style={styles.compactLabel}>Seat #</Text>
                    <CustomTextInput
                      style={styles.compactInput}
                      value={editedSeat.seat_number}
                      onChangeText={(text: string) =>
                        updateSeat({ seat_number: text })
                      }
                      placeholder='A1'
                    />
                  </View>
                  <View style={styles.compactField}>
                    <Text style={styles.compactLabel}>Row</Text>
                    <CustomTextInput
                      style={styles.compactInput}
                      value={editedSeat.row_number.toString()}
                      onChangeText={(text: string) =>
                        updateSeat({ row_number: parseInt(text) || 1 })
                      }
                      placeholder='1'
                      keyboardType='numeric'
                    />
                  </View>
                  <View style={styles.compactField}>
                    <Text style={styles.compactLabel}>Col</Text>
                    <CustomTextInput
                      style={styles.compactInput}
                      value={(editedSeat.position_x || 1).toString()}
                      onChangeText={(text: string) =>
                        updateSeat({ position_x: parseInt(text) || 1 })
                      }
                      placeholder='1'
                      keyboardType='numeric'
                    />
                  </View>
                </View>
              </View>
            )}

            {/* Seat Type Selection */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Seat Type</Text>
              <View style={styles.seatTypeGrid}>
                {SEAT_TYPES.map(type => (
                  <Pressable
                    key={type.type}
                    style={[
                      styles.seatTypeCard,
                      editedSeat.seat_type === type.type &&
                        styles.seatTypeCardSelected,
                    ]}
                    onPress={() => {
                      updateSeat({
                        seat_type: type.type as any,
                        seat_class:
                          type.type === 'premium'
                            ? 'business'
                            : type.type === 'crew'
                              ? 'economy'
                              : editedSeat.seat_class,
                        is_premium: type.type === 'premium',
                      });
                    }}
                  >
                    <View
                      style={[
                        styles.seatTypeIcon,
                        editedSeat.seat_type === type.type &&
                          styles.seatTypeIconSelected,
                      ]}
                    >
                      <type.icon
                        size={24}
                        color={
                          editedSeat.seat_type === type.type
                            ? colors.white
                            : type.color
                        }
                      />
                    </View>
                    <Text
                      style={[
                        styles.seatTypeLabel,
                        editedSeat.seat_type === type.type &&
                          styles.seatTypeLabelSelected,
                      ]}
                    >
                      {type.label}
                    </Text>
                    {editedSeat.seat_type === type.type && (
                      <View style={styles.seatTypeCheckmark}>
                        <Check size={16} color={colors.primary} />
                      </View>
                    )}
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Seat Name/Number */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Seat Name</Text>
              <View style={styles.seatNameContainer}>
                <RNTextInput
                  style={styles.seatNameInput}
                  value={editedSeat.seat_number}
                  onChangeText={text => updateSeat({ seat_number: text })}
                  placeholder='Enter seat name (e.g., A1, B2, VIP1)'
                  placeholderTextColor={colors.textSecondary}
                  maxLength={10}
                />
                <Text style={styles.seatNameHint}>
                  Custom name for this seat (max 10 characters)
                </Text>
              </View>
            </View>

            {/* Seat Properties */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Position & Features</Text>
              <View style={styles.propertiesGrid}>
                <Pressable
                  style={[
                    styles.propertyCard,
                    editedSeat.is_window && styles.propertyCardActive,
                  ]}
                  onPress={() =>
                    updateSeat({ is_window: !editedSeat.is_window })
                  }
                >
                  <View style={styles.propertyIcon}>
                    <Square
                      size={18}
                      color={
                        editedSeat.is_window
                          ? colors.primary
                          : colors.textSecondary
                      }
                    />
                  </View>
                  <Text
                    style={[
                      styles.propertyLabel,
                      editedSeat.is_window && styles.propertyLabelActive,
                    ]}
                  >
                    Window
                  </Text>
                </Pressable>

                <Pressable
                  style={[
                    styles.propertyCard,
                    editedSeat.is_aisle && styles.propertyCardActive,
                  ]}
                  onPress={() => updateSeat({ is_aisle: !editedSeat.is_aisle })}
                >
                  <View style={styles.propertyIcon}>
                    <ArrowRight
                      size={18}
                      color={
                        editedSeat.is_aisle
                          ? colors.primary
                          : colors.textSecondary
                      }
                    />
                  </View>
                  <Text
                    style={[
                      styles.propertyLabel,
                      editedSeat.is_aisle && styles.propertyLabelActive,
                    ]}
                  >
                    Aisle
                  </Text>
                </Pressable>

                <Pressable
                  style={[
                    styles.propertyCard,
                    editedSeat.is_disabled && styles.propertyCardActive,
                  ]}
                  onPress={() =>
                    updateSeat({ is_disabled: !editedSeat.is_disabled })
                  }
                >
                  <View style={styles.propertyIcon}>
                    <X
                      size={18}
                      color={
                        editedSeat.is_disabled
                          ? colors.danger
                          : colors.textSecondary
                      }
                    />
                  </View>
                  <Text
                    style={[
                      styles.propertyLabel,
                      editedSeat.is_disabled && { color: colors.danger },
                    ]}
                  >
                    Disabled
                  </Text>
                </Pressable>
              </View>
            </View>

            {/* Price Multiplier - Only for premium seats */}
            {(editedSeat.seat_type === 'premium' ||
              editedSeat.seat_class === 'business' ||
              editedSeat.seat_class === 'first') && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Price Adjustment</Text>
                <View style={styles.priceSection}>
                  <View style={styles.priceRow}>
                    <DollarSign size={20} color={colors.primary} />
                    <Text style={styles.priceLabel}>Multiplier</Text>
                    <CustomTextInput
                      style={styles.priceInput}
                      value={editedSeat.price_multiplier.toString()}
                      onChangeText={(text: string) => {
                        const value = Math.max(0.1, parseFloat(text) || 1.0);
                        updateSeat({ price_multiplier: value });
                      }}
                      placeholder='1.0'
                      keyboardType='decimal-pad'
                    />
                  </View>
                  <Text style={styles.priceHint}>
                    {editedSeat.price_multiplier < 1
                      ? '↓ Discounted'
                      : editedSeat.price_multiplier > 1
                        ? '↑ Premium pricing'
                        : '= Standard price'}
                  </Text>
                </View>
              </View>
            )}
          </View>
        </ScrollView>

        {/* Footer */}
        <View style={styles.modalFooter}>
          <View style={styles.footerButtonContainer}>
            {!isNewSeat && onDelete && (
              <Pressable style={styles.deleteButton} onPress={handleDelete}>
                <Trash2 size={18} color={colors.white} />
                <Text style={styles.deleteButtonText}>Delete</Text>
              </Pressable>
            )}

            <View style={styles.primaryButtonContainer}>
              <Pressable style={styles.cancelButton} onPress={handleCancel}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>

              <Pressable style={styles.saveButton} onPress={handleSave}>
                <Save size={18} color={colors.white} />
                <Text style={styles.saveButtonText}>
                  {isNewSeat ? 'Add Seat' : 'Save Changes'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// Custom TextInput component
const CustomTextInput = ({ style, ...props }: any) => (
  <RNTextInput
    style={[styles.baseTextInput, style]}
    placeholderTextColor={colors.textSecondary}
    {...props}
  />
);

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.card,
  },
  modalCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  modalTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 2,
  },
  modalHeaderSpacer: {
    width: 40,
  },
  modalScrollView: {
    flex: 1,
  },
  modalScrollContent: {
    paddingVertical: 20,
    paddingHorizontal: 20,
  },
  modalContentContainer: {
    width: '100%',
  },
  modalFooter: {
    padding: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.card,
  },
  footerButtonContainer: {
    gap: 16,
  },
  primaryButtonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  infoItem: {
    gap: 10,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '500',
    padding: 14,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 48,
  },
  baseTextInput: {
    fontSize: 16,
    color: colors.text,
    padding: 14,
    backgroundColor: colors.background,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.border,
    minHeight: 48,
  },
  textInput: {
    // Inherits from baseTextInput
  },
  seatNameContainer: {
    gap: 8,
  },
  seatNameInput: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '600',
    padding: 14,
    backgroundColor: colors.background,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.border,
    minHeight: 48,
    textAlign: 'center',
  },
  seatNameHint: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  selectionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  selectionOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 14,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    gap: 10,
    minWidth: 110,
    flex: 1,
  },
  selectionOptionSelected: {
    backgroundColor: `${colors.primary}15`,
    borderColor: colors.primary,
    borderWidth: 2,
  },
  selectionOptionText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
    textAlign: 'center',
    flex: 1,
  },
  selectionOptionTextSelected: {
    color: colors.primary,
    fontWeight: '700',
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 18,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  featureInfo: {
    flex: 1,
    marginRight: 16,
  },
  featureLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 3,
  },
  featureDescription: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  priceLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },
  priceInput: {
    width: 80,
    textAlign: 'center',
    backgroundColor: colors.background,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    backgroundColor: colors.error,
    borderRadius: 12,
    gap: 8,
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 20,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  saveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    backgroundColor: colors.primary,
    borderRadius: 12,
    gap: 8,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
  },
  // New compact styles
  compactRow: {
    flexDirection: 'row',
    gap: 12,
  },
  compactField: {
    flex: 1,
    gap: 6,
  },
  compactLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  compactInput: {
    fontSize: 16,
    color: colors.text,
    padding: 12,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    textAlign: 'center',
    fontWeight: '600',
  },
  // Seat type selection styles
  seatTypeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  seatTypeCard: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
    padding: 16,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.border,
    position: 'relative',
  },
  seatTypeCardSelected: {
    backgroundColor: `${colors.primary}10`,
    borderColor: colors.primary,
  },
  seatTypeIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 2,
    borderColor: colors.border,
  },
  seatTypeIconSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  seatTypeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    textAlign: 'center',
  },
  seatTypeLabelSelected: {
    color: colors.primary,
  },
  seatTypeCheckmark: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.primary,
  },
  // Properties grid styles
  propertiesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  propertyCard: {
    flex: 1,
    minWidth: '45%',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    gap: 10,
  },
  propertyCardActive: {
    backgroundColor: `${colors.primary}15`,
    borderColor: colors.primary,
  },
  propertyIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  propertyLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    flex: 1,
  },
  propertyLabelActive: {
    color: colors.primary,
  },
  // Price section styles
  priceSection: {
    gap: 12,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  priceHint: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
