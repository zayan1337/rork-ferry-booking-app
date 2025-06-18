import React from "react";
import { StyleSheet, Text, View, TouchableOpacity, Alert, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { useAuthStore } from "@/store/authStore";
import { useAgentStore } from "@/store/agentStore";
import Colors from "@/constants/colors";
import Card from "@/components/Card";
import Button from "@/components/Button";
import {
    User,
    Mail,
    CreditCard,
    Percent,
    Ticket,
    LogOut,
    Settings,
    Bell,
    HelpCircle,
    Shield
} from "lucide-react-native";
export default function AgentProfileScreen() {
    const router = useRouter();
    const { user, signOut } = useAuthStore();
    const { agent, reset } = useAgentStore();

    const handleSignOut = async () => {
        try {
            reset(); // Clear agent store
            await signOut();
            router.replace("/(auth)");
        } catch (error) {
            console.error("Sign out error:", error);
        }
    };
    const handleLogout = () => {
        Alert.alert(
            "Logout",
            "Are you sure you want to log out?",
            [
                {
                    text: "Cancel",
                    style: "cancel",
                },
                {
                    text: "Logout",
                    onPress: async () => {
                        try {
                            reset(); // Clear agent store
                            await signOut();
                            router.replace("/(auth)");
                        } catch (error) {
                            console.error("Sign out error:", error);
                        };
                    },
                    style: "destructive",
                },
            ]
        );
    };

    const formatCurrency = (amount: number) => {
        return `$${amount.toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        })}`;
    };

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            <View style={styles.profileHeader}>
                <View style={styles.avatarContainer}>
                    <Text style={styles.avatarText}>
                        {agent?.name.split(" ").map(n => n[0]).join("")}
                    </Text>
                </View>
                <Text style={styles.name}>{agent?.name}</Text>
                <Text style={styles.agentId}>{agent?.agentId}</Text>
            </View>

            <Card variant="elevated" style={styles.infoCard}>
                <Text style={styles.sectionTitle}>Agent Information</Text>

                <View style={styles.infoRow}>
                    <User size={20} color={Colors.subtext} />
                    <View style={styles.infoContent}>
                        <Text style={styles.infoLabel}>Full Name</Text>
                        <Text style={styles.infoValue}>{agent?.name}</Text>
                    </View>
                </View>

                <View style={styles.infoRow}>
                    <Mail size={20} color={Colors.subtext} />
                    <View style={styles.infoContent}>
                        <Text style={styles.infoLabel}>Email</Text>
                        <Text style={styles.infoValue}>{agent?.email}</Text>
                    </View>
                </View>

                <View style={styles.infoRow}>
                    <CreditCard size={20} color={Colors.subtext} />
                    <View style={styles.infoContent}>
                        <Text style={styles.infoLabel}>Credit Balance</Text>
                        <Text style={styles.infoValue}>{formatCurrency(agent?.creditBalance || 0)}</Text>
                    </View>
                </View>

                <View style={styles.infoRow}>
                    <Percent size={20} color={Colors.subtext} />
                    <View style={styles.infoContent}>
                        <Text style={styles.infoLabel}>Discount Rate</Text>
                        <Text style={styles.infoValue}>{agent?.discountRate}%</Text>
                    </View>
                </View>

                <View style={styles.infoRow}>
                    <Ticket size={20} color={Colors.subtext} />
                    <View style={styles.infoContent}>
                        <Text style={styles.infoLabel}>Free Tickets Remaining</Text>
                        <Text style={styles.infoValue}>{agent?.freeTicketsRemaining} / {agent?.freeTicketsAllocation}</Text>
                    </View>
                </View>
            </Card>

            <Text style={styles.sectionTitle}>Settings</Text>

            <Card variant="outlined" style={styles.settingsCard}>
                <View style={styles.settingRow}>
                    <Settings size={20} color={Colors.primary} />
                    <Text style={styles.settingText}>Account Settings</Text>
                </View>

                <View style={styles.settingDivider} />

                <View style={styles.settingRow}>
                    <Bell size={20} color={Colors.primary} />
                    <Text style={styles.settingText}>Notifications</Text>
                </View>

                <View style={styles.settingDivider} />

                <View style={styles.settingRow}>
                    <Shield size={20} color={Colors.primary} />
                    <Text style={styles.settingText}>Privacy & Security</Text>
                </View>

                <View style={styles.settingDivider} />

                <View style={styles.settingRow}>
                    <HelpCircle size={20} color={Colors.primary} />
                    <Text style={styles.settingText}>Help & Support</Text>
                </View>
            </Card>

            <Button
                title="Log Out"
                onPress={handleLogout}
                variant="outline"
                icon={<LogOut size={20} color={Colors.primary} />}
                style={styles.logoutButton}
            />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    content: {
        padding: 16,
    },
    profileHeader: {
        alignItems: "center",
        marginBottom: 24,
    },
    avatarContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: Colors.primary,
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 16,
    },
    avatarText: {
        fontSize: 32,
        fontWeight: "bold",
        color: "white",
    },
    name: {
        fontSize: 24,
        fontWeight: "bold",
        color: Colors.text,
        marginBottom: 4,
    },
    agentId: {
        fontSize: 16,
        color: Colors.subtext,
    },
    infoCard: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: "600",
        color: Colors.text,
        marginBottom: 16,
    },
    infoRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 16,
    },
    infoContent: {
        marginLeft: 12,
        flex: 1,
    },
    infoLabel: {
        fontSize: 14,
        color: Colors.subtext,
    },
    infoValue: {
        fontSize: 16,
        color: Colors.text,
        fontWeight: "500",
    },
    settingsCard: {
        marginBottom: 24,
    },
    settingRow: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 12,
    },
    settingText: {
        marginLeft: 12,
        fontSize: 16,
        color: Colors.text,
    },
    settingDivider: {
        height: 1,
        backgroundColor: Colors.border,
    },
    logoutButton: {
        marginBottom: 24,
    },
});