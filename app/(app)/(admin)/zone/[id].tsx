import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Alert,
    RefreshControl,
    TextInput,
    Dimensions,
    ActivityIndicator,
} from "react-native";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { colors } from "@/constants/adminColors";
import { useContentStore } from "@/store/admin/contentStore";
import { useAdminPermissions } from "@/hooks/useAdminPermissions";
import { Zone, ZoneFormData, ZONE_COLOR_OPTIONS, ZONE_ICON_OPTIONS } from "@/types/content";
import {
    validateZoneForm,
    zoneToFormData,
    isDuplicateZoneName,
    isDuplicateZoneCode,
    formatZoneCode
} from "@/utils/zoneUtils";
import {
    ArrowLeft,
    Edit3,
    Save,
    X,
    Trash2,
    MapPin,
    Globe,
    Palette,
    Hash,
    FileText,
    ToggleLeft,
    ToggleRight,
    Calendar,
    Activity,
    AlertTriangle,
} from "lucide-react-native";

// Components
import Button from "@/components/admin/Button";
import LoadingSpinner from "@/components/admin/LoadingSpinner";
import Switch from "@/components/admin/Switch";

const { width: screenWidth } = Dimensions.get('window');
const isTablet = screenWidth >= 768;

export default function ZoneDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const { canViewSettings, canManageSettings } = useAdminPermissions();
    const { zones, getZone, updateZone, deleteZone, loading, fetchZones } = useContentStore();

    const [zone, setZone] = useState<Zone | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState<ZoneFormData>({
        name: '',
        code: '',
        description: '',
        color: ZONE_COLOR_OPTIONS[0],
        icon: ZONE_ICON_OPTIONS[0],
        is_active: true,
        order_index: 0,
    });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    // Load zone data
    useEffect(() => {
        if (id) {
            const zoneData = getZone(id);
            if (zoneData) {
                setZone(zoneData);
                setFormData(zoneToFormData(zoneData));
            } else {
                // Zone not found in store, try to fetch
                fetchZones();
            }
        }
    }, [id, zones]);

    const handleRefresh = async () => {
        setIsRefreshing(true);
        await fetchZones();
        if (id) {
            const refreshedZone = getZone(id);
            if (refreshedZone) {
                setZone(refreshedZone);
                if (!isEditing) {
                    setFormData(zoneToFormData(refreshedZone));
                }
            }
        }
        setIsRefreshing(false);
    };

    const validateForm = (): boolean => {
        const validationErrors = validateZoneForm(formData);
        const errorMap: Record<string, string> = {};

        // Check for duplicates if name or code changed
        if (zone && formData.name !== zone.name) {
            if (isDuplicateZoneName(zones || [], formData.name, zone.id)) {
                validationErrors.push({ field: 'name', message: 'Zone name already exists' });
            }
        }

        if (zone && formData.code !== zone.code) {
            if (isDuplicateZoneCode(zones || [], formData.code, zone.id)) {
                validationErrors.push({ field: 'code', message: 'Zone code already exists' });
            }
        }

        validationErrors.forEach(error => {
            errorMap[error.field] = error.message;
        });

        setErrors(errorMap);
        return validationErrors.length === 0;
    };

    const handleSave = async () => {
        if (!validateForm() || !zone) return;

        setIsSaving(true);
        try {
            await updateZone(zone.id, {
                ...formData,
                code: formatZoneCode(formData.code),
            });

            // Refresh zone data
            const updatedZone = getZone(zone.id);
            if (updatedZone) {
                setZone(updatedZone);
                setFormData(zoneToFormData(updatedZone));
            }

            setIsEditing(false);
            setErrors({});
            Alert.alert("Success", "Zone updated successfully");
        } catch (error) {
            Alert.alert("Error", "Failed to update zone");
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancel = () => {
        if (zone) {
            setFormData(zoneToFormData(zone));
        }
        setIsEditing(false);
        setErrors({});
    };

    const handleDelete = () => {
        if (!zone) return;

        Alert.alert(
            "Delete Zone",
            `Are you sure you want to delete "${zone.name}"? This action cannot be undone.`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        setIsDeleting(true);
                        try {
                            await deleteZone(zone.id);
                            router.back();
                            Alert.alert("Success", "Zone deleted successfully");
                        } catch (error) {
                            Alert.alert("Error", "Failed to delete zone");
                        } finally {
                            setIsDeleting(false);
                        }
                    }
                }
            ]
        );
    };

    const updateFormField = (field: keyof ZoneFormData, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: '' }));
        }
    };

    const renderColorPicker = () => (
        <View style={styles.colorPickerContainer}>
            <Text style={styles.sectionLabel}>Color</Text>
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
            <Text style={styles.sectionLabel}>Icon</Text>
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

    if (!canViewSettings()) {
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
                    <Text style={styles.errorText}>You don't have permission to view zone details.</Text>
                    <Button title="Go Back" onPress={() => router.back()} variant="primary" />
                </View>
            </View>
        );
    }

    if (loading.zones || !zone) {
        return (
            <View style={styles.container}>
                <Stack.Screen
                    options={{
                        title: "Loading...",
                        headerLeft: () => (
                            <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
                                <ArrowLeft size={24} color={colors.primary} />
                            </TouchableOpacity>
                        ),
                    }}
                />
                <View style={styles.loadingContainer}>
                    <LoadingSpinner />
                    <Text style={styles.loadingText}>Loading zone details...</Text>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Stack.Screen
                options={{
                    title: isEditing ? "Edit Zone" : zone.name,
                    headerLeft: () => (
                        <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
                            <ArrowLeft size={24} color={colors.primary} />
                        </TouchableOpacity>
                    ),
                    headerRight: () => (
                        <View style={styles.headerRightContainer}>
                            {canManageSettings() && !isEditing && (
                                <>
                                    <TouchableOpacity onPress={() => setIsEditing(true)} style={styles.headerButton}>
                                        <Edit3 size={20} color={colors.primary} />
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        onPress={handleDelete}
                                        style={[styles.headerButton, styles.deleteButton]}
                                        disabled={isDeleting}
                                    >
                                        {isDeleting ? (
                                            <ActivityIndicator size="small" color={colors.error} />
                                        ) : (
                                            <Trash2 size={20} color={colors.error} />
                                        )}
                                    </TouchableOpacity>
                                </>
                            )}
                            {isEditing && (
                                <>
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
                                </>
                            )}
                        </View>
                    ),
                }}
            />

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                refreshControl={
                    <RefreshControl
                        refreshing={isRefreshing}
                        onRefresh={handleRefresh}
                        colors={[colors.primary]}
                        tintColor={colors.primary}
                    />
                }
                showsVerticalScrollIndicator={false}
            >
                {/* Zone Preview */}
                <View style={styles.previewCard}>
                    <View style={styles.previewHeader}>
                        <View style={[styles.previewIcon, { backgroundColor: formData.color + '20' }]}>
                            <Text style={[styles.previewIconText, { color: formData.color }]}>
                                {formData.icon}
                            </Text>
                        </View>
                        <View style={styles.previewInfo}>
                            <Text style={styles.previewName}>{formData.name || 'Zone Name'}</Text>
                            <View style={[styles.previewCodeBadge, { backgroundColor: formData.color + '15' }]}>
                                <Text style={[styles.previewCode, { color: formData.color }]}>
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
                            placeholder="Enter zone name"
                            editable={isEditing}
                            placeholderTextColor={colors.textTertiary}
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
                            editable={isEditing}
                            placeholderTextColor={colors.textTertiary}
                            autoCapitalize="characters"
                            maxLength={10}
                        />
                        {errors.code && <Text style={styles.errorText}>{errors.code}</Text>}
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Description</Text>
                        <TextInput
                            style={[styles.input, styles.textArea, errors.description && styles.inputError]}
                            value={formData.description}
                            onChangeText={(text) => updateFormField('description', text)}
                            placeholder="Enter zone description"
                            editable={isEditing}
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
                            editable={isEditing}
                            placeholderTextColor={colors.textTertiary}
                            keyboardType="numeric"
                        />
                        {errors.order_index && <Text style={styles.errorText}>{errors.order_index}</Text>}
                    </View>
                </View>

                {/* Appearance */}
                {isEditing && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Appearance</Text>
                        {renderColorPicker()}
                        {renderIconPicker()}
                    </View>
                )}

                {/* Status */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Status</Text>
                    <View style={styles.switchContainer}>
                        <View style={styles.switchInfo}>
                            <Text style={styles.switchLabel}>Active Status</Text>
                            <Text style={styles.switchDescription}>
                                {formData.is_active
                                    ? "Zone is active and visible to users"
                                    : "Zone is inactive and hidden from users"
                                }
                            </Text>
                        </View>
                        <Switch
                            value={formData.is_active}
                            onValueChange={(value) => updateFormField('is_active', value)}
                            disabled={!isEditing}
                        />
                    </View>
                </View>

                {/* Statistics */}
                {!isEditing && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Statistics</Text>
                        <View style={styles.statsGrid}>
                            <View style={styles.statCard}>
                                <View style={styles.statIcon}>
                                    <MapPin size={20} color={colors.primary} />
                                </View>
                                <Text style={styles.statValue}>{zone.total_islands || 0}</Text>
                                <Text style={styles.statLabel}>Total Islands</Text>
                                {zone.active_islands !== undefined && (
                                    <Text style={styles.statSubLabel}>
                                        {zone.active_islands} active
                                    </Text>
                                )}
                            </View>

                            <View style={styles.statCard}>
                                <View style={styles.statIcon}>
                                    <Globe size={20} color={colors.info} />
                                </View>
                                <Text style={styles.statValue}>{zone.total_routes || 0}</Text>
                                <Text style={styles.statLabel}>Total Routes</Text>
                                {zone.active_routes !== undefined && (
                                    <Text style={styles.statSubLabel}>
                                        {zone.active_routes} active
                                    </Text>
                                )}
                            </View>
                        </View>
                    </View>
                )}

                {/* Metadata */}
                {!isEditing && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Metadata</Text>
                        <View style={styles.metadataContainer}>
                            <View style={styles.metadataItem}>
                                <Calendar size={16} color={colors.textSecondary} />
                                <Text style={styles.metadataLabel}>Created:</Text>
                                <Text style={styles.metadataValue}>
                                    {new Date(zone.created_at).toLocaleDateString('en-US', {
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric'
                                    })}
                                </Text>
                            </View>
                            <View style={styles.metadataItem}>
                                <Activity size={16} color={colors.textSecondary} />
                                <Text style={styles.metadataLabel}>Last Updated:</Text>
                                <Text style={styles.metadataValue}>
                                    {new Date(zone.updated_at).toLocaleDateString('en-US', {
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric'
                                    })}
                                </Text>
                            </View>
                        </View>
                    </View>
                )}
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
    deleteButton: {
        marginLeft: 8,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 20,
        paddingBottom: 40,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 16,
    },
    loadingText: {
        fontSize: 16,
        color: colors.textSecondary,
        fontWeight: '500',
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
    statsGrid: {
        flexDirection: 'row',
        gap: 16,
    },
    statCard: {
        flex: 1,
        backgroundColor: colors.backgroundTertiary,
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
    },
    statIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.primaryLight,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
    },
    statValue: {
        fontSize: 24,
        fontWeight: '700',
        color: colors.text,
        marginBottom: 4,
    },
    statLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.textSecondary,
        textAlign: 'center',
    },
    statSubLabel: {
        fontSize: 12,
        color: colors.textTertiary,
        marginTop: 2,
    },
    metadataContainer: {
        gap: 12,
    },
    metadataItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    metadataLabel: {
        fontSize: 14,
        fontWeight: '500',
        color: colors.textSecondary,
        minWidth: 100,
    },
    metadataValue: {
        fontSize: 14,
        color: colors.text,
        flex: 1,
    },
}); 