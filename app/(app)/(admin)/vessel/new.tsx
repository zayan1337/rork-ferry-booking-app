import React, { useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, View, TextInput } from "react-native";
import { Stack, router } from "expo-router";
import { colors } from "@/constants/adminColors";
import { useAdminStore } from "@/store/admin/adminStore";
import Dropdown from "@/components/Dropdown";
import { Ship, Users, Save, X } from "lucide-react-native";
import Button from "@/components/admin/Button";

interface VesselFormData {
    name: string;
    capacity: string;
    status: "active" | "maintenance" | "inactive";
}

export default function NewVesselScreen() {
    const { addVessel } = useAdminStore();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState<VesselFormData>({
        name: "",
        capacity: "",
        status: "active",
    });

    const [errors, setErrors] = useState<Partial<VesselFormData>>({});

    const statusOptions = [
        { label: "Active", value: "active" },
        { label: "Maintenance", value: "maintenance" },
        { label: "Inactive", value: "inactive" },
    ];

    const validateForm = (): boolean => {
        const newErrors: Partial<VesselFormData> = {};

        if (!formData.name.trim()) newErrors.name = "Vessel name is required";
        if (!formData.capacity || parseInt(formData.capacity) < 1) {
            newErrors.capacity = "Valid capacity is required";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSave = async () => {
        if (!validateForm()) return;

        setLoading(true);
        try {
            const newVessel = {
                name: formData.name.trim(),
                capacity: parseInt(formData.capacity),
                status: formData.status,
            };

            addVessel(newVessel);
            await new Promise(resolve => setTimeout(resolve, 1000));

            Alert.alert(
                "Success",
                "Vessel created successfully!",
                [{ text: "OK", onPress: () => router.back() }]
            );
        } catch (error) {
            Alert.alert("Error", "Failed to create vessel. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = () => {
        Alert.alert(
            "Cancel",
            "Are you sure you want to cancel? All changes will be lost.",
            [
                { text: "Continue Editing", style: "cancel" },
                { text: "Yes, Cancel", style: "destructive", onPress: () => router.back() },
            ]
        );
    };

    const updateFormData = (field: keyof VesselFormData, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: undefined }));
        }
    };

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
            <Stack.Screen
                options={{
                    title: "New Vessel",
                    headerLeft: () => (
                        <Button
                            title="Cancel"
                            variant="outline"
                            size="small"
                            icon={<X size={16} color={colors.primary} />}
                            onPress={handleCancel}
                        />
                    ),
                    headerRight: () => (
                        <Button
                            title="Save"
                            variant="primary"
                            size="small"
                            icon={<Save size={16} color="#FFFFFF" />}
                            onPress={handleSave}
                            loading={loading}
                            disabled={loading}
                        />
                    ),
                }}
            />

            <View style={styles.card}>
                <Text style={styles.cardTitle}>Vessel Information</Text>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Vessel Name *</Text>
                    <View style={[styles.inputContainer, errors.name && styles.inputError]}>
                        <Ship size={20} color={colors.primary} style={styles.inputIcon} />
                        <TextInput
                            style={styles.input}
                            value={formData.name}
                            onChangeText={(value) => updateFormData("name", value)}
                            placeholder="Enter vessel name"
                            placeholderTextColor={colors.textSecondary}
                        />
                    </View>
                    {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Passenger Capacity *</Text>
                    <View style={[styles.inputContainer, errors.capacity && styles.inputError]}>
                        <Users size={20} color={colors.primary} style={styles.inputIcon} />
                        <TextInput
                            style={styles.input}
                            value={formData.capacity}
                            onChangeText={(value) => updateFormData("capacity", value)}
                            placeholder="Enter capacity"
                            keyboardType="numeric"
                            placeholderTextColor={colors.textSecondary}
                        />
                    </View>
                    {errors.capacity && <Text style={styles.errorText}>{errors.capacity}</Text>}
                </View>

                <Dropdown
                    label="Status"
                    items={statusOptions}
                    value={formData.status}
                    onChange={(value) => updateFormData("status", value as any)}
                    placeholder="Select status..."
                />
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.backgroundSecondary,
    },
    contentContainer: {
        padding: 16,
        paddingBottom: 32,
    },
    card: {
        backgroundColor: colors.card,
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 1,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: "600",
        color: colors.text,
        marginBottom: 16,
    },
    inputGroup: {
        marginBottom: 16,
    },
    label: {
        fontSize: 14,
        fontWeight: "500",
        color: colors.text,
        marginBottom: 8,
    },
    inputContainer: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: colors.backgroundSecondary,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.border,
        paddingHorizontal: 12,
        height: 48,
    },
    inputIcon: {
        marginRight: 8,
    },
    input: {
        flex: 1,
        fontSize: 16,
        color: colors.text,
        height: 48,
    },
    inputError: {
        borderColor: colors.danger,
    },
    errorText: {
        fontSize: 12,
        color: colors.danger,
        marginTop: 4,
    },
}); 