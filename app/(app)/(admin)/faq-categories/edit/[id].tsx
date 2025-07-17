import React, { useState, useEffect } from "react";
import { View, StyleSheet, TouchableOpacity, Alert, Text } from "react-native";
import { Stack, useLocalSearchParams, router } from "expo-router";
import { colors } from "@/constants/adminColors";
import { ArrowLeft, AlertCircle, RotateCcw } from "lucide-react-native";
import { FAQCategory } from "@/types/content";
import { useFAQManagement } from "@/hooks/useFAQManagement";
import { useAdminPermissions } from "@/hooks/useAdminPermissions";

// Components
import FAQCategoryForm from "@/components/admin/operations/FAQCategoryForm";
import LoadingSpinner from "@/components/admin/LoadingSpinner";
import Button from "@/components/admin/Button";

export default function EditFAQCategoryScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const { categories, refreshAll } = useFAQManagement();
    const { canManageSettings } = useAdminPermissions();

    const [category, setCategory] = useState<FAQCategory | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadCategoryData = async () => {
        if (!id) {
            setError("Invalid FAQ category ID");
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);

            // Try to find in existing categories first
            let categoryData = categories.find(c => c.id === id);

            // If not found, refresh data and try again
            if (!categoryData) {
                await refreshAll();
                categoryData = categories.find(c => c.id === id);
            }

            if (categoryData) {
                setCategory(categoryData);
            } else {
                setError("FAQ category not found");
            }
        } catch (error) {
            console.error("Error loading FAQ category:", error);
            setError("Failed to load FAQ category details");
        } finally {
            setLoading(false);
        }
    };

    const handleSuccess = () => {
        router.back();
    };

    const handleError = (error: string) => {
        console.error("Error updating FAQ category:", error);
        Alert.alert("Error", "Failed to update FAQ category");
    };

    const handleRetry = () => {
        loadCategoryData();
    };

    useEffect(() => {
        loadCategoryData();
    }, [id]);

    if (!canManageSettings()) {
        return (
            <View style={styles.container}>
                <Stack.Screen
                    options={{
                        title: "Edit FAQ Category",
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
                <View style={styles.accessDenied}>
                    <AlertCircle size={64} color={colors.error} />
                    <Text style={styles.accessDeniedTitle}>Access Denied</Text>
                    <Text style={styles.accessDeniedText}>
                        You don't have permission to edit FAQ categories.
                    </Text>
                    <Button
                        title="Go Back"
                        onPress={() => router.back()}
                        variant="outline"
                        style={styles.backButtonAction}
                    />
                </View>
            </View>
        );
    }

    if (loading) {
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
                <LoadingSpinner />
            </View>
        );
    }

    if (error || !category) {
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
                    <AlertCircle size={64} color={colors.error} />
                    <Text style={styles.errorTitle}>
                        {error || "FAQ category not found"}
                    </Text>
                    <Text style={styles.errorText}>
                        {error === "FAQ category not found"
                            ? "The FAQ category you're trying to edit doesn't exist."
                            : "There was an error loading the FAQ category details."
                        }
                    </Text>
                    <View style={styles.errorActions}>
                        <Button
                            title="Retry"
                            onPress={handleRetry}
                            variant="outline"
                            icon={<RotateCcw size={16} color={colors.primary} />}
                            style={styles.retryButton}
                        />
                        <Button
                            title="Go Back"
                            onPress={() => router.back()}
                            variant="primary"
                            style={styles.backButtonAction}
                        />
                    </View>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Stack.Screen
                options={{
                    title: `Edit "${category.name}"`,
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

            <FAQCategoryForm
                initialData={category}
                onSuccess={handleSuccess}
                onError={handleError}
                onCancel={() => router.back()}
            />
        </View>
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
    accessDenied: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 32,
    },
    accessDeniedTitle: {
        fontSize: 24,
        fontWeight: '600',
        color: colors.text,
        marginTop: 24,
        marginBottom: 12,
        textAlign: 'center',
    },
    accessDeniedText: {
        fontSize: 16,
        color: colors.textSecondary,
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 32,
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 32,
    },
    errorTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: colors.text,
        marginTop: 24,
        marginBottom: 12,
        textAlign: 'center',
    },
    errorText: {
        fontSize: 16,
        color: colors.textSecondary,
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 32,
    },
    errorActions: {
        flexDirection: 'row',
        gap: 12,
        width: '100%',
        maxWidth: 300,
    },
    retryButton: {
        flex: 1,
    },
    backButtonAction: {
        flex: 1,
    },
}); 