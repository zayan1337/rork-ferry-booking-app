import React from 'react';
import { StyleSheet, Text, View, Dimensions } from 'react-native';
import {
  Calendar,
  FileText,
  Clock,
  DollarSign,
  TrendingUp,
  TrendingDown,
} from 'lucide-react-native';

import { CreditTransaction } from '@/types/agent';
import Colors from '@/constants/colors';
import Card from './Card';
import { formatCurrency } from '@/utils/agentFormatters';

const { width: screenWidth } = Dimensions.get('window');
const isTablet = screenWidth >= 768;

interface CreditTransactionCardProps {
  transaction: CreditTransaction;
}

// Memoized component for better VirtualizedList performance
const CreditTransactionCard = React.memo<CreditTransactionCardProps>(
  ({ transaction }) => {
    const isCredit = transaction.type === 'refill';

    // Check if transaction is failed or cancelled
    const description = transaction.description || '';
    const isFailed =
      description.toLowerCase().includes('failed') ||
      description.toLowerCase().includes('cancelled');
    const isPending = description.toLowerCase().includes('pending');

    // Determine transaction status color
    const getStatusColor = () => {
      if (isFailed) {
        return Colors.error; // Red for failed/cancelled
      } else if (isPending) {
        return '#FF9800'; // Orange for pending
      } else if (isCredit) {
        return Colors.success; // Green for successful credit
      } else {
        return Colors.error; // Red for deduction
      }
    };

    const statusColor = getStatusColor();

    const formatDate = (dateString: string | null | undefined) => {
      if (!dateString) return 'N/A';

      const date = new Date(dateString);

      // Check if date is valid
      if (isNaN(date.getTime())) {
        // Try using the date field as fallback
        if (transaction.date) {
          const fallbackDate = new Date(transaction.date);
          if (!isNaN(fallbackDate.getTime())) {
            return fallbackDate.toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            });
          }
        }
        return 'N/A';
      }

      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    };

    const formatTime = (dateString: string | null | undefined) => {
      if (!dateString) return 'N/A';

      const date = new Date(dateString);

      // Check if date is valid
      if (isNaN(date.getTime())) {
        // Try using the date field as fallback
        if (transaction.date) {
          const fallbackDate = new Date(transaction.date);
          if (!isNaN(fallbackDate.getTime())) {
            return fallbackDate.toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
            });
          }
        }
        return 'N/A';
      }

      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      });
    };

    const getTransactionTypeLabel = () => {
      if (isCredit) {
        return 'Credit Added';
      } else {
        return transaction.bookingId ? 'Booking Payment' : 'Credit Deduction';
      }
    };

    const getTransactionIcon = () => {
      if (isFailed) {
        return <TrendingDown size={18} color={Colors.error} />;
      } else if (isPending) {
        return <Clock size={18} color='#FF9800' />;
      } else if (isCredit) {
        return <TrendingUp size={18} color={Colors.success} />;
      } else {
        return transaction.bookingId ? (
          <FileText size={18} color={Colors.error} />
        ) : (
          <TrendingDown size={18} color={Colors.error} />
        );
      }
    };

    // Format transaction ID for display (show last 8 characters)
    const getTransactionNumber = () => {
      if (transaction.id) {
        return transaction.id.slice(-8).toUpperCase();
      }
      return null;
    };

    return (
      <Card
        variant='outlined'
        style={[styles.card, { borderLeftColor: statusColor }]}
      >
        <View style={styles.header}>
          <View
            style={[
              styles.iconContainer,
              {
                backgroundColor: `${statusColor}15`,
                borderColor: `${statusColor}30`,
              },
            ]}
          >
            {getTransactionIcon()}
          </View>

          <View style={styles.mainContent}>
            <View style={styles.topRow}>
              <View style={styles.titleSection}>
                <Text style={styles.typeLabel}>
                  {getTransactionTypeLabel()}
                </Text>
                <Text style={styles.description} numberOfLines={2}>
                  {transaction.description}
                </Text>
              </View>

              <View style={styles.amountSection}>
                <Text style={[styles.amount, { color: statusColor }]}>
                  {isCredit && !isFailed ? '+' : '-'}
                  {formatCurrency(transaction.amount)}
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
                  <Text style={styles.date}>
                    {formatDate(transaction.createdAt)}
                  </Text>
                  <Clock
                    size={12}
                    color={Colors.subtext}
                    style={styles.timeIcon}
                  />
                  <Text style={styles.time}>
                    {formatTime(transaction.createdAt)}
                  </Text>
                </View>

                {getTransactionNumber() && (
                  <View style={styles.bookingContainer}>
                    <FileText size={12} color={Colors.subtext} />
                    <Text style={styles.bookingNumber}>
                      TXN: {getTransactionNumber()}
                    </Text>
                  </View>
                )}
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
                <View
                  style={[
                    styles.statusBadge,
                    {
                      backgroundColor: `${statusColor}20`,
                      borderColor: statusColor,
                    },
                  ]}
                >
                  <Text style={[styles.statusText, { color: statusColor }]}>
                    {isFailed
                      ? 'Failed'
                      : isPending
                        ? 'Pending'
                        : isCredit
                          ? 'Credit'
                          : 'Debit'}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>
      </Card>
    );
  },
  (prevProps, nextProps) => {
    // Custom comparison function for better performance
    return (
      prevProps.transaction.id === nextProps.transaction.id &&
      prevProps.transaction.amount === nextProps.transaction.amount &&
      prevProps.transaction.balance === nextProps.transaction.balance &&
      prevProps.transaction.type === nextProps.transaction.type &&
      prevProps.transaction.createdAt === nextProps.transaction.createdAt
    );
  }
);

CreditTransactionCard.displayName = 'CreditTransactionCard';

const styles = StyleSheet.create({
  card: {
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: Colors.border,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 1,
  },
  mainContent: {
    flex: 1,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  titleSection: {
    flex: 1,
    marginRight: 12,
  },
  typeLabel: {
    fontSize: 10,
    color: Colors.subtext,
    textTransform: 'uppercase',
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  description: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
    lineHeight: 20,
  },
  amountSection: {
    alignItems: 'flex-end',
  },
  amount: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  balanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  balance: {
    fontSize: 12,
    color: Colors.subtext,
    marginLeft: 4,
  },
  metadataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  leftMetadata: {
    flex: 1,
  },
  dateTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
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
    flexDirection: 'row',
    alignItems: 'center',
  },
  bookingNumber: {
    fontSize: 12,
    color: Colors.primary,
    marginLeft: 4,
    fontWeight: '500',
  },
  rightMetadata: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});

export default CreditTransactionCard;
