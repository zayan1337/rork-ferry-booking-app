import React, { useState } from "react";
import { View, Text, TextInput as RNTextInput, StyleSheet, TouchableOpacity, Modal } from "react-native";
import { colors } from "@/constants/adminColors";
import { ChevronDown } from "lucide-react-native";

interface UnitInputProps {
    label: string;
    value: string;
    onChangeText: (text: string) => void;
    error?: string;
    required?: boolean;
    description?: string;
    units: Array<{ label: string; value: string; suffix: string }>;
    defaultUnit?: string;
    placeholder?: string;
    keyboardType?: "numeric" | "default";
}

export default function UnitInput({
    label,
    value,
    onChangeText,
    error,
    required = false,
    description,
    units,
    defaultUnit,
    placeholder = "Enter value",
    keyboardType = "numeric",
}: UnitInputProps) {
    const [showUnitDropdown, setShowUnitDropdown] = useState(false);
    const [selectedUnit, setSelectedUnit] = useState(defaultUnit || units[0]?.value || "");

    // Parse the current value to extract number and unit
    const parseValue = (val: string) => {
        const match = val.match(/^([\d.]+)\s*(.+)$/);
        if (match) {
            return { number: match[1], unit: match[2] };
        }
        return { number: val, unit: selectedUnit };
    };

    const { number, unit } = parseValue(value);
    const currentUnit = units.find(u => u.value === unit) || units.find(u => u.value === selectedUnit) || units[0];

    const handleNumberChange = (text: string) => {
        // Only allow numbers and decimal point
        const cleanText = text.replace(/[^\d.]/g, "");

        // Ensure only one decimal point
        const parts = cleanText.split(".");
        if (parts.length > 2) return;

        // Limit decimal places to 2
        if (parts[1] && parts[1].length > 2) return;

        const newValue = cleanText + (cleanText ? ` ${currentUnit?.suffix || ""}` : "");
        onChangeText(newValue);
    };

    const handleUnitChange = (unitValue: string) => {
        const unitObj = units.find(u => u.value === unitValue);
        if (unitObj && number) {
            const newValue = `${number} ${unitObj.suffix}`;
            onChangeText(newValue);
        }
        setSelectedUnit(unitValue);
        setShowUnitDropdown(false);
    };

    return (
        <>
            <View style={styles.container}>
                <Text style={styles.label}>
                    {label}
                    {required && <Text style={styles.required}> *</Text>}
                </Text>

                {description && (
                    <Text style={styles.description}>{description}</Text>
                )}

                <View style={styles.inputWrapper}>
                    <View style={[
                        styles.inputContainer,
                        error && styles.inputError,
                    ]}>
                        <RNTextInput
                            style={styles.numberInput}
                            value={number}
                            onChangeText={handleNumberChange}
                            placeholder={placeholder}
                            keyboardType={keyboardType}
                            placeholderTextColor={colors.textSecondary}
                        />

                        <TouchableOpacity
                            style={styles.unitButton}
                            onPress={() => setShowUnitDropdown(true)}
                        >
                            <Text style={styles.unitButtonText}>
                                {currentUnit?.suffix || "km"}
                            </Text>
                            <ChevronDown
                                size={14}
                                color={colors.textSecondary}
                                style={styles.chevron}
                            />
                        </TouchableOpacity>
                    </View>
                </View>

                {error && <Text style={styles.errorText}>{error}</Text>}
            </View>

            <Modal
                visible={showUnitDropdown}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowUnitDropdown(false)}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setShowUnitDropdown(false)}
                >
                    <View style={styles.modalContent}>
                        <View style={styles.dropdown}>
                            {units.map((unitOption) => (
                                <TouchableOpacity
                                    key={unitOption.value}
                                    style={[
                                        styles.dropdownItem,
                                        selectedUnit === unitOption.value && styles.dropdownItemSelected,
                                    ]}
                                    onPress={() => handleUnitChange(unitOption.value)}
                                >
                                    <Text style={[
                                        styles.dropdownItemText,
                                        selectedUnit === unitOption.value && styles.dropdownItemTextSelected,
                                    ]}>
                                        {unitOption.suffix}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                </TouchableOpacity>
            </Modal>
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: 16,
    },
    label: {
        fontSize: 16,
        fontWeight: "500",
        color: colors.text,
        marginBottom: 8,
    },
    required: {
        color: colors.error,
    },
    description: {
        fontSize: 14,
        color: colors.textSecondary,
        marginBottom: 8,
        lineHeight: 20,
    },
    inputWrapper: {
        position: "relative",
    },
    inputContainer: {
        flexDirection: "row",
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 8,
        minHeight: 48,
        alignItems: "center",
    },
    numberInput: {
        flex: 1,
        paddingHorizontal: 12,
        paddingVertical: 14,
        fontSize: 16,
        color: colors.text,
        minHeight: 48,
    },
    unitButton: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderLeftWidth: 1,
        borderLeftColor: colors.border,
        backgroundColor: colors.backgroundSecondary,
        minHeight: 48,
        justifyContent: "center",
        minWidth: 50,
    },
    unitButtonText: {
        fontSize: 14,
        color: colors.text,
        fontWeight: "500",
        marginRight: 4,
    },
    chevron: {
        marginLeft: 2,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        backgroundColor: colors.card,
        borderRadius: 12,
        padding: 20,
        shadowColor: colors.shadowMedium,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
        elevation: 8,
        minWidth: 120,
    },
    dropdown: {
        backgroundColor: colors.card,
        borderRadius: 8,
        overflow: 'hidden',
    },
    dropdownItem: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    dropdownItemSelected: {
        backgroundColor: colors.primaryLight,
    },
    dropdownItemText: {
        fontSize: 16,
        color: colors.text,
        textAlign: "center",
        fontWeight: "500",
    },
    dropdownItemTextSelected: {
        color: colors.primary,
        fontWeight: "700",
    },
    inputError: {
        borderColor: colors.error,
    },
    errorText: {
        fontSize: 14,
        color: colors.error,
        marginTop: 4,
    },
}); 