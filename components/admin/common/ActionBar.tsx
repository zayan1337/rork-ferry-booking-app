import React from "react";
import {
    StyleSheet,
    Text,
    View,
    ViewStyle,
} from "react-native";
import { colors } from "@/constants/adminColors";
import Button from "@/components/admin/Button";

export interface ActionBarAction {
    title: string;
    variant?: "primary" | "secondary" | "danger" | "ghost" | "outline";
    onPress: () => void;
    icon?: React.ReactNode;
    disabled?: boolean;
}

interface ActionBarProps {
    message: string;
    actions: ActionBarAction[];
    variant?: "primary" | "warning" | "danger" | "success" | "info";
    visible?: boolean;
    style?: ViewStyle;
}

export default function ActionBar({
    message,
    actions,
    variant = "primary",
    visible = true,
    style,
}: ActionBarProps) {
    if (!visible) return null;

    const getBarStyle = () => {
        const baseStyle = [styles.actionBar];

        switch (variant) {
            case "warning":
                return [...baseStyle, styles.warningBar];
            case "danger":
                return [...baseStyle, styles.dangerBar];
            case "success":
                return [...baseStyle, styles.successBar];
            case "info":
                return [...baseStyle, styles.infoBar];
            default:
                return [...baseStyle, styles.primaryBar];
        }
    };

    const getTextColor = () => {
        switch (variant) {
            case "warning":
                return colors.warning;
            case "danger":
                return colors.danger;
            case "success":
                return colors.success;
            case "info":
                return colors.secondary;
            default:
                return colors.primary;
        }
    };

    return (
        <View style={[getBarStyle(), style]}>
            <Text style={[styles.actionBarText, { color: getTextColor() }]}>
                {message}
            </Text>
            <View style={styles.actionBarButtons}>
                {(actions || []).map((action, index) => (
                    <Button
                        key={index}
                        title={action.title}
                        variant={action.variant || "primary"}
                        size="small"
                        onPress={action.onPress}
                        icon={action.icon}
                        disabled={action.disabled}
                    />
                ))}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    actionBar: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        padding: 12,
        borderRadius: 8,
        marginBottom: 16,
        borderWidth: 1,
    },
    primaryBar: {
        backgroundColor: colors.primary + "10",
        borderColor: colors.primary + "30",
    },
    warningBar: {
        backgroundColor: colors.warning + "10",
        borderColor: colors.warning + "30",
    },
    dangerBar: {
        backgroundColor: colors.danger + "10",
        borderColor: colors.danger + "30",
    },
    successBar: {
        backgroundColor: colors.success + "10",
        borderColor: colors.success + "30",
    },
    infoBar: {
        backgroundColor: colors.secondary + "10",
        borderColor: colors.secondary + "30",
    },
    actionBarText: {
        fontSize: 14,
        fontWeight: "500",
        flex: 1,
        marginRight: 16,
    },
    actionBarButtons: {
        flexDirection: "row",
        gap: 8,
    },
}); 