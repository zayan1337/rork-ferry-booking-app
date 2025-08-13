import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors } from "@/constants/adminColors";
import Button from "@/components/admin/Button";

interface BulkActionsBarProps {
  selectedCount: number;
  onActivate: () => void;
  onSuspend: () => void;
  onClear: () => void;
  canUpdateUsers: boolean;
}

const BulkActionsBar: React.FC<BulkActionsBarProps> = ({
  selectedCount,
  onActivate,
  onSuspend,
  onClear,
  canUpdateUsers,
}) => {
  if (selectedCount === 0) return null;

  return (
    <View style={styles.bulkActionsBar}>
      <Text style={styles.bulkActionsText}>
        {selectedCount} user(s) selected
      </Text>
      <View style={styles.bulkActionsButtons}>
        {canUpdateUsers && (
          <>
            <Button
              title="Activate"
              variant="primary"
              size="small"
              onPress={onActivate}
            />
            <Button
              title="Suspend"
              variant="danger"
              size="small"
              onPress={onSuspend}
            />
          </>
        )}
        <Button title="Clear" variant="ghost" size="small" onPress={onClear} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  bulkActionsBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: colors.primary + "10",
    borderWidth: 1,
    borderColor: colors.primary + "30",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  bulkActionsText: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.primary,
  },
  bulkActionsButtons: {
    flexDirection: "row",
    gap: 8,
  },
});

export default BulkActionsBar;
