import React, { useState } from "react";
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
import { FAQCategory, FAQCategoryFormData } from "@/types/content";
import { useFAQManagementStore } from "@/store/admin/faqStore";
import {
    Folder,
    Save,
    X,
    AlertCircle,
    FileText,
    Hash,
    ToggleLeft,
    Type,
} from "lucide-react-native";

// Components
import Button from "@/components/admin/Button";
import TextInput from "@/components/admin/TextInput";
import Switch from "@/components/admin/Switch";

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
    const { createCategory, updateCategory } = useFAQManagementStore();

    const [formData, setFormData] = useState<FAQCategoryFormData>({
        name: category?.name || "",
        description: category?.description || "",
        order_index: category?.order_index || 0,
        is_active: category?.is_active ?? true,
    });

    const [errors, setErrors] = useState<Record<string, string>>({});
    const [submitting, setSubmitting] = useState(false);

    const isEditing = !!category;

    const validateForm = (): boolean => {
        const newErrors: Record<string, string> = {};

        if (!formData.name.trim()) {
            newErrors.name = "Category name is required";
        } else if (formData.name.trim().length < 3) {
            newErrors.name = "Category name must be at least 3 characters long";
        }

        if (formData.description && formData.description.length > 200) {
            newErrors.description = "Description must be less than 200 characters";
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
        try {
            if (isEditing) {
                await updateCategory(category.id, formData);
            } else {
                await createCategory(formData);
            }
            onSuccess();
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Failed to save category";
            onError(errorMessage);
        } finally {
            setSubmitting(false);
        }
    };

    const handleFieldChange = (field: keyof FAQCategoryFormData, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));

        // Clear error when field is being edited
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: "" }));
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.headerIcon}>
                        <Folder size={24} color={colors.primary} />
                    </View>
                    <Text style={styles.headerTitle}>
                        {isEditing ? "Edit FAQ Category" : "Create New Category"}
                    </Text>
                    <Text style={styles.headerSubtitle}>
                        {isEditing
                            ? "Update the category information below"
                            : "Create a new category to organize your FAQs"
                        }
                    </Text>
                </View>

                {/* Form Fields */}
                <View style={styles.formContainer}>
                    {/* Category Name */}
                    <View style={styles.fieldContainer}>
                        <Text style={styles.fieldLabel}>
                            <Type size={16} color={colors.textSecondary} /> Category Name *
                        </Text>
                        <TextInput
                            label="Category Name"
                            value={formData.name}
                            onChangeText={(value) => handleFieldChange('name', value)}
                            placeholder="Enter category name"
                            error={errors.name}
                        />
                        <Text style={styles.helperText}>
                            Minimum 3 characters. Current: {formData.name.length}
                        </Text>
                        {errors.name && (
                            <Text style={styles.errorText}>{errors.name}</Text>
                        )}
                    </View>

                    {/* Description */}
                    <View style={styles.fieldContainer}>
                        <Text style={styles.fieldLabel}>
                            <FileText size={16} color={colors.textSecondary} /> Description
                        </Text>
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
                            Optional. Maximum 200 characters. Current: {(formData.description || "").length}
                        </Text>
                        {errors.description && (
                            <Text style={styles.errorText}>{errors.description}</Text>
                        )}
                    </View>

                    {/* Order Index */}
                    <View style={styles.fieldContainer}>
                        <Text style={styles.fieldLabel}>
                            <Hash size={16} color={colors.textSecondary} /> Display Order
                        </Text>
                        <TextInput
                            label="Display Order"
                            value={formData.order_index.toString()}
                            onChangeText={(value) => {
                                const numValue = parseInt(value) || 0;
                                handleFieldChange('order_index', numValue);
                            }}
                            placeholder="0"
                            keyboardType="numeric"
                            error={errors.order_index}
                        />
                        <Text style={styles.helperText}>
                            Lower numbers appear first in the list
                        </Text>
                        {errors.order_index && (
                            <Text style={styles.errorText}>{errors.order_index}</Text>
                        )}
                    </View>

                    {/* Active Status */}
                    <View style={styles.fieldContainer}>
                        <Text style={styles.fieldLabel}>
                            <ToggleLeft size={16} color={colors.textSecondary} /> Status
                        </Text>
                        <View style={styles.switchContainer}>
                            <Switch
                                label="Status"
                                value={formData.is_active}
                                onValueChange={(value) => handleFieldChange('is_active', value)}
                            />
                            <Text style={styles.switchLabel}>
                                {formData.is_active ? "Active" : "Inactive"}
                            </Text>
                        </View>
                        <Text style={styles.helperText}>
                            {formData.is_active
                                ? "This category will be available for new FAQs"
                                : "This category will be hidden from new FAQ creation"
                            }
                        </Text>
                    </View>
                </View>

                {/* Action Buttons */}
                <View style={styles.actionContainer}>
                    <Button
                        title={isEditing ? "Update Category" : "Create Category"}
                        onPress={handleSubmit}
                        variant="primary"
                        icon={<Save size={20} color={colors.white} />}
                        loading={submitting}
                        disabled={submitting}
                        style={styles.submitButton}
                    />

                    {onCancel && (
                        <Button
                            title="Cancel"
                            onPress={onCancel}
                            variant="outline"
                            icon={<X size={20} color={colors.textSecondary} />}
                            disabled={submitting}
                            style={styles.cancelButton}
                        />
                    )}
                </View>

                {/* Info Card */}
                <View style={styles.infoCard}>
                    <AlertCircle size={16} color={colors.info} />
                    <Text style={styles.infoText}>
                        Categories help organize your FAQs and make them easier for users to find.
                        Choose clear, descriptive names that represent the type of questions in each category.
                    </Text>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.backgroundSecondary,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 32,
    },
    header: {
        backgroundColor: colors.card,
        padding: 24,
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: colors.background,
    },
    headerIcon: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: colors.primaryLight,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: colors.text,
        marginBottom: 8,
    },
    headerSubtitle: {
        fontSize: 16,
        color: colors.textSecondary,
        textAlign: 'center',
    },
    formContainer: {
        padding: 16,
        gap: 24,
    },
    fieldContainer: {
        marginBottom: 4,
    },
    fieldLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 8,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    helperText: {
        fontSize: 14,
        color: colors.textTertiary,
        marginTop: 6,
    },
    errorText: {
        fontSize: 14,
        color: colors.error,
        marginTop: 6,
    },
    switchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 8,
    },
    switchLabel: {
        fontSize: 16,
        color: colors.text,
        fontWeight: '500',
    },
    actionContainer: {
        padding: 16,
        gap: 12,
    },
    submitButton: {
        height: 56,
    },
    cancelButton: {
        height: 48,
    },
    infoCard: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: colors.infoLight,
        padding: 16,
        margin: 16,
        borderRadius: 12,
        gap: 12,
    },
    infoText: {
        flex: 1,
        fontSize: 14,
        color: colors.info,
        lineHeight: 20,
    },
});

export default FAQCategoryForm; 