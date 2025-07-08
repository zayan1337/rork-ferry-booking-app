import React, { useState } from "react";
import { StyleSheet, Text, View, ScrollView, TouchableOpacity } from "react-native";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { colors } from "@/constants/adminColors";
import { BarChart, FileText, TrendingUp, Calendar, Download, Filter } from "lucide-react-native";
import Button from "@/components/admin/Button";
import Card from "@/components/Card";

export default function ReportDetailsScreen() {
    const { type } = useLocalSearchParams<{ type: string }>();
    const [dateRange, setDateRange] = useState("last_30_days");

    const getReportInfo = () => {
        switch (type) {
            case "revenue":
                return {
                    title: "Revenue Analytics",
                    icon: <TrendingUp size={64} color={colors.success} />,
                    description: "Detailed revenue analysis and financial insights with comprehensive breakdowns by time period, routes, and customer segments.",
                    metrics: [
                        { label: "Total Revenue", value: "MVR 125,450", change: "+12.5%" },
                        { label: "Average Booking Value", value: "MVR 85", change: "+5.2%" },
                        { label: "Revenue Growth", value: "8.3%", change: "+2.1%" },
                        { label: "Top Route Revenue", value: "MVR 35,200", change: "+18.7%" }
                    ]
                };
            case "bookings":
                return {
                    title: "Booking Analytics",
                    icon: <BarChart size={64} color={colors.primary} />,
                    description: "Comprehensive booking statistics, trends, and customer behavior analysis with detailed insights into booking patterns.",
                    metrics: [
                        { label: "Total Bookings", value: "1,247", change: "+8.9%" },
                        { label: "Confirmed Bookings", value: "1,156", change: "+7.2%" },
                        { label: "Cancellation Rate", value: "7.3%", change: "-1.8%" },
                        { label: "Peak Booking Day", value: "Friday", change: "No change" }
                    ]
                };
            case "vessels":
                return {
                    title: "Fleet Performance",
                    icon: <FileText size={64} color={colors.secondary} />,
                    description: "Vessel utilization rates, maintenance schedules, and operational performance metrics with detailed fleet analytics.",
                    metrics: [
                        { label: "Fleet Utilization", value: "87.4%", change: "+4.1%" },
                        { label: "Active Vessels", value: "12", change: "No change" },
                        { label: "Maintenance Due", value: "2", change: "-1" },
                        { label: "Avg Trip Duration", value: "2.5 hrs", change: "-0.2hrs" }
                    ]
                };
            default:
                return {
                    title: "Report",
                    icon: <FileText size={64} color={colors.textSecondary} />,
                    description: "Report details and analytics.",
                    metrics: []
                };
        }
    };

    const reportInfo = getReportInfo();

    const dateRangeOptions = [
        { label: "Last 7 Days", value: "last_7_days" },
        { label: "Last 30 Days", value: "last_30_days" },
        { label: "Last 3 Months", value: "last_3_months" },
        { label: "Last Year", value: "last_year" },
    ];

    return (
        <ScrollView style={styles.container}>
            <Stack.Screen
                options={{
                    title: reportInfo.title,
                    headerRight: () => (
                        <TouchableOpacity style={styles.headerButton}>
                            <Download size={20} color={colors.primary} />
                        </TouchableOpacity>
                    ),
                }}
            />

            <View style={styles.content}>
                {/* Header Section */}
                <Card variant="elevated" style={styles.headerCard}>
                    <View style={styles.headerContent}>
                        {reportInfo.icon}
                        <View style={styles.headerInfo}>
                            <Text style={styles.title}>{reportInfo.title}</Text>
                            <Text style={styles.description}>
                                {reportInfo.description}
                            </Text>
                        </View>
                    </View>
                </Card>

                {/* Date Range Selector */}
                <Card variant="elevated" style={styles.filtersCard}>
                    <View style={styles.filtersHeader}>
                        <Filter size={20} color={colors.primary} />
                        <Text style={styles.filtersTitle}>Report Filters</Text>
                    </View>

                    <View style={styles.dateRangeContainer}>
                        <Text style={styles.filterLabel}>Time Period:</Text>
                        <View style={styles.dateRangeButtons}>
                            {dateRangeOptions.map((option) => (
                                <TouchableOpacity
                                    key={option.value}
                                    style={[
                                        styles.dateRangeButton,
                                        dateRange === option.value && styles.activeDateRangeButton
                                    ]}
                                    onPress={() => setDateRange(option.value)}
                                >
                                    <Text style={[
                                        styles.dateRangeButtonText,
                                        dateRange === option.value && styles.activeDateRangeButtonText
                                    ]}>
                                        {option.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                </Card>

                {/* Metrics Grid */}
                {reportInfo.metrics.length > 0 && (
                    <Card variant="elevated" style={styles.metricsCard}>
                        <Text style={styles.metricsTitle}>Key Metrics</Text>
                        <View style={styles.metricsGrid}>
                            {reportInfo.metrics.map((metric, index) => (
                                <View key={index} style={styles.metricItem}>
                                    <Text style={styles.metricLabel}>{metric.label}</Text>
                                    <Text style={styles.metricValue}>{metric.value}</Text>
                                    <Text style={[
                                        styles.metricChange,
                                        metric.change.includes('+') ? styles.positiveChange :
                                            metric.change.includes('-') ? styles.negativeChange : styles.neutralChange
                                    ]}>
                                        {metric.change}
                                    </Text>
                                </View>
                            ))}
                        </View>
                    </Card>
                )}

                {/* Chart Placeholder */}
                <Card variant="elevated" style={styles.chartCard}>
                    <Text style={styles.chartTitle}>Analytics Chart</Text>
                    <View style={styles.chartPlaceholder}>
                        <BarChart size={48} color={colors.textSecondary} />
                        <Text style={styles.chartPlaceholderText}>
                            Interactive charts and detailed analytics coming soon!
                        </Text>
                        <Text style={styles.chartSubtext}>
                            View trends, comparisons, and insights with visual data representation.
                        </Text>
                    </View>
                </Card>

                {/* Action Buttons */}
                <View style={styles.actionButtons}>
                    <Button
                        title="Export Report"
                        variant="primary"
                        onPress={() => {/* TODO: Export functionality */ }}
                        icon={<Download size={18} color="#FFFFFF" />}
                    />

                    <Button
                        title="Schedule Report"
                        variant="secondary"
                        onPress={() => {/* TODO: Schedule functionality */ }}
                        icon={<Calendar size={18} color={colors.primary} />}
                    />

                    <Button
                        title="Back to Reports"
                        variant="outline"
                        onPress={() => router.back()}
                    />
                </View>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.backgroundSecondary,
    },
    content: {
        padding: 16,
        paddingBottom: 32,
    },
    headerCard: {
        marginBottom: 24,
        padding: 20,
    },
    headerContent: {
        flexDirection: "row",
        alignItems: "flex-start",
    },
    headerInfo: {
        marginLeft: 16,
        flex: 1,
    },
    title: {
        fontSize: 24,
        fontWeight: "700",
        color: colors.text,
        marginBottom: 8,
    },
    description: {
        fontSize: 16,
        color: colors.textSecondary,
        lineHeight: 24,
    },
    filtersCard: {
        marginBottom: 24,
        padding: 20,
    },
    filtersHeader: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 16,
    },
    filtersTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: colors.text,
        marginLeft: 8,
    },
    dateRangeContainer: {
        marginTop: 8,
    },
    filterLabel: {
        fontSize: 14,
        fontWeight: "600",
        color: colors.text,
        marginBottom: 12,
    },
    dateRangeButtons: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
    },
    dateRangeButton: {
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 8,
        backgroundColor: colors.background,
    },
    activeDateRangeButton: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    dateRangeButtonText: {
        fontSize: 14,
        fontWeight: "600",
        color: colors.text,
    },
    activeDateRangeButtonText: {
        color: "#FFFFFF",
    },
    metricsCard: {
        marginBottom: 24,
        padding: 20,
    },
    metricsTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: colors.text,
        marginBottom: 16,
    },
    metricsGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 16,
    },
    metricItem: {
        flex: 1,
        minWidth: "45%",
        backgroundColor: colors.backgroundSecondary,
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.border,
    },
    metricLabel: {
        fontSize: 12,
        fontWeight: "600",
        color: colors.textSecondary,
        marginBottom: 4,
    },
    metricValue: {
        fontSize: 20,
        fontWeight: "700",
        color: colors.text,
        marginBottom: 4,
    },
    metricChange: {
        fontSize: 12,
        fontWeight: "600",
    },
    positiveChange: {
        color: colors.success,
    },
    negativeChange: {
        color: colors.danger,
    },
    neutralChange: {
        color: colors.textSecondary,
    },
    chartCard: {
        marginBottom: 24,
        padding: 20,
    },
    chartTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: colors.text,
        marginBottom: 16,
    },
    chartPlaceholder: {
        alignItems: "center",
        paddingVertical: 40,
        backgroundColor: colors.backgroundSecondary,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.border,
        borderStyle: "dashed",
    },
    chartPlaceholderText: {
        fontSize: 16,
        fontWeight: "600",
        color: colors.text,
        textAlign: "center",
        marginTop: 16,
        marginBottom: 8,
    },
    chartSubtext: {
        fontSize: 14,
        color: colors.textSecondary,
        textAlign: "center",
        lineHeight: 20,
    },
    actionButtons: {
        gap: 12,
        marginTop: 8,
    },
    headerButton: {
        padding: 8,
        marginRight: 8,
    },
}); 