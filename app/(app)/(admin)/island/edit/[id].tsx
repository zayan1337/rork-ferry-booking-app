import React, { useState, useEffect } from "react";
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert, Text } from "react-native";
import { Stack, useLocalSearchParams, router } from "expo-router";
import { colors } from "@/constants/adminColors";
import { ArrowLeft, Edit, AlertCircle, RotateCcw } from "lucide-react-native";
import { DatabaseIsland } from "@/types/database";
import { useOperationsStore } from "@/store/admin/operationsStore";
import { useAdminPermissions } from "@/hooks/useAdminPermissions";

// Components
import IslandForm from "@/components/admin/operations/IslandForm";
import LoadingSpinner from "@/components/admin/LoadingSpinner";
import Button from "@/components/admin/Button";

export default function EditIslandScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const { fetchIsland } = useOperationsStore();
    const { canUpdateIslands } = useAdminPermissions();

    const [island, setIsland] = useState<DatabaseIsland | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadIsland = async () => {
        if (!id) {
            setError("Invalid island ID");
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);
            const islandData = await fetchIsland(id);
            if (islandData) {
                setIsland(islandData);
            } else {
                setError("Island not found");
            }
        } catch (error) {
            console.error("Error loading island:", error);
            setError("Failed to load island details");
        } finally {
            setLoading(false);
        }
    };

    const handleSuccess = () => {
        Alert.alert(
            "Success",
            "Island updated successfully!",
            [
                {
                    text: "OK",
                    onPress: () => router.back()
                }
            ]
        );
    };

    const handleError = (errorMessage: string) => {
        Alert.alert("Error", errorMessage);
    };

    const handleRetry = () => {
        loadIsland();
    };

    useEffect(() => {
        loadIsland();
    }, [id]);

    if (!canUpdateIslands()) {
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
                        You don't have permission to edit islands.
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
                    <Text style={styles.loadingText}>Loading island details...</Text>
                </View>
            </View>
        );
    }

    if (error || !island) {
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
                        {error || "Island not found"}
                    </Text>
                    <Text style={styles.errorMessage}>
                        {error === "Failed to load island details"
                            ? "Please check your connection and try again."
                            : "The island you're trying to edit doesn't exist or may have been deleted."
                        }
                    </Text>
                    <View style={styles.errorActions}>
                        {error === "Failed to load island details" && (
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
                    title: `Edit ${island.name}`,
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
                <IslandForm
                    initialData={island}
                    onSuccess={handleSuccess}
                    onError={handleError}
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