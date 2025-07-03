import React from "react";
import { StyleSheet, Text, View, TouchableOpacity } from "react-native";
import { Client } from "@/types/agent";
import Colors from "@/constants/colors";
import { User, Mail, Phone, BarChart, UserX, AlertTriangle } from "lucide-react-native";
import Card from "./Card";

interface ClientCardProps {
    client: Client;
    onPress: (client: Client) => void;
    inactiveBookingsCount?: number; // Count of cancelled/modified bookings
}

// Memoized component for better VirtualizedList performance
const ClientCard = React.memo<ClientCardProps>(({ client, onPress, inactiveBookingsCount = 0 }) => {
    const handlePress = React.useCallback(() => {
        onPress(client);
    }, [onPress, client]);

    return (
        <TouchableOpacity onPress={handlePress}>
            <Card variant="elevated" style={styles.card}>
                <View style={styles.header}>
                    <View style={[
                        styles.avatarContainer,
                        !client.hasAccount && styles.avatarContainerNoAccount
                    ]}>
                        {client.hasAccount ? (
                            <User size={24} color={Colors.primary} />
                        ) : (
                            <UserX size={24} color={Colors.subtext} />
                        )}
                    </View>
                    <View style={styles.clientInfo}>
                        <View style={styles.nameRow}>
                            <Text style={styles.clientName}>{client.name}</Text>
                            {!client.hasAccount && (
                                <View style={styles.noAccountBadge}>
                                    <Text style={styles.noAccountText}>No Account</Text>
                                </View>
                            )}
                        </View>
                        <Text style={styles.clientEmail}>{client.email}</Text>
                    </View>
                    <View style={styles.bookingsInfo}>
                        <View style={styles.bookingsContainer}>
                            <BarChart size={16} color={Colors.primary} />
                            <Text style={styles.bookingsCount}>{client.bookingsCount}</Text>
                        </View>
                        {inactiveBookingsCount > 0 && (
                            <View style={styles.inactiveBookingsContainer}>
                                <AlertTriangle size={12} color={Colors.warning} />
                                <Text style={styles.inactiveBookingsCount}>{inactiveBookingsCount}</Text>
                            </View>
                        )}
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
}, (prevProps, nextProps) => {
    // Custom comparison function for better performance
    return (
        prevProps.client.id === nextProps.client.id &&
        prevProps.client.name === nextProps.client.name &&
        prevProps.client.bookingsCount === nextProps.client.bookingsCount &&
        prevProps.inactiveBookingsCount === nextProps.inactiveBookingsCount &&
        prevProps.onPress === nextProps.onPress
    );
});

ClientCard.displayName = 'ClientCard';

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
    avatarContainerNoAccount: {
        backgroundColor: `${Colors.subtext}15`,
    },
    clientInfo: {
        flex: 1,
    },
    nameRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 2,
    },
    clientName: {
        fontSize: 16,
        fontWeight: "600",
        color: Colors.text,
        flex: 1,
    },
    noAccountBadge: {
        backgroundColor: `${Colors.subtext}20`,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 8,
        marginLeft: 8,
    },
    noAccountText: {
        fontSize: 10,
        color: Colors.subtext,
        fontWeight: "500",
    },
    clientEmail: {
        fontSize: 14,
        color: Colors.subtext,
    },
    bookingsInfo: {
        alignItems: "flex-end",
    },
    bookingsContainer: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: `${Colors.primary}10`,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        marginBottom: 4,
    },
    inactiveBookingsContainer: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: `${Colors.warning}15`,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 8,
    },
    inactiveBookingsCount: {
        fontSize: 10,
        fontWeight: "500",
        color: Colors.warning,
        marginLeft: 2,
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

export default ClientCard; 