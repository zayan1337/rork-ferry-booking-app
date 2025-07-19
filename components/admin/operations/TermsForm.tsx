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
import { TermsAndConditions, TermsFormData } from "@/types/content";
import { useContentManagement } from "@/hooks/useContentManagement";
import {
    FileText,
    Save,
    X,
    AlertCircle,
    Type,
    MessageSquare,
    Calendar,
    Hash,
    ToggleLeft,
    Info,
    Settings,
    RotateCcw,
} from "lucide-react-native";

// Components
import Button from "@/components/admin/Button";
import TextInput from "@/components/admin/TextInput";
import Switch from "@/components/admin/Switch";
import LoadingSpinner from "@/components/admin/LoadingSpinner";

interface TermsFormProps {
    terms?: TermsAndConditions;
    onSuccess: () => void;
    onError: (error: string) => void;
    onCancel?: () => void;
}

const TermsForm: React.FC<TermsFormProps> = ({
    terms,
    onSuccess,
    onError,
    onCancel,
}) => {
    const {
        createTerms,
        updateTerms,
        loading,
        validateTermsData,
    } = useContentManagement();

    const [formData, setFormData] = useState<TermsFormData>({
        title: terms?.title || "",
        content: terms?.content || "",
        version: terms?.version || "",
        effective_date: terms?.effective_date || new Date().toISOString().split('T')[0],
        is_active: terms?.is_active ?? true,
    });

    const [initialData] = useState<TermsFormData>({
        title: terms?.title || "",
        content: terms?.content || "",
        version: terms?.version || "",
        effective_date: terms?.effective_date || new Date().toISOString().split('T')[0],
        is_active: terms?.is_active ?? true,
    });

    const [errors, setErrors] = useState<Record<string, string>>({});
    const [submitting, setSubmitting] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);

    const isEditing = !!terms;

    // Track form changes
    useEffect(() => {
        const hasFormChanges = JSON.stringify(formData) !== JSON.stringify(initialData);
        setHasChanges(hasFormChanges);
    }, [formData, initialData]);

    const validateForm = () => {
        const validation = validateTermsData(formData);
        setErrors(validation.errors);
        return validation.isValid;
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
                title: formData.title.trim(),
                content: formData.content.trim(),
                version: formData.version.trim(),
            };

            if (isEditing) {
                await updateTerms(terms!.id, cleanData);
            } else {
                await createTerms(cleanData);
            }

            onSuccess();
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : `Failed to ${isEditing ? 'update' : 'create'} terms and conditions`;
            onError(errorMessage);

            // Set field-specific errors if they exist in the error message
            if (errorMessage.toLowerCase().includes('title')) {
                setErrors({ title: errorMessage });
            } else if (errorMessage.toLowerCase().includes('content')) {
                setErrors({ content: errorMessage });
            } else if (errorMessage.toLowerCase().includes('version')) {
                setErrors({ version: errorMessage });
            } else if (errorMessage.toLowerCase().includes('date')) {
                setErrors({ effective_date: errorMessage });
            } else {
                setErrors({ general: errorMessage });
            }
        } finally {
            setSubmitting(false);
        }
    };

    const handleFieldChange = (field: keyof TermsFormData, value: any) => {
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

    const getWordCount = (text: string) => {
        return text.trim().split(/\s+/).filter(word => word.length > 0).length;
    };

    const getCharacterCount = (text: string) => {
        return text.length;
    };

    if (loading.terms) {
        return (
            <View style={styles.loadingContainer}>
                <LoadingSpinner />
                <Text style={styles.loadingText}>
                    {isEditing ? 'Loading terms and conditions...' : 'Preparing form...'}
                </Text>
            </View>
        );
    }

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.headerIcon}>
                        <FileText size={24} color={colors.primary} />
                    </View>
                    <View style={styles.headerText}>
                        <Text style={styles.headerTitle}>
                            {isEditing ? 'Edit Terms & Conditions' : 'New Terms & Conditions'}
                        </Text>
                        <Text style={styles.headerSubtitle}>
                            {isEditing ? 'Update the terms and conditions' : 'Create new terms and conditions'}
                        </Text>
                    </View>
                </View>

                {/* General Error */}
                {errors.general && (
                    <View style={styles.errorContainer}>
                        <AlertCircle size={16} color={colors.error} />
                        <Text style={styles.errorText}>{errors.general}</Text>
                    </View>
                )}

                {/* Form Fields */}
                <View style={styles.formContainer}>
                    {/* Title */}
                    <View style={styles.fieldContainer}>
                        <Text style={styles.fieldLabel}>
                            Title <Text style={styles.required}>*</Text>
                        </Text>
                        <TextInput
                            value={formData.title}
                            onChangeText={(value) => handleFieldChange('title', value)}
                            placeholder="Enter terms and conditions title"
                            error={errors.title}
                            multiline={false}
                            maxLength={200}
                            icon={<Type size={16} color={colors.textSecondary} />}
                        />
                        <View style={styles.fieldFooter}>
                            <Text style={styles.fieldHelper}>
                                A clear and descriptive title for the terms and conditions
                            </Text>
                            <Text style={styles.characterCount}>
                                {formData.title.length}/200
                            </Text>
                        </View>
                    </View>

                    {/* Version */}
                    <View style={styles.fieldContainer}>
                        <Text style={styles.fieldLabel}>
                            Version <Text style={styles.required}>*</Text>
                        </Text>
                        <TextInput
                            value={formData.version}
                            onChangeText={(value) => handleFieldChange('version', value)}
                            placeholder="e.g., 1.0, 2.1, etc."
                            error={errors.version}
                            multiline={false}
                            maxLength={20}
                            icon={<Hash size={16} color={colors.textSecondary} />}
                        />
                        <Text style={styles.fieldHelper}>
                            Version number to track changes over time
                        </Text>
                    </View>

                    {/* Effective Date */}
                    <View style={styles.fieldContainer}>
                        <Text style={styles.fieldLabel}>
                            Effective Date <Text style={styles.required}>*</Text>
                        </Text>
                        <TextInput
                            value={formData.effective_date}
                            onChangeText={(value) => handleFieldChange('effective_date', value)}
                            placeholder="YYYY-MM-DD"
                            error={errors.effective_date}
                            multiline={false}
                            icon={<Calendar size={16} color={colors.textSecondary} />}
                        />
                        <Text style={styles.fieldHelper}>
                            Date when these terms become effective
                        </Text>
                    </View>

                    {/* Content */}
                    <View style={styles.fieldContainer}>
                        <Text style={styles.fieldLabel}>
                            Content <Text style={styles.required}>*</Text>
                        </Text>
                        <TextInput
                            value={formData.content}
                            onChangeText={(value) => handleFieldChange('content', value)}
                            placeholder="Enter the full terms and conditions content..."
                            error={errors.content}
                            multiline={true}
                            numberOfLines={10}
                            maxLength={50000}
                            style={styles.contentInput}
                            icon={<MessageSquare size={16} color={colors.textSecondary} />}
                        />
                        <View style={styles.fieldFooter}>
                            <Text style={styles.fieldHelper}>
                                Complete terms and conditions content
                            </Text>
                            <View style={styles.contentStats}>
                                <Text style={styles.characterCount}>
                                    {getCharacterCount(formData.content)}/50,000 chars
                                </Text>
                                <Text style={styles.wordCount}>
                                    {getWordCount(formData.content)} words
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* Status */}
                    <View style={styles.fieldContainer}>
                        <View style={styles.switchContainer}>
                            <View style={styles.switchLabel}>
                                <ToggleLeft size={16} color={colors.textSecondary} />
                                <Text style={styles.fieldLabel}>Active Status</Text>
                            </View>
                            <Switch
                                value={formData.is_active}
                                onValueChange={(value) => handleFieldChange('is_active', value)}
                            />
                        </View>
                        <Text style={styles.fieldHelper}>
                            {formData.is_active
                                ? 'These terms are currently active and visible'
                                : 'These terms are inactive and not visible to users'
                            }
                        </Text>
                    </View>
                </View>

                {/* Info Box */}
                <View style={styles.infoContainer}>
                    <Info size={16} color={colors.info} />
                    <Text style={styles.infoText}>
                        Make sure to review all terms carefully before publishing. Once active,
                        these terms will be visible to all users.
                    </Text>
                </View>
            </ScrollView>

            {/* Actions */}
            <View style={styles.actionsContainer}>
                <View style={styles.actionsRow}>
                    {onCancel && (
                        <Button
                            title="Cancel"
                            variant="ghost"
                            onPress={onCancel}
                            style={styles.actionButton}
                            icon={<X size={16} color={colors.textSecondary} />}
                        />
                    )}

                    {hasChanges && (
                        <Button
                            title="Reset"
                            variant="outline"
                            onPress={handleReset}
                            style={styles.actionButton}
                            icon={<RotateCcw size={16} color={colors.textSecondary} />}
                        />
                    )}

                    <Button
                        title={isEditing ? 'Update Terms' : 'Create Terms'}
                        variant="primary"
                        onPress={handleSubmit}
                        loading={submitting}
                        disabled={submitting || !hasChanges}
                        style={[styles.actionButton, styles.primaryAction]}
                        icon={<Save size={16} color={colors.white} />}
                    />
                </View>
            </View>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.backgroundSecondary,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.backgroundSecondary,
        gap: 16,
    },
    loadingText: {
        fontSize: 16,
        color: colors.textSecondary,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 16,
        paddingBottom: 100,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 24,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    headerIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: colors.primary + '15',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    headerText: {
        flex: 1,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 4,
    },
    headerSubtitle: {
        fontSize: 14,
        color: colors.textSecondary,
    },
    errorContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.error + '10',
        borderColor: colors.error + '30',
        borderWidth: 1,
        borderRadius: 8,
        padding: 12,
        marginBottom: 16,
        gap: 8,
    },
    errorText: {
        flex: 1,
        fontSize: 14,
        color: colors.error,
    },
    formContainer: {
        gap: 20,
    },
    fieldContainer: {
        gap: 8,
    },
    fieldLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text,
    },
    required: {
        color: colors.error,
    },
    fieldHelper: {
        fontSize: 12,
        color: colors.textSecondary,
        lineHeight: 16,
    },
    fieldFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    characterCount: {
        fontSize: 11,
        color: colors.textSecondary,
        fontWeight: '500',
    },
    contentInput: {
        minHeight: 200,
        textAlignVertical: 'top',
    },
    contentStats: {
        alignItems: 'flex-end',
        gap: 2,
    },
    wordCount: {
        fontSize: 11,
        color: colors.textSecondary,
        fontWeight: '500',
    },
    switchContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    switchLabel: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    infoContainer: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: colors.info + '10',
        borderColor: colors.info + '30',
        borderWidth: 1,
        borderRadius: 8,
        padding: 12,
        marginTop: 20,
        gap: 8,
    },
    infoText: {
        flex: 1,
        fontSize: 13,
        color: colors.info,
        lineHeight: 18,
    },
    actionsContainer: {
        backgroundColor: colors.card,
        padding: 16,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 4,
    },
    actionsRow: {
        flexDirection: 'row',
        gap: 12,
    },
    actionButton: {
        flex: 1,
    },
    primaryAction: {
        flex: 2,
    },
});

export default TermsForm; 