import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Agent } from '@/types/agent';
import {
  formatCurrency,
  formatAgentId,
  formatDiscountRate,
  formatFreeTickets,
} from '@/utils/agentFormatters';
import Colors from '@/constants/colors';
import Card from '@/components/Card';

interface AgentInfoCardProps {
  agent: Agent | null;
  variant?: 'dashboard' | 'profile';
  style?: ViewStyle;
}

export default function AgentInfoCard({
  agent,
  variant = 'dashboard',
  style,
}: AgentInfoCardProps) {
  if (!agent) {
    return null;
  }

  const showHeader = variant === 'dashboard';

  return (
    <Card
      variant='elevated'
      style={StyleSheet.flatten([styles.container, style])}
    >
      {showHeader && (
        <View style={styles.header}>
          <Text style={styles.title}>Agent Information</Text>
          <View style={styles.agentIdBadge}>
            <Text style={styles.agentIdText}>
              {formatAgentId(agent.agentId)}
            </Text>
          </View>
        </View>
      )}

      <View style={styles.infoGrid}>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Credit Balance</Text>
          <Text style={styles.infoValue}>
            {formatCurrency(agent.creditBalance)}
          </Text>
        </View>

        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Discount Rate</Text>
          <Text style={styles.infoValue}>
            {formatDiscountRate(agent.discountRate)}
          </Text>
        </View>

        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Free Tickets</Text>
          <Text style={styles.infoValue}>
            {formatFreeTickets(
              agent.freeTicketsRemaining,
              agent.freeTicketsAllocation
            )}
          </Text>
        </View>

        {variant === 'profile' && (
          <>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Credit Ceiling</Text>
              <Text style={styles.infoValue}>
                {formatCurrency(agent.creditCeiling || 0)}
              </Text>
            </View>

            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Agent ID</Text>
              <Text style={styles.infoValue}>
                {formatAgentId(agent.agentId)}
              </Text>
            </View>
          </>
        )}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  agentIdBadge: {
    backgroundColor: Colors.highlight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  agentIdText: {
    color: Colors.primary,
    fontWeight: '500',
    fontSize: 14,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  infoItem: {
    width: '32%',
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 12,
    color: Colors.subtext,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
});
