import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Dimensions,
  ViewStyle,
} from 'react-native';
import { CreditCard, RefreshCw, AlertTriangle } from 'lucide-react-native';
import { Agent, CreditTransaction } from '@/types/agent';
import {
  formatCurrency,
  calculateCreditSummary,
} from '@/utils/agentFormatters';
import Colors from '@/constants/colors';
import Card from '@/components/Card';

const { width: screenWidth } = Dimensions.get('window');
const isTablet = screenWidth >= 768;

interface CreditSummaryCardProps {
  agent: Agent | null;
  transactions: CreditTransaction[];
  onRequestCredit?: () => void;
  style?: ViewStyle;
}

function CreditSummaryCard({
  agent,
  transactions = [],
  onRequestCredit,
  style,
}: CreditSummaryCardProps) {
  if (!agent) {
    return null;
  }

  const summary = calculateCreditSummary(agent, transactions);

  const getCreditStatusColor = () => {
    if (summary.creditUtilization > 90) return Colors.error;
    if (summary.creditUtilization > 70) return Colors.warning || '#FF8C00';
    return Colors.primary;
  };

  const getCreditStatusText = () => {
    if (summary.creditUtilization > 90) return 'Critical';
    if (summary.creditUtilization > 70) return 'Low';
    return 'Good';
  };

  const formatUtilization = (utilization: number) => {
    // If utilization is very small but greater than 0, show at least 0.01%
    if (utilization > 0 && utilization < 0.5) {
      return Math.max(0.01, Math.round(utilization * 100) / 100);
    }
    // For larger values, round to nearest integer
    return Math.round(utilization);
  };

  return (
    <Card
      variant='elevated'
      style={StyleSheet.flatten([styles.container, style])}
    >
      {/* Header Section */}
      <View style={styles.headerSection}>
        <View style={styles.balanceContainer}>
          <View
            style={[
              styles.iconContainer,
              { backgroundColor: `${Colors.primary}15` },
            ]}
          >
            <CreditCard size={24} color={Colors.primary} />
          </View>
          <View style={styles.balanceTextContainer}>
            <Text style={styles.balanceLabel}>Available Credit</Text>
            <Text style={styles.balanceValue}>
              {formatCurrency(summary.creditBalance)}
            </Text>
            <View style={styles.statusContainer}>
              <View
                style={[
                  styles.statusIndicator,
                  { backgroundColor: getCreditStatusColor() },
                ]}
              />
              <Text
                style={[styles.statusText, { color: getCreditStatusColor() }]}
              >
                {getCreditStatusText()}
              </Text>
            </View>
          </View>
        </View>

        {/* Utilization Percentage */}
        <View style={styles.utilizationContainer}>
          <Text style={styles.utilizationPercentage}>
            {summary.creditUtilization > 0 && summary.creditUtilization < 1
              ? summary.creditUtilization.toFixed(2)
              : formatUtilization(summary.creditUtilization)}
            %
          </Text>
          <Text style={styles.utilizationLabel}>Used</Text>
        </View>
      </View>

      {/* Credit Limit Progress Bar */}
      <View style={styles.progressSection}>
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${Math.min(100, summary.creditUtilization)}%`,
                  backgroundColor: getCreditStatusColor(),
                },
              ]}
            />
          </View>
          <View style={styles.progressLabels}>
            <Text style={styles.progressCurrentLabel}>
              {formatCurrency(summary.creditCeiling - summary.creditBalance)}{' '}
              used
            </Text>
            <Text style={styles.progressMaxLabel}>
              of {formatCurrency(summary.creditCeiling)}
            </Text>
          </View>
        </View>

        {/* Warning for low credit */}
        {summary.creditUtilization > 80 && (
          <View style={styles.warningContainer}>
            <AlertTriangle size={16} color={Colors.warning || '#FF8C00'} />
            <Text style={styles.warningText}>
              {summary.creditUtilization > 90
                ? 'Credit limit nearly reached'
                : 'Credit running low'}
            </Text>
          </View>
        )}
      </View>

      {/* Quick Stats Section */}
      <View style={styles.quickStatsSection}>
        <View style={styles.quickStatsRow}>
          <View style={styles.quickStat}>
            <Text style={styles.quickStatValue}>
              {transactions?.filter(t => t.type === 'refill').length || 0}
            </Text>
            <Text style={styles.quickStatLabel}>Refills</Text>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.quickStat}>
            <Text style={styles.quickStatValue}>
              {transactions?.filter(t => t.type === 'deduction').length || 0}
            </Text>
            <Text style={styles.quickStatLabel}>Payments</Text>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.quickStat}>
            <Text style={styles.quickStatValue}>
              {formatCurrency(summary.creditCeiling - summary.creditBalance)}
            </Text>
            <Text style={styles.quickStatLabel}>Balance to Pay</Text>
          </View>
        </View>
      </View>

      {/* Action Button */}
      {onRequestCredit && (
        <Pressable
          style={[
            styles.requestButton,
            summary.creditUtilization > 70 && styles.urgentRequestButton,
          ]}
          onPress={onRequestCredit}
        >
          <RefreshCw size={16} color='white' />
          <Text style={styles.requestText}>Pay Balance</Text>
        </Pressable>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  headerSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  balanceContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  balanceTextContainer: {
    flex: 1,
  },
  balanceLabel: {
    fontSize: 14,
    color: Colors.subtext,
    marginBottom: 4,
  },
  balanceValue: {
    fontSize: isTablet ? 28 : 24,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 6,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  utilizationContainer: {
    alignItems: 'center',
    backgroundColor: Colors.background,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  utilizationPercentage: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
  },
  utilizationLabel: {
    fontSize: 10,
    color: Colors.subtext,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  progressSection: {
    marginBottom: 16,
  },
  progressContainer: {
    marginBottom: 8,
  },
  progressBar: {
    height: 10,
    backgroundColor: Colors.border,
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressFill: {
    height: '100%',
    borderRadius: 5,
    minWidth: 4,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressCurrentLabel: {
    fontSize: 12,
    color: Colors.text,
    fontWeight: '500',
  },
  progressMaxLabel: {
    fontSize: 12,
    color: Colors.subtext,
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${Colors.warning || '#FF8C00'}15`,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: `${Colors.warning || '#FF8C00'}30`,
  },
  warningText: {
    fontSize: 12,
    color: Colors.warning || '#FF8C00',
    marginLeft: 6,
    fontWeight: '500',
  },
  quickStatsSection: {
    marginBottom: 16,
  },
  quickStatsRow: {
    flexDirection: 'row',
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 16,
  },
  quickStat: {
    flex: 1,
    alignItems: 'center',
  },
  quickStatValue: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 4,
  },
  quickStatLabel: {
    fontSize: 8,
    color: Colors.subtext,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: Colors.border,
    marginHorizontal: 12,
  },
  requestButton: {
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
  },
  urgentRequestButton: {
    backgroundColor: Colors.error,
  },
  requestText: {
    color: 'white',
    fontWeight: '600',
    marginLeft: 8,
    fontSize: 14,
  },
});

export default React.memo(CreditSummaryCard);
