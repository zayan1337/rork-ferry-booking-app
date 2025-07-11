import React, { useMemo } from "react";
import {
    RefreshControl,
    ScrollView,
    StyleSheet,
    View,
    TouchableOpacity,
    Dimensions,
    Text,
} from "react-native";
import { Stack } from "expo-router";
import { colors } from "@/constants/adminColors";
import { useAdminStore } from "@/store/admin/adminStore";
import { useAdminPermissions } from "@/hooks/useAdminPermissions";
import {
    Shield,
    Bell,
    Activity,
    Settings,
    FileText,
} from "lucide-react-native";
import {
    useSettingsData,
    useSettingsActions,
    useSettingsModals,
} from "@/hooks";
import {
    calculateSettingsStats,
    filterSettingsData,
    getResponsivePadding,
} from "@/utils/settingsUtils";
import SearchBar from "@/components/admin/SearchBar";
import {
    PermissionsTab,
    AlertsTab,
    ActivityTab,
    SystemTab,
    ReportsTab,
} from "@/components/admin/settings";
import {
    SystemSettingsModal,
} from "@/components/admin/settings/modals";
import { SettingsTab } from "@/types/settings";

const { width: screenWidth } = Dimensions.get('window');

export default function SettingsScreen() {
    const {
        alerts,
        activityLogs,
        systemSettings,
        refreshData,
        markAllAlertsAsRead,
    } = useAdminStore();

    const {
        canManagePermissions,
        canViewActivityLogs,
        canManageSystemSettings,
        canExportReports,
        canViewAlerts,
    } = useAdminPermissions();

    // Custom hooks for state management
    const {
        refreshing,
        setRefreshing,
        searchQuery,
        setSearchQuery,
        activeTab,
        setActiveTab,
        permissionView,
        setPermissionView,
        selectedTimeframe,
        setSelectedTimeframe,
        adminUsers,
        permissionCategories,
        roleTemplates,
        availablePermissions,
    } = useSettingsData();

    // Custom hooks for actions
    const {
        tempSettings,
        setTempSettings,
        handleRefresh,
        handleAlertAction,
        handleExportActivity,
        handleSystemBackup,
        handleSaveSettings,
        handleDeleteRole,
        handleClearCache,
        handleRestartSystem,
        handleHealthCheck,
        handleGenerateReport,
        handleExportLogs,
        exportSystemReport,
    } = useSettingsActions({});

    // System modal state
    const { showSystemModal, setShowSystemModal } = useSettingsModals();

    // Calculate statistics
    const stats = useMemo(() => calculateSettingsStats(
        adminUsers,
        permissionCategories,
        roleTemplates,
        alerts,
        activityLogs,
        selectedTimeframe,
        systemSettings
    ), [adminUsers, permissionCategories, roleTemplates, alerts, activityLogs, selectedTimeframe, systemSettings]);

    // Filter data based on search and active tab
    const filteredData = useMemo(() => filterSettingsData(
        activeTab,
        searchQuery,
        alerts,
        activityLogs,
        adminUsers
    ), [activeTab, searchQuery, alerts, activityLogs, adminUsers]);

    const onRefresh = async () => {
        setRefreshing(true);
        try {
            await handleRefresh();
        } catch (error) {
            console.error("Refresh error:", error);
        } finally {
            setRefreshing(false);
        }
    };



    const renderTabContent = () => {
        switch (activeTab) {
            case "permissions":
                return (
                    <PermissionsTab
                        permissionView={permissionView}
                        setPermissionView={setPermissionView}
                        adminUsers={adminUsers}
                        roleTemplates={roleTemplates}
                        permissionCategories={permissionCategories}
                        availablePermissions={availablePermissions}
                        filteredData={filteredData}
                        stats={stats}
                        onDeleteRole={handleDeleteRole}
                    />
                );

            case "alerts":
                return (
                    <AlertsTab
                        filteredData={filteredData as any[]}
                        stats={stats}
                        onAlertAction={handleAlertAction}
                        onMarkAllAlertsAsRead={markAllAlertsAsRead}
                    />
                );

            case "activity":
                return (
                    <ActivityTab
                        filteredData={filteredData as any[]}
                        stats={stats}
                        selectedTimeframe={selectedTimeframe}
                        setSelectedTimeframe={setSelectedTimeframe}
                        onExportActivity={() => handleExportActivity(filteredData as any[])}
                        canExportReports={canExportReports()}
                    />
                );

            case "system":
                return (
                    <SystemTab
                        stats={stats}
                        onSystemBackup={handleSystemBackup}
                        onClearCache={handleClearCache}
                        onRestartSystem={handleRestartSystem}
                        onHealthCheck={handleHealthCheck}
                        onGenerateReport={handleGenerateReport}
                        onExportLogs={handleExportLogs}
                        onShowSystemModal={() => setShowSystemModal(true)}
                    />
                );

            case "reports":
                return (
                    <ReportsTab
                        activityLogs={activityLogs}
                        onExportActivityLogs={handleExportActivity}
                        onExportSystemReport={exportSystemReport}
                    />
                );

            default:
                return null;
        }
    };

    return (
        <>
            <ScrollView
                style={styles.container}
                contentContainerStyle={[styles.contentContainer, getResponsivePadding(screenWidth)]}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        colors={[colors.primary]}
                        tintColor={colors.primary}
                    />
                }
                showsVerticalScrollIndicator={false}
            >
                <Stack.Screen
                    options={{
                        title: "Settings",
                    }}
                />

                {/* Tab Navigation */}
                <View style={styles.tabContainer}>
                    {[
                        { key: "permissions", label: "Permissions", icon: <Shield size={16} color={activeTab === "permissions" ? colors.primary : colors.textSecondary} /> },
                        { key: "alerts", label: "Alerts", icon: <Bell size={16} color={activeTab === "alerts" ? colors.primary : colors.textSecondary} /> },
                        { key: "activity", label: "Activity", icon: <Activity size={16} color={activeTab === "activity" ? colors.primary : colors.textSecondary} /> },
                        { key: "system", label: "System", icon: <Settings size={16} color={activeTab === "system" ? colors.primary : colors.textSecondary} /> },
                        { key: "reports", label: "Reports", icon: <FileText size={16} color={activeTab === "reports" ? colors.primary : colors.textSecondary} /> }
                    ].map((tab) => (
                        <TouchableOpacity
                            key={tab.key}
                            style={[
                                styles.tab,
                                activeTab === tab.key && styles.tabActive
                            ]}
                            onPress={() => setActiveTab(tab.key as SettingsTab)}
                        >
                            {tab.icon}
                            <Text style={[
                                styles.tabText,
                                activeTab === tab.key && styles.tabTextActive
                            ]}>
                                {tab.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Search Bar */}
                {(activeTab === "permissions" || activeTab === "alerts" || activeTab === "activity") && (
                    <View style={styles.searchContainer}>
                        <SearchBar
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            placeholder={`Search ${activeTab}...`}
                        />
                    </View>
                )}

                {/* Tab Content */}
                {renderTabContent()}
            </ScrollView>

            {/* Modals */}
            <SystemSettingsModal
                visible={showSystemModal}
                onClose={() => setShowSystemModal(false)}
                tempSettings={tempSettings}
                setTempSettings={setTempSettings}
                onSave={handleSaveSettings}
            />


        </>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.backgroundSecondary,
    },
    contentContainer: {
        flexGrow: 1,
    },
    tabContainer: {
        flexDirection: "row",
        backgroundColor: colors.card,
        borderRadius: 12,
        padding: 4,
        marginBottom: 24,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    tab: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 12,
        paddingHorizontal: 8,
        borderRadius: 8,
        gap: 6,
    },
    tabActive: {
        backgroundColor: colors.primary + "15",
    },
    tabText: {
        fontSize: 11,
        fontWeight: "500",
        color: colors.textSecondary,
    },
    tabTextActive: {
        color: colors.primary,
    },
    searchContainer: {
        marginBottom: 16,
    },
}); 