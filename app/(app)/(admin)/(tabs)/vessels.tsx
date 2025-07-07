import React, { useState } from "react";
import { FlatList, Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Stack } from "expo-router";
import { colors } from "@/constants/adminColors";
import { mockVessels } from "@/mocks/adminData";
import { Vessel } from "@/types/admin";
import SearchBar from "@/components/admin/SearchBar";
import EmptyState from "@/components/admin/EmptyState";
import { Anchor, Filter, MapPin, Plus, Ship } from "lucide-react-native";
import Button from "@/components/admin/Button";
import StatusBadge from "@/components/admin/StatusBadge";

function VesselItem({ vessel, onPress }: { vessel: Vessel; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.vesselCard} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.vesselHeader}>
        <View style={styles.vesselIconContainer}>
          <Ship size={24} color={colors.primary} />
        </View>
        <StatusBadge status={vessel.status} size="small" />
      </View>

      <Text style={styles.vesselName}>{vessel.name}</Text>
      <Text style={styles.vesselCapacity}>Capacity: {vessel.capacity} passengers</Text>

      {vessel.currentLocation && (
        <View style={styles.locationContainer}>
          <MapPin size={16} color={colors.textSecondary} />
          <Text style={styles.locationText}>
            {vessel.currentLocation.latitude.toFixed(6)}, {vessel.currentLocation.longitude.toFixed(6)}
          </Text>
        </View>
      )}

      <View style={styles.vesselFooter}>
        <Button
          title="Track"
          variant="outline"
          size="small"
          icon={<MapPin size={16} color={colors.primary} />}
          onPress={() => {/* Open tracking */ }}
        />
        <Button
          title="Manage"
          variant="primary"
          size="small"
          icon={<Anchor size={16} color="#FFFFFF" />}
          onPress={() => {/* Open vessel management */ }}
        />
      </View>
    </TouchableOpacity>
  );
}

export default function VesselsScreen() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const filteredVessels = mockVessels.filter(
    (vessel) =>
      vessel.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      vessel.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleRefresh = () => {
    setIsRefreshing(true);
    // Simulate refresh
    setTimeout(() => {
      setIsRefreshing(false);
    }, 1500);
  };

  const handleVesselPress = (vessel: Vessel) => {
    // Navigate to vessel details
    console.log("Vessel pressed:", vessel.id);
  };

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: "Vessels",
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
          placeholder="Search vessels..."
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
        data={filteredVessels}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <VesselItem vessel={item} onPress={() => handleVesselPress(item)} />
        )}
        numColumns={2}
        columnWrapperStyle={styles.vesselGrid}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        onRefresh={handleRefresh}
        refreshing={isRefreshing}
        ListEmptyComponent={
          <EmptyState
            icon={<Ship size={48} color={colors.textSecondary} />}
            title="No Vessels Found"
            message={
              searchQuery
                ? "We couldn't find any vessels matching your search."
                : "There are no vessels in the system yet."
            }
            action={
              <Button
                title="Add Vessel"
                variant="primary"
                icon={<Plus size={18} color="#FFFFFF" />}
                onPress={() => {/* Navigate to add vessel */ }}
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
  vesselGrid: {
    justifyContent: "space-between",
    marginBottom: 16,
  },
  vesselCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    width: "48%",
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 1,
  },
  vesselHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  vesselIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primaryLight,
    justifyContent: "center",
    alignItems: "center",
  },
  vesselName: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
    marginBottom: 4,
  },
  vesselCapacity: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 12,
  },
  locationContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  locationText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginLeft: 6,
  },
  vesselFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
});