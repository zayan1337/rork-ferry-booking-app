import React from "react";
import { StyleSheet, Text, View, TouchableOpacity } from "react-native";
import { Calendar, MapPin, User, DollarSign } from "lucide-react-native";

import { Booking } from "@/types/agent";
import Colors from "@/constants/colors";
import Card from "./Card";
import { isBookingExpired, isBookingInactive } from "@/utils/bookingUtils";
import { getClientDisplayName } from "@/utils/clientUtils";
import { formatCurrency, formatBookingDate } from "@/utils/agentFormatters";
import { useAgentStore } from "@/store/agent/agentStore";

interface AgentBookingCardProps {
    booking: Booking;
    onPress: (booking: Booking) => void;
}

// Memoized component for better VirtualizedList performance
const AgentBookingCard = React.memo<AgentBookingCardProps>(({ booking, onPress }) => {
    const { clients } = useAgentStore();

    const getStatusColor = (status: string, isExpired: boolean = false) => {
        if (isExpired) {
            return Colors.warning; // Show expired bookings in warning color
        }

        switch (status) {
            case "confirmed":
                return Colors.primary;
            case "completed":
                return Colors.success;
            case "cancelled":
                return Colors.error;
            case "modified":
                return Colors.warning;
            case "pending":
                return Colors.secondary;
            default:
                return Colors.inactive;
        }
    };

    const getStatusText = (status: string) => {
        return status.charAt(0).toUpperCase() + status.slice(1);
    };

    const bookingExpired = isBookingExpired(booking);
    const bookingInactive = isBookingInactive(booking);

    const handlePress = React.useCallback(() => {
        onPress(booking);
    }, [onPress, booking]);

    return (
        <TouchableOpacity onPress={handlePress}>
            <Card variant="elevated" style={styles.card}>
                <View style={styles.header}>
                    <View style={styles.route}>
                        <Text style={[
                            styles.routeText,
                            bookingInactive && styles.inactiveText
                        ]}>
                            {booking.origin} → {booking.destination}
                        </Text>
                    </View>
                    <View
                        style={[
                            styles.statusBadge,
                            { backgroundColor: getStatusColor(booking.status, bookingExpired) },
                        ]}
                    >
                        <Text style={styles.statusText}>
                            {getStatusText(booking.status)}
                        </Text>
                    </View>
                </View>

                <View style={styles.infoRow}>
                    <View style={styles.infoItem}>
                        <Calendar size={16} color={Colors.subtext} />
                        <Text style={[
                            styles.infoText,
                            bookingExpired && styles.expiredText
                        ]}>
                            {formatBookingDate(booking.departureDate)}
                            {booking.returnDate ? ` - ${formatBookingDate(booking.returnDate)}` : ""}
                            {bookingExpired && " (Expired)"}
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
                        <Text style={styles.clientName}>{getClientDisplayName(booking.clientName, clients)}</Text>
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
}, (prevProps, nextProps) => {
    // Custom comparison function for better performance
    return (
        prevProps.booking.id === nextProps.booking.id &&
        prevProps.booking.status === nextProps.booking.status &&
        prevProps.booking.discountedAmount === nextProps.booking.discountedAmount &&
        prevProps.onPress === nextProps.onPress
    );
});

AgentBookingCard.displayName = 'AgentBookingCard';

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
    inactiveText: {
        color: Colors.subtext,
    },
    expiredText: {
        color: Colors.warning,
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

export default AgentBookingCard;