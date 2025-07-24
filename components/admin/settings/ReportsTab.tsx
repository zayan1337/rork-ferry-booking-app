import React from "react";
import { View, TouchableOpacity, Text } from "react-native";
import { Activity, Users, Server, Shield, Download } from "lucide-react-native";
import { colors } from "@/constants/adminColors";
import { ActivityLog as AdminActivityLog } from "@/types/admin";
import SectionHeader from "@/components/admin/SectionHeader";
import { styles } from "./styles";

interface ReportsTabProps {
    activityLogs: AdminActivityLog[];
    onExportActivityLogs: (logs: AdminActivityLog[]) => void;
    onExportSystemReport: (reportType: string) => void;
}

export default function ReportsTab({
    activityLogs,
    onExportActivityLogs,
    onExportSystemReport,
}: ReportsTabProps) {
    const reportTypes = [
        {
            title: "Activity Report",
            description: "Detailed system activity and audit logs",
            icon: <Activity size={24} color={colors.primary} />,
            action: () => onExportActivityLogs(activityLogs)
        },
        {
            title: "User Report",
            description: "Complete user and role analytics",
            icon: <Users size={24} color={colors.secondary} />,
            action: () => onExportSystemReport("users")
        },
        {
            title: "System Health Report",
            description: "System performance and health metrics",
            icon: <Server size={24} color={colors.success} />,
            action: () => onExportSystemReport("health")
        },
        {
            title: "Security Report",
            description: "Security events and permission audit",
            icon: <Shield size={24} color={colors.danger} />,
            action: () => onExportSystemReport("security")
        }
    ];

    return (
        <View style={styles.tabContent}>
            <SectionHeader
                title="System Reports"
                subtitle="Generate and download system reports"
            />

            <View style={styles.reportsList}>
                {reportTypes.map((report, index) => (
                    <TouchableOpacity
                        key={index}
                        style={styles.reportItem}
                        onPress={report.action}
                    >
                        <View style={styles.reportIcon}>
                            {report.icon}
                        </View>
                        <View style={styles.reportInfo}>
                            <Text style={styles.reportTitle}>{report.title}</Text>
                            <Text style={styles.reportDescription}>{report.description}</Text>
                        </View>
                        <Download size={20} color={colors.primary} />
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );
} 