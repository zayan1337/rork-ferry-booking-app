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
import { FAQ, FAQCategory, FAQFormData } from "@/types/content";
import { useFAQManagementStore } from "@/store/admin/faqStore";
import { useFAQManagement } from "@/hooks/useFAQManagement";
import {
    HelpCircle,
    Save,
    X,
    AlertCircle,
    FileText,
    MessageSquare,
    Folder,
    Hash,
    ToggleLeft,
    Info,
    Settings,
    RotateCcw,
} from "lucide-react-native";

// Components
import Button from "@/components/admin/Button";
import TextInput from "@/components/admin/TextInput";
import Dropdown from "@/components/admin/Dropdown";
import Switch from "@/components/admin/Switch";
import LoadingSpinner from "@/components/admin/LoadingSpinner";

interface FAQFormProps {
    faq?: FAQ;
    onSuccess: () => void;
    onError: (error: string) => void;
    onCancel?: () => void;
}

const FAQForm: React.FC<FAQFormProps> = ({
    faq,
    onSuccess,
    onError,
    onCancel,
}) => {
    const {
        categories,
        loadCategories,
        createFAQ,
        updateFAQ,
        loading,
        getAvailableFaqOrderOptions,
        getSuggestedFaqOrder
    } = useFAQManagement();

    const [formData, setFormData] = useState<FAQFormData>({
        category_id: faq?.category_id || "",
        question: faq?.question || "",
        answer: faq?.answer || "",
        is_active: faq?.is_active ?? true,
        order_index: faq?.order_index || 0,
    });

    const [initialData] = useState<FAQFormData>({
        category_id: faq?.category_id || "",
        question: faq?.question || "",
        answer: faq?.answer || "",
        is_active: faq?.is_active ?? true,
        order_index: faq?.order_index || 0,
    });

    const [errors, setErrors] = useState<Record<string, string>>({});
    const [submitting, setSubmitting] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);

    const isEditing = !!faq;

    // Track form changes
    useEffect(() => {
        const hasFormChanges = JSON.stringify(formData) !== JSON.stringify(initialData);
        setHasChanges(hasFormChanges);
    }, [formData, initialData]);

    useEffect(() => {
        if (categories.length === 0) {
            loadCategories();
        }
    }, [categories.length, loadCategories]);

    // Update suggested order when category changes
    useEffect(() => {
        if (formData.category_id && !isEditing) {
            const suggestedOrder = getSuggestedFaqOrder(formData.category_id);
            setFormData(prev => ({ ...prev, order_index: suggestedOrder }));
        }
    }, [formData.category_id, isEditing, getSuggestedFaqOrder]);

    const validateForm = (): boolean => {
        const newErrors: Record<string, string> = {};

        if (!formData.category_id.trim()) {
            newErrors.category_id = "Category is required";
        }

        if (!formData.question.trim()) {
            newErrors.question = "Question is required";
        } else if (formData.question.trim().length < 10) {
            newErrors.question = "Question must be at least 10 characters long";
        } else if (formData.question.trim().length > 500) {
            newErrors.question = "Question must be less than 500 characters";
        }

        if (!formData.answer.trim()) {
            newErrors.answer = "Answer is required";
        } else if (formData.answer.trim().length < 20) {
            newErrors.answer = "Answer must be at least 20 characters long";
        } else if (formData.answer.trim().length > 5000) {
            newErrors.answer = "Answer must be less than 5000 characters";
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
                question: formData.question.trim(),
                answer: formData.answer.trim(),
            };

            if (isEditing) {
                await updateFAQ(faq!.id, cleanData);
            } else {
                await createFAQ(cleanData);
            }

            onSuccess();
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : `Failed to ${isEditing ? 'update' : 'create'} FAQ`;
            onError(errorMessage);

            // Set field-specific errors if they exist in the error message
            if (errorMessage.toLowerCase().includes('question')) {
                setErrors({ question: errorMessage });
            } else if (errorMessage.toLowerCase().includes('answer')) {
                setErrors({ answer: errorMessage });
            } else if (errorMessage.toLowerCase().includes('category')) {
                setErrors({ category_id: errorMessage });
            } else {
                setErrors({ general: errorMessage });
            }
        } finally {
            setSubmitting(false);
        }
    };

    const handleFieldChange = (field: keyof FAQFormData, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));

        // Clear error when field is being edited
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: "" }));
        }
    };

    const handleReset = () => {
        setFormData(initialData);
        setErrors({});
        setHasChanges(false);
    };

    const categoryOptions = categories.map(cat => ({
        label: cat.name,
        value: cat.id,
    }));

    const selectedCategory = categories.find(cat => cat.id === formData.category_id);

    // Get available order options for the selected category
    const orderOptions = formData.category_id
        ? getAvailableFaqOrderOptions(formData.category_id).map(option => ({
            label: option.label,
            value: option.value.toString()
        }))
        : [];

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerIcon}>
                    <HelpCircle size={24} color={colors.primary} />
                </View>
                <View style={styles.headerContent}>
                    <Text style={styles.title}>
                        {isEditing ? "Edit FAQ" : "Create New FAQ"}
                    </Text>
                    <Text style={styles.subtitle}>
                        {isEditing
                            ? "Update the FAQ information and settings"
                            : "Add a new frequently asked question to help users"
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
                    {/* Loading State */}
                    {loading && loading.categories && (
                        <View style={styles.loadingSection}>
                            <LoadingSpinner />
                            <Text style={styles.loadingText}>Loading categories...</Text>
                        </View>
                    )}

                    {/* Basic Information */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <View style={styles.sectionHeaderIcon}>
                                <Info size={20} color={colors.primary} />
                            </View>
                            <Text style={styles.sectionTitle}>Basic Information</Text>
                        </View>

                        <View style={styles.formGroup}>
                            <Dropdown
                                label="Category"
                                value={formData.category_id}
                                onValueChange={(value: string) => handleFieldChange('category_id', value)}
                                options={categoryOptions}
                                placeholder="Select a category"
                                error={errors.category_id}
                                required
                            />
                            {selectedCategory && (
                                <View style={styles.categoryDescription}>
                                    <View style={styles.categoryDescriptionIcon}>
                                        <Folder size={14} color={colors.primary} />
                                    </View>
                                    <View style={styles.categoryDescriptionContent}>
                                        <Text style={styles.categoryDescriptionTitle}>
                                            {selectedCategory.name}
                                        </Text>
                                        <Text style={styles.categoryDescriptionText}>
                                            {selectedCategory.description || 'FAQ category for organizing related questions'}
                                        </Text>
                                    </View>
                                </View>
                            )}
                        </View>

                        <View style={styles.formGroup}>
                            <TextInput
                                label="Question"
                                value={formData.question}
                                onChangeText={(value) => handleFieldChange('question', value)}
                                placeholder="Enter the FAQ question"
                                multiline
                                numberOfLines={3}
                                error={errors.question}
                                required
                            />
                            <Text style={styles.helperText}>
                                Minimum 10 characters. Current: {formData.question.length}
                            </Text>
                        </View>
                    </View>

                    {/* Answer Section */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <View style={[styles.sectionHeaderIcon, { backgroundColor: colors.infoLight }]}>
                                <FileText size={20} color={colors.info} />
                            </View>
                            <Text style={styles.sectionTitle}>Answer</Text>
                        </View>

                        <View style={styles.formGroup}>
                            <TextInput
                                label="Answer"
                                value={formData.answer}
                                onChangeText={(value) => handleFieldChange('answer', value)}
                                placeholder="Enter the detailed answer"
                                multiline
                                numberOfLines={6}
                                error={errors.answer}
                                required
                            />
                            <Text style={styles.helperText}>
                                Minimum 20 characters. Current: {formData.answer.length}
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
                                placeholder="Select order"
                                error={errors.order_index}
                                required
                            />
                            <Text style={styles.helperText}>
                                Lower numbers appear first in the list
                            </Text>
                        </View>

                        <View style={styles.switchContainer}>
                            <Switch
                                label="Active Status"
                                value={formData.is_active}
                                onValueChange={(value) => handleFieldChange('is_active', value)}
                                description={formData.is_active
                                    ? "This FAQ will be visible to users"
                                    : "This FAQ will be hidden from users"
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
                            title={isEditing ? "Update FAQ" : "Create FAQ"}
                            onPress={handleSubmit}
                            variant="primary"
                            icon={<Save size={20} color={hasChanges ? colors.white : colors.textSecondary} />}
                            loading={submitting}
                            disabled={submitting || loading.categories || !hasChanges}
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
                            FAQs are displayed to users based on their category and order index.
                            Make sure to provide clear, helpful answers that address common questions.
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
    loadingSection: {
        backgroundColor: colors.card,
        borderRadius: 16,
        padding: 32,
        marginBottom: 20,
        alignItems: 'center',
        shadowColor: colors.shadowMedium,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
        color: colors.textSecondary,
        fontWeight: "500",
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
    categoryDescription: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 12,
        marginTop: 12,
        paddingHorizontal: 16,
        paddingVertical: 16,
        borderRadius: 12,
        backgroundColor: colors.primaryLight,
        borderLeftWidth: 3,
        borderLeftColor: colors.primary,
    },
    categoryDescriptionIcon: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: colors.primary + '20',
        alignItems: "center",
        justifyContent: "center",
        marginTop: 2,
    },
    categoryDescriptionContent: {
        flex: 1,
        gap: 4,
    },
    categoryDescriptionTitle: {
        fontSize: 14,
        fontWeight: "700",
        color: colors.primary,
        lineHeight: 18,
    },
    categoryDescriptionText: {
        fontSize: 13,
        fontWeight: "500",
        color: colors.primary,
        lineHeight: 18,
        opacity: 0.8,
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

export default FAQForm; 