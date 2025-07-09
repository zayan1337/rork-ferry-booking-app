import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Stack, router } from "expo-router";
import { colors } from "@/constants/adminColors";
import { Calendar } from "lucide-react-native";
import Button from "@/components/admin/Button";

export default function NewScheduleScreen() {
    return (
        <View style={styles.container}>
            <Stack.Screen
                options={{
                    title: "New Schedule",
                }}
            />

            <View style={styles.content}>
                <Calendar size={64} color={colors.primary} />
                <Text style={styles.title}>Schedule Management</Text>
                <Text style={styles.description}>
                    Schedule management is currently handled through the main schedule tab.
                    Go to the Schedule tab to create and manage trips.
                </Text>

                <Button
                    title="Go to Schedule"
                    variant="primary"
                    onPress={() => router.push("/(admin)/(tabs)/schedule" as any)}
                    fullWidth
                />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.backgroundSecondary,
    },
    content: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 32,
    },
    title: {
        fontSize: 24,
        fontWeight: "700",
        color: colors.text,
        marginTop: 24,
        marginBottom: 16,
        textAlign: "center",
    },
    description: {
        fontSize: 16,
        color: colors.textSecondary,
        textAlign: "center",
        lineHeight: 24,
        marginBottom: 32,
    },
}); 