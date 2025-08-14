import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Alert,
  TextInput as RNTextInput,
  Dimensions,
} from 'react-native';
import { colors } from '@/constants/adminColors';
import { AdminManagement } from '@/types';
import Button from '@/components/admin/Button';
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

const SEAT_CLASSES = [
  { class: 'economy', label: 'Economy', color: '#6b7280' },
  { class: 'business', label: 'Business', color: '#3b82f6' },
  { class: 'first', label: 'First Class', color: '#8b5cf6' },
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
      Alert.alert('Error', 'Seat number is required');
      return;
    }

    if (editedSeat.row_number <= 0 || (editedSeat.position_x || 1) <= 0) {
      Alert.alert('Error', 'Row and column numbers must be greater than 0');
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
    Alert.alert(
      'Delete Seat',
      `Are you sure you want to delete seat ${editedSeat.seat_number}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            if (onDelete && editedSeat.id) {
              onDelete(editedSeat.id);
            }
          },
        },
      ]
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

  const getSeatClassData = (seatClass: string) => {
    return SEAT_CLASSES.find(c => c.class === seatClass) || SEAT_CLASSES[0];
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
          <TouchableOpacity
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
          </TouchableOpacity>
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
      transparent={true}
      onRequestClose={handleCancel}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View
                style={[
                  styles.seatTypeIcon,
                  { backgroundColor: `${currentTypeData.color}20` },
                ]}
              >
                <currentTypeData.icon size={24} color={currentTypeData.color} />
              </View>
              <View style={styles.headerContent}>
                <Text style={styles.title}>
                  {isNewSeat
                    ? 'Add New Seat'
                    : `Edit Seat ${editedSeat.seat_number}`}
                </Text>
                <Text style={styles.subtitle}>
                  {isNewSeat
                    ? 'Configure new seat properties'
                    : 'Modify seat configuration'}
                </Text>
              </View>
            </View>
            <TouchableOpacity style={styles.closeButton} onPress={handleCancel}>
              <X size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={false}
          >
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

            {/* Quick Seat Type Selection */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Seat Type & Class</Text>
              <View style={styles.quickSelection}>
                {SEAT_TYPES.map(type => (
                  <TouchableOpacity
                    key={type.type}
                    style={[
                      styles.quickOption,
                      editedSeat.seat_type === type.type &&
                        styles.quickOptionSelected,
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
                    <type.icon
                      size={20}
                      color={
                        editedSeat.seat_type === type.type
                          ? colors.primary
                          : type.color
                      }
                    />
                    <Text
                      style={[
                        styles.quickOptionText,
                        editedSeat.seat_type === type.type &&
                          styles.quickOptionTextSelected,
                      ]}
                    >
                      {type.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Class selection only for standard/premium seats */}
              {(editedSeat.seat_type === 'standard' ||
                editedSeat.seat_type === 'premium') && (
                <View style={styles.classSelection}>
                  <Text style={styles.subLabel}>Class</Text>
                  <View style={styles.classButtons}>
                    {SEAT_CLASSES.map(seatClass => (
                      <TouchableOpacity
                        key={seatClass.class}
                        style={[
                          styles.classButton,
                          editedSeat.seat_class === seatClass.class &&
                            styles.classButtonSelected,
                        ]}
                        onPress={() =>
                          updateSeat({
                            seat_class: seatClass.class as any,
                            is_premium:
                              seatClass.class === 'business' ||
                              seatClass.class === 'first',
                          })
                        }
                      >
                        <Text
                          style={[
                            styles.classButtonText,
                            editedSeat.seat_class === seatClass.class &&
                              styles.classButtonTextSelected,
                          ]}
                        >
                          {seatClass.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}
            </View>

            {/* Seat Properties */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Position & Features</Text>
              <View style={styles.propertiesGrid}>
                <TouchableOpacity
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
                </TouchableOpacity>

                <TouchableOpacity
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
                </TouchableOpacity>

                <TouchableOpacity
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
                </TouchableOpacity>
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
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <View style={styles.footerActions}>
              {!isNewSeat && onDelete && (
                <Button
                  title='Delete'
                  onPress={handleDelete}
                  variant='danger'
                  icon={<Trash2 size={16} color={colors.white} />}
                  style={styles.deleteButton}
                />
              )}
              <View style={styles.primaryActions}>
                <Button
                  title='Cancel'
                  onPress={handleCancel}
                  variant='secondary'
                  style={styles.cancelButton}
                />
                <Button
                  title={isNewSeat ? 'Add Seat' : 'Save Changes'}
                  onPress={handleSave}
                  variant='primary'
                  icon={<Save size={16} color={colors.white} />}
                  style={styles.saveButton}
                />
              </View>
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
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modal: {
    backgroundColor: colors.background,
    borderRadius: 20,
    minHeight: Math.max(500, screenHeight * 0.6),
    width: Math.min(screenWidth - 32, 420),
    maxHeight: screenHeight * 0.92,
    overflow: 'hidden',
    elevation: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 15 },
    shadowOpacity: 0.3,
    shadowRadius: 25,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 24,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    minHeight: 88,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  seatTypeIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
    letterSpacing: 0.2,
  },
  subtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  content: {
    flex: 1,
    paddingTop: 8,
  },
  section: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 18,
    letterSpacing: 0.3,
  },
  infoGrid: {
    gap: 16,
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
  featuresContainer: {
    gap: 18,
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
  priceContainer: {
    gap: 12,
  },
  priceField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
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
  priceDescription: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  footer: {
    padding: 24,
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    minHeight: 90,
  },
  footerActions: {
    gap: 16,
  },
  primaryActions: {
    flexDirection: 'row',
    gap: 16,
  },
  deleteButton: {
    alignSelf: 'flex-start',
    minWidth: 100,
  },
  cancelButton: {
    flex: 1,
    minHeight: 48,
  },
  saveButton: {
    flex: 1,
    minHeight: 48,
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
  // Quick selection styles
  quickSelection: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  quickOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    gap: 8,
    flex: 1,
    minWidth: 80,
  },
  quickOptionSelected: {
    backgroundColor: `${colors.primary}15`,
    borderColor: colors.primary,
  },
  quickOptionText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    textAlign: 'center',
  },
  quickOptionTextSelected: {
    color: colors.primary,
  },
  // Class selection styles
  classSelection: {
    gap: 10,
  },
  subLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 6,
  },
  classButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  classButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  classButtonSelected: {
    backgroundColor: `${colors.primary}15`,
    borderColor: colors.primary,
  },
  classButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  classButtonTextSelected: {
    color: colors.primary,
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
