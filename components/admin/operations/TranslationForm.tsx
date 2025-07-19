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
import { Translation, TranslationFormData } from "@/types/content";
import { useContentManagement } from "@/hooks/useContentManagement";
import {
    Globe,
    Save,
    X,
    AlertCircle,
    Type,
    MessageSquare,
    Languages,
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

interface TranslationFormProps {
    translation?: Translation;
    onSuccess: () => void;
    onError: (error: string) => void;
    onCancel?: () => void;
}

const SUPPORTED_LANGUAGES = [
    { label: "🇺🇸 English", value: "en" },
    { label: "🇲🇻 Dhivehi", value: "dv" },
    { label: "🇸🇦 Arabic", value: "ar" },
    { label: "🇮🇳 Hindi", value: "hi" },
    { label: "🇫🇷 French", value: "fr" },
    { label: "🇪🇸 Spanish", value: "es" },
    { label: "🇩🇪 German", value: "de" },
    { label: "🇨🇳 Chinese", value: "zh" },
    { label: "🇯🇵 Japanese", value: "ja" },
    { label: "🇰🇷 Korean", value: "ko" },
];

const TranslationForm: React.FC<TranslationFormProps> = ({
    translation,
    onSuccess,
    onError,
    onCancel,
}) => {
    const {
        createTranslation,
        updateTranslation,
        loading,
        validateTranslationData,
    } = useContentManagement();

    const [formData, setFormData] = useState<TranslationFormData>({
        key: translation?.key || "",
        language_code: translation?.language_code || "en",
        translation: translation?.translation || "",
        context: translation?.context || "",
        is_active: translation?.is_active ?? true,
    });

    const [initialData] = useState<TranslationFormData>({
        key: translation?.key || "",
        language_code: translation?.language_code || "en",
        translation: translation?.translation || "",
        context: translation?.context || "",
        is_active: translation?.is_active ?? true,
    });

    const [errors, setErrors] = useState<Record<string, string>>({});
    const [submitting, setSubmitting] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);

    const isEditing = !!translation;

    // Track form changes
    useEffect(() => {
        const hasFormChanges = JSON.stringify(formData) !== JSON.stringify(initialData);
        setHasChanges(hasFormChanges);
    }, [formData, initialData]);

    const validateForm = () => {
        const validation = validateTranslationData(formData);
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
                key: formData.key.trim(),
                translation: formData.translation.trim(),
                context: formData.context?.trim() || undefined,
            };

            if (isEditing) {
                await updateTranslation(translation!.id, cleanData);
            } else {
                await createTranslation(cleanData);
            }

            onSuccess();
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : `Failed to ${isEditing ? 'update' : 'create'} translation`;
            onError(errorMessage);

            // Set field-specific errors if they exist in the error message
            if (errorMessage.toLowerCase().includes('key')) {
                setErrors({ key: errorMessage });
            } else if (errorMessage.toLowerCase().includes('translation')) {
                setErrors({ translation: errorMessage });
            } else if (errorMessage.toLowerCase().includes('language')) {
                setErrors({ language_code: errorMessage });
            } else if (errorMessage.toLowerCase().includes('context')) {
                setErrors({ context: errorMessage });
            } else {
                setErrors({ general: errorMessage });
            }
        } finally {
            setSubmitting(false);
        }
    };

    const handleFieldChange = (field: keyof TranslationFormData, value: any) => {
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

    const getCharacterCount = (text: string) => {
        return text.length;
    };

    const getSelectedLanguage = () => {
        return SUPPORTED_LANGUAGES.find(lang => lang.value === formData.language_code);
    };

    const generateKeyFromText = () => {
        if (formData.translation.trim()) {
            // Create a key from the translation text
            const key = formData.translation
                .toLowerCase()
                .replace(/[^\w\s]/g, '') // Remove special characters
                .replace(/\s+/g, '_') // Replace spaces with underscores
                .substring(0, 50); // Limit length

            handleFieldChange('key', key);
        }
    };

    if (loading.translations) {
        return (
            <View style={styles.loadingContainer}>
                <LoadingSpinner />
                <Text style={styles.loadingText}>
                    {isEditing ? 'Loading translation...' : 'Preparing form...'}
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
                        <Globe size={24} color={colors.primary} />
                    </View>
                    <View style={styles.headerText}>
                        <Text style={styles.headerTitle}>
                            {isEditing ? 'Edit Translation' : 'New Translation'}
                        </Text>
                        <Text style={styles.headerSubtitle}>
                            {isEditing ? 'Update the translation' : 'Create a new translation'}
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
                    {/* Key */}
                    <View style={styles.fieldContainer}>
                        <View style={styles.fieldHeader}>
                            <Text style={styles.fieldLabel}>
                                Translation Key <Text style={styles.required}>*</Text>
                            </Text>
                            {!isEditing && formData.translation && (
                                <Button
                                    title="Generate"
                                    variant="ghost"
                                    size="small"
                                    onPress={generateKeyFromText}
                                    style={styles.generateButton}
                                />
                            )}
                        </View>
                        <TextInput
                            value={formData.key}
                            onChangeText={(value) => handleFieldChange('key', value)}
                            placeholder="e.g., welcome_message, error_invalid_input"
                            error={errors.key}
                            multiline={false}
                            maxLength={255}
                            editable={!isEditing} // Don't allow editing key for existing translations
                            style={isEditing ? styles.disabledInput : undefined}
                            icon={<Hash size={16} color={colors.textSecondary} />}
                        />
                        <Text style={styles.fieldHelper}>
                            {isEditing
                                ? "Translation key cannot be changed"
                                : "Unique identifier for this translation (letters, numbers, dots, underscores, hyphens only)"
                            }
                        </Text>
                    </View>

                    {/* Language */}
                    <View style={styles.fieldContainer}>
                        <Text style={styles.fieldLabel}>
                            Language <Text style={styles.required}>*</Text>
                        </Text>
                        <Dropdown
                            value={formData.language_code}
                            onSelect={(value) => handleFieldChange('language_code', value)}
                            options={SUPPORTED_LANGUAGES}
                            placeholder="Select language"
                            error={errors.language_code}
                            icon={<Languages size={16} color={colors.textSecondary} />}
                        />
                        <Text style={styles.fieldHelper}>
                            Target language for this translation
                        </Text>
                    </View>

                    {/* Translation */}
                    <View style={styles.fieldContainer}>
                        <Text style={styles.fieldLabel}>
                            Translation <Text style={styles.required}>*</Text>
                        </Text>
                        <TextInput
                            value={formData.translation}
                            onChangeText={(value) => handleFieldChange('translation', value)}
                            placeholder={`Enter translation in ${getSelectedLanguage()?.label || 'selected language'}...`}
                            error={errors.translation}
                            multiline={true}
                            numberOfLines={4}
                            maxLength={5000}
                            style={styles.translationInput}
                            icon={<MessageSquare size={16} color={colors.textSecondary} />}
                        />
                        <View style={styles.fieldFooter}>
                            <Text style={styles.fieldHelper}>
                                The translated text in the target language
                            </Text>
                            <Text style={styles.characterCount}>
                                {getCharacterCount(formData.translation)}/5,000 chars
                            </Text>
                        </View>
                    </View>

                    {/* Context */}
                    <View style={styles.fieldContainer}>
                        <Text style={styles.fieldLabel}>
                            Context (Optional)
                        </Text>
                        <TextInput
                            value={formData.context || ""}
                            onChangeText={(value) => handleFieldChange('context', value)}
                            placeholder="Provide context for translators (e.g., 'Button text', 'Error message for login form')"
                            error={errors.context}
                            multiline={true}
                            numberOfLines={2}
                            maxLength={500}
                            icon={<Info size={16} color={colors.textSecondary} />}
                        />
                        <View style={styles.fieldFooter}>
                            <Text style={styles.fieldHelper}>
                                Additional context to help translators understand the usage
                            </Text>
                            <Text style={styles.characterCount}>
                                {getCharacterCount(formData.context || "")}/500 chars
                            </Text>
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
                                ? 'This translation is active and will be used in the application'
                                : 'This translation is inactive and will not be used'
                            }
                        </Text>
                    </View>
                </View>

                {/* Info Box */}
                <View style={styles.infoContainer}>
                    <Info size={16} color={colors.info} />
                    <Text style={styles.infoText}>
                        Make sure the translation is accurate and appropriate for the target language and culture.
                        Consider using the context field to provide additional information for future translators.
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
                        title={isEditing ? 'Update Translation' : 'Create Translation'}
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
    fieldHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    fieldLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text,
    },
    required: {
        color: colors.error,
    },
    generateButton: {
        paddingHorizontal: 12,
        paddingVertical: 6,
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
    disabledInput: {
        backgroundColor: colors.backgroundSecondary,
        opacity: 0.6,
    },
    translationInput: {
        minHeight: 100,
        textAlignVertical: 'top',
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

export default TranslationForm; 