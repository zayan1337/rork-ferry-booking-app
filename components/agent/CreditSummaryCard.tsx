import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { CreditCard, RefreshCw } from 'lucide-react-native';
import { Agent, CreditSummary } from '@/types/agent';
import { formatCurrency, calculateCreditSummary } from '@/utils/agentFormatters';
import Colors from '@/constants/colors';
import Card from '@/components/Card';

interface CreditSummaryCardProps {
  agent: Agent | null;
  transactions: any[];
  onRequestCredit?: () => void;
  style?: any;
}

export default function CreditSummaryCard({ 
  agent, 
  transactions = [],
  onRequestCredit,
  style 
}: CreditSummaryCardProps) {
  if (!agent) {
    return null;
  }

  const summary = calculateCreditSummary(agent, transactions);

  return (
    <Card variant="elevated" style={[styles.container, style]}>
      <View style={styles.balanceContainer}>
        <CreditCard size={24} color={Colors.primary} />
        <View style={styles.balanceTextContainer}>
          <Text style={styles.balanceLabel}>Current Credit Balance</Text>
          <Text style={styles.balanceValue}>
            {formatCurrency(summary.creditBalance)}
          </Text>
        </View>
      </View>

      <View style={styles.limitContainer}>
        <View style={styles.limitBar}>
          <View
            style={[
              styles.limitFill,
              {
                width: `${summary.creditUtilization}%`,
                backgroundColor: summary.isLowCredit ? Colors.error : Colors.primary
              }
            ]}
          />
        </View>
        <Text style={styles.limitText}>
          Credit Ceiling: {formatCurrency(summary.creditCeiling)}
        </Text>
      </View>

      {onRequestCredit && (
        <TouchableOpacity
          style={styles.requestButton}
          onPress={onRequestCredit}
        >
          <RefreshCw size={16} color="white" />
          <Text style={styles.requestText}>Request More Credit</Text>
        </TouchableOpacity>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  balanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  balanceTextContainer: {
    marginLeft: 12,
  },
  balanceLabel: {
    fontSize: 14,
    color: Colors.subtext,
  },
  balanceValue: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text,
  },
  limitContainer: {
    marginBottom: 16,
  },
  limitBar: {
    height: 8,
    backgroundColor: Colors.border,
    borderRadius: 4,
    marginBottom: 8,
    overflow: 'hidden',
  },
  limitFill: {
    height: '100%',
    borderRadius: 4,
  },
  limitText: {
    fontSize: 12,
    color: Colors.subtext,
    textAlign: 'right',
  },
  requestButton: {
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
  },
  requestText: {
    color: 'white',
    fontWeight: '600',
    marginLeft: 8,
  },
}); 