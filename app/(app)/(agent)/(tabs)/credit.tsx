import React from "react";
import { StyleSheet, Text, View, FlatList, TouchableOpacity } from "react-native";
import Colors from "@/constants/colors";
import Card from "@/components/Card";
import CreditTransactionCard from "@/components/CreditTransactionCard";
import { CreditCard, ArrowUp, ArrowDown, RefreshCw } from "lucide-react-native";
import { formatCurrency } from "@/utils/currencyUtils";
import { getCreditUtilization, isAgentCreditLow } from "@/utils/agentUtils";
import { useAgentData } from "@/hooks/useAgentData";
import { SkeletonCreditTransactionsList } from "@/components/skeleton";

export default function AgentCreditScreen() {
  const { agent, creditTransactions, isLoadingCredit } = useAgentData();

  const handleRequestCredit = () => {
    alert("Credit request functionality would be implemented here");
    // Credit request functionality would be implemented here
  };

  const creditUtilization = getCreditUtilization(agent);
  const isCreditLow = isAgentCreditLow(agent);

  return (
    <View style={styles.container}>
      {/* Static Credit Summary - Always visible */}
      <View style={styles.creditSummaryContainer}>
        <Card variant="elevated" style={styles.creditSummaryCard}>
          <View style={styles.creditBalanceContainer}>
            <CreditCard size={24} color={Colors.primary} />
            <View style={styles.creditBalanceTextContainer}>
              <Text style={styles.creditBalanceLabel}>Current Credit Balance</Text>
              <Text style={styles.creditBalanceValue}>
                {formatCurrency(agent?.creditBalance || 0)}
              </Text>
            </View>
          </View>

          <View style={styles.creditLimitContainer}>
            <View style={styles.creditLimitBar}>
              <View
                style={[
                  styles.creditLimitFill,
                  {
                    width: `${creditUtilization}%`,
                    backgroundColor: isCreditLow ? Colors.error : Colors.primary
                  }
                ]}
              />
            </View>
            <Text style={styles.creditLimitText}>
              Credit Ceiling: {formatCurrency(agent?.creditCeiling || 0)}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.requestCreditButton}
            onPress={handleRequestCredit}
          >
            <RefreshCw size={16} color="white" />
            <Text style={styles.requestCreditText}>Request More Credit</Text>
          </TouchableOpacity>
        </Card>
      </View>

      {/* Static Transaction Summary - Always visible */}
      <View style={styles.transactionSummaryContainer}>
        <View style={styles.transactionSummaryCard}>
          <View style={styles.transactionSummaryItem}>
            <View style={[styles.transactionIcon, { backgroundColor: `${Colors.success}20` }]}>
              <ArrowUp size={16} color={Colors.success} />
            </View>
            <View>
              <Text style={styles.transactionLabel}>Credit Added</Text>
              <Text style={[styles.transactionValue, { color: Colors.success }]}>
                {formatCurrency(
                  creditTransactions
                    .filter(t => t.type === "refill")
                    .reduce((sum, t) => sum + t.amount, 0)
                )}
              </Text>
            </View>
          </View>
          <View style={styles.transactionSummaryDivider} />
          <View style={styles.transactionSummaryItem}>
            <View style={[styles.transactionIcon, { backgroundColor: `${Colors.error}20` }]}>
              <ArrowDown size={16} color={Colors.error} />
            </View>
            <View>
              <Text style={styles.transactionLabel}>Credit Used</Text>
              <Text style={[styles.transactionValue, { color: Colors.error }]}>
                {formatCurrency(
                  creditTransactions
                    .filter(t => t.type === "deduction")
                    .reduce((sum, t) => sum + t.amount, 0)
                )}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Static Header - Always visible */}
      <View style={styles.transactionsHeader}>
        <Text style={styles.transactionsTitle}>Transaction History</Text>
      </View>

      {/* Dynamic Content - Show skeleton only for initial load when no data */}
      {isLoadingCredit && (!creditTransactions || creditTransactions.length === 0) ? (
        <SkeletonCreditTransactionsList count={8} delay={0} />
      ) : (
        <FlatList
          data={creditTransactions}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <CreditTransactionCard transaction={item} />}
          contentContainerStyle={styles.transactionsList}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  creditSummaryContainer: {
    padding: 16,
    paddingBottom: 0,
  },
  creditSummaryCard: {
    marginBottom: 16,
  },
  creditBalanceContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  creditBalanceTextContainer: {
    marginLeft: 12,
  },
  creditBalanceLabel: {
    fontSize: 14,
    color: Colors.subtext,
  },
  creditBalanceValue: {
    fontSize: 24,
    fontWeight: "700",
    color: Colors.text,
  },
  creditLimitContainer: {
    marginBottom: 16,
  },
  creditLimitBar: {
    height: 8,
    backgroundColor: Colors.border,
    borderRadius: 4,
    marginBottom: 8,
    overflow: "hidden",
  },
  creditLimitFill: {
    height: "100%",
    borderRadius: 4,
  },
  creditLimitText: {
    fontSize: 12,
    color: Colors.subtext,
    textAlign: "right",
  },
  requestCreditButton: {
    backgroundColor: Colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 8,
  },
  requestCreditText: {
    color: "white",
    fontWeight: "600",
    marginLeft: 8,
  },
  transactionSummaryContainer: {
    padding: 16,
    paddingBottom: 0,
  },
  transactionSummaryCard: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  transactionSummaryItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  transactionIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  transactionLabel: {
    fontSize: 12,
    color: Colors.subtext,
  },
  transactionValue: {
    fontSize: 16,
    fontWeight: "600",
  },
  transactionSummaryDivider: {
    width: 1,
    height: "80%",
    backgroundColor: Colors.border,
    marginHorizontal: 16,
  },
  transactionsHeader: {
    padding: 16,
    paddingBottom: 8,
  },
  transactionsTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: Colors.text,
  },
  transactionsList: {
    padding: 16,
    paddingTop: 0,
  },
});