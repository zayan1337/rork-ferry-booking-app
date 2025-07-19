import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    Alert,
    KeyboardAvoidingView,
    Platform,
} from "react-native";
import { Stack, useLocalSearchParams, router } from "expo-router";
import { colors } from "@/constants/adminColors";
import { useContentStore } from "@/store/admin/contentStore";
import { useAdminPermissions } from "@/hooks/useAdminPermissions";
import { TranslationFormData } from "@/types/content";
import {
    ArrowLeft,
    Globe,
    Save,
    Key,
    Type,
    MessageSquare,
    Tag,
} from "lucide-react-native";

// Components
import Button from "@/components/admin/Button";
import LoadingSpinner from "@/components/admin/LoadingSpinner";

const COMMON_LANGUAGES = [
    { code: 'en', name: 'English' },
    { code: 'es', name: 'Spanish' },
    { code: 'fr', name: 'French' },
    { code: 'de', name: 'German' },
    { code: 'it', name: 'Italian' },
    { code: 'pt', name: 'Portuguese' },
    { code: 'nl', name: 'Dutch' },
    { code: 'sv', name: 'Swedish' },
    { code: 'da', name: 'Danish' },
    { code: 'no', name: 'Norwegian' },
];

const COMMON_CONTEXTS = [
    'navigation',
    'buttons',
    'forms',
    'messages',
    'errors',
    'success',
    'warnings',
    'labels',
    'placeholders',
    'titles',
];

