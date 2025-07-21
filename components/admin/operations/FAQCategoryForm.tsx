import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Alert,
    KeyboardAvoidingView,
    Platform,
} from "react-native";
import { colors } from "@/constants/adminColors";
import { FAQCategory, FAQCategoryFormData } from "@/types/admin/management";
import { useFAQManagement } from "@/hooks/useFAQManagement";
import {
    Folder,
    Save,
    X,
    AlertCircle,
    FileText,
    Hash,
    ToggleLeft,
    Type,
    Info,
    Settings,
    RotateCcw,
} from "lucide-react-native";

// Components
import Button from "@/components/admin/Button";
import TextInput from "@/components/admin/TextInput";
import Switch from "@/components/admin/Switch";
import Dropdown from "@/components/admin/Dropdown";

interface FAQCategoryFormProps {
    category?: FAQCategory;
    onSuccess: () => void;
    onError: (error: string) => void;
    onCancel?: () => void;
}

const FAQCategoryForm: React.FC<FAQCategoryFormProps> = ({
    category,
    onSuccess,
    onError,
    onCancel,
}) => {
    const {
        createCategory,
        updateCategory,
        getAvailableCategoryOrderOptions,
        getSuggestedCategoryOrder
    } = useFAQManagement();

    const [formData, setFormData] = useState<FAQCategoryFormData>({
        name: category?.name || "",
        description: category?.description || "",
        order_index: category?.order_index || 0,
        is_active: category?.is_active ?? true,
    });

    const [initialData] = useState<FAQCategoryFormData>({
        name: category?.name || "",
        description: category?.description || "",
        order_index: category?.order_index || 0,
        is_active: category?.is_active ?? true,
    });

    const [errors, setErrors] = useState<Record<string, string>>({});
    const [submitting, setSubmitting] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);

    const isEditing = !!category;

    // Track form changes
    useEffect(() => {
        const hasFormChanges = JSON.stringify(formData) !== JSON.stringify(initialData);
        setHasChanges(hasFormChanges);
    }, [formData, initialData]);

    // Set suggested order for new categories
    useEffect(() => {
        if (!isEditing && formData.order_index === 0) {
            const suggestedOrder = getSuggestedCategoryOrder();
            setFormData((prev: FAQCategoryFormData) => ({ ...prev, order_index: suggestedOrder }));
        }
    }, [isEditing, getSuggestedCategoryOrder, formData.order_index]);

    // Get available order options
    const orderOptions = getAvailableCategoryOrderOptions().map(option => ({
        label: option.label,
        value: option.value.toString()
    }));

    const validateForm = (): boolean => {
        const newErrors: Record<string, string> = {};

        if (!formData.name.trim()) {
            newErrors.name = "Category name is required";
        } else if (formData.name.trim().length < 3) {
            newErrors.name = "Category name must be at least 3 characters long";
        } else if (formData.name.trim().length > 100) {
            newErrors.name = "Category name must be less than 100 characters";
        }

        if (formData.description && formData.description.length > 500) {
            newErrors.description = "Description must be less than 500 characters";
        }

        if (formData.order_index < 0) {
            newErrors.order_index = "Order index must be a positive number";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async () => {
        if (!validateForm()) {
            return;
        }

        setSubmitting(true);
        setErrors({});

        try {
            const cleanData = {
                ...formData,
                name: formData.name.trim(),
                description: formData.description?.trim(),
            };

            if (isEditing) {
                await updateCategory(category!.id, cleanData);
            } else {
                await createCategory(cleanData);
            }

            onSuccess();
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : `Failed to ${isEditing ? 'update' : 'create'} category`;
            onError(errorMessage);

            // Set field-specific errors if they exist in the error message
            if (errorMessage.toLowerCase().includes('name')) {
                setErrors({ name: errorMessage });
            } else if (errorMessage.toLowerCase().includes('description')) {
                setErrors({ description: errorMessage });
            } else {
                setErrors({ general: errorMessage });
            }
        } finally {
            setSubmitting(false);
        }
    };

    const handleFieldChange = (field: keyof FAQCategoryFormData, value: any) => {
        setFormData((prev: FAQCategoryFormData) => ({ ...prev, [field]: value }));

        // Clear error when field is being edited
        if (errors[field as string]) {
            setErrors((prev: Record<string, string>) => ({ ...prev, [field as string]: "" }));
        }
    };

    const handleReset = () => {
        setFormData(initialData);
        setErrors({});
        setHasChanges(false);
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerIcon}>
                    <Folder size={24} color={colors.primary} />
                </View>
                <View style={styles.headerContent}>
                    <Text style={styles.title}>
                        {isEditing ? "Edit FAQ Category" : "Create New Category"}
                    </Text>
                    <Text style={styles.subtitle}>
                        {isEditing
                            ? "Update the category information and settings"
                            : "Create a new category to organize your FAQs"
                        }
                    </Text>
                </View>
            </View>

            <KeyboardAvoidingView
                style={styles.keyboardContainer}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
            >
                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                    keyboardDismissMode="interactive"
                    showsVerticalScrollIndicator={false}
                    nestedScrollEnabled={true}
                    contentInsetAdjustmentBehavior="automatic"
                >
                    {/* Basic Information */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <View style={styles.sectionHeaderIcon}>
                                <Info size={20} color={colors.primary} />
                            </View>
                            <Text style={styles.sectionTitle}>Basic Information</Text>
                        </View>

                        <View style={styles.formGroup}>
                            <TextInput
                                label="Category Name"
                                value={formData.name}
                                onChangeText={(value) => handleFieldChange('name', value)}
                                placeholder="Enter category name"
                                error={errors.name}
                                required
                            />
                            <Text style={styles.helperText}>
                                Minimum 3 characters. Current: {formData.name.length}
                            </Text>
                        </View>

                        <View style={styles.formGroup}>
                            <TextInput
                                label="Description"
                                value={formData.description || ""}
                                onChangeText={(value) => handleFieldChange('description', value)}
                                placeholder="Enter a brief description (optional)"
                                multiline
                                numberOfLines={3}
                                error={errors.description}
                            />
                            <Text style={styles.helperText}>
                                Optional. Maximum 500 characters. Current: {(formData.description || "").length}
                            </Text>
                        </View>
                    </View>

                    {/* Settings */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <View style={[
                                styles.sectionHeaderIcon,
                                { backgroundColor: formData.is_active ? colors.successLight : colors.backgroundTertiary }
                            ]}>
                                <Settings size={20} color={formData.is_active ? colors.success : colors.textSecondary} />
                            </View>
                            <Text style={styles.sectionTitle}>Settings</Text>
                        </View>

                        <View style={styles.formGroup}>
                            <Dropdown
                                label="Display Order"
                                value={formData.order_index.toString()}
                                onValueChange={(value: string) => {
                                    const numValue = parseInt(value) || 0;
                                    handleFieldChange('order_index', numValue);
                                }}
                                options={orderOptions}
                                placeholder="Select position"
                                error={errors.order_index}
                                required
                            />
                            <Text style={styles.helperText}>
                                Choose where this category should appear in the list
                            </Text>
                        </View>

                        <View style={styles.switchContainer}>
                            <Switch
                                label="Active Status"
                                value={formData.is_active}
                                onValueChange={(value) => handleFieldChange('is_active', value)}
                                description={formData.is_active
                                    ? "This category will be available for new FAQs"
                                    : "This category will be hidden from new FAQ creation"
                                }
                            />
                        </View>
                    </View>

                    {/* Error Display */}
                    {errors.general && (
                        <View style={styles.errorContainer}>
                            <View style={styles.errorIcon}>
                                <AlertCircle size={16} color={colors.error} />
                            </View>
                            <Text style={styles.errorText}>{errors.general}</Text>
                        </View>
                    )}

                    {/* Action Buttons */}
                    <View style={styles.buttonContainer}>
                        <Button
                            title={isEditing ? "Update Category" : "Create Category"}
                            onPress={handleSubmit}
                            variant="primary"
                            icon={<Save size={20} color={hasChanges ? colors.white : colors.textSecondary} />}
                            loading={submitting}
                            disabled={submitting || !hasChanges}
                        />

                        {hasChanges && (
                            <Button
                                title="Reset Changes"
                                onPress={handleReset}
                                variant="outline"
                                disabled={submitting}
                                icon={<RotateCcw size={20} color={colors.primary} />}
                            />
                        )}

                        {onCancel && (
                            <Button
                                title="Cancel"
                                onPress={onCancel}
                                variant="outline"
                                icon={<X size={20} color={colors.textSecondary} />}
                                disabled={submitting}
                            />
                        )}
                    </View>

                    {/* Form Status */}
                    {hasChanges && (
                        <View style={styles.statusContainer}>
                            <View style={styles.statusIcon}>
                                <AlertCircle size={14} color={colors.warning} />
                            </View>
                            <Text style={styles.statusText}>
                                You have unsaved changes
                            </Text>
                        </View>
                    )}

                    {/* Info Card */}
                    <View style={styles.infoCard}>
                        <View style={styles.infoIcon}>
                            <AlertCircle size={16} color={colors.info} />
                        </View>
                        <Text style={styles.infoText}>
                            Categories help organize your FAQs and make them easier for users to find.
                            Choose clear, descriptive names that represent the type of questions in each category.
                        </Text>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    keyboardContainer: {
        flex: 1,
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: colors.card,
        padding: 24,
        borderRadius: 16,
        marginBottom: 24,
        shadowColor: colors.shadowMedium,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
    },
    headerIcon: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: colors.primaryLight,
        alignItems: "center",
        justifyContent: "center",
        marginRight: 16,
    },
    headerContent: {
        flex: 1,
    },
    title: {
        fontSize: 22,
        fontWeight: "700",
        color: colors.text,
        marginBottom: 4,
        lineHeight: 28,
    },
    subtitle: {
        fontSize: 15,
        color: colors.textSecondary,
        lineHeight: 20,
        fontWeight: "500",
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 32,
    },
    section: {
        backgroundColor: colors.card,
        borderRadius: 16,
        padding: 24,
        marginBottom: 20,
        shadowColor: colors.shadowMedium,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
    },
    sectionHeader: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 20,
        gap: 12,
    },
    sectionHeaderIcon: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: colors.primaryLight,
        alignItems: "center",
        justifyContent: "center",
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: colors.text,
        lineHeight: 24,
    },
    formGroup: {
        marginBottom: 20,
    },
    helperText: {
        fontSize: 14,
        color: colors.textTertiary,
        marginTop: 6,
        fontWeight: "500",
    },
    switchContainer: {
        marginBottom: 8,
    },
    errorContainer: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        backgroundColor: colors.errorLight,
        padding: 20,
        borderRadius: 16,
        marginBottom: 20,
        borderLeftWidth: 3,
        borderLeftColor: colors.error,
    },
    errorIcon: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: colors.error + '20',
        alignItems: "center",
        justifyContent: "center",
    },
    errorText: {
        flex: 1,
        fontSize: 14,
        color: colors.error,
        fontWeight: "500",
        lineHeight: 20,
    },
    buttonContainer: {
        backgroundColor: colors.card,
        borderRadius: 16,
        padding: 24,
        marginBottom: 20,
        gap: 12,
        shadowColor: colors.shadowMedium,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
    },
    statusContainer: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        backgroundColor: colors.warningLight,
        padding: 16,
        borderRadius: 12,
        marginBottom: 20,
        borderLeftWidth: 3,
        borderLeftColor: colors.warning,
    },
    statusIcon: {
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: colors.warning + '20',
        alignItems: "center",
        justifyContent: "center",
    },
    statusText: {
        fontSize: 14,
        color: colors.warning,
        fontWeight: "600",
        lineHeight: 18,
    },
    infoCard: {
        flexDirection: "row",
        alignItems: "flex-start",
        backgroundColor: colors.infoLight,
        padding: 20,
        borderRadius: 16,
        gap: 12,
        borderLeftWidth: 3,
        borderLeftColor: colors.info,
    },
    infoIcon: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: colors.info + '20',
        alignItems: "center",
        justifyContent: "center",
        marginTop: 2,
    },
    infoText: {
        flex: 1,
        fontSize: 14,
        color: colors.info,
        lineHeight: 20,
        fontWeight: "500",
    },
});

export default FAQCategoryForm; 