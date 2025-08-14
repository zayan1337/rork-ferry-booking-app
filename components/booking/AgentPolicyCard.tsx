import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AlertTriangle } from 'lucide-react-native';
import Card from '@/components/Card';
import Colors from '@/constants/colors';

const AgentPolicyCard: React.FC = () => {
  return (
    <Card variant='elevated' style={styles.policyCard}>
      <View style={styles.policyHeader}>
        <AlertTriangle
          size={24}
          color={Colors.warning}
          style={styles.policyIcon}
        />
        <Text style={styles.policyTitle}>Agent Cancellation Authority</Text>
      </View>
      <Text style={styles.policyText}>
        As an agent, you have the authority to:
      </Text>
      <View style={styles.policyList}>
        <Text style={styles.policyItem}>
          • Offer up to 100% refund for valid reasons
        </Text>
        <Text style={styles.policyItem}>
          • Process immediate refunds through agent credit
        </Text>
        <Text style={styles.policyItem}>
          • Waive standard cancellation policies for client satisfaction
        </Text>
        <Text style={styles.policyItem}>
          • Document special circumstances in notes
        </Text>
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  policyCard: {
    marginBottom: 16,
    backgroundColor: '#fff8e1',
    borderLeftWidth: 4,
    borderLeftColor: Colors.warning,
  },
  policyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  policyIcon: {
    marginRight: 8,
  },
  policyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  policyText: {
    fontSize: 14,
    color: Colors.text,
    marginBottom: 8,
  },
  policyList: {
    marginBottom: 8,
  },
  policyItem: {
    fontSize: 14,
    color: Colors.text,
    marginBottom: 4,
  },
});

export default AgentPolicyCard;
