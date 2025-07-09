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
    TextInput,
    Modal,
} from "react-native";
import { Stack, router } from "expo-router";
import { colors } from "@/constants/adminColors";
import { useAdminStore } from "@/store/admin/adminStore";
import { useAdminPermissions } from "@/hooks/useAdminPermissions";
import {
    MessageSquare,
    Bell,
    Send,
    Plus,
    Eye,
    AlertTriangle,
    Users,
    Clock,
    CheckCircle,
    XCircle,
    Edit,
    Trash2,
} from "lucide-react-native";
import StatCard from "@/components/admin/StatCard";
import SectionHeader from "@/components/admin/SectionHeader";
import Button from "@/components/admin/Button";
import SearchBar from "@/components/admin/SearchBar";

const { width: screenWidth } = Dimensions.get("window");

export default function CommunicationsScreen() {
    const {
        notifications,
        bulkMessages,
        loading,
        refreshData,
        searchQueries,
        setSearchQuery,
        addNotification,
        addBulkMessage,
        sendBulkMessage,
        deleteNotification,
        deleteBulkMessage,
    } = useAdminStore();

    const {
        canViewNotifications,
        canSendNotifications,
        canViewBulkMessages,
        canSendBulkMessages,
    } = useAdminPermissions();

    const [isRefreshing, setIsRefreshing] = useState(false);
    const [activeSection, setActiveSection] = useState<"notifications" | "bulk_messages" | "templates">("notifications");
    const [showNotificationModal, setShowNotificationModal] = useState(false);
    const [showBulkMessageModal, setShowBulkMessageModal] = useState(false);
    const [newNotification, setNewNotification] = useState({
        title: "",
        message: "",
        type: "system" as const,
        priority: "medium" as const,
        target_users: "all" as const,
    });
    const [newBulkMessage, setNewBulkMessage] = useState({
        title: "",
        message_content: "",
        target_criteria: { user_roles: ["customer"] },
    });

    const isTablet = screenWidth >= 768;
    const isSmallScreen = screenWidth < 480;

    const handleRefresh = async () => {
        setIsRefreshing(true);
        await refreshData();
        setIsRefreshing(false);
    };

    const handleSendNotification = () => {
        if (!canSendNotifications()) {
            Alert.alert("Access Denied", "You don't have permission to send notifications.");
            return;
        }

        if (!newNotification.title || !newNotification.message) {
            Alert.alert("Error", "Please fill in all required fields.");
            return;
        }

        addNotification({
            ...newNotification,
            is_read: false,
            sent_by: "admin1",
            sent_by_name: "Admin User",
        });

        setNewNotification({
            title: "",
            message: "",
            type: "system",
            priority: "medium",
            target_users: "all",
        });
        setShowNotificationModal(false);
        Alert.alert("Success", "Notification sent successfully!");
    };

    const handleSendBulkMessage = () => {
        if (!canSendBulkMessages()) {
            Alert.alert("Access Denied", "You don't have permission to send bulk messages.");
            return;
        }

        if (!newBulkMessage.title || !newBulkMessage.message_content) {
            Alert.alert("Error", "Please fill in all required fields.");
            return;
        }

        const messageData = {
            ...newBulkMessage,
            recipient_count: 100, // Mock recipient count
            sent_count: 0,
            failed_count: 0,
            status: "draft" as const,
            sent_by: "admin1",
            sent_by_name: "Admin User",
        };

        addBulkMessage(messageData);

        setNewBulkMessage({
            title: "",
            message_content: "",
            target_criteria: { user_roles: ["customer"] },
        });
        setShowBulkMessageModal(false);
        Alert.alert("Success", "Bulk message created and queued for sending!");
    };

    const handleDeleteNotification = (id: string) => {
        Alert.alert(
            "Delete Notification",
            "Are you sure you want to delete this notification?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: () => deleteNotification(id),
                },
            ]
        );
    };

    const handleDeleteBulkMessage = (id: string) => {
        Alert.alert(
            "Delete Message",
            "Are you sure you want to delete this bulk message?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: () => deleteBulkMessage(id),
                },
            ]
        );
    };

    const getResponsivePadding = () => ({
        paddingHorizontal: isTablet ? 24 : isSmallScreen ? 12 : 16,
        paddingVertical: isTablet ? 20 : 16,
    });

    // Calculate communication statistics
    const unreadNotifications = notifications.filter(n => !n.is_read).length;
    const todayNotifications = notifications.filter(
        n => new Date(n.created_at).toDateString() === new Date().toDateString()
    ).length;
    const activeBulkMessages = bulkMessages.filter(m => m.status === "sending" || m.status === "sent").length;
    const totalRecipients = bulkMessages.reduce((sum, m) => sum + m.recipient_count, 0);

    const renderSectionSelector = () => (
        <View style={styles.sectionSelector}>
            {[
                { key: "notifications", label: "Notifications", icon: Bell, permission: canViewNotifications() },
                { key: "bulk_messages", label: "Bulk Messages", icon: MessageSquare, permission: canViewBulkMessages() },
                { key: "templates", label: "Templates", icon: Edit, permission: canSendNotifications() },
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

    const renderNotifications = () => {
        if (!canViewNotifications()) {
            return (
                <View style={styles.noPermissionContainer}>
                    <AlertTriangle size={48} color={colors.warning} />
                    <Text style={styles.noPermissionText}>
                        You don't have permission to view notifications.
                    </Text>
                </View>
            );
        }

        return (
            <View style={styles.sectionContent}>
                <View style={styles.sectionHeader}>
                    <SectionHeader
                        title="Notifications Management"
                        subtitle={`${unreadNotifications} unread notifications`}
                    />
                    {canSendNotifications() && (
                        <Button
                            title="New Notification"
                            onPress={() => setShowNotificationModal(true)}
                            size="small"
                            variant="primary"
                            icon={<Plus size={16} color="white" />}
                        />
                    )}
                </View>

                <SearchBar
                    placeholder="Search notifications..."
                    value={searchQueries.notifications || ""}
                    onChangeText={(text) => setSearchQuery("notifications", text)}
                />

                <View style={styles.itemsList}>
                    {notifications.slice(0, 10).map((notification) => (
                        <View key={notification.id} style={styles.notificationItem}>
                            <View style={styles.notificationHeader}>
                                <View style={styles.notificationTypeContainer}>
                                    <View style={[styles.notificationTypeIcon, {
                                        backgroundColor: notification.type === "emergency" ? colors.danger + "20" :
                                            notification.type === "maintenance" ? colors.warning + "20" :
                                                colors.primary + "20"
                                    }]}>
                                        <Bell
                                            size={16}
                                            color={notification.type === "emergency" ? colors.danger :
                                                notification.type === "maintenance" ? colors.warning :
                                                    colors.primary}
                                        />
                                    </View>
                                    <View style={[styles.priorityBadge, {
                                        backgroundColor: notification.priority === "critical" ? colors.danger :
                                            notification.priority === "high" ? colors.warning :
                                                notification.priority === "medium" ? colors.primary :
                                                    colors.textSecondary
                                    }]}>
                                        <Text style={styles.priorityText}>{notification.priority}</Text>
                                    </View>
                                </View>
                                <View style={styles.notificationActions}>
                                    {!notification.is_read && (
                                        <View style={styles.unreadIndicator} />
                                    )}
                                    <TouchableOpacity
                                        style={styles.deleteButton}
                                        onPress={() => handleDeleteNotification(notification.id)}
                                    >
                                        <Trash2 size={16} color={colors.danger} />
                                    </TouchableOpacity>
                                </View>
                            </View>

                            <Text style={styles.notificationTitle}>{notification.title}</Text>
                            <Text style={styles.notificationMessage}>{notification.message}</Text>

                            <View style={styles.notificationFooter}>
                                <Text style={styles.notificationDate}>
                                    {new Date(notification.created_at).toLocaleDateString()}
                                </Text>
                                <Text style={styles.notificationTarget}>
                                    Target: {notification.target_users}
                                </Text>
                                <Text style={styles.notificationSender}>
                                    By: {notification.sent_by_name}
                                </Text>
                            </View>
                        </View>
                    ))}
                </View>
            </View>
        );
    };

    const renderBulkMessages = () => {
        if (!canViewBulkMessages()) {
            return (
                <View style={styles.noPermissionContainer}>
                    <AlertTriangle size={48} color={colors.warning} />
                    <Text style={styles.noPermissionText}>
                        You don't have permission to view bulk messages.
                    </Text>
                </View>
            );
        }

        return (
            <View style={styles.sectionContent}>
                <View style={styles.sectionHeader}>
                    <SectionHeader
                        title="Bulk Messages"
                        subtitle={`${activeBulkMessages} active campaigns`}
                    />
                    {canSendBulkMessages() && (
                        <Button
                            title="New Campaign"
                            onPress={() => setShowBulkMessageModal(true)}
                            size="small"
                            variant="primary"
                            icon={<Plus size={16} color="white" />}
                        />
                    )}
                </View>

                <SearchBar
                    placeholder="Search bulk messages..."
                    value={searchQueries.bulkMessages || ""}
                    onChangeText={(text) => setSearchQuery("bulkMessages", text)}
                />

                <View style={styles.itemsList}>
                    {bulkMessages.slice(0, 10).map((message) => (
                        <View key={message.id} style={styles.bulkMessageItem}>
                            <View style={styles.bulkMessageHeader}>
                                <Text style={styles.bulkMessageTitle}>{message.title}</Text>
                                <View style={styles.bulkMessageActions}>
                                    <View style={[styles.statusBadge, {
                                        backgroundColor: message.status === "sent" ? colors.success + "20" :
                                            message.status === "sending" ? colors.warning + "20" :
                                                message.status === "failed" ? colors.danger + "20" :
                                                    colors.textSecondary + "20"
                                    }]}>
                                        <Text style={[styles.statusText, {
                                            color: message.status === "sent" ? colors.success :
                                                message.status === "sending" ? colors.warning :
                                                    message.status === "failed" ? colors.danger :
                                                        colors.textSecondary
                                        }]}>
                                            {message.status}
                                        </Text>
                                    </View>
                                    {message.status === "draft" && canSendBulkMessages() && (
                                        <TouchableOpacity
                                            style={styles.sendButton}
                                            onPress={() => sendBulkMessage(message.id)}
                                        >
                                            <Send size={16} color={colors.primary} />
                                        </TouchableOpacity>
                                    )}
                                    <TouchableOpacity
                                        style={styles.deleteButton}
                                        onPress={() => handleDeleteBulkMessage(message.id)}
                                    >
                                        <Trash2 size={16} color={colors.danger} />
                                    </TouchableOpacity>
                                </View>
                            </View>

                            <Text style={styles.bulkMessageContent} numberOfLines={2}>
                                {message.message_content}
                            </Text>

                            <View style={styles.bulkMessageStats}>
                                <View style={styles.statItem}>
                                    <Users size={16} color={colors.primary} />
                                    <Text style={styles.statText}>{message.recipient_count} recipients</Text>
                                </View>
                                <View style={styles.statItem}>
                                    <CheckCircle size={16} color={colors.success} />
                                    <Text style={styles.statText}>{message.sent_count} sent</Text>
                                </View>
                                {message.failed_count > 0 && (
                                    <View style={styles.statItem}>
                                        <XCircle size={16} color={colors.danger} />
                                        <Text style={styles.statText}>{message.failed_count} failed</Text>
                                    </View>
                                )}
                            </View>

                            <View style={styles.bulkMessageFooter}>
                                <Text style={styles.bulkMessageDate}>
                                    {new Date(message.created_at).toLocaleDateString()}
                                </Text>
                                <Text style={styles.bulkMessageSender}>
                                    By: {message.sent_by_name}
                                </Text>
                            </View>
                        </View>
                    ))}
                </View>
            </View>
        );
    };

    const renderTemplates = () => {
        if (!canSendNotifications()) {
            return (
                <View style={styles.noPermissionContainer}>
                    <AlertTriangle size={48} color={colors.warning} />
                    <Text style={styles.noPermissionText}>
                        You don't have permission to manage templates.
                    </Text>
                </View>
            );
        }

        const templates = [
            {
                id: "1",
                name: "Trip Delay Notice",
                content: "Due to weather conditions, your trip has been delayed by {delay_time}.",
                category: "operations",
            },
            {
                id: "2",
                name: "Booking Confirmation",
                content: "Your booking {booking_number} has been confirmed for {travel_date}.",
                category: "booking",
            },
            {
                id: "3",
                name: "Payment Reminder",
                content: "Please complete payment for booking {booking_number} before {due_date}.",
                category: "payment",
            },
            {
                id: "4",
                name: "System Maintenance",
                content: "System maintenance scheduled from {start_time} to {end_time}.",
                category: "system",
            },
        ];

        return (
            <View style={styles.sectionContent}>
                <View style={styles.sectionHeader}>
                    <SectionHeader
                        title="Message Templates"
                        subtitle="Pre-configured message templates"
                    />
                    <Button
                        title="New Template"
                        onPress={() => { }}
                        size="small"
                        variant="outline"
                        icon={<Plus size={16} color={colors.primary} />}
                    />
                </View>

                <View style={styles.itemsList}>
                    {templates.map((template) => (
                        <View key={template.id} style={styles.templateItem}>
                            <View style={styles.templateHeader}>
                                <Text style={styles.templateName}>{template.name}</Text>
                                <View style={styles.templateCategory}>
                                    <Text style={styles.templateCategoryText}>{template.category}</Text>
                                </View>
                            </View>
                            <Text style={styles.templateContent}>{template.content}</Text>
                            <View style={styles.templateActions}>
                                <TouchableOpacity style={styles.templateAction}>
                                    <Edit size={16} color={colors.primary} />
                                    <Text style={styles.templateActionText}>Edit</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.templateAction}>
                                    <Send size={16} color={colors.primary} />
                                    <Text style={styles.templateActionText}>Use</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    ))}
                </View>
            </View>
        );
    };

    const renderContent = () => {
        switch (activeSection) {
            case "notifications":
                return renderNotifications();
            case "bulk_messages":
                return renderBulkMessages();
            case "templates":
                return renderTemplates();
            default:
                return renderNotifications();
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
                    title: "Communications",
                }}
            />

            {/* Communication Stats */}
            <View style={styles.statsContainer}>
                <View style={styles.statsGrid}>
                    <StatCard
                        title="Notifications"
                        value={notifications.length.toString()}
                        subtitle={`${unreadNotifications} unread`}
                        icon={<Bell size={isTablet ? 20 : 18} color={colors.primary} />}
                        size={isTablet ? "large" : "medium"}
                    />
                    <StatCard
                        title="Bulk Messages"
                        value={bulkMessages.length.toString()}
                        subtitle={`${activeBulkMessages} active`}
                        icon={<MessageSquare size={isTablet ? 20 : 18} color={colors.secondary} />}
                        color={colors.secondary}
                        size={isTablet ? "large" : "medium"}
                    />
                    <StatCard
                        title="Total Recipients"
                        value={totalRecipients.toString()}
                        icon={<Users size={isTablet ? 20 : 18} color="#34C759" />}
                        color="#34C759"
                        size={isTablet ? "large" : "medium"}
                    />
                    <StatCard
                        title="Today's Messages"
                        value={todayNotifications.toString()}
                        icon={<Clock size={isTablet ? 20 : 18} color="#FF9500" />}
                        color="#FF9500"
                        size={isTablet ? "large" : "medium"}
                    />
                </View>
            </View>

            {/* Section Selector */}
            {renderSectionSelector()}

            {/* Content */}
            {renderContent()}

            {/* Notification Modal */}
            <Modal
                visible={showNotificationModal}
                animationType="slide"
                presentationStyle="pageSheet"
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>New Notification</Text>
                        <TouchableOpacity onPress={() => setShowNotificationModal(false)}>
                            <XCircle size={24} color={colors.textSecondary} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.modalContent}>
                        <Text style={styles.inputLabel}>Title *</Text>
                        <TextInput
                            style={styles.textInput}
                            value={newNotification.title}
                            onChangeText={(text) => setNewNotification(prev => ({ ...prev, title: text }))}
                            placeholder="Enter notification title"
                        />

                        <Text style={styles.inputLabel}>Message *</Text>
                        <TextInput
                            style={[styles.textInput, styles.textArea]}
                            value={newNotification.message}
                            onChangeText={(text) => setNewNotification(prev => ({ ...prev, message: text }))}
                            placeholder="Enter notification message"
                            multiline
                            numberOfLines={4}
                        />

                        <Text style={styles.inputLabel}>Type</Text>
                        <View style={styles.radioGroup}>
                            {["system", "booking", "payment", "maintenance", "emergency"].map((type) => (
                                <TouchableOpacity
                                    key={type}
                                    style={[
                                        styles.radioOption,
                                        newNotification.type === type && styles.radioOptionSelected
                                    ]}
                                    onPress={() => setNewNotification(prev => ({ ...prev, type: type as any }))}
                                >
                                    <Text style={[
                                        styles.radioText,
                                        newNotification.type === type && styles.radioTextSelected
                                    ]}>
                                        {type}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={styles.inputLabel}>Priority</Text>
                        <View style={styles.radioGroup}>
                            {["low", "medium", "high", "critical"].map((priority) => (
                                <TouchableOpacity
                                    key={priority}
                                    style={[
                                        styles.radioOption,
                                        newNotification.priority === priority && styles.radioOptionSelected
                                    ]}
                                    onPress={() => setNewNotification(prev => ({ ...prev, priority: priority as any }))}
                                >
                                    <Text style={[
                                        styles.radioText,
                                        newNotification.priority === priority && styles.radioTextSelected
                                    ]}>
                                        {priority}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </ScrollView>

                    <View style={styles.modalActions}>
                        <Button
                            title="Cancel"
                            onPress={() => setShowNotificationModal(false)}
                            variant="outline"
                        />
                        <Button
                            title="Send Notification"
                            onPress={handleSendNotification}
                            variant="primary"
                        />
                    </View>
                </View>
            </Modal>

            {/* Bulk Message Modal */}
            <Modal
                visible={showBulkMessageModal}
                animationType="slide"
                presentationStyle="pageSheet"
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>New Bulk Message</Text>
                        <TouchableOpacity onPress={() => setShowBulkMessageModal(false)}>
                            <XCircle size={24} color={colors.textSecondary} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.modalContent}>
                        <Text style={styles.inputLabel}>Campaign Title *</Text>
                        <TextInput
                            style={styles.textInput}
                            value={newBulkMessage.title}
                            onChangeText={(text) => setNewBulkMessage(prev => ({ ...prev, title: text }))}
                            placeholder="Enter campaign title"
                        />

                        <Text style={styles.inputLabel}>Message Content *</Text>
                        <TextInput
                            style={[styles.textInput, styles.textArea]}
                            value={newBulkMessage.message_content}
                            onChangeText={(text) => setNewBulkMessage(prev => ({ ...prev, message_content: text }))}
                            placeholder="Enter message content"
                            multiline
                            numberOfLines={6}
                        />

                        <Text style={styles.inputLabel}>Target Audience</Text>
                        <View style={styles.radioGroup}>
                            {["customer", "agent", "all"].map((role) => (
                                <TouchableOpacity
                                    key={role}
                                    style={[
                                        styles.radioOption,
                                        newBulkMessage.target_criteria.user_roles?.includes(role) && styles.radioOptionSelected
                                    ]}
                                    onPress={() => setNewBulkMessage(prev => ({
                                        ...prev,
                                        target_criteria: { user_roles: [role] }
                                    }))}
                                >
                                    <Text style={[
                                        styles.radioText,
                                        newBulkMessage.target_criteria.user_roles?.includes(role) && styles.radioTextSelected
                                    ]}>
                                        {role}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </ScrollView>

                    <View style={styles.modalActions}>
                        <Button
                            title="Cancel"
                            onPress={() => setShowBulkMessageModal(false)}
                            variant="outline"
                        />
                        <Button
                            title="Create Campaign"
                            onPress={handleSendBulkMessage}
                            variant="primary"
                        />
                    </View>
                </View>
            </Modal>
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
        gap: 16,
        marginTop: 16,
    },
    notificationItem: {
        backgroundColor: colors.card,
        padding: 16,
        borderRadius: 12,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    notificationHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 12,
    },
    notificationTypeContainer: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    notificationTypeIcon: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: "center",
        justifyContent: "center",
    },
    priorityBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    priorityText: {
        fontSize: 10,
        fontWeight: "600",
        color: "white",
        textTransform: "uppercase",
    },
    notificationActions: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    unreadIndicator: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: colors.primary,
    },
    deleteButton: {
        padding: 4,
    },
    notificationTitle: {
        fontSize: 16,
        fontWeight: "600",
        color: colors.text,
        marginBottom: 8,
    },
    notificationMessage: {
        fontSize: 14,
        color: colors.textSecondary,
        marginBottom: 12,
        lineHeight: 20,
    },
    notificationFooter: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    notificationDate: {
        fontSize: 12,
        color: colors.textSecondary,
    },
    notificationTarget: {
        fontSize: 12,
        color: colors.textSecondary,
    },
    notificationSender: {
        fontSize: 12,
        color: colors.textSecondary,
    },
    bulkMessageItem: {
        backgroundColor: colors.card,
        padding: 16,
        borderRadius: 12,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    bulkMessageHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 12,
    },
    bulkMessageTitle: {
        fontSize: 16,
        fontWeight: "600",
        color: colors.text,
        flex: 1,
    },
    bulkMessageActions: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    statusText: {
        fontSize: 10,
        fontWeight: "600",
        textTransform: "uppercase",
    },
    sendButton: {
        padding: 4,
    },
    bulkMessageContent: {
        fontSize: 14,
        color: colors.textSecondary,
        marginBottom: 12,
        lineHeight: 20,
    },
    bulkMessageStats: {
        flexDirection: "row",
        gap: 16,
        marginBottom: 12,
    },
    statItem: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
    },
    statText: {
        fontSize: 12,
        color: colors.textSecondary,
    },
    bulkMessageFooter: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    bulkMessageDate: {
        fontSize: 12,
        color: colors.textSecondary,
    },
    bulkMessageSender: {
        fontSize: 12,
        color: colors.textSecondary,
    },
    templateItem: {
        backgroundColor: colors.card,
        padding: 16,
        borderRadius: 12,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    templateHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 12,
    },
    templateName: {
        fontSize: 16,
        fontWeight: "600",
        color: colors.text,
    },
    templateCategory: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        backgroundColor: colors.primary + "20",
        borderRadius: 6,
    },
    templateCategoryText: {
        fontSize: 10,
        fontWeight: "600",
        color: colors.primary,
        textTransform: "uppercase",
    },
    templateContent: {
        fontSize: 14,
        color: colors.textSecondary,
        marginBottom: 16,
        lineHeight: 20,
    },
    templateActions: {
        flexDirection: "row",
        gap: 16,
    },
    templateAction: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
    },
    templateActionText: {
        fontSize: 12,
        fontWeight: "500",
        color: colors.primary,
    },
    modalContainer: {
        flex: 1,
        backgroundColor: colors.background,
    },
    modalHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: "600",
        color: colors.text,
    },
    modalContent: {
        flex: 1,
        padding: 16,
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: "500",
        color: colors.text,
        marginBottom: 8,
        marginTop: 16,
    },
    textInput: {
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 8,
        padding: 12,
        fontSize: 14,
        color: colors.text,
    },
    textArea: {
        height: 100,
        textAlignVertical: "top",
    },
    radioGroup: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
    },
    radioOption: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 6,
        backgroundColor: colors.card,
    },
    radioOptionSelected: {
        backgroundColor: colors.primary + "20",
        borderColor: colors.primary,
    },
    radioText: {
        fontSize: 12,
        fontWeight: "500",
        color: colors.textSecondary,
        textTransform: "capitalize",
    },
    radioTextSelected: {
        color: colors.primary,
    },
    modalActions: {
        flexDirection: "row",
        padding: 16,
        gap: 12,
        borderTopWidth: 1,
        borderTopColor: colors.border,
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