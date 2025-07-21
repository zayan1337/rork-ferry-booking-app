import React, { useState, useEffect } from "react";
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert, Text } from "react-native";
import { Stack, useLocalSearchParams, router } from "expo-router";
import { colors } from "@/constants/adminColors";
import { ArrowLeft, AlertCircle, RotateCcw } from "lucide-react-native";
import { FAQ } from "@/types/admin/management";
import { useFAQManagement } from "@/hooks/useFAQManagement";
import { useAdminPermissions } from "@/hooks/useAdminPermissions";

// Components
import FAQForm from "@/components/admin/operations/FAQForm";
import LoadingSpinner from "@/components/admin/LoadingSpinner";
import Button from "@/components/admin/Button";

export default function EditFAQScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const { loadFAQ } = useFAQManagement();
    const { canManageSettings } = useAdminPermissions();

    const [faq, setFaq] = useState<FAQ | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadFAQData = async () => {
        if (!id) {
            setError("Invalid FAQ ID");
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);
            const faqData = await loadFAQ(id);

            if (faqData) {
                setFaq(faqData);
            } else {
                setError("FAQ not found");
            }
        } catch (error) {
            console.error("Error loading FAQ:", error);
            setError("Failed to load FAQ details");
        } finally {
            setLoading(false);
        }
    };

    const handleSuccess = () => {
        router.back();
    };

    const handleError = (error: string) => {
        console.error("Error updating FAQ:", error);
        Alert.alert("Error", error);
    };

    const handleRetry = () => {
        loadFAQData();
    };

    useEffect(() => {
        loadFAQData();
    }, [id]);

    if (!canManageSettings()) {
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
                        You don't have permission to edit FAQs.
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
                <View style={styles.loadingContainer}>
                    <LoadingSpinner />
                    <Text style={styles.loadingText}>Loading FAQ details...</Text>
                </View>
            </View>
        );
    }

    if (error || !faq) {
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
                    <Text style={styles.errorTitle}>
                        {error || "FAQ not found"}
                    </Text>
                    <Text style={styles.errorMessage}>
                        {error === "Failed to load FAQ details"
                            ? "Please check your connection and try again."
                            : "The FAQ you're trying to edit doesn't exist or may have been deleted."
                        }
                    </Text>
                    <View style={styles.errorActions}>
                        {error === "Failed to load FAQ details" && (
                            <Button
                                title="Retry"
                                variant="primary"
                                onPress={handleRetry}
                                icon={<RotateCcw size={20} color={colors.white} />}
                            />
                        )}
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

    return (
        <View style={styles.container}>
            <Stack.Screen
                options={{
                    title: `Edit FAQ`,
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

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.contentContainer}
                showsVerticalScrollIndicator={false}
            >
                <FAQForm
                    faq={faq}
                    onSuccess={handleSuccess}
                    onError={handleError}
                    onCancel={() => router.back()}
                />
            </ScrollView>
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
        backgroundColor: colors.warningLight,
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
    backButton: {
        padding: 8,
        marginLeft: -8,
    },
    scrollView: {
        flex: 1,
    },
    contentContainer: {
        flexGrow: 1,
        padding: 20,
        paddingBottom: 40,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        gap: 16,
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
    errorMessage: {
        fontSize: 15,
        color: colors.textSecondary,
        textAlign: "center",
        maxWidth: 320,
        lineHeight: 22,
        marginBottom: 20,
    },
    errorActions: {
        gap: 16,
        width: "100%",
        maxWidth: 300,
    },
}); 