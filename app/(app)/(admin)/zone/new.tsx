import React, { useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Alert,
    TextInput,
    ActivityIndicator,
    Dimensions,
} from "react-native";
import { Stack, router } from "expo-router";
import { colors } from "@/constants/adminColors";
import { useContentStore } from "@/store/admin/contentStore";
import { useAdminPermissions } from "@/hooks/useAdminPermissions";
import { ZoneFormData } from "@/types/content";
import {
    validateZoneForm,
    createDefaultZoneFormData,
    isDuplicateZoneName,
    isDuplicateZoneCode,
    formatZoneCode
} from "@/utils/zoneUtils";
import {
    ArrowLeft,
    Save,
    X,
    AlertTriangle,
    Globe,
    Hash,
    FileText,
    Palette,
    ToggleLeft,
    ToggleRight,
} from "lucide-react-native";

// Components
import Button from "@/components/admin/Button";
import Switch from "@/components/admin/Switch";

const { width: screenWidth } = Dimensions.get('window');
const isTablet = screenWidth >= 768;

export default function NewZoneScreen() {
    const { canManageSettings } = useAdminPermissions();
    const { zones, addZone } = useContentStore();

    const [formData, setFormData] = useState<ZoneFormData>(createDefaultZoneFormData());
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isSaving, setIsSaving] = useState(false);

    const validateForm = (): boolean => {
        const validationErrors = validateZoneForm(formData);
        const errorMap: Record<string, string> = {};

        // Check for duplicates
        if (isDuplicateZoneName(zones || [], formData.name)) {
            validationErrors.push({ field: 'name', message: 'Zone name already exists' });
        }

        if (isDuplicateZoneCode(zones || [], formData.code)) {
            validationErrors.push({ field: 'code', message: 'Zone code already exists' });
        }

        validationErrors.forEach(error => {
            errorMap[error.field] = error.message;
        });

        setErrors(errorMap);
        return validationErrors.length === 0;
    };

    const handleSave = async () => {
        if (!validateForm()) return;

        setIsSaving(true);
        try {
            // Calculate next order index
            const maxOrder = Math.max(...(zones || []).map(z => z.order_index), -1);
            const nextOrderIndex = maxOrder + 1;

            await addZone({
                ...formData,
                code: formatZoneCode(formData.code),
                order_index: formData.order_index || nextOrderIndex,
            });

            router.back();
            Alert.alert("Success", "Zone created successfully");
        } catch (error) {
            Alert.alert("Error", "Failed to create zone");
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancel = () => {
        router.back();
    };

    const updateFormField = (field: keyof ZoneFormData, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: '' }));
        }
    };

    const renderColorPicker = () => (
        <View style={styles.colorPickerContainer}>
            <Text style={styles.sectionLabel}>
                Color <Text style={styles.required}>*</Text>
            </Text>
            <View style={styles.colorGrid}>
                {ZONE_COLOR_OPTIONS.map((color) => (
                    <TouchableOpacity
                        key={color}
                        style={[
                            styles.colorOption,
                            { backgroundColor: color },
                            formData.color === color && styles.colorOptionSelected
                        ]}
                        onPress={() => updateFormField('color', color)}
                    >
                        {formData.color === color && (
                            <View style={styles.colorSelectedIndicator} />
                        )}
                    </TouchableOpacity>
                ))}
            </View>
            {errors.color && <Text style={styles.errorText}>{errors.color}</Text>}
        </View>
    );

    const renderIconPicker = () => (
        <View style={styles.iconPickerContainer}>
            <Text style={styles.sectionLabel}>
                Icon <Text style={styles.required}>*</Text>
            </Text>
            <View style={styles.iconGrid}>
                {ZONE_ICON_OPTIONS.map((icon) => (
                    <TouchableOpacity
                        key={icon}
                        style={[
                            styles.iconOption,
                            formData.icon === icon && styles.iconOptionSelected
                        ]}
                        onPress={() => updateFormField('icon', icon)}
                    >
                        <Text style={styles.iconText}>{icon}</Text>
                    </TouchableOpacity>
                ))}
            </View>
            {errors.icon && <Text style={styles.errorText}>{errors.icon}</Text>}
        </View>
    );

    if (!canManageSettings()) {
        return (
            <View style={styles.container}>
                <Stack.Screen
                    options={{
                        title: "Access Denied",
                        headerLeft: () => (
                            <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
                                <ArrowLeft size={24} color={colors.primary} />
                            </TouchableOpacity>
                        ),
                    }}
                />
                <View style={styles.errorContainer}>
                    <AlertTriangle size={48} color={colors.error} />
                    <Text style={styles.errorTitle}>Access Denied</Text>
                    <Text style={styles.errorText}>You don't have permission to create zones.</Text>
                    <Button title="Go Back" onPress={() => router.back()} variant="primary" />
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Stack.Screen
                options={{
                    title: "Create Zone",
                    headerLeft: () => (
                        <TouchableOpacity onPress={handleCancel} style={styles.headerButton}>
                            <ArrowLeft size={24} color={colors.primary} />
                        </TouchableOpacity>
                    ),
                    headerRight: () => (
                        <View style={styles.headerRightContainer}>
                            <TouchableOpacity
                                onPress={handleSave}
                                style={styles.headerButton}
                                disabled={isSaving}
                            >
                                {isSaving ? (
                                    <ActivityIndicator size="small" color={colors.primary} />
                                ) : (
                                    <Save size={20} color={colors.primary} />
                                )}
                            </TouchableOpacity>
                            <TouchableOpacity onPress={handleCancel} style={styles.headerButton}>
                                <X size={20} color={colors.textSecondary} />
                            </TouchableOpacity>
                        </View>
                    ),
                }}
            />

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                {/* Zone Preview */}
                <View style={styles.previewCard}>
                    <Text style={styles.previewTitle}>Zone Preview</Text>
                    <View style={styles.previewHeader}>
                        <View style={styles.previewIcon}>
                            <Text style={styles.previewIconText}>
                                📍
                            </Text>
                        </View>
                        <View style={styles.previewInfo}>
                            <Text style={styles.previewName}>
                                {formData.name || 'Zone Name'}
                            </Text>
                            <View style={styles.previewCodeBadge}>
                                <Text style={styles.previewCode}>
                                    {formData.code || 'CODE'}
                                </Text>
                            </View>
                        </View>
                        <View style={[
                            styles.previewStatus,
                            formData.is_active ? styles.statusActive : styles.statusInactive
                        ]}>
                            <View style={[
                                styles.statusDot,
                                { backgroundColor: formData.is_active ? colors.success : colors.textTertiary }
                            ]} />
                            <Text style={[
                                styles.statusText,
                                { color: formData.is_active ? colors.success : colors.textTertiary }
                            ]}>
                                {formData.is_active ? 'Active' : 'Inactive'}
                            </Text>
                        </View>
                    </View>
                    {formData.description && (
                        <Text style={styles.previewDescription}>{formData.description}</Text>
                    )}
                </View>

                {/* Basic Information */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Basic Information</Text>

                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>
                            Zone Name <Text style={styles.required}>*</Text>
                        </Text>
                        <TextInput
                            style={[styles.input, errors.name && styles.inputError]}
                            value={formData.name}
                            onChangeText={(text) => updateFormField('name', text)}
                            placeholder="Enter zone name (e.g., North Zone)"
                            placeholderTextColor={colors.textTertiary}
                            autoCapitalize="words"
                        />
                        {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>
                            Zone Code <Text style={styles.required}>*</Text>
                        </Text>
                        <TextInput
                            style={[styles.input, errors.code && styles.inputError]}
                            value={formData.code}
                            onChangeText={(text) => updateFormField('code', text.toUpperCase())}
                            placeholder="Enter zone code (e.g., NORTH)"
                            placeholderTextColor={colors.textTertiary}
                            autoCapitalize="characters"
                            maxLength={10}
                        />
                        <Text style={styles.inputHint}>
                            Unique code used to identify this zone (letters, numbers, underscores, and hyphens only)
                        </Text>
                        {errors.code && <Text style={styles.errorText}>{errors.code}</Text>}
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Description</Text>
                        <TextInput
                            style={[styles.input, styles.textArea, errors.description && styles.inputError]}
                            value={formData.description}
                            onChangeText={(text) => updateFormField('description', text)}
                            placeholder="Enter a description for this zone (optional)"
                            placeholderTextColor={colors.textTertiary}
                            multiline
                            numberOfLines={3}
                            textAlignVertical="top"
                        />
                        {errors.description && <Text style={styles.errorText}>{errors.description}</Text>}
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Order Index</Text>
                        <TextInput
                            style={[styles.input, errors.order_index && styles.inputError]}
                            value={formData.order_index.toString()}
                            onChangeText={(text) => updateFormField('order_index', parseInt(text) || 0)}
                            placeholder="0"
                            placeholderTextColor={colors.textTertiary}
                            keyboardType="numeric"
                        />
                        <Text style={styles.inputHint}>
                            Used to determine the display order of zones (lower numbers appear first)
                        </Text>
                        {errors.order_index && <Text style={styles.errorText}>{errors.order_index}</Text>}
                    </View>
                </View>

                {/* Appearance */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Appearance</Text>

                </View>

                {/* Status */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Status</Text>
                    <View style={styles.switchContainer}>
                        <View style={styles.switchInfo}>
                            <Text style={styles.switchLabel}>Active Status</Text>
                            <Text style={styles.switchDescription}>
                                {formData.is_active
                                    ? "Zone will be active and visible to users"
                                    : "Zone will be inactive and hidden from users"
                                }
                            </Text>
                        </View>
                        <Switch
                            value={formData.is_active}
                            onValueChange={(value) => updateFormField('is_active', value)}
                        />
                    </View>
                </View>

                {/* Action Buttons */}
                <View style={styles.actionContainer}>
                    <Button
                        title="Create Zone"
                        onPress={handleSave}
                        variant="primary"
                        disabled={isSaving}
                        icon={isSaving ? <ActivityIndicator size="small" color={colors.white} /> : <Save size={20} color={colors.white} />}
                        style={styles.createButton}
                    />
                    <Button
                        title="Cancel"
                        onPress={handleCancel}
                        variant="secondary"
                        icon={<X size={20} color={colors.textSecondary} />}
                        style={styles.cancelButton}
                    />
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
    headerButton: {
        padding: 8,
        marginHorizontal: 4,
    },
    headerRightContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 20,
        paddingBottom: 40,
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        gap: 16,
    },
    errorTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: colors.text,
        textAlign: 'center',
    },
    errorText: {
        fontSize: 14,
        color: colors.error,
        marginTop: 4,
    },
    previewCard: {
        backgroundColor: colors.card,
        borderRadius: 16,
        padding: 20,
        marginBottom: 24,
        shadowColor: colors.shadowMedium,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
    },
    previewTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.textSecondary,
        marginBottom: 16,
        textAlign: 'center',
    },
    previewHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    previewIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    previewIconText: {
        fontSize: 24,
    },
    previewInfo: {
        flex: 1,
    },
    previewName: {
        fontSize: 20,
        fontWeight: '700',
        color: colors.text,
        marginBottom: 4,
    },
    previewCodeBadge: {
        alignSelf: 'flex-start',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 8,
    },
    previewCode: {
        fontSize: 14,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    previewStatus: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        gap: 6,
    },
    statusActive: {
        backgroundColor: colors.successLight,
    },
    statusInactive: {
        backgroundColor: colors.backgroundTertiary,
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    statusText: {
        fontSize: 14,
        fontWeight: '600',
    },
    previewDescription: {
        fontSize: 16,
        color: colors.textSecondary,
        lineHeight: 24,
        marginTop: 8,
    },
    section: {
        backgroundColor: colors.card,
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        shadowColor: colors.shadowLight,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.text,
        marginBottom: 16,
    },
    inputGroup: {
        marginBottom: 16,
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 8,
    },
    required: {
        color: colors.error,
    },
    input: {
        borderWidth: 1,
        borderColor: colors.borderLight,
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        color: colors.text,
        backgroundColor: colors.card,
    },
    inputError: {
        borderColor: colors.error,
    },
    inputHint: {
        fontSize: 12,
        color: colors.textTertiary,
        marginTop: 4,
        lineHeight: 16,
    },
    textArea: {
        minHeight: 80,
    },
    colorPickerContainer: {
        marginBottom: 16,
    },
    sectionLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 12,
    },
    colorGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    colorOption: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: 'transparent',
    },
    colorOptionSelected: {
        borderColor: colors.text,
    },
    colorSelectedIndicator: {
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: colors.white,
    },
    iconPickerContainer: {
        marginBottom: 16,
    },
    iconGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    iconOption: {
        width: 48,
        height: 48,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.backgroundTertiary,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    iconOptionSelected: {
        borderColor: colors.primary,
        backgroundColor: colors.primaryLight,
    },
    iconText: {
        fontSize: 24,
    },
    switchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    switchInfo: {
        flex: 1,
        marginRight: 16,
    },
    switchLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 4,
    },
    switchDescription: {
        fontSize: 14,
        color: colors.textSecondary,
        lineHeight: 20,
    },
    actionContainer: {
        gap: 12,
        marginTop: 8,
    },
    createButton: {
        minHeight: 48,
    },
    cancelButton: {
        minHeight: 48,
    },
}); 