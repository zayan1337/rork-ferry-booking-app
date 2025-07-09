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
import { getClientInactiveBookingsCount } from "@/utils/agentUtils";

export default function AgentClientsScreen() {
  const router = useRouter();
  const {
    agent,
    clients,
    bookings,
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

  // Function to recalculate client booking counts from actual bookings data
  const getClientTotalBookingsCount = React.useCallback((clientId: string) => {
    if (!bookings || bookings.length === 0) return 0;

    return bookings.filter(booking => {
      // Handle both types of client matching
      return booking.clientId === clientId ||
        booking.userId === clientId ||
        booking.agentClientId === clientId;
    }).length;
  }, [bookings]);

  // Function to get client's last booking date
  const getClientLastBookingDate = React.useCallback((clientId: string) => {
    if (!bookings || bookings.length === 0) return undefined;

    const clientBookings = bookings.filter(booking => {
      return booking.clientId === clientId ||
        booking.userId === clientId ||
        booking.agentClientId === clientId;
    });

    if (clientBookings.length === 0) return undefined;

    // Sort by booking date (most recent first) and get the latest
    const sortedBookings = clientBookings.sort((a, b) => {
      const dateA = new Date(a.bookingDate);
      const dateB = new Date(b.bookingDate);
      return dateB.getTime() - dateA.getTime();
    });

    return sortedBookings[0].bookingDate;
  }, [bookings]);

  // Function to get client's total revenue
  const getClientTotalRevenue = React.useCallback((clientId: string) => {
    if (!bookings || bookings.length === 0) return 0;

    const clientBookings = bookings.filter(booking => {
      return booking.clientId === clientId ||
        booking.userId === clientId ||
        booking.agentClientId === clientId;
    });

    return clientBookings.reduce((total, booking) => {
      // Use totalAmount or discountedAmount, fallback to 0
      const amount = booking.totalAmount || booking.discountedAmount || 0;
      return total + amount;
    }, 0);
  }, [bookings]);

  // Update clients data with corrected booking counts
  const clientsWithCorrectCounts = React.useMemo(() => {
    if (!clients || !bookings) return clients || [];

    return clients.map(client => {
      const actualBookingsCount = getClientTotalBookingsCount(client.id);

      // Only update if there's a mismatch
      if (client.bookingsCount !== actualBookingsCount) {
        return {
          ...client,
          bookingsCount: actualBookingsCount
        };
      }

      return client;
    });
  }, [clients, bookings, getClientTotalBookingsCount]);

  const {
    searchQuery,
    filteredClients,
    updateSearchQuery,
    searchStats
  } = useAgentClientSearch(clientsWithCorrectCounts);

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

  const getInactiveBookingsCount = React.useCallback((clientId: string) => {
    if (!bookings || bookings.length === 0) return 0;
    return getClientInactiveBookingsCount(bookings, clientId);
  }, [bookings]);

  const handleAddClient = () => {
    router.push("../client/add");
  };

  // Enhanced renderItem function with additional client data
  const renderClientItem = React.useCallback(({ item }: { item: Client }) => {
    const lastBookingDate = getClientLastBookingDate(item.id);
    const totalRevenue = getClientTotalRevenue(item.id);
    const inactiveBookingsCount = getInactiveBookingsCount(item.id);

    return (
      <ClientCard
        client={item}
        onPress={handleClientPress}
        inactiveBookingsCount={inactiveBookingsCount}
        lastBookingDate={lastBookingDate}
        totalRevenue={totalRevenue}
      />
    );
  }, [handleClientPress, getInactiveBookingsCount, getClientLastBookingDate, getClientTotalRevenue]);

  // Calculate enhanced stats with proper average calculation
  const enhancedStats = {
    totalClients: searchStats.totalClients,
    filteredClients: filteredClients.length,
    averageBookings: clientsWithCorrectCounts && clientsWithCorrectCounts.length > 0
      ? clientsWithCorrectCounts.reduce((sum, client) => sum + (client.bookingsCount || 0), 0) / clientsWithCorrectCounts.length
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
        <SkeletonClientsList count={6} delay={0} />
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
          removeClippedSubviews={true}
          maxToRenderPerBatch={6}
          windowSize={6}
          initialNumToRender={6}
          showsVerticalScrollIndicator={false}
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