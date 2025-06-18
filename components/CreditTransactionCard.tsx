import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { CreditTransaction } from "@/types/agent";
import Colors from "@/constants/colors";
import { ArrowUp, ArrowDown, Calendar, FileText } from "lucide-react-native";
import Card from "./Card";

interface CreditTransactionCardProps {
    transaction: CreditTransaction;
}

export default function CreditTransactionCard({ transaction }: CreditTransactionCardProps) {
    const isCredit = transaction.type === "refill";

    const formatCurrency = (amount: number) => {
        return `$${amount.toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        })}`;
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    return (
        <Card variant="outlined" style={styles.card}>
            <View style={styles.header}>
                <View style={[
                    styles.iconContainer,
                    { backgroundColor: isCredit ? `${Colors.success}20` : `${Colors.error}20` }
                ]}>
                    {isCredit ? (
                        <ArrowUp size={16} color={Colors.success} />
                    ) : (
                        <ArrowDown size={16} color={Colors.error} />
                    )}
                </View>
                <View style={styles.transactionInfo}>
                    <Text style={styles.description}>{transaction.description}</Text>
                    <View style={styles.dateRow}>
                        <Calendar size={12} color={Colors.subtext} />
                        <Text style={styles.date}>{formatDate(transaction.date)}</Text>
                    </View>
                    {transaction.bookingId && (
                        <View style={styles.bookingRow}>
                            <FileText size={12} color={Colors.subtext} />
                            <Text style={styles.bookingId}>Booking: {transaction.bookingId}</Text>
                        </View>
                    )}
                </View>
                <View style={styles.amountContainer}>
                    <Text style={[
                        styles.amount,
                        { color: isCredit ? Colors.success : Colors.error }
                    ]}>
                        {isCredit ? '+' : '-'}{formatCurrency(transaction.amount)}
                    </Text>
                    <Text style={styles.balance}>
                        Balance: {formatCurrency(transaction.balance)}
                    </Text>
                </View>
            </View>
        </Card>
    );
}

const styles = StyleSheet.create({
    card: {
        marginBottom: 12,
    },
    header: {
        flexDirection: "row",
        alignItems: "flex-start",
    },
    iconContainer: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: "center",
        justifyContent: "center",
        marginRight: 12,
    },
    transactionInfo: {
        flex: 1,
    },
    description: {
        fontSize: 14,
        fontWeight: "500",
        color: Colors.text,
        marginBottom: 4,
    },
    dateRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 2,
    },
    date: {
        fontSize: 12,
        color: Colors.subtext,
        marginLeft: 4,
    },
    bookingRow: {
        flexDirection: "row",
        alignItems: "center",
    },
    bookingId: {
        fontSize: 12,
        color: Colors.subtext,
        marginLeft: 4,
    },
    amountContainer: {
        alignItems: "flex-end",
    },
    amount: {
        fontSize: 16,
        fontWeight: "600",
        marginBottom: 2,
    },
    balance: {
        fontSize: 12,
        color: Colors.subtext,
    },
}); 