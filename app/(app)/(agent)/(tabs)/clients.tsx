import React, { useState } from "react";
import { StyleSheet, Text, View, FlatList, TouchableOpacity, TextStyle } from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { useAgentStore } from "@/store/agentStore";
import Colors from "@/constants/colors";
import ClientCard from "@/components/ClientCard";
import Input from "@/components/Input";
import { Search, UserPlus } from "lucide-react-native";
import { Client } from "@/types/agent";
import { isBookingInactive } from "@/utils/bookingUtils";

export default function AgentClientsScreen() {
  const router = useRouter();
  const { clients, getBookingsByClient, isLoading, error, agent, fetchClients } = useAgentStore();
  const [searchQuery, setSearchQuery] = useState("");

  // Refresh data when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      if (agent?.id) {
        fetchClients();
      }
    }, [agent?.id, fetchClients])
  );

  const filteredClients = (clients || []).filter((client: Client) => {
    if (!searchQuery) return true;

    const query = searchQuery.toLowerCase();
    return (
      client.name.toLowerCase().includes(query) ||
      client.email.toLowerCase().includes(query) ||
      client.phone.includes(query)
    );
  });

  const handleClientPress = (client: Client) => {
    router.push(`../client/${client.id}`);
  };

  const getInactiveBookingsCount = (clientId: string) => {
    const clientBookings = getBookingsByClient(clientId);
    return clientBookings.filter(isBookingInactive).length;
  };

  const getTotalBookingsCount = () => {
    // Calculate total bookings across all clients (including modified)
    return (clients || []).reduce((sum: number, client: Client) => {
      const clientBookings = getBookingsByClient(client.id);
      return sum + clientBookings.length;
    }, 0);
  };

  const handleAddClient = () => {
    router.push("../client/add");
  };


  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.searchContainer}>
          <Input
            value={searchQuery}
            onChangeText={setSearchQuery}
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

      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{(clients || []).length}</Text>
          <Text style={styles.statLabel}>Total Clients</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>
            {getTotalBookingsCount()}
          </Text>
          <Text style={styles.statLabel}>Total Bookings</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>
            {(clients || []).length > 0 ? (getTotalBookingsCount() / (clients || []).length).toFixed(1) : '0'}
          </Text>
          <Text style={styles.statLabel}>Avg. Bookings</Text>
        </View>
      </View>

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Error: {error}</Text>
        </View>
      )}

      {isLoading ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Loading clients...</Text>
        </View>
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
            {clients?.length === 0 ? 'No clients found for this agent' : 'No clients match your search'}
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