import React, { useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Dimensions,
    Alert,
    RefreshControl,
    FlatList,
} from "react-native";
import { Stack, router } from "expo-router";
import { colors } from "@/constants/adminColors";
import { useAdminStore } from "@/store/admin/adminStore";
import { useAdminPermissions } from "@/hooks/useAdminPermissions";
import {
    DollarSign,
    Wallet,
    CreditCard,
    TrendingUp,
    TrendingDown,
    Plus,
    Eye,
    AlertTriangle,
    Download,
    Filter,
} from "lucide-react-native";
import StatCard from "@/components/admin/StatCard";
import SectionHeader from "@/components/admin/SectionHeader";
import Button from "@/components/admin/Button";
import SearchBar from "@/components/admin/SearchBar";

const { width: screenWidth } = Dimensions.get("window");

export default function FinanceScreen() {
    const {
        wallets,
        walletTransactions,
        paymentReports,
        dashboardStats,
        loading,
        refreshData,
        searchQueries,
        setSearchQuery,
        addWalletTransaction,
    } = useAdminStore();

    const {
        canViewWallets,
        canManageWallets,
        canViewPayments,
        canManagePayments,
    } = useAdminPermissions();

    const [isRefreshing, setIsRefreshing] = useState(false);
    const [activeSection, setActiveSection] = useState<"wallets" | "payments" | "reports">("wallets");

    const isTablet = screenWidth >= 768;
    const isSmallScreen = screenWidth < 480;

    const handleRefresh = async () => {
        setIsRefreshing(true);
        await refreshData();
        setIsRefreshing(false);
    };

    const handleWalletPress = (walletId: string) => {
        if (canViewWallets()) {
            router.push(`../wallet/${walletId}` as any);
        }
    };

    const handleAddCredit = (walletId: string) => {
        if (!canManageWallets()) {
            Alert.alert("Access Denied", "You don't have permission to manage wallets.");
            return;
        }

        Alert.prompt(
            "Add Credit",
            "Enter the amount to add:",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Add",
                    onPress: (value) => {
                        if (value && !isNaN(Number(value))) {
                            addWalletTransaction({
                                wallet_id: walletId,
                                user_id: wallets.find(w => w.id === walletId)?.user_id || "",
                                user_name: wallets.find(w => w.id === walletId)?.user_name || "",
                                amount: Number(value),
                                transaction_type: "credit",
                                description: "Manual credit addition",
                            });
                            Alert.alert("Success", "Credit added successfully!");
                        } else {
                            Alert.alert("Error", "Please enter a valid amount.");
                        }
                    },
                },
            ],
            "plain-text"
        );
    };

    const getResponsivePadding = () => ({
        paddingHorizontal: isTablet ? 24 : isSmallScreen ? 12 : 16,
        paddingVertical: isTablet ? 20 : 16,
    });

    // Calculate financial statistics
    const totalWalletBalance = wallets.reduce((sum, w) => sum + w.balance, 0);
    const activeWallets = wallets.filter(w => w.is_active).length;
    const todayTransactions = walletTransactions.filter(
        t => new Date(t.created_at).toDateString() === new Date().toDateString()
    ).length;

    const renderSectionSelector = () => (
        <View style={styles.sectionSelector}>
            {[
                { key: "wallets", label: "Wallets", icon: Wallet, permission: canViewWallets() },
                { key: "payments", label: "Payments", icon: CreditCard, permission: canViewPayments() },
                { key: "reports", label: "Reports", icon: TrendingUp, permission: canViewPayments() },
            ].filter(section => section.permission).map((section) => (
                <TouchableOpacity
                    key={section.key}
                    style={[
                        styles.sectionButton,
                        activeSection === section.key && styles.sectionButtonActive,
                    ]}
                    onPress={() => setActiveSection(section.key as any)}
                >
                    <section.icon
                        size={16}
                        color={activeSection === section.key ? colors.primary : colors.textSecondary}
                    />
                    <Text
                        style={[
                            styles.sectionButtonText,
                            activeSection === section.key && styles.sectionButtonTextActive,
                        ]}
                    >
                        {section.label}
                    </Text>
                </TouchableOpacity>
            ))}
        </View>
    );

    const renderWallets = () => {
        if (!canViewWallets()) {
            return (
                <View style={styles.noPermissionContainer}>
                    <AlertTriangle size={48} color={colors.warning} />
                    <Text style={styles.noPermissionText}>
                        You don't have permission to view wallets.
                    </Text>
                </View>
            );
        }

        return (
            <View style={styles.sectionContent}>
                <View style={styles.sectionHeader}>
                    <SectionHeader
                        title="Wallet Management"
                        subtitle={`${activeWallets} active wallets`}
                    />
                </View>

                <SearchBar
                    placeholder="Search wallets..."
                    value={searchQueries.wallets || ""}
                    onChangeText={(text) => setSearchQuery("wallets", text)}
                />

                <View style={styles.itemsList}>
                    {wallets.slice(0, 10).map((wallet) => (
                        <TouchableOpacity
                            key={wallet.id}
                            style={styles.walletItem}
                            onPress={() => handleWalletPress(wallet.id)}
                        >
                            <View style={styles.walletInfo}>
                                <Text style={styles.walletUserName}>{wallet.user_name}</Text>
                                <Text style={styles.walletUserEmail}>{wallet.user_email}</Text>
                                <View style={styles.walletBalanceContainer}>
                                    <Text style={styles.walletBalance}>
                                        {wallet.currency} {wallet.balance.toFixed(2)}
                                    </Text>
                                    <View style={[styles.statusBadge, wallet.is_active ? styles.statusActive : styles.statusInactive]}>
                                        <Text style={[styles.statusText, wallet.is_active ? styles.statusTextActive : styles.statusTextInactive]}>
                                            {wallet.is_active ? "Active" : "Inactive"}
                                        </Text>
                                    </View>
                                </View>
                            </View>
                            <View style={styles.walletActions}>
                                {canManageWallets() && (
                                    <TouchableOpacity
                                        style={styles.addCreditButton}
                                        onPress={() => handleAddCredit(wallet.id)}
                                    >
                                        <Plus size={16} color={colors.primary} />
                                    </TouchableOpacity>
                                )}
                                <TouchableOpacity
                                    style={styles.viewButton}
                                    onPress={() => handleWalletPress(wallet.id)}
                                >
                                    <Eye size={16} color={colors.textSecondary} />
                                </TouchableOpacity>
                            </View>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Recent Transactions */}
                <View style={styles.transactionsSection}>
                    <SectionHeader
                        title="Recent Transactions"
                        subtitle={`${todayTransactions} today`}
                    />

                    <View style={styles.transactionsList}>
                        {walletTransactions.slice(0, 5).map((transaction) => (
                            <View key={transaction.id} style={styles.transactionItem}>
                                <View style={styles.transactionInfo}>
                                    <Text style={styles.transactionUser}>{transaction.user_name}</Text>
                                    <Text style={styles.transactionDescription}>
                                        {transaction.description || transaction.transaction_type}
                                    </Text>
                                    <Text style={styles.transactionDate}>
                                        {new Date(transaction.created_at).toLocaleDateString()}
                                    </Text>
                                </View>
                                <View style={styles.transactionAmount}>
                                    <Text style={[
                                        styles.transactionAmountText,
                                        transaction.transaction_type === "credit" ? styles.creditAmount : styles.debitAmount
                                    ]}>
                                        {transaction.transaction_type === "credit" ? "+" : "-"}
                                        MVR {transaction.amount.toFixed(2)}
                                    </Text>
                                    <View style={styles.transactionTypeIcon}>
                                        {transaction.transaction_type === "credit" ? (
                                            <TrendingUp size={16} color={colors.success} />
                                        ) : (
                                            <TrendingDown size={16} color={colors.danger} />
                                        )}
                                    </View>
                                </View>
                            </View>
                        ))}
                    </View>
                </View>
            </View>
        );
    };

    const renderPayments = () => {
        if (!canViewPayments()) {
            return (
                <View style={styles.noPermissionContainer}>
                    <AlertTriangle size={48} color={colors.warning} />
                    <Text style={styles.noPermissionText}>
                        You don't have permission to view payments.
                    </Text>
                </View>
            );
        }

        return (
            <View style={styles.sectionContent}>
                <View style={styles.sectionHeader}>
                    <SectionHeader
                        title="Payment Management"
                        subtitle="Transaction monitoring"
                    />
                    <TouchableOpacity style={styles.filterButton}>
                        <Filter size={16} color={colors.primary} />
                        <Text style={styles.filterButtonText}>Filter</Text>
                    </TouchableOpacity>
                </View>

                <SearchBar
                    placeholder="Search payments..."
                    value={searchQueries.payments || ""}
                    onChangeText={(text) => setSearchQuery("payments", text)}
                />

                {/* Payment Stats */}
                <View style={styles.paymentStats}>
                    <View style={styles.paymentStatItem}>
                        <Text style={styles.paymentStatValue}>
                            {dashboardStats.paymentStatus.completed}
                        </Text>
                        <Text style={styles.paymentStatLabel}>Completed</Text>
                    </View>
                    <View style={styles.paymentStatItem}>
                        <Text style={[styles.paymentStatValue, { color: colors.warning }]}>
                            {dashboardStats.paymentStatus.pending}
                        </Text>
                        <Text style={styles.paymentStatLabel}>Pending</Text>
                    </View>
                    <View style={styles.paymentStatItem}>
                        <Text style={[styles.paymentStatValue, { color: colors.danger }]}>
                            {dashboardStats.paymentStatus.failed}
                        </Text>
                        <Text style={styles.paymentStatLabel}>Failed</Text>
                    </View>
                    <View style={styles.paymentStatItem}>
                        <Text style={styles.paymentStatValue}>
                            MVR {dashboardStats.paymentStatus.total_value?.toFixed(2) || "0.00"}
                        </Text>
                        <Text style={styles.paymentStatLabel}>Total Value</Text>
                    </View>
                </View>

                {/* Payment Methods Distribution */}
                <View style={styles.paymentMethodsSection}>
                    <Text style={styles.sectionTitle}>Payment Methods</Text>
                    <View style={styles.paymentMethods}>
                        {["Gateway", "Wallet", "Bank Transfer", "Cash"].map((method, index) => (
                            <View key={method} style={styles.paymentMethodItem}>
                                <View style={[styles.paymentMethodIcon, { backgroundColor: colors.primary + "20" }]}>
                                    <CreditCard size={16} color={colors.primary} />
                                </View>
                                <Text style={styles.paymentMethodName}>{method}</Text>
                                <Text style={styles.paymentMethodCount}>
                                    {Math.floor(Math.random() * 100) + 20}
                                </Text>
                            </View>
                        ))}
                    </View>
                </View>
            </View>
        );
    };

    const renderReports = () => {
        if (!canViewPayments()) {
            return (
                <View style={styles.noPermissionContainer}>
                    <AlertTriangle size={48} color={colors.warning} />
                    <Text style={styles.noPermissionText}>
                        You don't have permission to view financial reports.
                    </Text>
                </View>
            );
        }

        return (
            <View style={styles.sectionContent}>
                <View style={styles.sectionHeader}>
                    <SectionHeader
                        title="Financial Reports"
                        subtitle="Revenue and analytics"
                    />
                    <Button
                        title="Generate Report"
                        onPress={() => router.push("../reports/financial" as any)}
                        size="small"
                        variant="primary"
                        icon={<Download size={16} color="white" />}
                    />
                </View>

                {/* Revenue Summary */}
                <View style={styles.revenueSummary}>
                    <Text style={styles.sectionTitle}>Revenue Summary</Text>
                    <View style={styles.revenueGrid}>
                        <View style={styles.revenueItem}>
                            <Text style={styles.revenueLabel}>Today</Text>
                            <Text style={styles.revenueValue}>
                                MVR {dashboardStats.dailyBookings.revenue.toFixed(2)}
                            </Text>
                            <Text style={[styles.revenueChange, { color: colors.success }]}>
                                +{dashboardStats.dailyBookings.change_percentage || 0}%
                            </Text>
                        </View>
                        <View style={styles.revenueItem}>
                            <Text style={styles.revenueLabel}>This Month</Text>
                            <Text style={styles.revenueValue}>
                                MVR {(dashboardStats.dailyBookings.revenue * 25).toFixed(2)}
                            </Text>
                            <Text style={[styles.revenueChange, { color: colors.success }]}>
                                +12.5%
                            </Text>
                        </View>
                        <View style={styles.revenueItem}>
                            <Text style={styles.revenueLabel}>Wallet Balance</Text>
                            <Text style={styles.revenueValue}>
                                MVR {totalWalletBalance.toFixed(2)}
                            </Text>
                            <Text style={styles.revenueChange}>
                                {activeWallets} wallets
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Quick Actions */}
                <View style={styles.quickActions}>
                    <Text style={styles.sectionTitle}>Quick Actions</Text>
                    <View style={styles.actionButtons}>
                        <TouchableOpacity style={styles.actionButton}>
                            <Download size={20} color={colors.primary} />
                            <Text style={styles.actionButtonText}>Export Transactions</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.actionButton}>
                            <TrendingUp size={20} color={colors.primary} />
                            <Text style={styles.actionButtonText}>Revenue Report</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.actionButton}>
                            <Wallet size={20} color={colors.primary} />
                            <Text style={styles.actionButtonText}>Wallet Audit</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        );
    };

    const renderContent = () => {
        switch (activeSection) {
            case "wallets":
                return renderWallets();
            case "payments":
                return renderPayments();
            case "reports":
                return renderReports();
            default:
                return renderWallets();
        }
    };

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={[styles.contentContainer, getResponsivePadding()]}
            showsVerticalScrollIndicator={false}
            refreshControl={
                <RefreshControl
                    refreshing={isRefreshing}
                    onRefresh={handleRefresh}
                    colors={[colors.primary]}
                    tintColor={colors.primary}
                />
            }
        >
            <Stack.Screen
                options={{
                    title: "Finance",
                }}
            />

            {/* Financial Stats */}
            <View style={styles.statsContainer}>
                <View style={styles.statsGrid}>
                    <StatCard
                        title="Total Balance"
                        value={`MVR ${totalWalletBalance.toFixed(2)}`}
                        icon={<Wallet size={isTablet ? 20 : 18} color={colors.primary} />}
                        size={isTablet ? "large" : "medium"}
                    />
                    <StatCard
                        title="Active Wallets"
                        value={activeWallets.toString()}
                        icon={<DollarSign size={isTablet ? 20 : 18} color={colors.secondary} />}
                        color={colors.secondary}
                        size={isTablet ? "large" : "medium"}
                    />
                    <StatCard
                        title="Today's Revenue"
                        value={`MVR ${dashboardStats.dailyBookings.revenue.toFixed(2)}`}
                        icon={<TrendingUp size={isTablet ? 20 : 18} color="#34C759" />}
                        color="#34C759"
                        size={isTablet ? "large" : "medium"}
                    />
                    <StatCard
                        title="Transactions"
                        value={todayTransactions.toString()}
                        subtitle="today"
                        icon={<CreditCard size={isTablet ? 20 : 18} color="#FF9500" />}
                        color="#FF9500"
                        size={isTablet ? "large" : "medium"}
                    />
                </View>
            </View>

            {/* Section Selector */}
            {renderSectionSelector()}

            {/* Content */}
            {renderContent()}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    contentContainer: {
        flexGrow: 1,
    },
    statsContainer: {
        marginBottom: 24,
    },
    statsGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 12,
    },
    sectionSelector: {
        flexDirection: "row",
        backgroundColor: colors.card,
        borderRadius: 12,
        padding: 4,
        marginBottom: 24,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    sectionButton: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 12,
        paddingHorizontal: 8,
        borderRadius: 8,
        gap: 6,
    },
    sectionButtonActive: {
        backgroundColor: colors.primary + "15",
    },
    sectionButtonText: {
        fontSize: 14,
        fontWeight: "500",
        color: colors.textSecondary,
    },
    sectionButtonTextActive: {
        color: colors.primary,
        fontWeight: "600",
    },
    sectionContent: {
        flex: 1,
    },
    sectionHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 16,
    },
    itemsList: {
        gap: 12,
        marginTop: 16,
    },
    walletItem: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        backgroundColor: colors.card,
        padding: 16,
        borderRadius: 12,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    walletInfo: {
        flex: 1,
    },
    walletUserName: {
        fontSize: 16,
        fontWeight: "600",
        color: colors.text,
        marginBottom: 4,
    },
    walletUserEmail: {
        fontSize: 14,
        color: colors.textSecondary,
        marginBottom: 8,
    },
    walletBalanceContainer: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    walletBalance: {
        fontSize: 16,
        fontWeight: "600",
        color: colors.primary,
    },
    walletActions: {
        flexDirection: "row",
        gap: 8,
    },
    addCreditButton: {
        padding: 8,
        borderRadius: 8,
        backgroundColor: colors.primary + "15",
    },
    viewButton: {
        padding: 8,
        borderRadius: 8,
        backgroundColor: colors.background,
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    statusActive: {
        backgroundColor: colors.success + "20",
    },
    statusInactive: {
        backgroundColor: colors.textSecondary + "20",
    },
    statusText: {
        fontSize: 12,
        fontWeight: "500",
    },
    statusTextActive: {
        color: colors.success,
    },
    statusTextInactive: {
        color: colors.textSecondary,
    },
    transactionsSection: {
        marginTop: 32,
    },
    transactionsList: {
        gap: 12,
        marginTop: 16,
    },
    transactionItem: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        backgroundColor: colors.card,
        padding: 12,
        borderRadius: 8,
    },
    transactionInfo: {
        flex: 1,
    },
    transactionUser: {
        fontSize: 14,
        fontWeight: "500",
        color: colors.text,
        marginBottom: 2,
    },
    transactionDescription: {
        fontSize: 12,
        color: colors.textSecondary,
        marginBottom: 2,
    },
    transactionDate: {
        fontSize: 12,
        color: colors.textSecondary,
    },
    transactionAmount: {
        alignItems: "flex-end",
        gap: 4,
    },
    transactionAmountText: {
        fontSize: 14,
        fontWeight: "600",
    },
    creditAmount: {
        color: colors.success,
    },
    debitAmount: {
        color: colors.danger,
    },
    transactionTypeIcon: {
        alignSelf: "flex-end",
    },
    filterButton: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        paddingHorizontal: 12,
        paddingVertical: 6,
        backgroundColor: colors.primary + "15",
        borderRadius: 6,
    },
    filterButtonText: {
        fontSize: 12,
        fontWeight: "500",
        color: colors.primary,
    },
    paymentStats: {
        flexDirection: "row",
        backgroundColor: colors.card,
        borderRadius: 12,
        padding: 16,
        marginTop: 16,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    paymentStatItem: {
        flex: 1,
        alignItems: "center",
    },
    paymentStatValue: {
        fontSize: 18,
        fontWeight: "600",
        color: colors.primary,
        marginBottom: 4,
    },
    paymentStatLabel: {
        fontSize: 12,
        color: colors.textSecondary,
    },
    paymentMethodsSection: {
        marginTop: 24,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: "600",
        color: colors.text,
        marginBottom: 16,
    },
    paymentMethods: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 12,
    },
    paymentMethodItem: {
        backgroundColor: colors.card,
        padding: 16,
        borderRadius: 12,
        alignItems: "center",
        minWidth: "22%",
        flex: 1,
    },
    paymentMethodIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 8,
    },
    paymentMethodName: {
        fontSize: 12,
        color: colors.textSecondary,
        marginBottom: 4,
    },
    paymentMethodCount: {
        fontSize: 16,
        fontWeight: "600",
        color: colors.text,
    },
    revenueSummary: {
        marginTop: 16,
    },
    revenueGrid: {
        flexDirection: "row",
        gap: 12,
    },
    revenueItem: {
        flex: 1,
        backgroundColor: colors.card,
        padding: 16,
        borderRadius: 12,
        alignItems: "center",
    },
    revenueLabel: {
        fontSize: 12,
        color: colors.textSecondary,
        marginBottom: 8,
    },
    revenueValue: {
        fontSize: 18,
        fontWeight: "600",
        color: colors.text,
        marginBottom: 4,
    },
    revenueChange: {
        fontSize: 12,
        color: colors.textSecondary,
    },
    quickActions: {
        marginTop: 24,
    },
    actionButtons: {
        gap: 12,
    },
    actionButton: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: colors.card,
        padding: 16,
        borderRadius: 12,
        gap: 12,
    },
    actionButtonText: {
        fontSize: 14,
        fontWeight: "500",
        color: colors.text,
    },
    noPermissionContainer: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 64,
        gap: 16,
    },
    noPermissionText: {
        fontSize: 16,
        color: colors.textSecondary,
        textAlign: "center",
        maxWidth: 250,
    },
}); 