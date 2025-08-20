import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { DollarSign } from 'lucide-react-native';
import Card from '@/components/Card';
import { formatCurrency } from '@/utils/agentFormatters';
import Colors from '@/constants/colors';

interface CommissionImpactCardProps {
  commission: number;
}

const CommissionImpactCard: React.FC<CommissionImpactCardProps> = ({
  commission,
}) => {
  if (!commission || commission <= 0) return null;

  return (
    <Card variant='elevated' style={styles.commissionCard}>
      <View style={styles.commissionHeader}>
        <DollarSign size={20} color={Colors.warning} />
        <Text style={styles.commissionTitle}>Commission Impact</Text>
      </View>
      <Text style={styles.commissionText}>
        Your commission of {formatCurrency(commission)} will be deducted from
        your account.
      </Text>
    </Card>
  );
};

const styles = StyleSheet.create({
  commissionCard: {
    marginBottom: 16,
    backgroundColor: '#fff8e1',
    borderLeftWidth: 4,
    borderLeftColor: Colors.warning,
  },
  commissionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  commissionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginLeft: 8,
  },
  commissionText: {
    fontSize: 14,
    color: Colors.text,
  },
});

export default CommissionImpactCard;
