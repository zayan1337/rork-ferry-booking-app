import React from "react";
import { StyleSheet, Text, View, TouchableOpacity } from "react-native";
import { Booking } from "@/types/agent";
import Colors from "@/constants/colors";
import { Calendar, MapPin, User, DollarSign } from "lucide-react-native";
import Card from "./Card";

interface AgentBookingCardProps {
    booking: Booking;
    onPress: (booking: Booking) => void;
}

export default function AgentBookingCard({ booking, onPress }: AgentBookingCardProps) {
    const getStatusColor = (status: string) => {
        switch (status) {
            case "confirmed":
                return Colors.primary;
            case "completed":
                return Colors.success;
            case "cancelled":
                return Colors.error;
            default:
                return Colors.inactive;
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
        });
    };

    const formatCurrency = (amount: number) => {
        return `$${amount.toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        })}`;
    };

    return (
        <TouchableOpacity onPress={() => onPress(booking)}>
            <Card variant="elevated" style={styles.card}>
                <View style={styles.header}>
                    <View style={styles.route}>
                        <Text style={styles.routeText}>
                            {booking.origin} → {booking.destination}
                        </Text>
                    </View>
                    <View
                        style={[
                            styles.statusBadge,
                            { backgroundColor: getStatusColor(booking.status) },
                        ]}
                    >
                        <Text style={styles.statusText}>
                            {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                        </Text>
                    </View>
                </View>

                <View style={styles.infoRow}>
                    <View style={styles.infoItem}>
                        <Calendar size={16} color={Colors.subtext} />
                        <Text style={styles.infoText}>
                            {formatDate(booking.departureDate)}
                            {booking.returnDate ? ` - ${formatDate(booking.returnDate)}` : ""}
                        </Text>
                    </View>
                    <View style={styles.infoItem}>
                        <User size={16} color={Colors.subtext} />
                        <Text style={styles.infoText}>
                            {booking.passengerCount} {booking.passengerCount === 1 ? "passenger" : "passengers"}
                        </Text>
                    </View>
                </View>

                <View style={styles.divider} />

                <View style={styles.footer}>
                    <View style={styles.clientInfo}>
                        <Text style={styles.clientName}>{booking.clientName}</Text>
                        <Text style={styles.bookingId}>ID: {booking.id}</Text>
                    </View>
                    <View style={styles.priceInfo}>
                        <Text style={styles.price}>{formatCurrency(booking.discountedAmount)}</Text>
                        {booking.discountedAmount !== booking.totalAmount && (
                            <Text style={styles.originalPrice}>{formatCurrency(booking.totalAmount)}</Text>
                        )}
                    </View>
                </View>
            </Card>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    card: {
        marginBottom: 16,
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 12,
    },
    route: {
        flex: 1,
    },
    routeText: {
        fontSize: 18,
        fontWeight: "600",
        color: Colors.text,
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
    },
    statusText: {
        color: "white",
        fontSize: 12,
        fontWeight: "500",
    },
    infoRow: {
        flexDirection: "row",
        marginBottom: 12,
    },
    infoItem: {
        flexDirection: "row",
        alignItems: "center",
        marginRight: 16,
    },
    infoText: {
        marginLeft: 6,
        color: Colors.subtext,
        fontSize: 14,
    },
    divider: {
        height: 1,
        backgroundColor: Colors.border,
        marginVertical: 12,
    },
    footer: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    clientInfo: {},
    clientName: {
        fontSize: 16,
        fontWeight: "500",
        color: Colors.text,
    },
    bookingId: {
        fontSize: 12,
        color: Colors.subtext,
    },
    priceInfo: {
        alignItems: "flex-end",
    },
    price: {
        fontSize: 18,
        fontWeight: "600",
        color: Colors.primary,
    },
    originalPrice: {
        fontSize: 14,
        color: Colors.subtext,
        textDecorationLine: "line-through",
    },
    });