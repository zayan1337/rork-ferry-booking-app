import React, { useState } from "react";
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
import { Stack, router } from "expo-router";
import { colors } from "@/constants/adminColors";
import { useContentStore } from "@/store/admin/contentStore";
import { useAdminPermissions } from "@/hooks/useAdminPermissions";
import { AdminManagement } from "@/types";
import {
    ArrowLeft,
    FileText,
    Save,
    Calendar,
} from "lucide-react-native";

// Components
import Button from "@/components/admin/Button";
import LoadingSpinner from "@/components/admin/LoadingSpinner";

type TermsFormData = AdminManagement.TermsFormData;

export default function NewTermScreen() {
    const { canManageContent } = useAdminPermissions();
    const { addTerms, loading } = useContentStore();

    const [formData, setFormData] = useState<TermsFormData>({
        title: "",
        content: "",
        version: "1.0",
        effective_date: new Date().toISOString().split('T')[0],
        is_active: true,
    });

    const [errors, setErrors] = useState<Record<string, string>>({});

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
            Alert.alert("Access Denied", "You don't have permission to create terms and conditions.");
            return;
        }

        if (!validateForm()) {
            Alert.alert("Validation Error", "Please fix the errors and try again.");
            return;
        }

        try {
            await addTerms({
                ...formData,
                effective_date: formData.effective_date + 'T00:00:00Z',
            });

            Alert.alert(
                "Success",
                "Terms and conditions created successfully",
                [
                    {
                        text: "OK",
                        onPress: () => router.back(),
                    },
                ]
            );
        } catch (error) {
            console.error("Error creating terms:", error);
            Alert.alert("Error", "Failed to create terms and conditions. Please try again.");
        }
    };

    const updateFormData = (field: keyof TermsFormData, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        // Clear error when user starts typing
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: "" }));
        }
    };

    // Permission check
    if (!canManageContent()) {
        return (
            <View style={styles.noPermissionContainer}>
                <Text style={styles.noPermissionText}>
                    You don't have permission to create terms and conditions.
                </Text>
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
                    title: "New Terms & Conditions",
                    headerLeft: () => (
                        <TouchableOpacity
                            onPress={() => router.back()}
                            style={styles.backButton}
                        >
                            <ArrowLeft size={24} color={colors.text} />
                        </TouchableOpacity>
                    ),
                    headerRight: () => (
                        <Button
                            title="Save"
                            onPress={handleSave}
                            size="small"
                            disabled={loading.terms}
                            icon={<Save size={16} color={colors.card} />}
                        />
                    ),
                }}
            />

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                {/* Header */}
                <View style={styles.headerCard}>
                    <View style={styles.headerIcon}>
                        <FileText size={32} color={colors.primary} />
                    </View>
                    <View style={styles.headerInfo}>
                        <Text style={styles.headerTitle}>Create Terms & Conditions</Text>
                        <Text style={styles.headerSubtitle}>
                            Add new terms and conditions document
                        </Text>
                    </View>
                </View>

                {/* Form */}
                <View style={styles.formCard}>
                    <Text style={styles.cardTitle}>Basic Information</Text>

                    {/* Title */}
                    <View style={styles.formGroup}>
                        <Text style={styles.label}>
                            Title <Text style={styles.required}>*</Text>
                        </Text>
                        <TextInput
                            style={[styles.input, errors.title && styles.inputError]}
                            value={formData.title}
                            onChangeText={(text) => updateFormData('title', text)}
                            placeholder="Enter title for terms and conditions"
                            placeholderTextColor={colors.textSecondary}
                        />
                        {errors.title && <Text style={styles.errorText}>{errors.title}</Text>}
                    </View>

                    {/* Version */}
                    <View style={styles.formGroup}>
                        <Text style={styles.label}>
                            Version <Text style={styles.required}>*</Text>
                        </Text>
                        <TextInput
                            style={[styles.input, errors.version && styles.inputError]}
                            value={formData.version}
                            onChangeText={(text) => updateFormData('version', text)}
                            placeholder="e.g., 1.0, 2.1, etc."
                            placeholderTextColor={colors.textSecondary}
                        />
                        {errors.version && <Text style={styles.errorText}>{errors.version}</Text>}
                    </View>

                    {/* Effective Date */}
                    <View style={styles.formGroup}>
                        <Text style={styles.label}>
                            Effective Date <Text style={styles.required}>*</Text>
                        </Text>
                        <View style={styles.dateInputContainer}>
                            <Calendar size={20} color={colors.textSecondary} />
                            <TextInput
                                style={[styles.dateInput, errors.effective_date && styles.inputError]}
                                value={formData.effective_date}
                                onChangeText={(text) => updateFormData('effective_date', text)}
                                placeholder="YYYY-MM-DD"
                                placeholderTextColor={colors.textSecondary}
                            />
                        </View>
                        {errors.effective_date && <Text style={styles.errorText}>{errors.effective_date}</Text>}
                        <Text style={styles.helpText}>Date when these terms become effective</Text>
                    </View>

                    {/* Active Status */}
                    <View style={styles.formGroup}>
                        <View style={styles.switchContainer}>
                            <View style={styles.switchInfo}>
                                <Text style={styles.label}>Active</Text>
                                <Text style={styles.helpText}>
                                    Whether these terms are currently active
                                </Text>
                            </View>
                            <Switch
                                value={formData.is_active}
                                onValueChange={(value) => updateFormData('is_active', value)}
                                trackColor={{ false: colors.textSecondary, true: colors.primary }}
                                thumbColor={colors.card}
                            />
                        </View>
                    </View>
                </View>

                {/* Content */}
                <View style={styles.formCard}>
                    <Text style={styles.cardTitle}>Content</Text>

                    <View style={styles.formGroup}>
                        <Text style={styles.label}>
                            Terms and Conditions Content <Text style={styles.required}>*</Text>
                        </Text>
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
                        <Text style={styles.helpText}>
                            Full legal text of the terms and conditions
                        </Text>
                    </View>
                </View>

                {/* Actions */}
                <View style={styles.actionsCard}>
                    <Button
                        title={loading.terms ? "Creating..." : "Create Terms & Conditions"}
                        onPress={handleSave}
                        disabled={loading.terms}
                        icon={loading.terms ?
                            <LoadingSpinner size="small" color={colors.card} /> :
                            <Save size={16} color={colors.card} />
                        }
                        style={styles.saveButton}
                    />
                    <Button
                        title="Cancel"
                        onPress={() => router.back()}
                        variant="outline"
                        style={styles.cancelButton}
                    />
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
    backButton: {
        padding: 8,
        marginLeft: -8,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 16,
        gap: 16,
    },
    headerCard: {
        backgroundColor: colors.card,
        borderRadius: 16,
        padding: 20,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    headerIcon: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: colors.primary + '15',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    headerInfo: {
        flex: 1,
        gap: 4,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: colors.text,
    },
    headerSubtitle: {
        fontSize: 16,
        color: colors.textSecondary,
    },
    formCard: {
        backgroundColor: colors.card,
        borderRadius: 16,
        padding: 20,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.text,
        marginBottom: 16,
    },
    formGroup: {
        marginBottom: 20,
    },
    label: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 8,
    },
    required: {
        color: colors.error,
    },
    input: {
        borderWidth: 1,
        borderColor: colors.backgroundSecondary,
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 16,
        color: colors.text,
        backgroundColor: colors.backgroundSecondary,
    },
    inputError: {
        borderColor: colors.error,
        backgroundColor: colors.error + '10',
    },
    dateInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.backgroundSecondary,
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: colors.backgroundSecondary,
        gap: 12,
    },
    dateInput: {
        flex: 1,
        fontSize: 16,
        color: colors.text,
        padding: 0,
    },
    textArea: {
        borderWidth: 1,
        borderColor: colors.backgroundSecondary,
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 16,
        color: colors.text,
        backgroundColor: colors.backgroundSecondary,
        minHeight: 200,
        textAlignVertical: 'top',
    },
    switchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    switchInfo: {
        flex: 1,
        gap: 4,
    },
    helpText: {
        fontSize: 14,
        color: colors.textSecondary,
        marginTop: 4,
    },
    errorText: {
        fontSize: 14,
        color: colors.error,
        marginTop: 4,
    },
    actionsCard: {
        backgroundColor: colors.card,
        borderRadius: 16,
        padding: 20,
        gap: 12,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    saveButton: {
        marginBottom: 8,
    },
    cancelButton: {
        borderColor: colors.textSecondary,
    },
    noPermissionContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 32,
    },
    noPermissionText: {
        fontSize: 16,
        color: colors.textSecondary,
        textAlign: 'center',
    },
}); 