import React, { useState } from "react";
import { Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Stack } from "expo-router";
import { colors } from "@/constants/adminColors";
import {
  BarChart,
  Calendar,
  ChevronDown,
  CreditCard,
  Download,
  LineChart,
  PieChart,
  Ship,
  Users
} from "lucide-react-native";
import Button from "@/components/admin/Button";
import SectionHeader from "@/components/admin/SectionHeader";

const ReportCard = ({
  title,
  icon,
  description,
  onPress
}: {
  title: string;
  icon: React.ReactNode;
  description: string;
  onPress: () => void;
}) => {
  return (
    <TouchableOpacity style={styles.reportCard} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.reportIconContainer}>{icon}</View>
      <Text style={styles.reportTitle}>{title}</Text>
      <Text style={styles.reportDescription}>{description}</Text>
      <View style={styles.reportFooter}>
        <Button
          title="Generate"
          variant="primary"
          size="small"
          icon={<Download size={16} color="#FFFFFF" />}
          onPress={onPress}
        />
      </View>
    </TouchableOpacity>
  );
};

export default function ReportsScreen() {
  const [selectedPeriod, setSelectedPeriod] = useState("This Month");
  const [showPeriodDropdown, setShowPeriodDropdown] = useState(false);

  const periods = ["Today", "This Week", "This Month", "Last Month", "Custom Range"];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      <Stack.Screen
        options={{
          title: "Reports",
        }}
      />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Generate Reports</Text>
        <View style={styles.periodSelector}>
          <TouchableOpacity
            style={styles.periodButton}
            onPress={() => setShowPeriodDropdown(!showPeriodDropdown)}
          >
            <Text style={styles.periodText}>{selectedPeriod}</Text>
            <ChevronDown size={18} color={colors.text} />
          </TouchableOpacity>

          {showPeriodDropdown && (
            <View style={styles.periodDropdown}>
              {periods.map((period) => (
                <TouchableOpacity
                  key={period}
                  style={[
                    styles.periodOption,
                    selectedPeriod === period && styles.selectedPeriodOption,
                  ]}
                  onPress={() => {
                    setSelectedPeriod(period);
                    setShowPeriodDropdown(false);
                  }}
                >
                  <Text
                    style={[
                      styles.periodOptionText,
                      selectedPeriod === period && styles.selectedPeriodOptionText,
                    ]}
                  >
                    {period}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </View>

      <SectionHeader title="Financial Reports" />
      <View style={styles.reportGrid}>
        <ReportCard
          title="Revenue Report"
          icon={<BarChart size={24} color={colors.primary} />}
          description="Total income by route, payment method, and time period"
          onPress={() => {/* Generate revenue report */ }}
        />
        <ReportCard
          title="Refund Report"
          icon={<CreditCard size={24} color="#FF9500" />}
          description="Cancellations and refund impact on revenue"
          onPress={() => {/* Generate refund report */ }}
        />
      </View>

      <SectionHeader title="Operational Reports" />
      <View style={styles.reportGrid}>
        <ReportCard
          title="Booking Analytics"
          icon={<LineChart size={24} color={colors.secondary} />}
          description="Booking patterns, popular routes, and trends"
          onPress={() => {/* Generate booking analytics */ }}
        />
        <ReportCard
          title="Vessel Utilization"
          icon={<Ship size={24} color="#34C759" />}
          description="Vessel capacity usage and efficiency metrics"
          onPress={() => {/* Generate vessel utilization report */ }}
        />
      </View>

      <SectionHeader title="User Reports" />
      <View style={styles.reportGrid}>
        <ReportCard
          title="Customer Activity"
          icon={<Users size={24} color="#5856D6" />}
          description="Customer booking frequency and preferences"
          onPress={() => {/* Generate customer activity report */ }}
        />
        <ReportCard
          title="Agent Performance"
          icon={<PieChart size={24} color="#FF2D55" />}
          description="Agent bookings, revenue, and commission metrics"
          onPress={() => {/* Generate agent performance report */ }}
        />
      </View>

      <SectionHeader title="Schedule Reports" />
      <View style={styles.reportGrid}>
        <ReportCard
          title="Route Performance"
          icon={<BarChart size={24} color="#5AC8FA" />}
          description="Route popularity, revenue, and occupancy rates"
          onPress={() => {/* Generate route performance report */ }}
        />
        <ReportCard
          title="Seasonal Analysis"
          icon={<Calendar size={24} color="#FF9500" />}
          description="Peak and off-peak booking patterns by season"
          onPress={() => {/* Generate seasonal analysis */ }}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: Platform.OS === "ios" ? 120 : 100,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: colors.text,
  },
  periodSelector: {
    position: "relative",
  },
  periodButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  periodText: {
    fontSize: 14,
    color: colors.text,
    marginRight: 8,
  },
  periodDropdown: {
    position: "absolute",
    top: 40,
    right: 0,
    backgroundColor: colors.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    width: 160,
    zIndex: 10,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  periodOption: {
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  selectedPeriodOption: {
    backgroundColor: colors.primaryLight,
  },
  periodOptionText: {
    fontSize: 14,
    color: colors.text,
  },
  selectedPeriodOptionText: {
    color: colors.primary,
    fontWeight: "600",
  },
  reportGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  reportCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    width: "48%",
    marginBottom: 16,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 1,
  },
  reportIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.backgroundSecondary,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  reportTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
    marginBottom: 8,
  },
  reportDescription: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 16,
    height: 48,
  },
  reportFooter: {
    alignItems: "flex-start",
  },
});