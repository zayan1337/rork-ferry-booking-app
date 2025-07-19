import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    Switch,
    Alert,
    KeyboardAvoidingView,
    Platform,
} from "react-native";
import { Stack, useLocalSearchParams, router } from "expo-router";
import { colors } from "@/constants/adminColors";
import { useContentManagement } from "@/hooks/useContentManagement";
import { useAdminPermissions } from "@/hooks/useAdminPermissions";
import { TermsFormData } from "@/types/content";
import {
    ArrowLeft,
    FileText,
    Save,
    Calendar,
    Hash,
    Type,
    Clock,
    AlertTriangle,
} from "lucide-react-native";

// Components
import Button from "@/components/admin/Button";
import LoadingSpinner from "@/components/admin/LoadingSpinner";

export default function EditTermsScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const { canManageContent } = useAdminPermissions();
    const {
        currentTerms,
        loading,
        fetchTermsById,
        updateTerms,
        resetCurrentTerms,
        error,
        clearError,
    } = useContentManagement();

    const [formData, setFormData] = useState<TermsFormData>({
        title: "",
        content: "",
        version: "1.0",
        effective_date: new Date().toISOString().split('T')[0],
        is_active: true,
    });

    const [errors, setErrors] = useState<Record<string, string>>({});
    const [hasInitialized, setHasInitialized] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Load terms data
    useEffect(() => {
        if (canManageContent() && id && !hasInitialized) {
            fetchTermsById(id).finally(() => {
                setHasInitialized(true);
            });
        }
    }, [id, hasInitialized]); // Removed function dependencies

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            resetCurrentTerms();
            clearError();
        };
    }, []); // Empty dependency array for cleanup only

    // Update form data when currentTerms changes
    useEffect(() => {
        if (currentTerms) {
            setFormData({
                title: currentTerms.title,
                content: currentTerms.content,
                version: currentTerms.version,
                effective_date: currentTerms.effective_date.split('T')[0],
                is_active: currentTerms.is_active,
            });
        }
    }, [currentTerms]);

    const validateForm = (): boolean => {
        const newErrors: Record<string, string> = {};

        if (!formData.title.trim()) {
            newErrors.title = "Title is required";
        }

        if (!formData.content.trim()) {
            newErrors.content = "Content is required";
        }

        if (!formData.version.trim()) {
            newErrors.version = "Version is required";
        }

        if (!formData.effective_date) {
            newErrors.effective_date = "Effective date is required";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSave = async () => {
        if (!canManageContent()) {
            Alert.alert("Access Denied", "You don't have permission to edit terms and conditions.");
            return;
        }

        if (!validateForm()) {
            Alert.alert("Validation Error", "Please fix the errors and try again.");
            return;
        }

        if (!id) {
            Alert.alert("Error", "Terms ID is missing.");
            return;
        }

        setIsSubmitting(true);
        try {
            await updateTerms(id, {
                ...formData,
                effective_date: formData.effective_date + 'T00:00:00Z',
            });

            Alert.alert(
                "Success",
                "Terms and conditions updated successfully",
                [
                    {
                        text: "OK",
                        onPress: () => router.back(),
                    },
                ]
            );
        } catch (error) {
            console.error("Error updating terms:", error);
            Alert.alert("Error", "Failed to update terms and conditions. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const updateFormData = (field: keyof TermsFormData, value: string | boolean) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        // Clear error when user starts typing
        if (errors[field as string]) {
            setErrors(prev => ({ ...prev, [field as string]: "" }));
        }
    };

    // Permission check
    if (!canManageContent()) {
        return (
            <View style={styles.container}>
                <Stack.Screen
                    options={{
                        title: "Edit Terms & Conditions",
                        headerLeft: () => (
                            <TouchableOpacity onPress={() => router.back()}>
                                <ArrowLeft size={24} color={colors.primary} />
                            </TouchableOpacity>
                        ),
                    }}
                />
                <View style={styles.noPermissionContainer}>
                    <AlertTriangle size={48} color={colors.warning} />
                    <Text style={styles.noPermissionTitle}>Access Denied</Text>
                    <Text style={styles.noPermissionText}>
                        You don't have permission to edit terms and conditions.
                    </Text>
                </View>
            </View>
        );
    }

    // Loading state
    if ((loading.singleTerms || loading.terms) && !hasInitialized) {
        return (
            <View style={styles.container}>
                <Stack.Screen
                    options={{
                        title: "Edit Terms & Conditions",
                        headerLeft: () => (
                            <TouchableOpacity onPress={() => router.back()}>
                                <ArrowLeft size={24} color={colors.primary} />
                            </TouchableOpacity>
                        ),
                    }}
                />
                <View style={styles.loadingContainer}>
                    <LoadingSpinner />
                    <Text style={styles.loadingText}>Loading terms and conditions...</Text>
                </View>
            </View>
        );
    }

    // Not found state
    if (hasInitialized && !currentTerms && !loading.singleTerms) {
        return (
            <View style={styles.container}>
                <Stack.Screen
                    options={{
                        title: "Terms Not Found",
                        headerLeft: () => (
                            <TouchableOpacity onPress={() => router.back()}>
                                <ArrowLeft size={24} color={colors.primary} />
                            </TouchableOpacity>
                        ),
                    }}
                />
                <View style={styles.notFoundContainer}>
                    <FileText size={64} color={colors.textSecondary} />
                    <Text style={styles.notFoundTitle}>Terms & Conditions Not Found</Text>
                    <Text style={styles.notFoundText}>
                        The terms and conditions you're trying to edit don't exist or have been deleted.
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
                    title: "Edit Terms & Conditions",
                    headerLeft: () => (
                        <TouchableOpacity onPress={() => router.back()}>
                            <ArrowLeft size={24} color={colors.primary} />
                        </TouchableOpacity>
                    ),
                    headerRight: () => (
                        <TouchableOpacity
                            onPress={handleSave}
                            disabled={isSubmitting || loading.terms}
                        >
                            {(isSubmitting || loading.terms) ? (
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
                    {/* Title */}
                    <View style={styles.fieldContainer}>
                        <View style={styles.fieldHeader}>
                            <Type size={20} color={colors.primary} />
                            <Text style={styles.fieldLabel}>Title</Text>
                            <Text style={styles.requiredText}>*</Text>
                        </View>
                        <TextInput
                            style={[styles.input, errors.title && styles.inputError]}
                            value={formData.title}
                            onChangeText={(text) => updateFormData('title', text)}
                            placeholder="Enter terms and conditions title..."
                            placeholderTextColor={colors.textSecondary}
                        />
                        {errors.title && <Text style={styles.errorText}>{errors.title}</Text>}
                        <Text style={styles.fieldHelp}>
                            Provide a clear and descriptive title for these terms
                        </Text>
                    </View>

                    {/* Version */}
                    <View style={styles.fieldContainer}>
                        <View style={styles.fieldHeader}>
                            <Hash size={20} color={colors.primary} />
                            <Text style={styles.fieldLabel}>Version</Text>
                            <Text style={styles.requiredText}>*</Text>
                        </View>
                        <TextInput
                            style={[styles.input, errors.version && styles.inputError]}
                            value={formData.version}
                            onChangeText={(text) => updateFormData('version', text)}
                            placeholder="e.g., 1.0, 2.1, 3.0"
                            placeholderTextColor={colors.textSecondary}
                        />
                        {errors.version && <Text style={styles.errorText}>{errors.version}</Text>}
                        <Text style={styles.fieldHelp}>
                            Use semantic versioning (e.g., 1.0, 1.1, 2.0) to track changes
                        </Text>
                    </View>

                    {/* Effective Date */}
                    <View style={styles.fieldContainer}>
                        <View style={styles.fieldHeader}>
                            <Calendar size={20} color={colors.primary} />
                            <Text style={styles.fieldLabel}>Effective Date</Text>
                            <Text style={styles.requiredText}>*</Text>
                        </View>
                        <TextInput
                            style={[styles.input, errors.effective_date && styles.inputError]}
                            value={formData.effective_date}
                            onChangeText={(text) => updateFormData('effective_date', text)}
                            placeholder="YYYY-MM-DD"
                            placeholderTextColor={colors.textSecondary}
                        />
                        {errors.effective_date && <Text style={styles.errorText}>{errors.effective_date}</Text>}
                        <Text style={styles.fieldHelp}>
                            Date when these terms and conditions become effective
                        </Text>
                    </View>

                    {/* Content */}
                    <View style={styles.fieldContainer}>
                        <View style={styles.fieldHeader}>
                            <FileText size={20} color={colors.primary} />
                            <Text style={styles.fieldLabel}>Content</Text>
                            <Text style={styles.requiredText}>*</Text>
                        </View>
                        <TextInput
                            style={[styles.textArea, errors.content && styles.inputError]}
                            value={formData.content}
                            onChangeText={(text) => updateFormData('content', text)}
                            placeholder="Enter the full terms and conditions content..."
                            placeholderTextColor={colors.textSecondary}
                            multiline
                            numberOfLines={10}
                            textAlignVertical="top"
                        />
                        {errors.content && <Text style={styles.errorText}>{errors.content}</Text>}
                        <Text style={styles.fieldHelp}>
                            Full legal text of the terms and conditions
                        </Text>
                    </View>

                    {/* Status */}
                    <View style={styles.fieldContainer}>
                        <View style={styles.fieldHeader}>
                            <Clock size={20} color={colors.primary} />
                            <Text style={styles.fieldLabel}>Status</Text>
                        </View>
                        <View style={styles.switchContainer}>
                            <Switch
                                value={formData.is_active}
                                onValueChange={(value) => updateFormData('is_active', value)}
                                trackColor={{ false: colors.background, true: colors.primary + '40' }}
                                thumbColor={formData.is_active ? colors.primary : colors.textSecondary}
                            />
                            <Text style={styles.switchLabel}>
                                {formData.is_active ? 'Active' : 'Inactive'}
                            </Text>
                        </View>
                        <Text style={styles.fieldHelp}>
                            Inactive terms will not be visible to users
                        </Text>
                    </View>

                    {/* Actions */}
                    <View style={styles.actionsContainer}>
                        <Button
                            title="Cancel"
                            variant="outline"
                            onPress={() => router.back()}
                            disabled={isSubmitting}
                        />
                        <Button
                            title="Save Changes"
                            variant="primary"
                            onPress={handleSave}
                            loading={isSubmitting}
                            disabled={isSubmitting}
                            icon={<Save size={16} color={colors.white} />}
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
        backgroundColor: colors.backgroundSecondary,
    },
    scrollContainer: {
        flex: 1,
    },
    formContainer: {
        padding: 16,
        gap: 24,
    },
    fieldContainer: {
        gap: 8,
    },
    fieldHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    fieldLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text,
        flex: 1,
    },
    requiredText: {
        color: colors.error,
        fontSize: 16,
        fontWeight: '600',
    },
    input: {
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.background,
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        color: colors.text,
        minHeight: 48,
    },
    textArea: {
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.background,
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        color: colors.text,
        minHeight: 120,
        textAlignVertical: 'top',
    },
    inputError: {
        borderColor: colors.error,
    },
    fieldHelp: {
        fontSize: 14,
        color: colors.textSecondary,
        lineHeight: 18,
    },
    errorText: {
        fontSize: 14,
        color: colors.error,
        fontWeight: '500',
    },
    switchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    switchLabel: {
        fontSize: 16,
        color: colors.text,
        fontWeight: '500',
    },
    actionsContainer: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 24,
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
    noPermissionContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 32,
        gap: 16,
    },
    noPermissionTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: colors.text,
        textAlign: 'center',
    },
    noPermissionText: {
        fontSize: 16,
        color: colors.textSecondary,
        textAlign: 'center',
        lineHeight: 22,
    },
    notFoundContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 32,
        gap: 16,
    },
    notFoundTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: colors.text,
        textAlign: 'center',
    },
    notFoundText: {
        fontSize: 16,
        color: colors.textSecondary,
        textAlign: 'center',
        lineHeight: 22,
    },
    backButton: {
        marginTop: 16,
    },
}); 