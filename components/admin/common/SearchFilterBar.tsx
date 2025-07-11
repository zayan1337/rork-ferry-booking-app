import React from "react";
import {
    StyleSheet,
    View,
} from "react-native";
import SearchBar from "@/components/admin/SearchBar";
import Button from "@/components/admin/Button";

interface FilterAction {
    icon: React.ReactNode;
    onPress: () => void;
    variant?: "primary" | "outline" | "ghost";
    size?: "small" | "medium" | "large";
    title?: string;
}

interface SearchFilterBarProps {
    // Search
    searchValue: string;
    onSearchChange: (value: string) => void;
    searchPlaceholder?: string;

    // Filter actions
    filterActions?: FilterAction[];

    // Additional actions
    rightActions?: FilterAction[];

    // Styling
    style?: any;
}

export default function SearchFilterBar({
    searchValue,
    onSearchChange,
    searchPlaceholder = "Search...",
    filterActions = [],
    rightActions = [],
    style,
}: SearchFilterBarProps) {
    return (
        <View style={[styles.searchContainer, style]}>
            <View style={styles.searchWrapper}>
                <SearchBar
                    value={searchValue}
                    onChangeText={onSearchChange}
                    placeholder={searchPlaceholder}
                />
            </View>

            {/* Filter Actions */}
            {filterActions.map((action, index) => (
                <Button
                    key={`filter-${index}`}
                    title={action.title || ""}
                    variant={action.variant || "outline"}
                    size={action.size || "medium"}
                    icon={action.icon}
                    onPress={action.onPress}
                />
            ))}

            {/* Right Actions */}
            {rightActions.map((action, index) => (
                <Button
                    key={`right-${index}`}
                    title={action.title || ""}
                    variant={action.variant || "outline"}
                    size={action.size || "medium"}
                    icon={action.icon}
                    onPress={action.onPress}
                />
            ))}
        </View>
    );
}

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