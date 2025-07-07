import React, { useState } from "react";
import { FlatList, Platform, StyleSheet, View } from "react-native";
import { Stack } from "expo-router";
import { colors } from "@/constants/adminColors";
import { mockTrips } from "@/mocks/adminData";
import { Trip } from "@/types/admin";
import TripItem from "@/components/admin/TripItem";
import SearchBar from "@/components/admin/SearchBar";
import EmptyState from "@/components/admin/EmptyState";
import { Calendar, Filter, Plus } from "lucide-react-native";
import Button from "@/components/admin/Button";

export default function ScheduleScreen() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const filteredTrips = mockTrips.filter(
    (trip) =>
      trip.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      trip.routeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      trip.vesselName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleRefresh = () => {
    setIsRefreshing(true);
    // Simulate refresh
    setTimeout(() => {
      setIsRefreshing(false);
    }, 1500);
  };

  const handleTripPress = (trip: Trip) => {
    // Navigate to trip details
    console.log("Trip pressed:", trip.id);
  };

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: "Schedule",
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
          placeholder="Search trips..."
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
        data={filteredTrips}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TripItem trip={item} onPress={() => handleTripPress(item)} />
        )}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        onRefresh={handleRefresh}
        refreshing={isRefreshing}
        ListEmptyComponent={
          <EmptyState
            icon={<Calendar size={48} color={colors.textSecondary} />}
            title="No Trips Found"
            message={
              searchQuery
                ? "We couldn't find any trips matching your search."
                : "There are no trips scheduled in the system yet."
            }
            action={
              <Button
                title="Schedule Trip"
                variant="primary"
                icon={<Plus size={18} color="#FFFFFF" />}
                onPress={() => {/* Navigate to create trip */ }}
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