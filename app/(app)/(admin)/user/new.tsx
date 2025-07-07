import React, { useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, View, TextInput } from "react-native";
import { Stack, router } from "expo-router";
import { colors } from "@/constants/adminColors";
import { useAdminStore } from "@/store/admin/adminStore";
import Dropdown from "@/components/Dropdown";
import { User, Mail, Shield, Save, X } from "lucide-react-native";
import Button from "@/components/admin/Button";

interface UserFormData {
    name: string;
    email: string;
    role: "customer" | "agent" | "admin";
    status: "active" | "inactive" | "suspended";
}

export default function NewUserScreen() {
    const { addUser } = useAdminStore();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState<UserFormData>({
        name: "",
        email: "",
        role: "customer",
        status: "active",
    });

    const [errors, setErrors] = useState<Partial<UserFormData>>({});

    const roleOptions = [
        { label: "Customer", value: "customer" },
        { label: "Agent", value: "agent" },
        { label: "Admin", value: "admin" },
    ];

    const statusOptions = [
        { label: "Active", value: "active" },
        { label: "Inactive", value: "inactive" },
        { label: "Suspended", value: "suspended" },
    ];

    const validateForm = (): boolean => {
        const newErrors: Partial<UserFormData> = {};

        if (!formData.name.trim()) newErrors.name = "Name is required";
        if (!formData.email.trim()) {
            newErrors.email = "Email is required";
        } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
            newErrors.email = "Invalid email format";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSave = async () => {
        if (!validateForm()) return;

        setLoading(true);
        try {
            const newUser = {
                name: formData.name.trim(),
                email: formData.email.trim().toLowerCase(),
                role: formData.role,
                status: formData.status,
            };

            addUser(newUser);
            await new Promise(resolve => setTimeout(resolve, 1000));

            Alert.alert(
                "Success",
                "User created successfully!",
                [{ text: "OK", onPress: () => router.back() }]
            );
        } catch (error) {
            Alert.alert("Error", "Failed to create user. Please try again.");
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

    const updateFormData = (field: keyof UserFormData, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: undefined }));
        }
    };

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
            <Stack.Screen
                options={{
                    title: "New User",
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
                <Text style={styles.cardTitle}>User Information</Text>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Full Name *</Text>
                    <View style={[styles.inputContainer, errors.name && styles.inputError]}>
                        <User size={20} color={colors.primary} style={styles.inputIcon} />
                        <TextInput
                            style={styles.input}
                            value={formData.name}
                            onChangeText={(value) => updateFormData("name", value)}
                            placeholder="Enter full name"
                            placeholderTextColor={colors.textSecondary}
                        />
                    </View>
                    {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Email Address *</Text>
                    <View style={[styles.inputContainer, errors.email && styles.inputError]}>
                        <Mail size={20} color={colors.primary} style={styles.inputIcon} />
                        <TextInput
                            style={styles.input}
                            value={formData.email}
                            onChangeText={(value) => updateFormData("email", value)}
                            placeholder="Enter email address"
                            keyboardType="email-address"
                            autoCapitalize="none"
                            placeholderTextColor={colors.textSecondary}
                        />
                    </View>
                    {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
                </View>

                <Dropdown
                    label="Role"
                    items={roleOptions}
                    value={formData.role}
                    onChange={(value) => updateFormData("role", value as any)}
                    placeholder="Select role..."
                    required
                />

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