export default function EditTranslationScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const { canManageContent } = useAdminPermissions();
    const {
        translations,
        loading,
        fetchTranslations,
        updateTranslation,
        getTranslation
    } = useContentStore();

    const [formData, setFormData] = useState<TranslationFormData>({
        key: "",
        translation: "",
        language_code: "en",
        context: "",
        description: "",
    });

    const [errors, setErrors] = useState<Record<string, string>>({});
    const [initialLoad, setInitialLoad] = useState(true);

    // Load translation data
    useEffect(() => {
        if (canManageContent()) {
            if (translations.length === 0) {
                fetchTranslations();
            } else {
                loadTranslationData();
            }
        }
    }, [id, translations]);

    useEffect(() => {
        if (translations.length > 0 && initialLoad) {
            loadTranslationData();
        }
    }, [translations, initialLoad]);

    const loadTranslationData = () => {
        const translation = getTranslation(id);
        if (translation) {
            setFormData({
                key: translation.key,
                translation: translation.translation,
                language_code: translation.language_code,
                context: translation.context || "",
                description: translation.description || "",
            });
            setInitialLoad(false);
        }
    };

    const validateForm = (): boolean => {
        const newErrors: Record<string, string> = {};

        if (!formData.key.trim()) {
            newErrors.key = "Translation key is required";
        } else if (!/^[a-zA-Z0-9._-]+$/.test(formData.key)) {
            newErrors.key = "Translation key can only contain letters, numbers, dots, hyphens, and underscores";
        }

        if (!formData.translation.trim()) {
            newErrors.translation = "Translation text is required";
        }

        if (!formData.language_code.trim()) {
            newErrors.language_code = "Language code is required";
        } else if (!/^[a-z]{2}(-[A-Z]{2})?$/.test(formData.language_code)) {
            newErrors.language_code = "Language code must be in format 'en' or 'en-US'";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSave = async () => {
        if (!canManageContent()) {
            Alert.alert("Access Denied", "You don't have permission to edit translations.");
            return;
        }

        if (!validateForm()) {
            Alert.alert("Validation Error", "Please fix the errors and try again.");
            return;
        }

        try {
            await updateTranslation(id, formData);

            Alert.alert(
                "Success",
                "Translation updated successfully",
                [
                    {
                        text: "OK",
                        onPress: () => router.back(),
                    },
                ]
            );
        } catch (error) {
            console.error("Error updating translation:", error);
            Alert.alert("Error", "Failed to update translation. Please try again.");
        }
    };

    const updateFormData = (field: keyof TranslationFormData, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        // Clear error when user starts typing
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: "" }));
        }
    };

    // Permission check
    if (!canManageContent()) {
        return (
            <View style={styles.container}>
                <Stack.Screen
                    options={{
                        title: "Edit Translation",
                        headerLeft: () => (
                            <TouchableOpacity onPress={() => router.back()}>
                                <ArrowLeft size={24} color={colors.primary} />
                            </TouchableOpacity>
                        ),
                    }}
                />
                <View style={styles.noPermissionContainer}>
                    <Globe size={48} color={colors.textSecondary} />
                    <Text style={styles.noPermissionTitle}>Access Denied</Text>
                    <Text style={styles.noPermissionText}>
                        You don't have permission to edit translations.
                    </Text>
                </View>
            </View>
        );
    }

    // Loading state
    if (loading.translations && initialLoad) {
        return (
            <View style={styles.container}>
                <Stack.Screen
                    options={{
                        title: "Edit Translation",
                        headerLeft: () => (
                            <TouchableOpacity onPress={() => router.back()}>
                                <ArrowLeft size={24} color={colors.primary} />
                            </TouchableOpacity>
                        ),
                    }}
                />
                <View style={styles.loadingContainer}>
                    <LoadingSpinner />
                    <Text style={styles.loadingText}>Loading translation...</Text>
                </View>
            </View>
        );
    }

    // Not found state
    if (!initialLoad && !getTranslation(id)) {
        return (
            <View style={styles.container}>
                <Stack.Screen
                    options={{
                        title: "Translation Not Found",
                        headerLeft: () => (
                            <TouchableOpacity onPress={() => router.back()}>
                                <ArrowLeft size={24} color={colors.primary} />
                            </TouchableOpacity>
                        ),
                    }}
                />
                <View style={styles.notFoundContainer}>
                    <Globe size={64} color={colors.textSecondary} />
                    <Text style={styles.notFoundTitle}>Translation Not Found</Text>
                    <Text style={styles.notFoundText}>
                        The translation you're trying to edit doesn't exist or has been deleted.
                    </Text>
                    <Button
                        title="Go Back"
                        variant="primary"
                        onPress={() => router.back()}
                        style={styles.backButton}
                    />
                </View>
            </View>
        );
    }

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <Stack.Screen
                options={{
                    title: "Edit Translation",
                    headerLeft: () => (
                        <TouchableOpacity onPress={() => router.back()}>
                            <ArrowLeft size={24} color={colors.primary} />
                        </TouchableOpacity>
                    ),
                    headerRight: () => (
                        <TouchableOpacity
                            onPress={handleSave}
                            disabled={loading.translations}
                        >
                            {loading.translations ? (
                                <LoadingSpinner size="small" />
                            ) : (
                                <Save size={24} color={colors.primary} />
                            )}
                        </TouchableOpacity>
                    ),
                }}
            />

            <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
                <View style={styles.formContainer}>
                    {/* Translation Key */}
                    <View style={styles.fieldContainer}>
                        <View style={styles.fieldHeader}>
                            <Key size={20} color={colors.primary} />
                            <Text style={styles.fieldLabel}>Translation Key</Text>
                            <Text style={styles.requiredText}>*</Text>
                        </View>
                        <TextInput
                            style={[styles.input, errors.key && styles.inputError]}
                            value={formData.key}
                            onChangeText={(text) => updateFormData('key', text)}
                            placeholder="e.g., button.save, message.welcome"
                            placeholderTextColor={colors.textSecondary}
                        />
                        {errors.key && <Text style={styles.errorText}>{errors.key}</Text>}
                        <Text style={styles.fieldHelp}>
                            Use a descriptive key with dots to organize (e.g., nav.home, form.submit)
                        </Text>
                    </View>

                    {/* Language Code */}
                    <View style={styles.fieldContainer}>
                        <View style={styles.fieldHeader}>
                            <Globe size={20} color={colors.primary} />
                            <Text style={styles.fieldLabel}>Language Code</Text>
                            <Text style={styles.requiredText}>*</Text>
                        </View>
                        <View style={styles.languageContainer}>
                            <TextInput
                                style={[styles.languageInput, errors.language_code && styles.inputError]}
                                value={formData.language_code}
                                onChangeText={(text) => updateFormData('language_code', text.toLowerCase())}
                                placeholder="en"
                                placeholderTextColor={colors.textSecondary}
                                maxLength={5}
                                autoCapitalize="none"
                            />
                            <View style={styles.languageButtons}>
                                {COMMON_LANGUAGES.slice(0, 5).map(lang => (
                                    <TouchableOpacity
                                        key={lang.code}
                                        style={[
                                            styles.languageButton,
                                            formData.language_code === lang.code && styles.languageButtonActive
                                        ]}
                                        onPress={() => updateFormData('language_code', lang.code)}
                                    >
                                        <Text style={[
                                            styles.languageButtonText,
                                            formData.language_code === lang.code && styles.languageButtonTextActive
                                        ]}>
                                            {lang.code}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                        {errors.language_code && <Text style={styles.errorText}>{errors.language_code}</Text>}
                        <Text style={styles.fieldHelp}>
                            Use ISO 639-1 language codes (e.g., 'en', 'es', 'fr')
                        </Text>
                    </View>

                    {/* Translation Text */}
                    <View style={styles.fieldContainer}>
                        <View style={styles.fieldHeader}>
                            <Type size={20} color={colors.primary} />
                            <Text style={styles.fieldLabel}>Translation Text</Text>
                            <Text style={styles.requiredText}>*</Text>
                        </View>
                        <TextInput
                            style={[styles.textArea, errors.translation && styles.inputError]}
                            value={formData.translation}
                            onChangeText={(text) => updateFormData('translation', text)}
                            placeholder="Enter the translated text..."
                            placeholderTextColor={colors.textSecondary}
                            multiline
                            numberOfLines={4}
                            textAlignVertical="top"
                        />
                        {errors.translation && <Text style={styles.errorText}>{errors.translation}</Text>}
                    </View>

                    {/* Context */}
                    <View style={styles.fieldContainer}>
                        <View style={styles.fieldHeader}>
                            <Tag size={20} color={colors.primary} />
                            <Text style={styles.fieldLabel}>Context</Text>
                        </View>
                        <View style={styles.contextContainer}>
                            <TextInput
                                style={styles.input}
                                value={formData.context || ""}
                                onChangeText={(text) => updateFormData('context', text)}
                                placeholder="Optional context"
                                placeholderTextColor={colors.textSecondary}
                            />
                            <View style={styles.contextButtons}>
                                {COMMON_CONTEXTS.slice(0, 6).map(context => (
                                    <TouchableOpacity
                                        key={context}
                                        style={[
                                            styles.contextButton,
                                            formData.context === context && styles.contextButtonActive
                                        ]}
                                        onPress={() => updateFormData('context', context)}
                                    >
                                        <Text style={[
                                            styles.contextButtonText,
                                            formData.context === context && styles.contextButtonTextActive
                                        ]}>
                                            {context}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                        <Text style={styles.fieldHelp}>
                            Context helps organize translations by usage area
                        </Text>
                    </View>

                    {/* Description */}
                    <View style={styles.fieldContainer}>
                        <View style={styles.fieldHeader}>
                            <MessageSquare size={20} color={colors.primary} />
                            <Text style={styles.fieldLabel}>Description</Text>
                        </View>
                        <TextInput
                            style={styles.textArea}
                            value={formData.description || ""}
                            onChangeText={(text) => updateFormData('description', text)}
                            placeholder="Optional description for translators..."
                            placeholderTextColor={colors.textSecondary}
                            multiline
                            numberOfLines={3}
                            textAlignVertical="top"
                        />
                        <Text style={styles.fieldHelp}>
                            Provide context or instructions for translators
                        </Text>
                    </View>

                    {/* Actions */}
                    <View style={styles.actionsContainer}>
                        <Button
                            title="Cancel"
                            variant="outline"
                            onPress={() => router.back()}
                            style={styles.cancelButton}
                        />
                        <Button
                            title="Save Changes"
                            variant="primary"
                            onPress={handleSave}
                            loading={loading.translations}
                            icon={<Save size={16} color={colors.white} />}
                            style={styles.saveButton}
                        />
                    </View>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    noPermissionContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 32,
    },
    noPermissionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.text,
        marginTop: 16,
        marginBottom: 8,
        textAlign: 'center',
    },
    noPermissionText: {
        fontSize: 14,
        color: colors.textSecondary,
        textAlign: 'center',
        lineHeight: 20,
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
    },
    notFoundContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 32,
    },
    notFoundTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.text,
        marginTop: 16,
        marginBottom: 8,
        textAlign: 'center',
    },
    notFoundText: {
        fontSize: 14,
        color: colors.textSecondary,
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 24,
    },
    backButton: {
        minWidth: 120,
    },
    scrollContainer: {
        flex: 1,
    },
    formContainer: {
        padding: 16,
    },
    fieldContainer: {
        marginBottom: 24,
    },
    fieldHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
        gap: 8,
    },
    fieldLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text,
        flex: 1,
    },
    requiredText: {
        fontSize: 16,
        color: colors.error,
        fontWeight: '600',
    },
    input: {
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        color: colors.text,
        marginBottom: 4,
    },
    inputError: {
        borderColor: colors.error,
        backgroundColor: colors.error + '10',
    },
    textArea: {
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        color: colors.text,
        marginBottom: 4,
        minHeight: 100,
    },
    languageContainer: {
        gap: 12,
    },
    languageInput: {
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        color: colors.text,
        textAlign: 'center',
        textTransform: 'lowercase',
    },
    languageButtons: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    languageButton: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        backgroundColor: colors.backgroundSecondary,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.border,
    },
    languageButtonActive: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    languageButtonText: {
        fontSize: 12,
        fontWeight: '500',
        color: colors.textSecondary,
        textTransform: 'uppercase',
    },
    languageButtonTextActive: {
        color: colors.white,
    },
    contextContainer: {
        gap: 12,
    },
    contextButtons: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    contextButton: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        backgroundColor: colors.backgroundSecondary,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.border,
    },
    contextButtonActive: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    contextButtonText: {
        fontSize: 12,
        fontWeight: '500',
        color: colors.textSecondary,
    },
    contextButtonTextActive: {
        color: colors.white,
    },
    fieldHelp: {
        fontSize: 12,
        color: colors.textSecondary,
        lineHeight: 16,
        marginTop: 4,
    },
    errorText: {
        fontSize: 12,
        color: colors.error,
        marginTop: 4,
    },
    actionsContainer: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 24,
        paddingBottom: 32,
    },
    cancelButton: {
        flex: 1,
    },
    saveButton: {
        flex: 2,
    },
}); 