import { StyleSheet, Dimensions } from "react-native";
import { colors } from "@/constants/adminColors";

const { width: screenWidth } = Dimensions.get('window');

export const styles = StyleSheet.create({
    // Main container styles
    container: {
        flex: 1,
        backgroundColor: colors.backgroundSecondary,
    },
    contentContainer: {
        flexGrow: 1,
    },
    tabContent: {
        flex: 1,
    },

    // Tab navigation styles
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

    // Search and filters
    searchContainer: {
        marginBottom: 16,
    },
    timeframeContainer: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: colors.card,
        padding: 16,
        borderRadius: 12,
        marginBottom: 16,
        gap: 12,
    },
    filterLabel: {
        fontSize: 14,
        fontWeight: "600",
        color: colors.text,
    },
    timeframeButtons: {
        flexDirection: "row",
        gap: 8,
    },
    timeframeButton: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        backgroundColor: colors.background,
        borderWidth: 1,
        borderColor: colors.border,
    },
    timeframeButtonActive: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    timeframeButtonText: {
        fontSize: 12,
        fontWeight: "500",
        color: colors.textSecondary,
    },
    timeframeButtonTextActive: {
        color: "white",
    },

    // Statistics styles
    statsContainer: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 12,
        marginBottom: 24,
    },

    // Modern User Card Styles
    modernUserCard: {
        backgroundColor: colors.card,
        borderRadius: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: colors.border + "30",
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
        overflow: 'hidden',
    },

    userCardHeader: {
        flexDirection: "row",
        alignItems: "center",
        padding: 20,
        paddingBottom: 16,
    },

    userAvatarContainer: {
        position: 'relative',
        marginRight: 16,
    },

    userAvatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: "center",
        alignItems: "center",
    },

    userAvatarText: {
        fontSize: 18,
        fontWeight: "700",
        color: colors.white,
    },

    superAdminBadge: {
        position: 'absolute',
        top: -4,
        right: -4,
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: colors.warning,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: colors.card,
    },

    userMainInfo: {
        flex: 1,
    },

    userName: {
        fontSize: 16,
        fontWeight: "600",
        color: colors.text,
        marginBottom: 4,
    },

    userEmail: {
        fontSize: 14,
        color: colors.textSecondary,
    },

    userStatusContainer: {
        alignItems: 'flex-end',
    },

    userCardContent: {
        paddingHorizontal: 20,
        paddingBottom: 16,
    },

    userMetadata: {
        flexDirection: "row",
        alignItems: "center",
        gap: 16,
        marginBottom: 8,
    },

    roleContainer: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: colors.primary + "15",
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 12,
        gap: 6,
    },

    roleText: {
        fontSize: 12,
        fontWeight: "600",
        color: colors.primary,
        textTransform: 'capitalize',
    },

    permissionCount: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: colors.warning + "15",
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 12,
        gap: 6,
    },

    permissionCountText: {
        fontSize: 12,
        fontWeight: "500",
        color: colors.warning,
    },

    superAdminNote: {
        backgroundColor: colors.warning + "08",
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.warning + "20",
        marginTop: 8,
    },

    superAdminNoteText: {
        fontSize: 12,
        fontStyle: 'italic',
        color: colors.warning,
        textAlign: 'center',
    },

    actionIndicator: {
        position: 'absolute',
        top: 20,
        right: 20,
        padding: 8,
    },

    // Modern Role Card Styles
    modernRoleCard: {
        backgroundColor: colors.card,
        borderRadius: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: colors.border + "30",
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
    },

    roleCardHeader: {
        flexDirection: "row",
        alignItems: "center",
        padding: 20,
        paddingBottom: 16,
    },

    roleIconContainer: {
        marginRight: 16,
    },

    roleIcon: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: "center",
        alignItems: "center",
    },

    roleInfo: {
        flex: 1,
    },

    roleName: {
        fontSize: 16,
        fontWeight: "600",
        color: colors.text,
        marginBottom: 4,
    },

    roleDescription: {
        fontSize: 14,
        color: colors.textSecondary,
        lineHeight: 20,
    },

    roleActions: {
        flexDirection: "row",
        gap: 8,
    },

    roleActionButton: {
        padding: 8,
        borderRadius: 8,
        backgroundColor: colors.backgroundSecondary,
    },

    roleCardContent: {
        paddingHorizontal: 20,
        paddingBottom: 20,
    },

    roleMetadata: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },

    permissionCountBadge: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: colors.primary + "15",
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 12,
        gap: 6,
    },

    permissionCountBadgeText: {
        fontSize: 12,
        fontWeight: "500",
        color: colors.primary,
    },

    systemRoleBadge: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: colors.info + "15",
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 10,
        gap: 4,
    },

    systemRoleText: {
        fontSize: 10,
        fontWeight: "600",
        color: colors.info,
        textTransform: 'uppercase',
    },

    // Modern Category Card Styles
    modernCategoryCard: {
        backgroundColor: colors.card,
        borderRadius: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: colors.border + "30",
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
    },

    categoryCardHeader: {
        flexDirection: "row",
        alignItems: "center",
        padding: 20,
        paddingBottom: 16,
    },

    categoryIconContainer: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: colors.primary + "15",
        justifyContent: "center",
        alignItems: "center",
        marginRight: 16,
    },

    categoryInfo: {
        flex: 1,
    },

    categoryName: {
        fontSize: 16,
        fontWeight: "600",
        color: colors.text,
        marginBottom: 4,
    },

    categoryDescription: {
        fontSize: 14,
        color: colors.textSecondary,
        lineHeight: 20,
    },

    categoryStats: {
        alignItems: 'flex-end',
    },

    categoryStatsText: {
        fontSize: 12,
        fontWeight: "500",
        color: colors.textSecondary,
    },

    categoryPermissions: {
        paddingHorizontal: 20,
        paddingBottom: 20,
        gap: 8,
    },

    permissionPreview: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: colors.backgroundSecondary,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        gap: 8,
    },

    permissionLevelBadge: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        backgroundColor: colors.background,
    },

    permissionLevelText: {
        fontSize: 10,
        fontWeight: "700",
        textTransform: 'uppercase',
    },

    permissionPreviewName: {
        fontSize: 13,
        color: colors.text,
        flex: 1,
    },

    morePermissionsText: {
        fontSize: 12,
        color: colors.textSecondary,
        fontStyle: 'italic',
        textAlign: 'center',
        marginTop: 4,
    },

    // Original statistics styles continue here
    originalStatsContainer: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 12,
        marginBottom: 24,
    },

    // Header styles
    headerActions: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    subsectionTitle: {
        fontSize: 16,
        fontWeight: "600",
        color: colors.text,
        marginBottom: 12,
    },

    // Permission navigation styles
    permissionNavContainer: {
        marginBottom: 20,
    },
    permissionNavTabs: {
        flexDirection: "row",
        backgroundColor: colors.card,
        borderRadius: 12,
        padding: 4,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    permissionNavTab: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 8,
        gap: 8,
    },
    permissionNavTabActive: {
        backgroundColor: colors.primary + "15",
    },
    permissionNavTabText: {
        fontSize: 14,
        fontWeight: "500",
        color: colors.textSecondary,
    },
    permissionNavTabTextActive: {
        color: colors.primary,
        fontWeight: "600",
    },

    // User card styles
    usersList: {
        gap: 12,
    },

    // Role list styles
    rolesList: {
        gap: 12,
    },
    enhancedUserCard: {
        backgroundColor: colors.card,
        borderRadius: 20,
        padding: 24,
        marginBottom: 20,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
        elevation: 8,
        borderWidth: 1,
        borderColor: colors.border + "20",
        position: "relative",
        overflow: "hidden",
    },
    cardGradient: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        borderRadius: 20,
        opacity: 0.6,
    },
    enhancedUserHeader: {
        flexDirection: "row",
        alignItems: "flex-start",
        marginBottom: 16,
    },
    enhancedUserAvatarContainer: {
        position: "relative",
        marginRight: 20,
    },
    enhancedUserAvatar: {
        width: 56,
        height: 56,
        borderRadius: 28,
        alignItems: "center",
        justifyContent: "center",
        marginRight: 12,
        borderWidth: 3,
        borderColor: "white",
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    enhancedUserAvatarText: {
        fontSize: 18,
        fontWeight: "800",
        color: "white",
        textShadowColor: "rgba(0,0,0,0.3)",
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
    },
    userStatusBadge: {
        position: "absolute",
        top: -4,
        right: -4,
        zIndex: 2,
    },
    enhancedUserInfo: {
        flex: 1,
    },
    userNameRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 4,
    },
    enhancedUserName: {
        fontSize: 18,
        fontWeight: "700",
        color: colors.text,
        marginBottom: 4,
        letterSpacing: -0.5,
    },
    enhancedUserEmail: {
        fontSize: 14,
        color: colors.textSecondary,
        marginBottom: 8,
        opacity: 0.8,
    },
    userActionButton: {
        padding: 6,
        borderRadius: 6,
        backgroundColor: colors.primary + "15",
    },
    userRoleContainer: {
        marginTop: 8,
    },
    roleTag: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        alignSelf: "flex-start",
        gap: 4,
    },
    roleTagText: {
        fontSize: 12,
        fontWeight: "600",
    },

    // User permissions styles
    enhancedUserPermissions: {
        marginBottom: 16,
    },
    permissionsHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 12,
    },
    permissionsLabel: {
        fontSize: 12,
        fontWeight: "600",
        color: colors.text,
        marginBottom: 6,
    },
    viewAllButton: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        backgroundColor: colors.primary + "10",
    },
    viewAllButtonText: {
        fontSize: 11,
        fontWeight: "500",
        color: colors.primary,
    },
    enhancedPermissionTags: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 10,
    },
    enhancedPermissionTag: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12,
        backgroundColor: colors.background,
        borderWidth: 1.5,
        gap: 6,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    enhancedPermissionTagText: {
        fontSize: 11,
        fontWeight: "600",
        color: colors.text,
    },
    morePermissionsTag: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        backgroundColor: colors.textSecondary + "20",
        alignItems: "center",
        justifyContent: "center",
    },
    enhancedMorePermissionsText: {
        fontSize: 11,
        fontWeight: "500",
        color: colors.textSecondary,
    },

    // User footer styles
    enhancedUserFooter: {
        borderTopWidth: 1,
        borderTopColor: colors.border + "20",
        paddingTop: 12,
    },
    userMetrics: {
        flexDirection: "row",
        gap: 20,
    },
    userMetric: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
    },
    userMetricText: {
        fontSize: 11,
        color: colors.textSecondary,
    },

    // Role card styles
    enhancedRolesList: {
        gap: 16,
    },
    roleCard: {
        backgroundColor: colors.card,
        borderRadius: 16,
        padding: 20,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 8,
        elevation: 4,
        borderWidth: 1,
        borderColor: colors.border + "30",
    },
    roleHeader: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 16,
    },
    enhancedRoleIconContainer: {
        marginRight: 16,
    },
    enhancedRoleIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: "center",
        justifyContent: "center",
    },
    enhancedRoleInfo: {
        flex: 1,
    },
    enhancedRoleName: {
        fontSize: 18,
        fontWeight: "700",
        color: colors.text,
        marginBottom: 4,
    },
    enhancedRoleDescription: {
        fontSize: 14,
        color: colors.textSecondary,
        lineHeight: 20,
    },
    enhancedRoleActions: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    enhancedSystemRoleBadge: {
        backgroundColor: colors.warning + "20",
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    enhancedSystemRoleText: {
        fontSize: 10,
        fontWeight: "600",
        color: colors.warning,
    },
    enhancedRoleActionButton: {
        padding: 8,
        borderRadius: 8,
        backgroundColor: colors.background,
        borderWidth: 1,
        borderColor: colors.border + "30",
    },

    // Role permissions styles
    rolePermissions: {
        marginBottom: 16,
    },
    rolePermissionsLabel: {
        fontSize: 14,
        fontWeight: "600",
        color: colors.text,
        marginBottom: 12,
    },
    rolePermissionsList: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
    },
    rolePermissionItem: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        backgroundColor: colors.background,
        borderWidth: 1,
        borderColor: colors.border + "30",
        gap: 6,
    },
    rolePermissionText: {
        fontSize: 11,
        fontWeight: "500",
        color: colors.text,
    },
    rolePermissionMore: {
        fontSize: 11,
        fontWeight: "500",
        color: colors.textSecondary,
        fontStyle: "italic",
    },
    roleFooter: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        borderTopWidth: 1,
        borderTopColor: colors.border + "20",
        paddingTop: 16,
    },
    roleUsageText: {
        fontSize: 12,
        color: colors.textSecondary,
    },
    viewRoleButton: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        backgroundColor: colors.primary + "10",
    },
    viewRoleButtonText: {
        fontSize: 11,
        fontWeight: "500",
        color: colors.primary,
    },

    // Permission categories styles
    permissionCategoriesList: {
        gap: 20,
    },
    permissionCategoryCard: {
        backgroundColor: colors.card,
        borderRadius: 16,
        padding: 20,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 8,
        elevation: 4,
        borderWidth: 1,
        borderColor: colors.border + "30",
    },
    permissionCategoryHeader: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 20,
    },
    detailCategoryIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: colors.primary + "15",
        alignItems: "center",
        justifyContent: "center",
        marginRight: 16,
    },
    detailCategoryInfo: {
        flex: 1,
    },
    detailCategoryName: {
        fontSize: 18,
        fontWeight: "700",
        color: colors.text,
        marginBottom: 4,
    },
    detailCategoryDescription: {
        fontSize: 14,
        color: colors.textSecondary,
        lineHeight: 20,
    },
    detailCategoryStats: {
        alignItems: "flex-end",
    },
    detailCategoryStatsText: {
        fontSize: 12,
        fontWeight: "600",
        color: colors.primary,
    },
    detailCategoryPermissions: {
        gap: 12,
    },

    // Permission detail styles
    permissionDetailItem: {
        backgroundColor: colors.background,
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.border + "30",
    },
    permissionDetailHeader: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 8,
        gap: 12,
    },
    detailPermissionLevelBadge: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        backgroundColor: colors.background,
        borderWidth: 1,
        borderColor: colors.border + "30",
        gap: 4,
    },
    detailPermissionLevelText: {
        fontSize: 10,
        fontWeight: "700",
    },
    permissionDetailName: {
        fontSize: 15,
        fontWeight: "600",
        color: colors.text,
        flex: 1,
    },
    permissionDetailDescription: {
        fontSize: 13,
        color: colors.textSecondary,
        lineHeight: 18,
        marginBottom: 8,
    },
    permissionUsage: {
        borderTopWidth: 1,
        borderTopColor: colors.border + "20",
        paddingTop: 8,
    },
    permissionUsageText: {
        fontSize: 11,
        color: colors.textSecondary,
        fontStyle: "italic",
    },

    // Alert styles
    alertsList: {
        gap: 12,
    },
    alertWrapper: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    deleteAlertButton: {
        padding: 8,
        borderRadius: 8,
        backgroundColor: colors.danger + "20",
    },

    // Activity styles
    activityList: {
        gap: 12,
    },
    activityItem: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: colors.card,
        padding: 12,
        borderRadius: 8,
        gap: 12,
    },
    activityIcon: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: colors.primary + "20",
        alignItems: "center",
        justifyContent: "center",
    },
    activityContent: {
        flex: 1,
    },
    activityAction: {
        fontSize: 14,
        fontWeight: "500",
        color: colors.text,
        marginBottom: 2,
    },
    activityDetails: {
        fontSize: 12,
        color: colors.textSecondary,
        marginBottom: 2,
    },
    activityUser: {
        fontSize: 10,
        color: colors.textSecondary,
    },
    activityTime: {
        alignItems: "flex-end",
    },
    activityTimeText: {
        fontSize: 10,
        color: colors.textSecondary,
    },

    // System status styles
    systemStatusContainer: {
        marginBottom: 24,
    },
    statusHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 16,
    },
    statusIndicator: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: colors.success,
    },
    statusText: {
        fontSize: 12,
        fontWeight: "500",
        color: colors.success,
    },
    statusGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 12,
    },
    statusCard: {
        flex: 1,
        minWidth: "48%",
        backgroundColor: colors.card,
        borderRadius: 12,
        padding: 16,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    statusCardHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        marginBottom: 12,
    },
    statusCardTitle: {
        fontSize: 14,
        fontWeight: "600",
        color: colors.text,
    },
    statusCardValue: {
        fontSize: 18,
        fontWeight: "700",
        color: colors.primary,
        marginBottom: 4,
    },
    statusCardMetric: {
        fontSize: 12,
        color: colors.textSecondary,
        marginBottom: 12,
    },
    statusCardFooter: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    statusCardTime: {
        fontSize: 10,
        color: colors.textSecondary,
        fontStyle: "italic",
    },

    // Reports styles
    reportsList: {
        gap: 12,
        marginTop: 16,
    },
    reportItem: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: colors.card,
        padding: 16,
        borderRadius: 12,
        gap: 12,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    reportIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: colors.primary + "20",
        alignItems: "center",
        justifyContent: "center",
    },
    reportInfo: {
        flex: 1,
    },
    reportTitle: {
        fontSize: 16,
        fontWeight: "600",
        color: colors.text,
        marginBottom: 4,
    },
    reportDescription: {
        fontSize: 14,
        color: colors.textSecondary,
    },

    // No permission styles
    noPermissionContainer: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        padding: 64,
        gap: 16,
    },
    noPermissionText: {
        fontSize: 16,
        color: colors.textSecondary,
        textAlign: "center",
        maxWidth: 250,
    },

    // Modal styles (will be used in modal components)
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        justifyContent: "center",
        alignItems: "center",
    },
    modal: {
        backgroundColor: colors.card,
        borderRadius: 20,
        margin: 20,
        maxHeight: "80%",
        width: "90%",
    },
    enhancedModal: {
        backgroundColor: colors.card,
        borderRadius: 20,
        margin: 20,
        maxHeight: "85%",
        width: "92%",
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25,
        shadowRadius: 20,
        elevation: 8,
    },
    modalHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: colors.text,
    },
    modalSubtitle: {
        fontSize: 14,
        color: colors.textSecondary,
        marginTop: 2,
    },
    modalTitleContainer: {
        flex: 1,
    },
    modalContent: {
        padding: 20,
        maxHeight: 400,
    },
    modalActions: {
        flexDirection: "row",
        justifyContent: "flex-end",
        gap: 12,
        padding: 20,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },

    // Security styles
    securityContainer: {
        marginBottom: 24,
    },
    securityHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 16,
    },
    securityGrid: {
        backgroundColor: colors.card,
        borderRadius: 12,
        padding: 16,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    securityItem: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: colors.border + "30",
        gap: 12,
    },
    securityLabel: {
        flex: 1,
        fontSize: 14,
        fontWeight: "500",
        color: colors.text,
    },
    securityStatus: {
        fontSize: 12,
        color: colors.textSecondary,
    },

    // Enhanced Actions styles
    enhancedActionsContainer: {
        marginBottom: 24,
    },
    actionsGrid: {
        gap: 20,
        marginBottom: 20,
    },
    actionCategory: {
        backgroundColor: colors.card,
        borderRadius: 12,
        padding: 16,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    actionCategoryTitle: {
        fontSize: 14,
        fontWeight: "600",
        color: colors.text,
        marginBottom: 12,
    },
    actionRow: {
        flexDirection: "row",
        gap: 12,
    },
    enhancedActionCard: {
        flex: 1,
        backgroundColor: colors.background,
        borderRadius: 8,
        padding: 12,
        alignItems: "center",
        borderWidth: 1,
        borderColor: colors.border + "30",
    },
    actionCardIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.primary + "15",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 8,
    },
    actionCardTitle: {
        fontSize: 12,
        fontWeight: "600",
        color: colors.text,
        textAlign: "center",
        marginBottom: 4,
    },
    actionCardDescription: {
        fontSize: 10,
        color: colors.textSecondary,
        textAlign: "center",
        marginBottom: 4,
    },
    actionCardTime: {
        fontSize: 9,
        color: colors.textSecondary,
        textAlign: "center",
        fontStyle: "italic",
    },
    quickActionsBar: {
        flexDirection: "row",
        gap: 8,
        backgroundColor: colors.card,
        borderRadius: 12,
        padding: 16,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    quickActionButton: {
        flex: 1,
        flexShrink: 1,
        minWidth: 0,
    },

    // Settings modal styles
    settingSection: {
        marginBottom: 24,
    },
    settingSectionTitle: {
        fontSize: 16,
        fontWeight: "600",
        color: colors.text,
        marginBottom: 12,
    },
    settingItem: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.border + "30",
    },
    settingLabel: {
        fontSize: 14,
        color: colors.text,
        flex: 1,
    },

    // Enhanced modal styles for permissions and roles
    sectionTitle: {
        fontSize: 16,
        fontWeight: "700",
        color: colors.text,
        marginBottom: 4,
    },
    sectionSubtitle: {
        fontSize: 13,
        color: colors.textSecondary,
        marginBottom: 16,
        lineHeight: 18,
    },

    // Role template section styles
    roleTemplateSection: {
        marginBottom: 24,
    },
    roleTemplateList: {
        gap: 12,
    },
    roleTemplateItem: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: colors.background,
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.border + "30",
    },
    roleTemplateItemActive: {
        borderColor: colors.primary,
        backgroundColor: colors.primary + "10",
    },
    roleTemplateIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: "center",
        justifyContent: "center",
        marginRight: 12,
    },
    roleTemplateInfo: {
        flex: 1,
    },
    roleTemplateName: {
        fontSize: 14,
        fontWeight: "600",
        color: colors.text,
        marginBottom: 2,
    },
    roleTemplateDescription: {
        fontSize: 12,
        color: colors.textSecondary,
        marginBottom: 4,
        lineHeight: 16,
    },
    roleTemplateCount: {
        fontSize: 11,
        color: colors.primary,
        fontWeight: "500",
    },

    // Enhanced permissions section styles
    enhancedPermissionsSection: {
        marginBottom: 24,
    },
    permissionCategorySection: {
        backgroundColor: colors.background,
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: colors.border + "20",
    },
    categorySectionHeader: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 16,
    },
    categoryHeaderIcon: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: colors.primary + "15",
        alignItems: "center",
        justifyContent: "center",
        marginRight: 12,
    },
    categoryHeaderInfo: {
        flex: 1,
    },
    categorySectionTitle: {
        fontSize: 14,
        fontWeight: "600",
        color: colors.text,
        marginBottom: 2,
    },
    categorySectionDescription: {
        fontSize: 11,
        color: colors.textSecondary,
        lineHeight: 14,
    },
    categoryPermissionCount: {
        alignItems: "flex-end",
    },
    categoryCountText: {
        fontSize: 12,
        fontWeight: "600",
        color: colors.primary,
    },
    categoryPermissionsList: {
        gap: 12,
    },
    enhancedPermissionCheckboxItem: {
        backgroundColor: colors.card,
        borderRadius: 8,
        padding: 12,
        borderWidth: 1,
        borderColor: colors.border + "20",
    },
    permissionCheckboxContainer: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 12,
    },
    enhancedCheckbox: {
        width: 20,
        height: 20,
        borderRadius: 6,
        borderWidth: 2,
        borderColor: colors.border,
        backgroundColor: colors.background,
        alignItems: "center",
        justifyContent: "center",
        marginTop: 2,
    },
    enhancedCheckboxChecked: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    enhancedPermissionInfo: {
        flex: 1,
    },
    permissionNameRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 6,
    },
    enhancedPermissionName: {
        fontSize: 14,
        fontWeight: "600",
        color: colors.text,
        flex: 1,
        marginRight: 8,
    },
    enhancedPermissionDescription: {
        fontSize: 12,
        color: colors.textSecondary,
        lineHeight: 16,
    },

    // Enhanced permission summary styles
    enhancedPermissionSummary: {
        backgroundColor: colors.primary + "05",
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: colors.primary + "20",
    },
    summaryHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 16,
    },
    permissionSummaryTitle: {
        fontSize: 14,
        fontWeight: "600",
        color: colors.text,
        marginBottom: 12,
    },
    summaryCount: {
        fontSize: 12,
        fontWeight: "500",
        color: colors.primary,
    },
    summaryCategories: {
        gap: 12,
    },
    summaryCategoryItem: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    summaryCategoryName: {
        fontSize: 12,
        fontWeight: "500",
        color: colors.text,
        flex: 1,
    },
    summaryCategoryCount: {
        fontSize: 11,
        fontWeight: "600",
        color: colors.primary,
        minWidth: 40,
        textAlign: "right",
    },
    summaryCategoryBar: {
        width: 60,
        height: 6,
        backgroundColor: colors.background,
        borderRadius: 3,
        overflow: "hidden",
    },
    summaryCategoryBarFill: {
        height: "100%",
        backgroundColor: colors.primary,
        borderRadius: 3,
    },

    // Role creation modal styles
    roleBasicInfoSection: {
        marginBottom: 24,
    },
    inputContainer: {
        marginBottom: 16,
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: "600",
        color: colors.text,
        marginBottom: 8,
    },
    rolePermissionsSection: {
        marginBottom: 24,
    },
    selectAllButton: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        backgroundColor: colors.primary + "15",
        borderWidth: 1,
        borderColor: colors.primary + "30",
    },
    selectAllButtonText: {
        fontSize: 11,
        fontWeight: "600",
        color: colors.primary,
    },
    roleCreationSummary: {
        backgroundColor: colors.background,
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: colors.border + "30",
    },
    summaryTitle: {
        fontSize: 14,
        fontWeight: "600",
        color: colors.text,
        marginBottom: 12,
    },
    summaryDetails: {
        gap: 8,
    },
    summaryDetailText: {
        fontSize: 13,
        color: colors.textSecondary,
        lineHeight: 18,
    },
    summaryDetailLabel: {
        fontWeight: "600",
        color: colors.text,
    },
}); 