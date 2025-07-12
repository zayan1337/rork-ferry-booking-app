import React, { useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, View, TextInput, Platform } from "react-native";
import { Stack, router } from "expo-router";
import { colors } from "@/constants/adminColors";
import { useAdminStore } from "@/store/admin/adminStore";
import Dropdown from "@/components/Dropdown";
import {
    Calendar,
    Clock,
    Users,
    MapPin,
    CreditCard,
    Save,
    X
} from "lucide-react-native";
import Button from "@/components/admin/Button";

interface BookingFormData {
    routeId: string;
    customerId: string;
    date: string;
    departureTime: string;
    passengers: string;
    totalAmount: string;
    status: "confirmed" | "pending" | "cancelled" | "completed";
    paymentStatus: "paid" | "pending" | "refunded" | "failed";
}

export default function NewBookingScreen() {
    const { routes, users, addBooking } = useAdminStore();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState<BookingFormData>({
        routeId: "",
        customerId: "",
        date: "",
        departureTime: "",
        passengers: "1",
        totalAmount: "",
        status: "pending",
        paymentStatus: "pending",
    });

    const [errors, setErrors] = useState<Partial<BookingFormData>>({});

    // Get customers only (filter out agents and admins)
    const customers = users.filter(user => user.role === "customer");

    // Format options for dropdowns
    const routeOptions = routes
        .filter(route => route.status === "active")
        .map(route => ({
            label: `${route.name} (${route.duration})`,
            value: route.id
        }));

    const customerOptions = customers.map(customer => ({
        label: `${customer.name} (${customer.email})`,
        value: customer.id
    }));

    const statusOptions = [
        { label: "Pending", value: "pending" },
        { label: "Confirmed", value: "confirmed" },
        { label: "Cancelled", value: "cancelled" },
    ];

    const paymentStatusOptions = [
        { label: "Pending", value: "pending" },
        { label: "Paid", value: "paid" },
        { label: "Failed", value: "failed" },
    ];

    const validateForm = (): boolean => {
        const newErrors: Partial<BookingFormData> = {};

        if (!formData.routeId) newErrors.routeId = "Route is required";
        if (!formData.customerId) newErrors.customerId = "Customer is required";
        if (!formData.date) newErrors.date = "Date is required";
        if (!formData.departureTime) newErrors.departureTime = "Departure time is required";
        if (!formData.passengers || parseInt(formData.passengers) < 1) {
            newErrors.passengers = "At least 1 passenger is required";
        }
        if (!formData.totalAmount || parseFloat(formData.totalAmount) <= 0) {
            newErrors.totalAmount = "Valid amount is required";
        }

        // Validate date is not in the past
        if (formData.date) {
            const selectedDate = new Date(formData.date);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            if (selectedDate < today) {
                newErrors.date = "Date cannot be in the past";
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSave = async () => {
        if (!validateForm()) return;

        setLoading(true);
        try {
            const selectedRoute = routes?.find(r => r.id === formData.routeId);
            const selectedCustomer = customers?.find(c => c.id === formData.customerId);

            if (!selectedRoute || !selectedCustomer) {
                Alert.alert("Error", "Invalid route or customer selected");
                return;
            }

            const newBooking = {
                routeId: formData.routeId,
                routeName: selectedRoute.name,
                customerId: formData.customerId,
                customerName: selectedCustomer.name,
                date: formData.date,
                departureTime: formData.departureTime,
                status: formData.status,
                paymentStatus: formData.paymentStatus,
                passengers: parseInt(formData.passengers),
                totalAmount: parseFloat(formData.totalAmount),
            };

            addBooking(newBooking);

            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 1000));

            Alert.alert(
                "Success",
                "Booking created successfully!",
                [{ text: "OK", onPress: () => router.back() }]
            );
        } catch (error) {
            Alert.alert("Error", "Failed to create booking. Please try again.");
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

    const updateFormData = (field: keyof BookingFormData, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        // Clear error when user starts typing/selecting
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: undefined }));
        }
    };

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
            <Stack.Screen
                options={{
                    title: "New Booking",
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

            {/* Route Selection */}
            <View style={styles.card}>
                <Text style={styles.cardTitle}>Trip Information</Text>

                <Dropdown
                    label="Route"
                    items={routeOptions}
                    value={formData.routeId}
                    onChange={(value) => updateFormData("routeId", value)}
                    placeholder="Select a route..."
                    error={errors.routeId}
                    searchable
                    required
                />

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Date *</Text>
                    <View style={[styles.inputContainer, errors.date && styles.inputError]}>
                        <Calendar size={20} color={colors.primary} style={styles.inputIcon} />
                        <TextInput
                            style={styles.input}
                            value={formData.date}
                            onChangeText={(value) => updateFormData("date", value)}
                            placeholder="YYYY-MM-DD"
                            placeholderTextColor={colors.textSecondary}
                        />
                    </View>
                    {errors.date && <Text style={styles.errorText}>{errors.date}</Text>}
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Departure Time *</Text>
                    <View style={[styles.inputContainer, errors.departureTime && styles.inputError]}>
                        <Clock size={20} color={colors.primary} style={styles.inputIcon} />
                        <TextInput
                            style={styles.input}
                            value={formData.departureTime}
                            onChangeText={(value) => updateFormData("departureTime", value)}
                            placeholder="HH:MM"
                            placeholderTextColor={colors.textSecondary}
                        />
                    </View>
                    {errors.departureTime && <Text style={styles.errorText}>{errors.departureTime}</Text>}
                </View>
            </View>

            {/* Customer Selection */}
            <View style={styles.card}>
                <Text style={styles.cardTitle}>Customer Information</Text>

                <Dropdown
                    label="Customer"
                    items={customerOptions}
                    value={formData.customerId}
                    onChange={(value) => updateFormData("customerId", value)}
                    placeholder="Select a customer..."
                    error={errors.customerId}
                    searchable
                    required
                />

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Number of Passengers *</Text>
                    <View style={[styles.inputContainer, errors.passengers && styles.inputError]}>
                        <Users size={20} color={colors.primary} style={styles.inputIcon} />
                        <TextInput
                            style={styles.input}
                            value={formData.passengers}
                            onChangeText={(value) => updateFormData("passengers", value)}
                            placeholder="1"
                            keyboardType="numeric"
                            placeholderTextColor={colors.textSecondary}
                        />
                    </View>
                    {errors.passengers && <Text style={styles.errorText}>{errors.passengers}</Text>}
                </View>
            </View>

            {/* Payment Information */}
            <View style={styles.card}>
                <Text style={styles.cardTitle}>Payment Information</Text>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Total Amount *</Text>
                    <View style={[styles.inputContainer, errors.totalAmount && styles.inputError]}>
                        <CreditCard size={20} color={colors.primary} style={styles.inputIcon} />
                        <TextInput
                            style={styles.input}
                            value={formData.totalAmount}
                            onChangeText={(value) => updateFormData("totalAmount", value)}
                            placeholder="0.00"
                            keyboardType="decimal-pad"
                            placeholderTextColor={colors.textSecondary}
                        />
                    </View>
                    {errors.totalAmount && <Text style={styles.errorText}>{errors.totalAmount}</Text>}
                </View>

                <Dropdown
                    label="Payment Status"
                    items={paymentStatusOptions}
                    value={formData.paymentStatus}
                    onChange={(value) => updateFormData("paymentStatus", value)}
                    placeholder="Select payment status..."
                />

                <Dropdown
                    label="Booking Status"
                    items={statusOptions}
                    value={formData.status}
                    onChange={(value) => updateFormData("status", value)}
                    placeholder="Select booking status..."
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