import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Shield, CheckCircle, XCircle, Calendar, Clock } from "lucide-react-native";
import { colors } from "@/constants/adminColors";
import { Permission, UserPermission } from "@/types/permissions";

interface PermissionItemProps {
    permission: Permission;
    userPermission?: UserPermission;
    onGrant?: (permissionId: string) => void;
    onRevoke?: (permissionId: string) => void;
    showActions?: boolean;
}

export default function PermissionItem({
    permission,
    userPermission,
    onGrant,
    onRevoke,
    showActions = true
}: PermissionItemProps) {
    const hasPermission = userPermission?.is_active || false;

    const getCategoryColor = (category: string) => {
        const categoryColors: Record<string, string> = {
            dashboard: '#6366F1',
            bookings: '#8B5CF6',
            operations: '#10B981',
            content: '#F59E0B',
            users: '#3B82F6',
            finance: '#EF4444',
            communications: '#06B6D4',
            reports: '#84CC16',
            settings: '#6B7280',
            system: '#1F2937',
        };
        return categoryColors[category] || colors.textSecondary;
    };

    const getLevelColor = (level: string) => {
        const levelColors: Record<string, string> = {
            view: '#10B981',
            create: '#3B82F6',
            update: '#F59E0B',
            delete: '#EF4444',
            manage: '#8B5CF6',
            export: '#06B6D4',
            send: '#84CC16',
            approve: '#F97316',
            cancel: '#EF4444',
        };
        return levelColors[level] || colors.textSecondary;
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return new Intl.DateTimeFormat('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        }).format(date);
    };

    const handleGrant = () => {
        if (onGrant) onGrant(permission.id);
    };

    const handleRevoke = () => {
        if (onRevoke) onRevoke(permission.id);
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View style={styles.iconContainer}>
                    <Shield size={20} color={getCategoryColor(permission.category)} />
                </View>

                <View style={styles.content}>
                    <View style={styles.titleRow}>
                        <Text style={styles.name} numberOfLines={1}>{permission.name}</Text>
                        {hasPermission && (
                            <View style={styles.grantedBadge}>
                                <CheckCircle size={14} color={colors.success} />
                                <Text style={styles.grantedText}>Granted</Text>
                            </View>
                        )}
                    </View>

                    <Text style={styles.description} numberOfLines={2}>
                        {permission.description}
                    </Text>

                    <View style={styles.tags}>
                        <View style={[styles.categoryTag, { backgroundColor: getCategoryColor(permission.category) + '15' }]}>
                            <Text style={[styles.categoryText, { color: getCategoryColor(permission.category) }]}>
                                {permission.category}
                            </Text>
                        </View>
                        <View style={[styles.levelTag, { backgroundColor: getLevelColor(permission.action) + '15' }]}>
                            <Text style={[styles.levelText, { color: getLevelColor(permission.action) }]}>
                                {permission.action}
                            </Text>
                        </View>
                    </View>
                </View>

                {showActions && (
                    <View style={styles.actions}>
                        {hasPermission ? (
                            <TouchableOpacity
                                style={styles.revokeButton}
                                onPress={handleRevoke}
                                activeOpacity={0.7}
                            >
                                <XCircle size={16} color={colors.danger} />
                                <Text style={styles.revokeText}>Revoke</Text>
                            </TouchableOpacity>
                        ) : (
                            <TouchableOpacity
                                style={styles.grantButton}
                                onPress={handleGrant}
                                activeOpacity={0.7}
                            >
                                <CheckCircle size={16} color={colors.success} />
                                <Text style={styles.grantText}>Grant</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                )}
            </View>

            {userPermission && (
                <View style={styles.meta}>
                    <View style={styles.metaItem}>
                        <Calendar size={12} color={colors.textTertiary} />
                        <Text style={styles.metaText}>
                            Granted: {formatDate(userPermission.granted_at)}
                        </Text>
                    </View>
                    {userPermission.expires_at && (
                        <View style={styles.metaItem}>
                            <Clock size={12} color={colors.textTertiary} />
                            <Text style={styles.metaText}>
                                Expires: {formatDate(userPermission.expires_at)}
                            </Text>
                        </View>
                    )}
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: colors.card,
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
        borderWidth: 1,
        borderColor: colors.borderLight,
    },
    header: {
        flexDirection: "row",
        alignItems: "flex-start",
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.primaryLight,
        alignItems: "center",
        justifyContent: "center",
        marginRight: 12,
        borderWidth: 1,
        borderColor: colors.primary + '20',
    },
    content: {
        flex: 1,
        marginRight: 12,
    },
    titleRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: 6,
    },
    name: {
        fontSize: 16,
        fontWeight: "600",
        color: colors.text,
        flex: 1,
        marginRight: 8,
        lineHeight: 20,
    },
    grantedBadge: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: colors.successLight,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        gap: 4,
    },
    grantedText: {
        fontSize: 12,
        fontWeight: "600",
        color: colors.success,
    },
    description: {
        fontSize: 14,
        color: colors.textSecondary,
        lineHeight: 18,
        marginBottom: 12,
    },
    tags: {
        flexDirection: "row",
        gap: 8,
    },
    categoryTag: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    categoryText: {
        fontSize: 12,
        fontWeight: "600",
        textTransform: "capitalize",
    },
    levelTag: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    levelText: {
        fontSize: 12,
        fontWeight: "600",
        textTransform: "capitalize",
    },
    actions: {
        alignItems: "center",
        justifyContent: "center",
    },
    grantButton: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: colors.successLight,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        gap: 6,
    },
    grantText: {
        fontSize: 14,
        fontWeight: "600",
        color: colors.success,
    },
    revokeButton: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: colors.dangerLight,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        gap: 6,
    },
    revokeText: {
        fontSize: 14,
        fontWeight: "600",
        color: colors.danger,
    },
    meta: {
        borderTopWidth: 1,
        borderTopColor: colors.border,
        paddingTop: 12,
        marginTop: 12,
        gap: 6,
    },
    metaItem: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },
    metaText: {
        fontSize: 12,
        color: colors.textTertiary,
        fontWeight: "500",
    },
}); 