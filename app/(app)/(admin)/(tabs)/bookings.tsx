import React, { useState } from "react";
import { FlatList, Platform, StyleSheet, View } from "react-native";
import { Stack } from "expo-router";
import { colors } from "@/constants/adminColors";
import { mockBookings } from "@/mocks/adminData";
import { Booking } from "@/types/admin";
import BookingItem from "@/components/admin/BookingItem";
import SearchBar from "@/components/admin/SearchBar";
import EmptyState from "@/components/admin/EmptyState";
import { CreditCard, Filter, Plus } from "lucide-react-native";
import Button from "@/components/admin/Button";

export default function BookingsScreen() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const filteredBookings = mockBookings.filter(
    (booking) =>
      booking.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      booking.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      booking.routeName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleRefresh = () => {
    setIsRefreshing(true);
    // Simulate refresh
    setTimeout(() => {
      setIsRefreshing(false);
    }, 1500);
  };

  const handleBookingPress = (booking: Booking) => {
    // Navigate to booking details
    console.log("Booking pressed:", booking.id);
  };

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: "Bookings",
          headerRight: () => (
            <View style={styles.headerRight}>
              <Plus size={24} color={colors.text} />
            </View>
          ),
        }}
      />

      <View style={styles.searchContainer}>
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search bookings..."
        />
        <Button
          title="Filter"
          variant="outline"
          size="medium"
          icon={<Filter size={18} color={colors.primary} />}
          onPress={() => {/* Show filter modal */ }}
        />
      </View>

      <FlatList
        data={filteredBookings}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <BookingItem booking={item} onPress={() => handleBookingPress(item)} />
        )}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        onRefresh={handleRefresh}
        refreshing={isRefreshing}
        ListEmptyComponent={
          <EmptyState
            icon={<CreditCard size={48} color={colors.textSecondary} />}
            title="No Bookings Found"
            message={
              searchQuery
                ? "We couldn't find any bookings matching your search."
                : "There are no bookings in the system yet."
            }
            action={
              <Button
                title="Create Booking"
                variant="primary"
                icon={<Plus size={18} color="#FFFFFF" />}
                onPress={() => {/* Navigate to create booking */ }}
              />
            }
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
    padding: 16,
  },
  headerRight: {
    marginRight: 16,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  listContent: {
    paddingBottom: Platform.OS === "ios" ? 120 : 100,
  },
});