import React from "react";
import { View, StyleSheet } from "react-native";
import { Filter, ArrowUpDown } from "lucide-react-native";
import { colors } from "@/constants/adminColors";
import SearchBar from "@/components/admin/SearchBar";
import Button from "@/components/admin/Button";

interface SearchAndFilterBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onFilterPress: () => void;
  onSortPress: () => void;
  isTablet: boolean;
}

const SearchAndFilterBar: React.FC<SearchAndFilterBarProps> = ({
  searchQuery,
  onSearchChange,
  onFilterPress,
  onSortPress,
  isTablet,
}) => {
  return (
    <View style={styles.searchContainer}>
      <View style={styles.searchWrapper}>
        <SearchBar
          value={searchQuery}
          onChangeText={onSearchChange}
          placeholder="Search by name, email, phone, or ID..."
        />
      </View>
      <Button
        title=""
        variant="outline"
        size={isTablet ? "large" : "medium"}
        icon={<Filter size={isTablet ? 20 : 18} color={colors.primary} />}
        onPress={onFilterPress}
      />
      <Button
        title=""
        variant="outline"
        size={isTablet ? "large" : "medium"}
        icon={<ArrowUpDown size={isTablet ? 20 : 18} color={colors.primary} />}
        onPress={onSortPress}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  searchWrapper: {
    flex: 1,
  },
});

export default SearchAndFilterBar;
