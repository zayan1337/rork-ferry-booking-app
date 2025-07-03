import React from "react";
import { StyleSheet, Text, View, FlatList, RefreshControl } from "react-native";
import { ArrowUp, ArrowDown } from "lucide-react-native";

import Colors from "@/constants/colors";
import CreditTransactionCard from "@/components/CreditTransactionCard";
import { CreditSummaryCard } from "@/components/agent";
import { SkeletonCreditTransactionsList } from "@/components/skeleton";

import { useAgentData } from "@/hooks/useAgentData";
import { useRefreshControl } from "@/hooks/useRefreshControl";
import { formatCurrency, calculateCreditSummary } from "@/utils/agentFormatters";

export default function AgentCreditScreen() {
  const { agent, creditTransactions, isLoadingCredit, refreshCreditTransactions } = useAgentData();
  
  const { isRefreshing, onRefresh } = useRefreshControl({
    onRefresh: refreshCreditTransactions
  });

  const handleRequestCredit = () => {
    alert("Credit request functionality would be implemented here");
    // Credit request functionality would be implemented here
  };

  const creditSummary = calculateCreditSummary(agent, creditTransactions);

  // Stable renderItem function for better FlatList performance
  const renderTransactionItem = React.useCallback(({ item }: { item: any }) => (
    <CreditTransactionCard transaction={item} />
  ), []);

  return (
    <View style={styles.container}>
      {/* Credit Summary Card */}
      <View style={styles.creditSummaryContainer}>
        <CreditSummaryCard 
          agent={agent}
          transactions={creditTransactions}
          onRequestCredit={handleRequestCredit}
        />
      </View>

      {/* Transaction Summary Card */}
      <View style={styles.transactionSummaryContainer}>
        <View style={styles.transactionSummaryCard}>
          <View style={styles.transactionSummaryItem}>
            <View style={[styles.transactionIcon, { backgroundColor: `${Colors.success}20` }]}>
              <ArrowUp size={16} color={Colors.success} />
            </View>
            <View>
              <Text style={styles.transactionLabel}>Credit Added</Text>
              <Text style={[styles.transactionValue, { color: Colors.success }]}>
                {formatCurrency(creditSummary.totalCreditAdded)}
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
                {formatCurrency(creditSummary.totalCreditUsed)}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Transaction History Header */}
      <View style={styles.transactionsHeader}>
        <Text style={styles.transactionsTitle}>Transaction History</Text>
      </View>

      {/* Transaction List */}
      {isLoadingCredit && (!creditTransactions || creditTransactions.length === 0) ? (
        <SkeletonCreditTransactionsList count={8} delay={0} />
      ) : (
        <FlatList
          data={creditTransactions}
          keyExtractor={(item) => item.id}
          renderItem={renderTransactionItem}
          contentContainerStyle={styles.transactionsList}
          refreshControl={
            <RefreshControl 
              refreshing={isRefreshing} 
              onRefresh={onRefresh}
              colors={[Colors.primary]}
              tintColor={Colors.primary}
            />
          }
          getItemLayout={(data, index) => (
            { length: 100, offset: 100 * index, index }
          )}
          removeClippedSubviews={true}
          maxToRenderPerBatch={12}
          windowSize={12}
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