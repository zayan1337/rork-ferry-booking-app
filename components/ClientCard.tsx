import React from "react";
import { StyleSheet, Text, View, TouchableOpacity } from "react-native";
import { Client } from "@/types/agent";
import Colors from "@/constants/colors";
import { User, Mail, Phone, BarChart } from "lucide-react-native";
import Card from "./Card";

interface ClientCardProps {
    client: Client;
    onPress: (client: Client) => void;
}

export default function ClientCard({ client, onPress }: ClientCardProps) {
    return (
        <TouchableOpacity onPress={() => onPress(client)}>
            <Card variant="elevated" style={styles.card}>
                <View style={styles.header}>
                    <View style={styles.avatarContainer}>
                        <User size={24} color={Colors.primary} />
                    </View>
                    <View style={styles.clientInfo}>
                        <Text style={styles.clientName}>{client.name}</Text>
                        <Text style={styles.clientEmail}>{client.email}</Text>
                    </View>
                    <View style={styles.bookingsContainer}>
                        <BarChart size={16} color={Colors.primary} />
                        <Text style={styles.bookingsCount}>{client.bookingsCount}</Text>
                    </View>
                </View>

                <View style={styles.divider} />

                <View style={styles.contactInfo}>
                    <View style={styles.contactRow}>
                        <Phone size={14} color={Colors.subtext} />
                        <Text style={styles.contactText}>{client.phone}</Text>
                    </View>
                    <View style={styles.contactRow}>
                        <Mail size={14} color={Colors.subtext} />
                        <Text style={styles.contactText}>{client.email}</Text>
                    </View>
                </View>
            </Card>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    card: {
        marginBottom: 12,
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 12,
    },
    avatarContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: `${Colors.primary}15`,
        alignItems: "center",
        justifyContent: "center",
        marginRight: 12,
    },
    clientInfo: {
        flex: 1,
    },
    clientName: {
        fontSize: 16,
        fontWeight: "600",
        color: Colors.text,
        marginBottom: 2,
    },
    clientEmail: {
        fontSize: 14,
        color: Colors.subtext,
    },
    bookingsContainer: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: `${Colors.primary}10`,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    bookingsCount: {
        fontSize: 14,
        fontWeight: "600",
        color: Colors.primary,
        marginLeft: 4,
    },
    divider: {
        height: 1,
        backgroundColor: Colors.border,
        marginBottom: 12,
    },
    contactInfo: {
        flexDirection: "row",
        justifyContent: "space-between",
    },
    contactRow: {
        flexDirection: "row",
        alignItems: "center",
        flex: 1,
    },
    contactText: {
        fontSize: 12,
        color: Colors.subtext,
        marginLeft: 6,
        flex: 1,
    },
}); 