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
        fetchCategories,
        createFAQ,
        updateFAQ,
        loading
    } = useFAQManagementStore();

    const [formData, setFormData] = useState<FAQFormData>({
        category_id: faq?.category_id || "",
        question: faq?.question || "",
        answer: faq?.answer || "",
        is_active: faq?.is_active ?? true,
        order_index: faq?.order_index || 0,
    });

    const [errors, setErrors] = useState<Record<string, string>>({});
    const [submitting, setSubmitting] = useState(false);

    const isEditing = !!faq;

    useEffect(() => {
        if (categories.length === 0) {
            fetchCategories();
        }
    }, [categories.length, fetchCategories]);

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

    const categoryOptions = categories.map(cat => ({
        label: cat.name,
        value: cat.id,
    }));

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
                        <HelpCircle size={24} color={colors.primary} />
                    </View>
                    <Text style={styles.headerTitle}>
                        {isEditing ? "Edit FAQ" : "Create New FAQ"}
                    </Text>
                    <Text style={styles.headerSubtitle}>
                        {isEditing
                            ? "Update the FAQ information below"
                            : "Fill in the details to create a new FAQ"
                        }
                    </Text>
                </View>

                {/* Loading State */}
                {loading && loading.categories && (
                    <View style={styles.loadingContainer}>
                        <LoadingSpinner />
                        <Text style={styles.loadingText}>Loading categories...</Text>
                    </View>
                )}

                {/* Form Fields */}
                <View style={styles.formContainer}>
                    {/* Category Selection */}
                    <View style={styles.fieldContainer}>
                        <Text style={styles.fieldLabel}>
                            <Folder size={16} color={colors.textSecondary} /> Category *
                        </Text>
                        <Dropdown
                            label="Category"
                            options={categoryOptions}
                            value={formData.category_id}
                            onValueChange={(value: string) => handleFieldChange('category_id', value)}
                            placeholder="Select a category"
                            error={errors.category_id}
                        />
                        {errors.category_id && (
                            <Text style={styles.errorText}>{errors.category_id}</Text>
                        )}
                    </View>

                    {/* Question */}
                    <View style={styles.fieldContainer}>
                        <Text style={styles.fieldLabel}>
                            <MessageSquare size={16} color={colors.textSecondary} /> Question *
                        </Text>
                        <TextInput
                            label="Question"
                            value={formData.question}
                            onChangeText={(value) => handleFieldChange('question', value)}
                            placeholder="Enter the FAQ question"
                            multiline
                            numberOfLines={3}
                            error={errors.question}
                        />
                        <Text style={styles.helperText}>
                            Minimum 10 characters. Current: {formData.question.length}
                        </Text>
                        {errors.question && (
                            <Text style={styles.errorText}>{errors.question}</Text>
                        )}
                    </View>

                    {/* Answer */}
                    <View style={styles.fieldContainer}>
                        <Text style={styles.fieldLabel}>
                            <FileText size={16} color={colors.textSecondary} /> Answer *
                        </Text>
                        <TextInput
                            label="Answer"
                            value={formData.answer}
                            onChangeText={(value) => handleFieldChange('answer', value)}
                            placeholder="Enter the detailed answer"
                            multiline
                            numberOfLines={6}
                            error={errors.answer}
                        />
                        <Text style={styles.helperText}>
                            Minimum 20 characters. Current: {formData.answer.length}
                        </Text>
                        {errors.answer && (
                            <Text style={styles.errorText}>{errors.answer}</Text>
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
                                ? "This FAQ will be visible to users"
                                : "This FAQ will be hidden from users"
                            }
                        </Text>
                    </View>
                </View>

                {/* Action Buttons */}
                <View style={styles.actionContainer}>
                    <Button
                        title={isEditing ? "Update FAQ" : "Create FAQ"}
                        onPress={handleSubmit}
                        variant="primary"
                        icon={<Save size={20} color={colors.white} />}
                        loading={submitting}
                        disabled={submitting || loading.categories}
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
                        FAQs are displayed to users based on their category and order index.
                        Make sure to provide clear, helpful answers that address common questions.
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
    loadingContainer: {
        padding: 32,
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
        color: colors.textSecondary,
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

export default FAQForm; 