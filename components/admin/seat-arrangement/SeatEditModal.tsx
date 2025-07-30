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
    Plus,
    Minus,
} from 'lucide-react-native';

type Seat = AdminManagement.Seat;

interface SeatEditModalProps {
    seat: Seat | null;
    visible: boolean;
    onSave: (seat: Seat) => void;
    onDelete?: (seatId: string) => void;
    onCancel: () => void;
}

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
            setIsNewSeat(false);
        } else {
            // Create a new seat template
            const newSeat: Seat = {
                id: `new_seat_${Date.now()}`,
                vessel_id: '',
                layout_id: '',
                seat_number: '',
                row_number: 1,
                position_x: 1,
                position_y: 1,
                is_window: false,
                is_aisle: false,
                seat_type: 'standard',
                seat_class: 'economy',
                is_disabled: false,
                is_premium: false,
                price_multiplier: 1.0,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            };
            setEditedSeat(newSeat);
            setIsNewSeat(true);
        }
    }, [seat]);

    const handleSave = () => {
        if (!editedSeat) return;

        // Validate required fields
        if (!editedSeat.seat_number.trim()) {
            Alert.alert('Error', 'Seat number is required');
            return;
        }

        if (editedSeat.row_number <= 0 || (editedSeat.position_x || 1) <= 0) {
            Alert.alert('Error', 'Row and column numbers must be greater than 0');
            return;
        }

        onSave(editedSeat);
    };

    const handleDelete = () => {
        if (!editedSeat) return;

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

    const getSeatTypeIcon = (type: string) => {
        switch (type) {
            case 'premium':
                return Crown;
            case 'crew':
                return Anchor;
            case 'disabled':
                return UserCheck;
            default:
                return User;
        }
    };

    const getSeatTypeColor = (type: string) => {
        switch (type) {
            case 'premium':
                return colors.primary;
            case 'crew':
                return colors.warning;
            case 'disabled':
                return colors.danger;
            default:
                return colors.success;
        }
    };

    if (!editedSeat) return null;

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={handleCancel}
        >
            <View style={styles.overlay}>
                <View style={styles.modal}>
                    {/* Header */}
                    <View style={styles.header}>
                        <View style={styles.headerLeft}>
                            <View style={[
                                styles.seatTypeIcon,
                                { backgroundColor: getSeatTypeColor(editedSeat.seat_type) + '20' }
                            ]}>
                                {React.createElement(getSeatTypeIcon(editedSeat.seat_type), {
                                    size: 20,
                                    color: getSeatTypeColor(editedSeat.seat_type)
                                })}
                            </View>
                            <View style={styles.headerContent}>
                                <Text style={styles.title}>
                                    {isNewSeat ? 'Add New Seat' : `Edit Seat ${editedSeat.seat_number}`}
                                </Text>
                                <Text style={styles.subtitle}>
                                    {isNewSeat ? 'Configure new seat properties' : 'Modify seat configuration'}
                                </Text>
                            </View>
                        </View>
                        <TouchableOpacity
                            style={styles.closeButton}
                            onPress={handleCancel}
                        >
                            <X size={20} color={colors.textSecondary} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                        {/* Basic Information */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Basic Information</Text>

                            {isNewSeat ? (
                                <View style={styles.infoGrid}>
                                    <View style={styles.infoItem}>
                                        <Text style={styles.infoLabel}>Seat Number</Text>
                                        <CustomTextInput
                                            style={styles.textInput}
                                            value={editedSeat.seat_number}
                                            onChangeText={(text: string) => updateSeat({ seat_number: text })}
                                            placeholder="e.g., A1, B2"
                                        />
                                    </View>
                                    <View style={styles.infoItem}>
                                        <Text style={styles.infoLabel}>Row</Text>
                                        <CustomTextInput
                                            style={styles.textInput}
                                            value={editedSeat.row_number.toString()}
                                            onChangeText={(text: string) => updateSeat({ row_number: parseInt(text) || 1 })}
                                            placeholder="Row number"
                                            keyboardType="numeric"
                                        />
                                    </View>
                                    <View style={styles.infoItem}>
                                        <Text style={styles.infoLabel}>Column</Text>
                                        <CustomTextInput
                                            style={styles.textInput}
                                            value={(editedSeat.position_x || 1).toString()}
                                            onChangeText={(text: string) => updateSeat({ position_x: parseInt(text) || 1 })}
                                            placeholder="Column number"
                                            keyboardType="numeric"
                                        />
                                    </View>
                                </View>
                            ) : (
                                <View style={styles.infoGrid}>
                                    <View style={styles.infoItem}>
                                        <Text style={styles.infoLabel}>Seat Number</Text>
                                        <Text style={styles.infoValue}>{editedSeat.seat_number}</Text>
                                    </View>
                                    <View style={styles.infoItem}>
                                        <Text style={styles.infoLabel}>Row</Text>
                                        <Text style={styles.infoValue}>{editedSeat.row_number}</Text>
                                    </View>
                                    <View style={styles.infoItem}>
                                        <Text style={styles.infoLabel}>Column</Text>
                                        <Text style={styles.infoValue}>{editedSeat.position_x}</Text>
                                    </View>
                                </View>
                            )}
                        </View>

                        {/* Seat Type */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Seat Type</Text>
                            <View style={styles.typeGrid}>
                                {[
                                    { type: 'standard', label: 'Standard', icon: User },
                                    { type: 'premium', label: 'Premium', icon: Crown },
                                    { type: 'crew', label: 'Crew', icon: Anchor },
                                    { type: 'disabled', label: 'Disabled', icon: UserCheck },
                                ].map(({ type, label, icon: Icon }) => (
                                    <TouchableOpacity
                                        key={type}
                                        style={[
                                            styles.typeOption,
                                            editedSeat.seat_type === type && styles.typeOptionSelected,
                                            !editedSeat.seat_type && type === 'standard' && styles.typeOptionSelected, // Default to standard if no type selected
                                            editedSeat.seat_type !== type && styles.typeOptionUnselected,
                                        ]}
                                        onPress={() => updateSeat({ seat_type: type as any })}
                                    >
                                        <Icon
                                            size={20}
                                            color={editedSeat.seat_type === type ? colors.white : getSeatTypeColor(type)}
                                        />
                                        <Text style={[
                                            styles.typeOptionText,
                                            editedSeat.seat_type === type && styles.typeOptionTextSelected,
                                            editedSeat.seat_type !== type && styles.typeOptionTextUnselected,
                                        ]}>
                                            {label}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        {/* Seat Class */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Seat Class</Text>
                            <View style={styles.typeGrid}>
                                {[
                                    { class: 'economy', label: 'Economy' },
                                    { class: 'business', label: 'Business' },
                                    { class: 'first', label: 'First Class' },
                                ].map(({ class: seatClass, label }) => (
                                    <TouchableOpacity
                                        key={seatClass}
                                        style={[
                                            styles.typeOption,
                                            editedSeat.seat_class === seatClass && styles.typeOptionSelected,
                                            editedSeat.seat_class !== seatClass && styles.typeOptionUnselected,
                                        ]}
                                        onPress={() => updateSeat({ seat_class: seatClass as any })}
                                    >
                                        <Text style={[
                                            styles.typeOptionText,
                                            editedSeat.seat_class === seatClass && styles.typeOptionTextSelected,
                                            editedSeat.seat_class !== seatClass && styles.typeOptionTextUnselected,
                                        ]}>
                                            {label}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        {/* Seat Features */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Seat Features</Text>

                            <View style={styles.featureGrid}>
                                <View style={styles.featureItem}>
                                    <Switch
                                        label="Window Seat"
                                        value={editedSeat.is_window}
                                        onValueChange={(value) => updateSeat({ is_window: value })}
                                        description="Seat is located next to a window"
                                    />
                                </View>

                                <View style={styles.featureItem}>
                                    <Switch
                                        label="Aisle Seat"
                                        value={editedSeat.is_aisle}
                                        onValueChange={(value) => updateSeat({ is_aisle: value })}
                                        description="Seat is located next to an aisle"
                                    />
                                </View>

                                <View style={styles.featureItem}>
                                    <Switch
                                        label="Premium Seat"
                                        value={editedSeat.is_premium}
                                        onValueChange={(value) => updateSeat({ is_premium: value })}
                                        description="Seat has premium features and pricing"
                                    />
                                </View>

                                <View style={styles.featureItem}>
                                    <Switch
                                        label="Disabled Seat"
                                        value={editedSeat.is_disabled}
                                        onValueChange={(value) => updateSeat({ is_disabled: value })}
                                        description="Seat is disabled and not available for booking"
                                    />
                                </View>
                            </View>
                        </View>

                        {/* Price Multiplier */}
                        <View style={styles.priceSection}>
                            <View style={styles.priceHeader}>
                                <Text style={styles.priceLabel}>Price Multiplier</Text>
                                <Text style={styles.priceValue}>{editedSeat.price_multiplier}x</Text>
                            </View>
                            <Text style={styles.sectionDescription}>
                                Adjust the price multiplier for this seat (1.0 = standard price)
                            </Text>

                            <View style={styles.priceControls}>
                                <TouchableOpacity
                                    style={[styles.priceButton, editedSeat.price_multiplier <= 0.5 && styles.priceButtonDisabled]}
                                    onPress={() => {
                                        const newMultiplier = Math.max(0.5, editedSeat.price_multiplier - 0.1);
                                        updateSeat({ price_multiplier: parseFloat(newMultiplier.toFixed(1)) });
                                    }}
                                    disabled={editedSeat.price_multiplier <= 0.5}
                                >
                                    <Minus size={16} color={colors.white} />
                                </TouchableOpacity>

                                <Text style={styles.priceButtonText}>{editedSeat.price_multiplier}</Text>

                                <TouchableOpacity
                                    style={[styles.priceButton, editedSeat.price_multiplier >= 3.0 && styles.priceButtonDisabled]}
                                    onPress={() => {
                                        const newMultiplier = Math.min(3.0, editedSeat.price_multiplier + 0.1);
                                        updateSeat({ price_multiplier: parseFloat(newMultiplier.toFixed(1)) });
                                    }}
                                    disabled={editedSeat.price_multiplier >= 3.0}
                                >
                                    <Plus size={16} color={colors.white} />
                                </TouchableOpacity>
                            </View>
                        </View>
                    </ScrollView>

                    {/* Footer Actions */}
                    <View style={styles.footer}>
                        {!isNewSeat && onDelete && (
                            <Button
                                title="Delete"
                                onPress={handleDelete}
                                icon={<Trash2 size={16} color={colors.white} />}
                                variant="danger"
                                size="medium"
                            />
                        )}

                        <View style={styles.footerRight}>
                            <Button
                                title="Cancel"
                                onPress={handleCancel}
                                variant="outline"
                                size="medium"
                            />
                            <Button
                                title={isNewSeat ? "Add Seat" : "Save Changes"}
                                onPress={handleSave}
                                icon={isNewSeat ? <Plus size={16} color={colors.white} /> : <Save size={16} color={colors.white} />}
                                variant="primary"
                                size="medium"
                            />
                        </View>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

// Custom TextInput component to avoid import conflicts
const CustomTextInput = ({ style, ...props }: any) => (
    <View style={[styles.customTextInput, style]}>
        <RNTextInput
            {...props}
            style={styles.textInputField}
            placeholderTextColor={colors.textSecondary}
        />
    </View>
);

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modal: {
        backgroundColor: colors.background,
        borderRadius: 16,
        width: '100%',
        maxWidth: 500,
        height: '80%',
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 8,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    seatTypeIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    headerContent: {
        flex: 1,
    },
    title: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 2,
    },
    subtitle: {
        fontSize: 14,
        color: colors.textSecondary,
    },
    closeButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: colors.backgroundSecondary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    content: {
        flex: 1,
        padding: 20,
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 16,
    },
    sectionDescription: {
        fontSize: 14,
        color: colors.textSecondary,
        marginBottom: 12,
    },
    infoGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 16,
    },
    infoItem: {
        flex: 1,
        minWidth: 120,
    },
    infoLabel: {
        fontSize: 14,
        fontWeight: '500',
        color: colors.textSecondary,
        marginBottom: 8,
    },
    infoValue: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text,
        paddingVertical: 12,
        paddingHorizontal: 16,
        backgroundColor: colors.backgroundSecondary,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.border,
    },
    customTextInput: {
        backgroundColor: colors.backgroundSecondary,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.border,
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    textInputField: {
        fontSize: 16,
        color: colors.text,
        padding: 0,
    },
    textInput: {
        flex: 1,
    },
    typeGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    typeOption: {
        flex: 1,
        minWidth: 100,
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 8,
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
    },
    typeOptionSelected: {
        borderColor: colors.primary,
        backgroundColor: colors.primaryLight,
    },
    typeOptionUnselected: {
        borderColor: colors.border,
        backgroundColor: colors.backgroundSecondary,
    },
    typeOptionText: {
        fontSize: 14,
        fontWeight: '500',
    },
    typeOptionTextSelected: {
        color: colors.primary,
    },
    typeOptionTextUnselected: {
        color: colors.textSecondary,
    },
    featureGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 16,
    },
    featureItem: {
        flex: 1,
        minWidth: 120,
    },
    priceSection: {
        backgroundColor: colors.backgroundSecondary,
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
    },
    priceHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    priceLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text,
    },
    priceValue: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.primary,
    },
    priceControls: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
    },
    priceButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    priceButtonDisabled: {
        backgroundColor: colors.border,
    },
    priceButtonText: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.white,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        backgroundColor: colors.card,
        gap: 12,
    },
    footerLeft: {
        flexDirection: 'row',
        gap: 12,
    },
    footerRight: {
        flexDirection: 'row',
        gap: 12,
    },
}); 