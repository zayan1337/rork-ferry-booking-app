import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { DollarSign } from 'lucide-react-native';
import Card from '@/components/Card';
import { formatCurrency } from '@/utils/agentFormatters';
import Colors from '@/constants/colors';

interface FareCalculationCardProps {
  currentPaidAmount: number;
  newBookingFare: number;
  agentDiscountRate: number;
  discountedFare: number;
  fareDifference: number;
}

const FareCalculationCard: React.FC<FareCalculationCardProps> = ({
  currentPaidAmount,
  newBookingFare,
  agentDiscountRate,
  discountedFare,
  fareDifference,
}) => {
  const getPaymentDifferenceText = () => {
    if (fareDifference > 0) {
      return 'Additional payment required from client';
    } else if (fareDifference < 0) {
      return 'Refund amount to be processed';
    } else {
      return 'No additional payment required';
    }
  };

  const getPaymentDifferenceColor = () => {
    if (fareDifference > 0) {
      return Colors.error;
    } else if (fareDifference < 0) {
      return Colors.success;
    } else {
      return Colors.textSecondary;
    }
  };

  return (
    <Card variant='elevated' style={styles.fareCalculationCard}>
      <View style={styles.fareHeader}>
        <DollarSign size={20} color={Colors.primary} />
        <Text style={styles.fareTitle}>Fare Calculation</Text>
      </View>

      {/* Current Fare */}
      <View style={styles.discountRow}>
        <Text style={styles.discountLabel}>Current Paid Amount:</Text>
        <Text style={styles.discountValue}>
          {formatCurrency(currentPaidAmount)}
        </Text>
      </View>

      {/* New Booking Base Fare */}
      <View style={styles.discountRow}>
        <Text style={styles.discountLabel}>New Booking Fare:</Text>
        <Text style={styles.discountValue}>
          {formatCurrency(newBookingFare)}
        </Text>
      </View>

      {/* Agent Discount on New Fare */}
      {agentDiscountRate > 0 && (
        <>
          <View style={styles.discountRow}>
            <Text style={styles.discountLabel}>
              Agent Discount ({agentDiscountRate}%):
            </Text>
            <Text style={styles.discountSavings}>
              -{formatCurrency(newBookingFare * (agentDiscountRate / 100))}
            </Text>
          </View>

          <View style={styles.discountRow}>
            <Text style={styles.discountLabel}>New Discounted Fare:</Text>
            <Text style={styles.discountFinal}>
              {formatCurrency(discountedFare)}
            </Text>
          </View>
        </>
      )}

      {/* Payment Difference */}
      <View style={styles.dividerLine} />
      <View style={styles.discountRow}>
        <Text
          style={[styles.discountLabel, { fontSize: 16, fontWeight: '600' }]}
        >
          Payment Difference:
        </Text>
        <Text
          style={[
            styles.fareAmount,
            {
              fontSize: 18,
              color: getPaymentDifferenceColor(),
            },
          ]}
        >
          {fareDifference > 0 ? '+' : ''}
          {formatCurrency(fareDifference)}
        </Text>
      </View>

      <Text style={styles.fareDescription}>{getPaymentDifferenceText()}</Text>
    </Card>
  );
};

const styles = StyleSheet.create({
  fareCalculationCard: {
    marginBottom: 16,
    backgroundColor: '#f0f9ff',
  },
  fareHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  fareTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginLeft: 8,
  },
  discountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  discountLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  discountValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  discountSavings: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.warning,
  },
  discountFinal: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
  dividerLine: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 12,
  },
  fareAmount: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  fareDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
  },
});

export default FareCalculationCard;
