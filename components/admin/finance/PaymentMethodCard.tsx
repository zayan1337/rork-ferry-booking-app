import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors } from "@/constants/adminColors";

interface PaymentMethodCardProps {
    icon: React.ReactNode;
    title: string;
    value: number;
    percentage: number;
    color: string;
    isTablet?: boolean;
}

export default function PaymentMethodCard({
    icon,
    title,
    value,
    percentage,
    color,
    isTablet = false
}: PaymentMethodCardProps) {
    return (
        <View style={[styles.card, isTablet && styles.cardTablet]}>
            <View>
                <View style={styles.cardHeader}>
                    <View style={[styles.cardIcon, { backgroundColor: color + "20" }]}>
                        {icon}
                    </View>
                    <Text style={styles.cardTitle}>{title}</Text>
                </View>
                <View style={styles.cardStats}>
                    <Text style={styles.cardValue}>{value}</Text>
                    <Text style={[styles.cardPercentage, { color }]}>
                        {percentage}%
                    </Text>
                </View>
            </View>
            <View style={styles.progressBar}>
                <View
                    style={[
                        styles.progressFill,
                        { width: `${percentage}%`, backgroundColor: color }
                    ]}
                />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        flex: 1,
        backgroundColor: colors.card,
        borderRadius: 12,
        padding: 16,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
        elevation: 3,
        justifyContent: "space-between",
        minHeight: 130,
        maxWidth: "48%",
    },
    cardTablet: {
        padding: 20,
        minHeight: 150,
    },
    cardHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        marginBottom: 12,
    },
    cardIcon: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: "center",
        justifyContent: "center",
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: "600",
        color: colors.text,
        marginLeft: 2,
    },
    cardStats: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 12,
        marginTop: 8,
    },
    cardValue: {
        fontSize: 20,
        fontWeight: "700",
        color: colors.text,
    },
    cardPercentage: {
        fontSize: 15,
        fontWeight: "600",
    },
    progressBar: {
        height: 8,
        backgroundColor: "#E0E0E0",
        borderRadius: 4,
        overflow: "hidden",
        marginTop: 12,
        width: "100%",
    },
    progressFill: {
        height: "100%",
        borderRadius: 4,
        minWidth: 8,
    },
}); 