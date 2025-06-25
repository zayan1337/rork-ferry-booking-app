import React from "react";
import { Stack } from "expo-router";
import Colors from "@/constants/colors";

export default function AgentLayout() {
    return (
        <Stack
            screenOptions={{
                headerStyle: {
                    backgroundColor: Colors.background,
                },
                headerTintColor: Colors.text,
                headerTitleStyle: {
                    fontWeight: "600",
                },
            }}
        >
            <Stack.Screen
                name="(tabs)"
                options={{ headerShown: false }}
            />
            <Stack.Screen
                name="booking/[id]"
                options={{
                    title: "Booking Details",
                    presentation: "card",
                }}
            />
            <Stack.Screen
                name="booking/new"
                options={{
                    title: "New Booking",
                    presentation: "card",
                }}
            />
            <Stack.Screen
                name="cancel-booking/[id]"
                options={{
                    title: "Cancel Booking",
                    presentation: "card",
                }}
            />
            <Stack.Screen
                name="modify-booking/[id]"
                options={{
                    title: "Modify Booking",
                    presentation: "card",
                }}
            />
            <Stack.Screen
                name="client/[id]"
                options={{
                    title: "Client Details",
                    presentation: "card",
                }}
            />
        </Stack>
    );
} 