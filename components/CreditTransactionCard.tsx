import React from "react";
import { StyleSheet, Text, View, Dimensions } from "react-native";
import { ArrowUp, ArrowDown, Calendar, FileText, Clock, DollarSign, TrendingUp, TrendingDown } from "lucide-react-native";

import { CreditTransaction } from "@/types/agent";
import Colors from "@/constants/colors";
import Card from "./Card";
import { formatCurrency } from "@/utils/agentFormatters";

const { width: screenWidth } = Dimensions.get('window');
const isTablet = screenWidth >= 768;

interface CreditTransactionCardProps {
    transaction: CreditTransaction;
}

// Memoized component for better VirtualizedList performance
const CreditTransactionCard = React.memo<CreditTransactionCardProps>(({ transaction }) => {
    const isCredit = transaction.type === "refill";

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
        });
    };

    const formatTime = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const getTransactionTypeLabel = () => {
        if (isCredit) {
            return "Credit Added";
        } else {
            return transaction.bookingId ? "Booking Payment" : "Credit Deduction";
        }
    };

    const getTransactionIcon = () => {
        if (isCredit) {
            return <TrendingUp size={18} color={Colors.success} />;
        } else {
            return transaction.bookingId ?
                <FileText size={18} color={Colors.error} /> :
                <TrendingDown size={18} color={Colors.error} />;
        }
    };

    return (
        <Card variant="outlined" style={styles.card}>
            <View style={styles.header}>
                <View style={[
                    styles.iconContainer,
                    {
                        backgroundColor: isCredit ? `${Colors.success}15` : `${Colors.error}15`,
                        borderColor: isCredit ? `${Colors.success}30` : `${Colors.error}30`,
                    }
                ]}>
                    {getTransactionIcon()}
                </View>

                <View style={styles.mainContent}>
                    <View style={styles.topRow}>
                        <View style={styles.titleSection}>
                            <Text style={styles.typeLabel}>{getTransactionTypeLabel()}</Text>
                            <Text style={styles.description} numberOfLines={2}>
                                {transaction.description}
                            </Text>
                        </View>

                        <View style={styles.amountSection}>
                    <Text style={[
                        styles.amount,
                        { color: isCredit ? Colors.success : Colors.error }
                    ]}>
                        {isCredit ? '+' : '-'}{formatCurrency(transaction.amount)}
                    </Text>
                            <View style={styles.balanceContainer}>
                                <DollarSign size={12} color={Colors.subtext} />
                    <Text style={styles.balance}>
                                    {formatCurrency(transaction.balance)}
                                </Text>
                            </View>
                        </View>
                    </View>

                    <View style={styles.metadataRow}>
                        <View style={styles.leftMetadata}>
                            <View style={styles.dateTimeContainer}>
                                <Calendar size={12} color={Colors.subtext} />
                                <Text style={styles.date}>{formatDate(transaction.date)}</Text>
                                <Clock size={12} color={Colors.subtext} style={styles.timeIcon} />
                                <Text style={styles.time}>{formatTime(transaction.date)}</Text>
                            </View>

                            {transaction.bookingNumber && (
                                <View style={styles.bookingContainer}>
                                    <FileText size={12} color={Colors.subtext} />
                                    <Text style={styles.bookingNumber}>
                                        #{transaction.bookingNumber}
                                    </Text>
                                </View>
                            )}
                        </View>

                        <View style={styles.rightMetadata}>
                            <View style={[
                                styles.statusBadge,
                                {
                                    backgroundColor: isCredit ? `${Colors.success}20` : `${Colors.error}20`,
                                    borderColor: isCredit ? Colors.success : Colors.error,
                                }
                            ]}>
                                <Text style={[
                                    styles.statusText,
                                    { color: isCredit ? Colors.success : Colors.error }
                                ]}>
                                    {isCredit ? 'Credit' : 'Debit'}
                    </Text>
                            </View>
                        </View>
                    </View>
                </View>
            </View>
        </Card>
    );
}, (prevProps, nextProps) => {
    // Custom comparison function for better performance
    return (
        prevProps.transaction.id === nextProps.transaction.id &&
        prevProps.transaction.amount === nextProps.transaction.amount &&
        prevProps.transaction.balance === nextProps.transaction.balance &&
        prevProps.transaction.type === nextProps.transaction.type &&
        prevProps.transaction.date === nextProps.transaction.date
    );
});

CreditTransactionCard.displayName = 'CreditTransactionCard';

const styles = StyleSheet.create({
    card: {
        marginBottom: 12,
        borderLeftWidth: 4,
        borderLeftColor: Colors.border,
        overflow: 'hidden',
    },
    cardTablet: {
        marginHorizontal: 8,
    },
    header: {
        flexDirection: "row",
        alignItems: "flex-start",
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: "center",
        justifyContent: "center",
        marginRight: 12,
        borderWidth: 1,
    },
    mainContent: {
        flex: 1,
    },
    topRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: 12,
    },
    titleSection: {
        flex: 1,
        marginRight: 12,
    },
    typeLabel: {
        fontSize: 10,
        color: Colors.subtext,
        textTransform: "uppercase",
        fontWeight: "600",
        letterSpacing: 0.5,
        marginBottom: 2,
    },
    description: {
        fontSize: 15,
        fontWeight: "600",
        color: Colors.text,
        lineHeight: 20,
    },
    amountSection: {
        alignItems: "flex-end",
    },
    amount: {
        fontSize: 18,
        fontWeight: "700",
        marginBottom: 4,
    },
    balanceContainer: {
        flexDirection: "row",
        alignItems: "center",
    },
    balance: {
        fontSize: 12,
        color: Colors.subtext,
        marginLeft: 4,
    },
    metadataRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-end",
    },
    leftMetadata: {
        flex: 1,
    },
    dateTimeContainer: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 4,
    },
    date: {
        fontSize: 12,
        color: Colors.subtext,
        marginLeft: 4,
    },
    timeIcon: {
        marginLeft: 8,
    },
    time: {
        fontSize: 12,
        color: Colors.subtext,
        marginLeft: 4,
    },
    bookingContainer: {
        flexDirection: "row",
        alignItems: "center",
    },
    bookingNumber: {
        fontSize: 12,
        color: Colors.primary,
        marginLeft: 4,
        fontWeight: "500",
    },
    rightMetadata: {
        alignItems: "flex-end",
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        borderWidth: 1,
    },
    statusText: {
        fontSize: 10,
        fontWeight: "600",
        textTransform: "uppercase",
        letterSpacing: 0.5,
    },
});

export default CreditTransactionCard; 