import React, { useState, useEffect } from "react";
import { View, StyleSheet, TouchableOpacity, Text, Alert } from "react-native";
import { Stack, useLocalSearchParams, router } from "expo-router";
import { colors } from "@/constants/adminColors";
import { useContentManagement } from "@/hooks/useContentManagement";
import { useAdminPermissions } from "@/hooks/useAdminPermissions";
import {
    ArrowLeft,
    AlertCircle,
    Edit,
    RotateCcw,
} from "lucide-react-native";

// Components
import TermsForm from "@/components/admin/operations/TermsForm";
import Button from "@/components/admin/Button";
import LoadingSpinner from "@/components/admin/LoadingSpinner";

export default function EditTermsScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const { canManageContent } = useAdminPermissions();
    const {
        currentTerms,
        loading,
        fetchTermsById,
        resetCurrentTerms,
        error,
        clearError,
    } = useContentManagement();

    const [hasInitialized, setHasInitialized] = useState(false);
    const [localError, setLocalError] = useState<string | null>(null);

    const loadTermsData = async () => {
        if (!id) {
            setLocalError("Invalid terms ID");
            return;
        }

        try {
            setLocalError(null);
            await fetchTermsById(id);
        } catch (error) {
            console.error("Error loading terms:", error);
            setLocalError("Failed to load terms and conditions details");
        }
    };

    const handleSuccess = () => {
        Alert.alert(
            "Success",
            "Terms and conditions updated successfully",
            [
                {
                    text: "OK",
                    onPress: () => router.back()
                }
            ]
        );
    };

    const handleError = (error: string) => {
        console.error("Error updating terms:", error);
        setLocalError(error);
    };

    const handleCancel = () => {
        router.back();
    };

    const handleRetry = () => {
        setLocalError(null);
        clearError();
        loadTermsData();
    };

    // Load terms data
    useEffect(() => {
        if (canManageContent() && id && !hasInitialized) {
            loadTermsData().finally(() => {
                setHasInitialized(true);
            });
        }
    }, [id, hasInitialized]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            resetCurrentTerms();
            clearError();
        };
    }, []);

    // Permission check
    if (!canManageContent()) {
        return (
            <View style={styles.container}>
                <Stack.Screen
                    options={{
                        title: "Access Denied",
                        headerLeft: () => (
                            <TouchableOpacity
                                onPress={() => router.back()}
                                style={styles.backButton}
                            >
                                <ArrowLeft size={24} color={colors.primary} />
                            </TouchableOpacity>
                        ),
                    }}
                />
                <View style={styles.noPermissionContainer}>
                    <View style={styles.noAccessIcon}>
                        <AlertCircle size={48} color={colors.warning} />
                    </View>
                    <Text style={styles.noPermissionTitle}>Access Denied</Text>
                    <Text style={styles.noPermissionText}>
                        You don't have permission to edit terms and conditions.
                    </Text>
                    <Button
                        title="Go Back"
                        variant="primary"
                        onPress={() => router.back()}
                    />
                </View>
            </View>
        );
    }

    // Loading state
    if (loading.singleTerms && !currentTerms) {
        return (
            <View style={styles.container}>
                <Stack.Screen
                    options={{
                        title: "Loading...",
                        headerLeft: () => (
                            <TouchableOpacity
                                onPress={() => router.back()}
                                style={styles.backButton}
                            >
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

    // Error state
    if (localError || error) {
        return (
            <View style={styles.container}>
                <Stack.Screen
                    options={{
                        title: "Error",
                        headerLeft: () => (
                            <TouchableOpacity
                                onPress={() => router.back()}
                                style={styles.backButton}
                            >
                                <ArrowLeft size={24} color={colors.primary} />
                            </TouchableOpacity>
                        ),
                    }}
                />
                <View style={styles.errorContainer}>
                    <View style={styles.errorIcon}>
                        <AlertCircle size={48} color={colors.error} />
                    </View>
                    <Text style={styles.errorTitle}>Unable to Load Terms</Text>
                    <Text style={styles.errorText}>{localError || error}</Text>
                    <View style={styles.errorButtons}>
                        <Button
                            title="Try Again"
                            variant="primary"
                            onPress={handleRetry}
                            icon={<RotateCcw size={20} color={colors.white} />}
                        />
                        <Button
                            title="Go Back"
                            variant="outline"
                            onPress={() => router.back()}
                        />
                    </View>
                </View>
            </View>
        );
    }

    // Not found state
    if (!currentTerms && hasInitialized) {
        return (
            <View style={styles.container}>
                <Stack.Screen
                    options={{
                        title: "Terms Not Found",
                        headerLeft: () => (
                            <TouchableOpacity
                                onPress={() => router.back()}
                                style={styles.backButton}
                            >
                                <ArrowLeft size={24} color={colors.primary} />
                            </TouchableOpacity>
                        ),
                    }}
                />
                <View style={styles.errorContainer}>
                    <View style={styles.errorIcon}>
                        <AlertCircle size={48} color={colors.warning} />
                    </View>
                    <Text style={styles.errorTitle}>Terms Not Found</Text>
                    <Text style={styles.errorText}>
                        The terms and conditions you're trying to edit don't exist or have been removed.
                    </Text>
                    <Button
                        title="Go Back"
                        variant="primary"
                        onPress={() => router.back()}
                    />
                </View>
            </View>
        );
    }

    if (!currentTerms) return null;

    return (
        <View style={styles.container}>
            <Stack.Screen
                options={{
                    title: `Edit: ${currentTerms.title}`,
                    headerLeft: () => (
                        <TouchableOpacity
                            onPress={() => router.back()}
                            style={styles.backButton}
                        >
                            <ArrowLeft size={24} color={colors.primary} />
                        </TouchableOpacity>
                    ),
                }}
            />

            <TermsForm
                terms={currentTerms}
                onSuccess={handleSuccess}
                onError={handleError}
                onCancel={handleCancel}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.backgroundSecondary,
    },
    noPermissionContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
        gap: 20,
    },
    noAccessIcon: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: colors.backgroundTertiary,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 8,
    },
    noPermissionTitle: {
        fontSize: 20,
        fontWeight: "700",
        color: colors.text,
        textAlign: "center",
        marginBottom: 8,
    },
    noPermissionText: {
        fontSize: 16,
        color: colors.textSecondary,
        textAlign: "center",
        maxWidth: 280,
        lineHeight: 22,
        marginBottom: 20,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        gap: 16,
        padding: 20,
    },
    loadingText: {
        fontSize: 16,
        color: colors.textSecondary,
        fontWeight: "500",
    },
    errorContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
        gap: 20,
    },
    errorIcon: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: colors.errorLight,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 8,
    },
    errorTitle: {
        fontSize: 20,
        fontWeight: "700",
        color: colors.text,
        textAlign: "center",
        marginBottom: 8,
    },
    errorText: {
        fontSize: 16,
        color: colors.textSecondary,
        textAlign: "center",
        maxWidth: 300,
        lineHeight: 22,
        marginBottom: 20,
    },
    errorButtons: {
        flexDirection: "row",
        gap: 12,
        width: "100%",
        maxWidth: 300,
    },
    backButton: {
        padding: 8,
        marginLeft: -8,
    },
}); 