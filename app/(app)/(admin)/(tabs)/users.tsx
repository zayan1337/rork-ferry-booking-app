import React, { useState } from "react";
import { FlatList, Platform, StyleSheet, View } from "react-native";
import { Stack } from "expo-router";
import { colors } from "@/constants/adminColors";
import { mockUsers } from "@/mocks/adminData";
import { User } from "@/types/admin";
import UserItem from "@/components/admin/UserItem";
import SearchBar from "@/components/admin/SearchBar";
import EmptyState from "@/components/admin/EmptyState";
import { Filter, Plus, Users as UsersIcon } from "lucide-react-native";
import Button from "@/components/admin/Button";

export default function UsersScreen() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const filteredUsers = mockUsers.filter(
    (user) =>
      user.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleRefresh = () => {
    setIsRefreshing(true);
    // Simulate refresh
    setTimeout(() => {
      setIsRefreshing(false);
    }, 1500);
  };

  const handleUserPress = (user: User) => {
    // Navigate to user details
    console.log("User pressed:", user.id);
  };

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: "Users",
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
          placeholder="Search users..."
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
        data={filteredUsers}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <UserItem user={item} onPress={() => handleUserPress(item)} />
        )}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        onRefresh={handleRefresh}
        refreshing={isRefreshing}
        ListEmptyComponent={
          <EmptyState
            icon={<UsersIcon size={48} color={colors.textSecondary} />}
            title="No Users Found"
            message={
              searchQuery
                ? "We couldn't find any users matching your search."
                : "There are no users in the system yet."
            }
            action={
              <Button
                title="Add User"
                variant="primary"
                icon={<Plus size={18} color="#FFFFFF" />}
                onPress={() => {/* Navigate to add user */ }}
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