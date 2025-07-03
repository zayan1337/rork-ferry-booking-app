import React from "react";
import { StyleSheet, Text, View, FlatList, TouchableOpacity, RefreshControl } from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { Search, UserPlus } from "lucide-react-native";

import Colors from "@/constants/colors";
import ClientCard from "@/components/ClientCard";
import Input from "@/components/Input";
import { AgentStatsCard } from "@/components/agent";
import { SkeletonClientsList } from "@/components/skeleton";

import type { Client } from "@/types/agent";
import { useAgentData } from "@/hooks/useAgentData";
import { useAgentClientSearch } from "@/hooks/useAgentClientSearch";
import { useRefreshControl } from "@/hooks/useRefreshControl";

export default function AgentClientsScreen() {
  const router = useRouter();
  const {
    agent,
    clients,
    isLoadingClients,
    error,
    refreshClients
  } = useAgentData();

  const { isRefreshing, onRefresh } = useRefreshControl({
    onRefresh: async () => {
      if (agent?.id) {
        await refreshClients();
      }
    }
  });

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

  // Stable renderItem function for better FlatList performance
  const renderClientItem = React.useCallback(({ item }: { item: Client }) => (
    <ClientCard
      client={item}
      onPress={handleClientPress}
      inactiveBookingsCount={getInactiveBookingsCount(item.id)}
    />
  ), [handleClientPress, getInactiveBookingsCount]);

  // Calculate enhanced stats
  const enhancedStats = {
    totalClients: searchStats.totalClients,
    filteredClients: filteredClients.length,
    averageBookings: searchStats.totalClients > 0
      ? clients.reduce((sum, client) => sum + (client.bookingsCount || 0), 0) / searchStats.totalClients
      : 0,
  };

  return (
    <View style={styles.container}>
      {/* Search Header */}
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

      {/* Client Stats */}
      <AgentStatsCard stats={enhancedStats} />

      {/* Error Display */}
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Error: {error}</Text>
        </View>
      )}

      {/* Client List */}
      {isLoadingClients && (!clients || clients.length === 0) ? (
        <SkeletonClientsList count={7} delay={0} />
      ) : filteredClients.length > 0 ? (
        <FlatList
          data={filteredClients}
          keyExtractor={(item) => item.id}
          renderItem={renderClientItem}
          contentContainerStyle={styles.clientsList}
          refreshControl={
            <RefreshControl 
              refreshing={isRefreshing} 
              onRefresh={onRefresh}
              colors={[Colors.primary]}
              tintColor={Colors.primary}
            />
          }
          getItemLayout={(data, index) => (
            { length: 120, offset: 120 * index, index }
          )}
          removeClippedSubviews={true}
          maxToRenderPerBatch={8}
          windowSize={8}
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