import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { colors } from "@/constants/adminColors";

type FilterRole = "all" | "admin" | "agent" | "customer" | "passenger";

interface FilterTabsProps {
  filterRole: FilterRole;
  onRoleChange: (role: FilterRole) => void;
  getCount: (role: FilterRole) => number;
}

const FilterTabs: React.FC<FilterTabsProps> = ({
  filterRole,
  onRoleChange,
  getCount,
}) => {
  const roles: FilterRole[] = [
    "all",
    "admin",
    "agent",
    "customer",
    "passenger",
  ];

  return (
    <View style={styles.filterTabs}>
      {roles.map((role) => (
        <TouchableOpacity
          key={role}
          style={[
            styles.filterTab,
            filterRole === role && styles.filterTabActive,
          ]}
          onPress={() => onRoleChange(role)}
        >
          <Text
            style={[
              styles.filterTabText,
              filterRole === role && styles.filterTabTextActive,
            ]}
          >
            {role.charAt(0).toUpperCase() + role.slice(1)}
          </Text>
          <Text
            style={[
              styles.filterTabCount,
              filterRole === role && styles.filterTabCountActive,
            ]}
          >
            {getCount(role)}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  filterTabs: {
    flexDirection: "row",
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 8,
    alignItems: "center",
  },
  filterTabActive: {
    backgroundColor: colors.primary + "15",
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.textSecondary,
    marginBottom: 2,
  },
  filterTabTextActive: {
    color: colors.primary,
  },
  filterTabCount: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  filterTabCountActive: {
    color: colors.primary,
  },
});

export default FilterTabs;
