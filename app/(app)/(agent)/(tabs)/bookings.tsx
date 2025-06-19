import React, { useState } from "react";
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, FlatList } from "react-native";
import { useRouter } from "expo-router";
import { useAgentStore } from "@/store/agentStore";
import Colors from "@/constants/colors";
import AgentBookingCard from "@/components/AgentBookingCard";
import Button from "@/components/Button";
import { Plus, Search } from "lucide-react-native";
import Input from "@/components/Input";
import { Booking } from "@/types/agent";

export default function AgentBookingsScreen() {
  const router = useRouter();
  const { bookings } = useAgentStore();
  const [activeTab, setActiveTab] = useState<"all" | "confirmed" | "completed" | "cancelled">("all");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredBookings = bookings.filter((booking) => {
    // Filter by status
    if (activeTab !== "all" && booking.status !== activeTab) {
      return false;
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        booking.clientName.toLowerCase().includes(query) ||
        booking.origin.toLowerCase().includes(query) ||
        booking.destination.toLowerCase().includes(query) ||
        booking.id.toLowerCase().includes(query)
      );
    }

    return true;
  });

  // Sort bookings by date (most recent first)
  const sortedBookings = [...filteredBookings].sort((a, b) =>
    new Date(b.bookingDate).getTime() - new Date(a.bookingDate).getTime()
  );

  const handleBookingPress = (booking: Booking) => {
    router.push(`../booking/${booking.id}` as any);
  };

  const handleNewBooking = () => {
    router.push("../booking/new" as any);
  };

  const tabs = [
    { key: "all", label: "All" },
    { key: "confirmed", label: "Confirmed" },
    { key: "completed", label: "Completed" },
    { key: "cancelled", label: "Cancelled" },
  ];



  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.searchContainer}>
          <Input
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search bookings..."
            style={styles.searchInput}
            inputStyle={styles.searchInputText}
          />
          <Search size={20} color={Colors.subtext} style={styles.searchIcon} />
        </View>
        <TouchableOpacity
          style={styles.newBookingButton}
          onPress={handleNewBooking}
        >
          <Plus size={20} color="white" />
        </TouchableOpacity>
      </View>

      <View style={styles.tabsContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
        >
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[
                styles.tab,
                activeTab === tab.key && styles.activeTab,
              ]}
              onPress={() => setActiveTab(tab.key as any)}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === tab.key && styles.activeTabText,
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
      {sortedBookings.length > 0 ? (
        <FlatList
          data={sortedBookings}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <AgentBookingCard
              booking={item}
              onPress={() => handleBookingPress(item)}
            />
          )}
          contentContainerStyle={styles.bookingsList}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No bookings found</Text>
          <Button
            title="Create a Booking"
            onPress={handleNewBooking}
            variant="primary"
            style={styles.emptyButton}
          />
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
  newBookingButton: {
    backgroundColor: Colors.primary,
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 12,
  },
  tabsContainer: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  activeTab: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  tabText: {
    color: Colors.text,
    fontWeight: "500",
  },
  activeTabText: {
    color: "white",
  },
  bookingsList: {
    padding: 16,
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
    marginBottom: 16,
  },
  emptyButton: {
    minWidth: 200,
  },
});