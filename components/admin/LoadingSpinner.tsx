import React from "react";
import { View, StyleSheet, ActivityIndicator } from "react-native";
import { colors } from "@/constants/adminColors";

interface LoadingSpinnerProps {
    size?: "small" | "large";
    color?: string;
    style?: any;
}

export default function LoadingSpinner({
    size = "large",
    color = colors.primary,
    style
}: LoadingSpinnerProps) {
    return (
        <View style={[styles.container, style]}>
            <ActivityIndicator size={size} color={color} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
    },
}); 