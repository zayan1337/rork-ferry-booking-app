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
    Activity,
    Info,
    Settings,
    RotateCcw,
    CheckCircle,
    Eye,
} from "lucide-react-native";

// Components
import Button from "@/components/admin/Button";
import TextInput from "@/components/admin/TextInput";
import Switch from "@/components/admin/Switch";
import LoadingSpinner from "@/components/admin/LoadingSpinner";
import DatePicker from "@/components/DatePicker";

interface TermsFormProps {
    terms?: TermsAndConditions;
    onSuccess: () => void;
    onError: (error: string) => void;
    onCancel?: () => void;
}

interface ValidationErrors {
    title?: string;
    content?: string;
    version?: string;
    effective_date?: string;
    general?: string;
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

    const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
    const [submitting, setSubmitting] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);

    const isEditing = !!terms;

    // Track form changes
    useEffect(() => {
        if (isEditing) {
            const hasFormChanges = JSON.stringify(formData) !== JSON.stringify(initialData);
            setHasChanges(hasFormChanges);
        } else {
            const hasFormChanges =
                formData.title.trim() !== '' ||
                formData.content.trim() !== '' ||
                formData.version.trim() !== '' ||
                formData.effective_date !== new Date().toISOString().split('T')[0] ||
                formData.is_active !== true;
            setHasChanges(hasFormChanges);
        }
    }, [formData, initialData, isEditing]);

    const handleFieldChange = (field: keyof TermsFormData, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        // Clear field error when user starts typing
        if (validationErrors[field]) {
            setValidationErrors(prev => ({ ...prev, [field]: '' }));
        }
    };

    const handleReset = () => {
        setFormData(initialData);
        setValidationErrors({});
        setHasChanges(false);
    };

    const validateForm = (): boolean => {
        const errors: ValidationErrors = {};

        // Use content management validation
        const validation = validateTermsData(formData);
        if (!validation.isValid) {
            Object.assign(errors, validation.errors);
        }

        setValidationErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSubmit = async () => {
        if (!validateForm()) {
            return;
        }

        setSubmitting(true);
        setValidationErrors({});

        try {
            const cleanData = {
                ...formData,
                title: formData.title.trim(),
                content: formData.content.trim(),
                version: formData.version.trim(),
                effective_date: formData.effective_date + 'T00:00:00Z',
            };

            if (isEditing && terms) {
                await updateTerms(terms.id, cleanData);
                Alert.alert(
                    "Success",
                    "Terms and conditions updated successfully",
                    [
                        {
                            text: "OK",
                            onPress: () => {
                                onSuccess();
                            }
                        }
                    ]
                );
            } else {
                await createTerms(cleanData);
                Alert.alert(
                    "Success",
                    "Terms and conditions created successfully",
                    [
                        {
                            text: "OK",
                            onPress: () => {
                                onSuccess();
                            }
                        }
                    ]
                );

                // Reset form if creating new terms
                setFormData({
                    title: "",
                    content: "",
                    version: "",
                    effective_date: new Date().toISOString().split('T')[0],
                    is_active: true,
                });
                setHasChanges(false);
            }
        } catch (error: any) {
            console.error("Error saving terms:", error);
            const errorMessage = error?.message ||
                (isEditing
                    ? "Failed to update terms and conditions. Please check your connection and try again."
                    : "Failed to create terms and conditions. Please check your connection and try again.");
            setValidationErrors({ general: errorMessage });
            onError(errorMessage);
        } finally {
            setSubmitting(false);
        }
    };

    const getWordCount = (text: string) => {
        return text.trim() ? text.trim().split(/\s+/).length : 0;
    };

    const getCharacterCount = (text: string) => {
        return text.length;
    };

    const getReadingTime = (text: string) => {
        const words = getWordCount(text);
        return Math.ceil(words / 200); // Average reading speed
    };

    const contentStats = {
        words: getWordCount(formData.content),
        characters: getCharacterCount(formData.content),
        readingTime: getReadingTime(formData.content),
    };

    if (loading.singleTerms || loading.terms) {
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
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerIcon}>
                    <FileText size={24} color={colors.primary} />
                </View>
                <View style={styles.headerContent}>
                    <Text style={styles.title}>
                        {isEditing ? 'Edit Terms & Conditions' : 'Create New Terms & Conditions'}
                    </Text>
                    <Text style={styles.subtitle}>
                        {isEditing
                            ? 'Update the terms and conditions information'
                            : 'Create comprehensive terms and conditions for your platform'
                        }
                    </Text>
                </View>
            </View>

            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                {/* General Error */}
                {validationErrors.general && (
                    <View style={styles.errorContainer}>
                        <View style={styles.errorIcon}>
                            <AlertCircle size={20} color={colors.error} />
                        </View>
                        <Text style={styles.errorText}>{validationErrors.general}</Text>
                    </View>
                )}

                {/* Basic Information Section */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <View style={styles.sectionHeaderIcon}>
                            <Info size={20} color={colors.primary} />
                        </View>
                        <Text style={styles.sectionTitle}>Basic Information</Text>
                    </View>

                    <View style={styles.formGroup}>
                        <TextInput
                            label="Title"
                            value={formData.title}
                            onChangeText={(value) => handleFieldChange('title', value)}
                            placeholder="Enter terms and conditions title"
                            error={validationErrors.title}
                            maxLength={200}
                            required
                        />
                        <View style={styles.fieldFooter}>
                            <Text style={styles.fieldHelper}>
                                A clear and descriptive title for the terms and conditions
                            </Text>
                            <Text style={[
                                styles.characterCount,
                                formData.title.length > 180 && styles.characterCountWarning
                            ]}>
                                {formData.title.length}/200
                            </Text>
                        </View>
                    </View>

                    <View style={styles.formGroup}>
                        <TextInput
                            label="Version"
                            value={formData.version}
                            onChangeText={(value) => handleFieldChange('version', value)}
                            placeholder="e.g., 1.0, 2.1, etc."
                            error={validationErrors.version}
                            maxLength={20}
                            required
                        />
                        <Text style={styles.fieldHelper}>
                            Version number to track changes over time
                        </Text>
                    </View>

                    <View style={styles.formGroup}>
                        <DatePicker
                            label="Effective Date"
                            value={formData.effective_date}
                            onChange={(date) => handleFieldChange('effective_date', date)}
                            minDate={new Date().toISOString().split('T')[0]}
                            placeholder="Select when these terms become effective"
                            error={validationErrors.effective_date}
                            required
                        />
                        <Text style={styles.fieldHelper}>
                            Date when these terms become effective (must be today or later)
                        </Text>
                    </View>
                </View>

                {/* Content Section */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <View style={styles.sectionHeaderIcon}>
                            <MessageSquare size={20} color={colors.primary} />
                        </View>
                        <Text style={styles.sectionTitle}>Terms Content</Text>
                    </View>

                    <View style={styles.formGroup}>
                        <TextInput
                            label="Content"
                            value={formData.content}
                            onChangeText={(value) => handleFieldChange('content', value)}
                            placeholder="Enter the full terms and conditions content..."
                            error={validationErrors.content}
                            multiline={true}
                            numberOfLines={10}
                            maxLength={50000}
                            style={styles.contentInput}
                            required
                        />
                        <View style={styles.contentFooter}>
                            <Text style={styles.fieldHelper}>
                                Complete terms and conditions content that users will see
                            </Text>
                            <View style={styles.contentStats}>
                                <View style={styles.statRow}>
                                    <Type size={12} color={colors.textSecondary} />
                                    <Text style={styles.statText}>
                                        {contentStats.words} words
                                    </Text>
                                </View>
                                <View style={styles.statRow}>
                                    <Hash size={12} color={colors.textSecondary} />
                                    <Text style={[
                                        styles.statText,
                                        formData.content.length > 45000 && styles.statTextWarning
                                    ]}>
                                        {contentStats.characters}/50,000 chars
                                    </Text>
                                </View>
                                <View style={styles.statRow}>
                                    <Eye size={12} color={colors.textSecondary} />
                                    <Text style={styles.statText}>
                                        ~{contentStats.readingTime} min read
                                    </Text>
                                </View>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Settings Section */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <View style={styles.sectionHeaderIcon}>
                            <Settings size={20} color={colors.primary} />
                        </View>
                        <Text style={styles.sectionTitle}>Settings</Text>
                    </View>

                    <View style={styles.switchContainer}>
                        <Switch
                            label="Active Status"
                            value={formData.is_active}
                            onValueChange={(value) => handleFieldChange('is_active', value)}
                            description={
                                formData.is_active
                                    ? 'These terms are currently active and visible to users'
                                    : 'These terms are inactive and not visible to users'
                            }
                            icon={<Activity size={16} color={formData.is_active ? colors.success : colors.textSecondary} />}
                        />
                    </View>

                    {formData.is_active && (
                        <View style={styles.statusContainer}>
                            <View style={styles.statusIcon}>
                                <CheckCircle size={16} color={colors.success} />
                            </View>
                            <Text style={styles.statusText}>
                                These terms will be immediately visible to all users when saved
                            </Text>
                        </View>
                    )}
                </View>

                {/* Info Section */}
                <View style={styles.infoContainer}>
                    <View style={styles.infoIcon}>
                        <Info size={18} color={colors.info} />
                    </View>
                    <View style={styles.infoContent}>
                        <Text style={styles.infoTitle}>Important Note</Text>
                        <Text style={styles.infoText}>
                            Make sure to review all terms carefully before publishing. Once active,
                            these terms will be visible to all users and legally binding.
                        </Text>
                    </View>
                </View>

                {/* Action Buttons */}
                <View style={styles.buttonContainer}>
                    {hasChanges && (
                        <Button
                            title="Reset Changes"
                            variant="outline"
                            onPress={handleReset}
                            icon={<RotateCcw size={16} color={colors.textSecondary} />}
                        />
                    )}

                    <Button
                        title={isEditing ? 'Update Terms' : 'Create Terms'}
                        variant="primary"
                        onPress={handleSubmit}
                        loading={submitting}
                        disabled={submitting || !hasChanges}
                        icon={<Save size={16} color={colors.white} />}
                    />

                    {onCancel && (
                        <Button
                            title="Cancel"
                            variant="ghost"
                            onPress={onCancel}
                            disabled={submitting}
                            icon={<X size={16} color={colors.textSecondary} />}
                        />
                    )}
                </View>
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.backgroundSecondary,
        padding: 20,
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
        fontWeight: "500",
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
    errorContainer: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        backgroundColor: colors.errorLight,
        padding: 20,
        borderRadius: 16,
        marginBottom: 20,
        borderLeftWidth: 4,
        borderLeftColor: colors.error,
    },
    errorIcon: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: colors.error + '20',
        alignItems: "center",
        justifyContent: "center",
    },
    errorText: {
        fontSize: 14,
        color: colors.error,
        flex: 1,
        fontWeight: "600",
        lineHeight: 18,
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
    fieldFooter: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginTop: 8,
    },
    fieldHelper: {
        fontSize: 12,
        color: colors.textSecondary,
        lineHeight: 16,
        flex: 1,
    },
    characterCount: {
        fontSize: 11,
        color: colors.textSecondary,
        fontWeight: '500',
        marginLeft: 8,
    },
    characterCountWarning: {
        color: colors.warning,
    },
    contentInput: {
        minHeight: 200,
        textAlignVertical: 'top',
    },
    contentFooter: {
        gap: 8,
        marginTop: 8,
    },
    contentStats: {
        flexDirection: "row",
        gap: 16,
        marginTop: 4,
    },
    statRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
    },
    statText: {
        fontSize: 11,
        color: colors.textSecondary,
        fontWeight: '500',
    },
    statTextWarning: {
        color: colors.warning,
    },
    switchContainer: {
        marginBottom: 8,
    },
    statusContainer: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        backgroundColor: colors.successLight,
        padding: 16,
        borderRadius: 12,
        borderLeftWidth: 3,
        borderLeftColor: colors.success,
    },
    statusIcon: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: colors.success + '20',
        alignItems: "center",
        justifyContent: "center",
    },
    statusText: {
        fontSize: 13,
        color: colors.success,
        fontWeight: "600",
        flex: 1,
    },
    infoContainer: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 12,
        backgroundColor: colors.infoLight,
        padding: 20,
        borderRadius: 16,
        marginBottom: 20,
        borderLeftWidth: 4,
        borderLeftColor: colors.info,
    },
    infoIcon: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: colors.info + '20',
        alignItems: "center",
        justifyContent: "center",
        marginTop: 2,
    },
    infoContent: {
        flex: 1,
        gap: 4,
    },
    infoTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.info,
    },
    infoText: {
        fontSize: 13,
        color: colors.info,
        lineHeight: 18,
    },
    buttonContainer: {
        gap: 16,
        marginBottom: 20,
    },
});

export default TermsForm; 