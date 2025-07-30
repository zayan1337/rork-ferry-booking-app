import React, { useState, useEffect } from "react";
import { View, StyleSheet, ScrollView, TouchableOpacity, Text, Alert } from "react-native";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { colors } from "@/constants/adminColors";
import { ArrowLeft, AlertCircle, Edit, Ship } from "lucide-react-native";
import { useAdminPermissions } from "@/hooks/useAdminPermissions";
// UPDATED: Use new vessel management hook and types
import { useVesselManagement } from "@/hooks/useVesselManagement";
import { AdminManagement } from "@/types";

// Components
import VesselForm from "@/components/admin/operations/VesselForm";
import Button from "@/components/admin/Button";
import LoadingSpinner from "@/components/admin/LoadingSpinner";

type VesselFormData = AdminManagement.VesselFormData;
type Vessel = AdminManagement.Vessel;

export default function EditVesselScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const { canManageVessels } = useAdminPermissions();

    // UPDATED: Use new vessel management hook
    const {
        vessels,
        getById,
        update,
        loading,
        error,
    } = useVesselManagement();

    const [vesselData, setVesselData] = useState<Vessel | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const isTablet = false; // You can implement tablet detection logic here

    useEffect(() => {
        loadVesselData();
    }, [id]);

    const loadVesselData = async () => {
        if (!id) return;

        try {
            setIsLoading(true);
            const vessel = getById(id);
            if (vessel) {
                setVesselData(vessel);
            } else {
                Alert.alert('Error', 'Vessel not found');
                router.back();
            }
        } catch (error) {
            console.error("Error loading vessel:", error);
            Alert.alert('Error', 'Failed to load vessel details');
            router.back();
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async (formData: VesselFormData) => {
        if (!id) return;

        try {
            await update(id, formData);
            Alert.alert("Success", "Vessel updated successfully!", [
                {
                    text: "OK",
                    onPress: () => router.back(),
                },
            ]);
        } catch (error) {
            throw error; // Let the form handle the error display
        }
    };

    const handleCancel = () => {
        router.back();
    };

    if (!canManageVessels()) {
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
                        You don't have permission to edit vessels.
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

    if (isLoading) {
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
                    <LoadingSpinner size="large" />
                    <Text style={styles.loadingText}>Loading vessel details...</Text>
                </View>
            </View>
        );
    }

    if (!vesselData) {
        return (
            <View style={styles.container}>
                <Stack.Screen
                    options={{
                        title: "Vessel Not Found",
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
                    <Text style={styles.errorTitle}>Vessel Not Found</Text>
                    <Text style={styles.errorText}>
                        The vessel you're looking for doesn't exist or has been removed.
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

    return (
        <View style={styles.container}>
            <Stack.Screen
                options={{
                    title: "Edit Vessel",
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
                <VesselForm
                    initialData={vesselData}
                    onSave={handleSave}
                    onCancel={handleCancel}
                    loading={loading.update}
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
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        gap: 16,
    },
    loadingText: {
        fontSize: 16,
        color: colors.textSecondary,
        textAlign: "center",
    },
    errorContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
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
        padding: 12,
        paddingBottom: 40,
    },
}); 