import React from "react";
import { StyleSheet, Text, View, FlatList, TouchableOpacity } from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import Colors from "@/constants/colors";
import ClientCard from "@/components/ClientCard";
import Input from "@/components/Input";
import { Search, UserPlus } from "lucide-react-native";
import type { Client } from "@/types/agent";
import { getClientInactiveBookingsCount, getTotalBookingsAcrossClients } from "@/utils/agentUtils";
import { useAgentData } from "@/hooks/useAgentData";
import { useAgentClientSearch } from "@/hooks/useAgentClientSearch";
import { SkeletonClientsList } from "@/components/skeleton";

export default function AgentClientsScreen() {
  const router = useRouter();
  const {
    agent,
    clients,
    isLoadingClients,
    error,
    refreshClients
  } = useAgentData();

  const {
    searchQuery,
    filteredClients,
    updateSearchQuery,
    searchStats
  } = useAgentClientSearch(clients);

  // Refresh data when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      if (agent?.id) {
        refreshClients();
      }
    }, [agent?.id, refreshClients])
  );

  const handleClientPress = (client: Client) => {
    router.push(`../client/${client.id}`);
  };

  const getInactiveBookingsCount = (clientId: string) => {
    // This would need the bookings array - for now return 0
    // In a real implementation, you'd pass bookings from useAgentData
    return 0;
  };

  const handleAddClient = () => {
    router.push("../client/add");
  };

  return (
    <View style={styles.container}>
      {/* Static Header - Always visible */}
      <View style={styles.header}>
        <View style={styles.searchContainer}>
          <Input
            value={searchQuery}
            onChangeText={updateSearchQuery}
            placeholder="Search clients..."
            style={styles.searchInput}
            inputStyle={styles.searchInputText}
          />
          <Search size={20} color={Colors.subtext} style={styles.searchIcon} />
        </View>
        <TouchableOpacity
          style={styles.addClientButton}
          onPress={handleAddClient}
        >
          <UserPlus size={20} color="white" />
        </TouchableOpacity>
      </View>

      {/* Static Stats - Always visible */}
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{searchStats.totalClients}</Text>
          <Text style={styles.statLabel}>Total Clients</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>
            {clients.reduce((sum, client) => sum + (client.bookingsCount || 0), 0)}
          </Text>
          <Text style={styles.statLabel}>Total Bookings</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>
            {searchStats.totalClients > 0
              ? (clients.reduce((sum, client) => sum + (client.bookingsCount || 0), 0) / searchStats.totalClients).toFixed(1)
              : '0'}
          </Text>
          <Text style={styles.statLabel}>Avg. Bookings</Text>
        </View>
      </View>

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Error: {error}</Text>
        </View>
      )}

      {/* Dynamic Content - Show skeleton only for the list */}
      {isLoadingClients ? (
        <SkeletonClientsList count={7} delay={0} />
      ) : filteredClients.length > 0 ? (
        <FlatList
          data={filteredClients}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ClientCard
              client={item}
              onPress={handleClientPress}
              inactiveBookingsCount={getInactiveBookingsCount(item.id)}
            />
          )}
          contentContainerStyle={styles.clientsList}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            {searchStats.totalClients === 0 ? 'No clients found for this agent' : 'No clients match your search'}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: "row",
    padding: 16,
    paddingBottom: 8,
  },
  searchContainer: {
    flex: 1,
    position: "relative",
  },
  searchInput: {
    marginBottom: 0,
  },
  searchInputText: {
    paddingLeft: 40,
  },
  searchIcon: {
    position: "absolute",
    left: 12,
    top: 10,
  },
  addClientButton: {
    backgroundColor: Colors.primary,
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 12,
  },
  statsContainer: {
    flexDirection: "row",
    backgroundColor: Colors.card,
    margin: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statValue: {
    fontSize: 20,
    fontWeight: "700",
    color: Colors.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.subtext,
  },
  statDivider: {
    width: 1,
    backgroundColor: Colors.border,
    marginHorizontal: 8,
  },
  clientsList: {
    padding: 16,
    paddingTop: 0,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  emptyText: {
    fontSize: 16,
    color: Colors.subtext,
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    margin: 16,
    padding: 16,
    borderRadius: 8,
    borderColor: '#f44336',
    borderWidth: 1,
  },
  errorText: {
    fontSize: 14,
    color: '#d32f2f',
  },
});