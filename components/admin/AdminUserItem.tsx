import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { User, Shield, Crown, Calendar, Activity } from "lucide-react-native";
import { colors } from "@/constants/adminColors";
import { AdminUser } from "@/types/permissions";

interface AdminUserItemProps {
    admin: AdminUser;
    onPress: (id: string) => void;
}

export default function AdminUserItem({ admin, onPress }: AdminUserItemProps) {
    const getInitials = (name: string) => {
        return name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase();
    };

    const getRoleColor = () => {
        if (admin.is_super_admin) return colors.danger;
        switch (admin.role) {
            case "admin":
                return colors.primary;
            case "agent":
                return colors.secondary;
            default:
                return colors.textSecondary;
        }
    };

    const getRoleLabel = () => {
        if (admin.is_super_admin) return 'Super Admin';
        return admin.role.charAt(0).toUpperCase() + admin.role.slice(1);
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return new Intl.DateTimeFormat('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        }).format(date);
    };

    const formatLastLogin = (lastLogin: string | null) => {
        if (!lastLogin) return 'Never';
        const date = new Date(lastLogin);
        const now = new Date();
        const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

        if (diffInDays === 0) return 'Today';
        if (diffInDays === 1) return 'Yesterday';
        if (diffInDays < 7) return `${diffInDays} days ago`;
        return formatDate(lastLogin);
    };

    return (
        <TouchableOpacity
            style={styles.container}
            onPress={() => onPress(admin.id)}
            activeOpacity={0.7}
        >
            <View style={styles.iconContainer}>
                {admin.is_super_admin ? (
                    <Crown size={20} color={colors.danger} />
                ) : (
                    <User size={20} color={colors.primary} />
                )}
            </View>

            <View style={styles.content}>
                <View style={styles.header}>
                    <Text style={styles.name} numberOfLines={1}>{admin.full_name}</Text>
                    <View style={[
                        styles.statusBadge,
                        admin.is_active ? styles.statusActive : styles.statusInactive
                    ]}>
                        <View style={[
                            styles.statusDot,
                            { backgroundColor: admin.is_active ? colors.success : colors.textSecondary }
                        ]} />
                        <Text style={[
                            styles.statusText,
                            admin.is_active ? styles.statusTextActive : styles.statusTextInactive
                        ]}>
                            {admin.is_active ? 'Active' : 'Inactive'}
                        </Text>
                    </View>
                </View>

                <View style={styles.details}>
                    <View style={styles.detailRow}>
                        <View style={[styles.roleBadge, { backgroundColor: getRoleColor() + '15' }]}>
                            {admin.is_super_admin ? (
                                <Crown size={12} color={getRoleColor()} />
                            ) : (
                                <Shield size={12} color={getRoleColor()} />
                            )}
                            <Text style={[styles.roleText, { color: getRoleColor() }]}>
                                {getRoleLabel()}
                            </Text>
                        </View>
                        <View style={styles.permissionCount}>
                            <Activity size={12} color={colors.textTertiary} />
                            <Text style={styles.permissionCountText}>
                                {admin.total_permission_count} permissions
                            </Text>
                        </View>
                    </View>

                    <View style={styles.metaRow}>
                        <Calendar size={12} color={colors.textTertiary} />
                        <Text style={styles.lastLogin}>
                            Last login: {formatLastLogin(admin.last_login)}
                        </Text>
                    </View>
                </View>
            </View>

            <View style={styles.chevron}>
                <View style={styles.chevronIcon} />
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: colors.card,
        padding: 16,
        borderRadius: 16,
        marginBottom: 12,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
        borderWidth: 1,
        borderColor: colors.borderLight,
    },
    iconContainer: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: colors.primaryLight,
        alignItems: "center",
        justifyContent: "center",
        marginRight: 16,
        borderWidth: 1,
        borderColor: colors.primary + '20',
    },
    content: {
        flex: 1,
        minHeight: 60,
        justifyContent: "space-between",
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: 8,
    },
    name: {
        fontSize: 17,
        fontWeight: "700",
        color: colors.text,
        flex: 1,
        marginRight: 12,
        lineHeight: 22,
    },
    statusBadge: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 12,
        gap: 4,
    },
    statusActive: {
        backgroundColor: colors.successLight,
    },
    statusInactive: {
        backgroundColor: colors.backgroundTertiary,
    },
    statusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    statusText: {
        fontSize: 12,
        fontWeight: "600",
        letterSpacing: 0.2,
    },
    statusTextActive: {
        color: colors.success,
    },
    statusTextInactive: {
        color: colors.textSecondary,
    },
    details: {
        gap: 6,
    },
    detailRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    roleBadge: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        gap: 4,
    },
    roleText: {
        fontSize: 13,
        fontWeight: "600",
        letterSpacing: 0.1,
    },
    permissionCount: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
    },
    permissionCountText: {
        fontSize: 12,
        color: colors.textTertiary,
        fontWeight: "500",
    },
    metaRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },
    lastLogin: {
        fontSize: 12,
        color: colors.textTertiary,
        fontWeight: "500",
    },
    chevron: {
        alignItems: "center",
        justifyContent: "center",
        marginLeft: 8,
    },
    chevronIcon: {
        width: 8,
        height: 8,
        borderRightWidth: 2,
        borderTopWidth: 2,
        borderColor: colors.textTertiary,
        transform: [{ rotate: '45deg' }],
    },
}); 