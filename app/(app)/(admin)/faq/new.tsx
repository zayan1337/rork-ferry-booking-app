import React from "react";
import { View, StyleSheet, TouchableOpacity, Text } from "react-native";
import { Stack, router } from "expo-router";
import { colors } from "@/constants/adminColors";
import { ArrowLeft, AlertCircle } from "lucide-react-native";
import { useAdminPermissions } from "@/hooks/useAdminPermissions";

// Components
import FAQForm from "@/components/admin/operations/FAQForm";
import Button from "@/components/admin/Button";

export default function NewFAQScreen() {
    const { canManageSettings } = useAdminPermissions();

    const handleSuccess = () => {
        router.back();
    };

    const handleError = (error: string) => {
        console.error("Error creating FAQ:", error);
    };

    if (!canManageSettings()) {
        return (
            <View style={styles.container}>
                <Stack.Screen
                    options={{
                        title: "Create FAQ",
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
                        You don't have permission to create FAQs.
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

    return (
        <View style={styles.container}>
            <Stack.Screen
                options={{
                    title: "Create FAQ",
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
    backButtonAction: {
        width: 200,
    },
}); 