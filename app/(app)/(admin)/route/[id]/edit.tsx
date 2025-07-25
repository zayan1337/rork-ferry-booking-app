import React from "react";
import { View, StyleSheet, ScrollView, TouchableOpacity, Text } from "react-native";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { colors } from "@/constants/adminColors";
import { ArrowLeft, AlertCircle, Route as RouteIcon } from "lucide-react-native";
import { useAdminPermissions } from "@/hooks/useAdminPermissions";
// UPDATED: Use new route management hook and types
import { useRouteManagement } from "@/hooks/useRouteManagement";
import { AdminManagement } from "@/types";

// Components
import RouteForm from "@/components/admin/operations/RouteForm";
import Button from "@/components/admin/Button";

type RouteFormData = AdminManagement.RouteFormData;

export default function EditRouteScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const { canUpdateRoutes } = useAdminPermissions();

    // UPDATED: Use new route management hook
    const { getById } = useRouteManagement();

    // Find the current route data
    const currentRoute = getById(id || '');

    const handleSuccess = (routeData: RouteFormData) => {
        router.back();
    };

    const handleCancel = () => {
        router.back();
    };

    if (!canUpdateRoutes()) {
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
                        You don't have permission to edit routes.
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

    if (!currentRoute) {
    return (
            <View style={styles.container}>
                <Stack.Screen
                    options={{
                        title: "Route Not Found",
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
                    <Text style={styles.noPermissionTitle}>Route Not Found</Text>
                    <Text style={styles.noPermissionText}>
                        The route you're trying to edit doesn't exist or may have been deleted.
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
                    title: `Edit ${currentRoute.name}`,
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
                <RouteForm
                    routeId={id}
                    onSave={handleSuccess}
                    onCancel={handleCancel}
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
}); 