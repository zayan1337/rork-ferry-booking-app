import React, { useState, useEffect } from "react";
import { View, StyleSheet, TouchableOpacity, Alert, Text } from "react-native";
import { Stack, useLocalSearchParams, router } from "expo-router";
import { colors } from "@/constants/adminColors";
import { ArrowLeft, AlertCircle, RotateCcw } from "lucide-react-native";
import { FAQ } from "@/types/content";
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
                        title: "Edit FAQ",
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
                        You don't have permission to edit FAQs.
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
                        title: "Edit FAQ",
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
                    <Text style={styles.loadingText}>Loading FAQ...</Text>
                </View>
            </View>
        );
    }

    if (error || !faq) {
        return (
            <View style={styles.container}>
                <Stack.Screen
                    options={{
                        title: "Edit FAQ",
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
                    <Text style={styles.errorTitle}>Error Loading FAQ</Text>
                    <Text style={styles.errorText}>
                        {error || "FAQ not found"}
                    </Text>
                    <View style={styles.errorActions}>
                        <Button
                            title="Retry"
                            onPress={handleRetry}
                            variant="primary"
                            icon={<RotateCcw size={20} color={colors.white} />}
                            style={styles.retryButton}
                        />
                        <Button
                            title="Go Back"
                            onPress={() => router.back()}
                            variant="outline"
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
                    title: "Edit FAQ",
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

            <FAQForm
                faq={faq}
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
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
        color: colors.textSecondary,
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
        fontSize: 24,
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
        gap: 16,
    },
    retryButton: {
        flex: 1,
    },
    backButtonAction: {
        flex: 1,
    },
}); 