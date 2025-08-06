import React, { useState, useEffect } from "react";
import { View, StyleSheet, ScrollView, TouchableOpacity, Text, Alert } from "react-native";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { colors } from "@/constants/adminColors";
import { ArrowLeft, AlertCircle, Save, RotateCcw } from "lucide-react-native";
import { useAdminPermissions } from "@/hooks/useAdminPermissions";
import { useVesselStore } from "@/store/admin/vesselStore";
import { AdminManagement } from "@/types";

// Components
import SeatArrangementManager from "@/components/admin/seat-arrangement/SeatArrangementManager";
import Button from "@/components/admin/Button";
import LoadingSpinner from "@/components/admin/LoadingSpinner";

type VesselWithDetails = AdminManagement.VesselWithDetails;
type SeatLayout = AdminManagement.SeatLayout;
type Seat = AdminManagement.Seat;

export default function VesselSeatLayoutScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const { canManageVessels } = useAdminPermissions();

    const {
        fetchVesselDetails,
        saveCustomSeatLayout,
        loading,
        error,
    } = useVesselStore();

    const [vesselData, setVesselData] = useState<VesselWithDetails | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [saveError, setSaveError] = useState<string | null>(null);

    useEffect(() => {
        loadVesselData();
    }, [id]);

    const loadVesselData = async () => {
        if (!id) return;

        try {
            setIsLoading(true);
            setSaveError(null);

            const vessel = await fetchVesselDetails(id);
            if (vessel) {
                setVesselData(vessel);
            } else {
                Alert.alert('Error', 'Vessel not found');
                router.back();
            }
        } catch (error) {
            console.error("Error loading vessel:", error);
            Alert.alert('Error', 'Failed to load vessel details. Please try again.');
            router.back();
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async (layout: SeatLayout, seats: Seat[]) => {
        if (!id) return;

        try {
            setSaveError(null);
            await saveCustomSeatLayout(id, layout.layout_data, seats);

            Alert.alert(
                "Success",
                "Seat layout updated successfully!",
                [
                    {
                        text: "View Vessel",
                        onPress: () => router.push(`/vessel/${id}`),
                    },
                    {
                        text: "Continue Editing",
                        onPress: () => {
                            // Reload the data to show updated information
                            loadVesselData();
                        },
                    },
                    {
                        text: "Back to List",
                        onPress: () => router.back(),
                    },
                ]
            );
        } catch (error) {
            console.error("Error updating seat layout:", error);
            const errorMessage = error instanceof Error ? error.message : 'Failed to update seat layout';
            setSaveError(errorMessage);

            Alert.alert(
                "Update Failed",
                `Failed to update seat layout: ${errorMessage}`,
                [
                    {
                        text: "Try Again",
                        onPress: () => setSaveError(null),
                    },
                    {
                        text: "Cancel",
                        style: "cancel",
                    },
                ]
            );
        }
    };

    const handleCancel = () => {
        Alert.alert(
            "Discard Changes?",
            "Are you sure you want to discard your changes?",
            [
                {
                    text: "Discard",
                    style: "destructive",
                    onPress: () => router.back(),
                },
                {
                    text: "Keep Editing",
                    style: "cancel",
                },
            ]
        );
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
                        You don't have permission to edit vessel seat layouts.
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
                    <Text style={styles.loadingText}>Loading vessel seat layout...</Text>
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
                    title: `${vesselData.name} - Seat Layout`,
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
                {/* Error Display */}
                {saveError && (
                    <View style={styles.errorBanner}>
                        <View style={styles.errorBannerIcon}>
                            <AlertCircle size={20} color={colors.error} />
                        </View>
                        <Text style={styles.errorBannerText}>{saveError}</Text>
                        <TouchableOpacity
                            onPress={() => setSaveError(null)}
                            style={styles.errorBannerClose}
                        >
                            <Text style={styles.errorBannerCloseText}>×</Text>
                        </TouchableOpacity>
                    </View>
                )}

                <SeatArrangementManager
                    vesselId={vesselData.id}
                    initialLayout={vesselData.seatLayout || undefined}
                    initialSeats={vesselData.seats || []}
                    seatingCapacity={vesselData.seating_capacity}
                    vesselType={vesselData.vessel_type}
                    onSave={handleSave}
                    onCancel={handleCancel}
                    loading={loading.saveCustomLayout}
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
    errorBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.errorLight,
        borderRadius: 8,
        paddingVertical: 10,
        paddingHorizontal: 15,
        marginBottom: 15,
        borderWidth: 1,
        borderColor: colors.errorLight,
    },
    errorBannerIcon: {
        marginRight: 10,
    },
    errorBannerText: {
        flex: 1,
        fontSize: 14,
        color: colors.error,
        fontWeight: '500',
    },
    errorBannerClose: {
        padding: 5,
    },
    errorBannerCloseText: {
        fontSize: 20,
        color: colors.textSecondary,
    },
}); 