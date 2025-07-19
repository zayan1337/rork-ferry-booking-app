import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
} from 'react-native';
import { colors } from '@/constants/adminColors';
import { Promotion } from '@/types/content';
import {
    Percent,
    Calendar,
    Users,
    MoreHorizontal,
    Edit3,
    Copy,
    Trash2,
    Clock,
    CheckCircle,
    XCircle,
} from 'lucide-react-native';

interface PromotionItemProps {
    promotion: Promotion;
    onPress: (promotionId: string) => void;
    onEdit?: (promotionId: string) => void;
    onDelete?: (promotionId: string) => void;
    onDuplicate?: (promotionId: string) => void;
    showActions?: boolean;
}

const PromotionItem: React.FC<PromotionItemProps> = ({
    promotion,
    onPress,
    onEdit,
    onDelete,
    onDuplicate,
    showActions = false,
}) => {
    const isActive = promotion.is_active;
    const isExpired = new Date(promotion.end_date) < new Date();
    const isUpcoming = new Date(promotion.start_date) > new Date();
    const isCurrent = !isExpired && !isUpcoming && isActive;

    const getStatusIcon = () => {
        if (isExpired) return <XCircle size={16} color={colors.error} />;
        if (isUpcoming) return <Clock size={16} color={colors.warning} />;
        if (isCurrent) return <CheckCircle size={16} color={colors.success} />;
        return <XCircle size={16} color={colors.textSecondary} />;
    };

    const getStatusText = () => {
        if (isExpired) return 'Expired';
        if (isUpcoming) return 'Upcoming';
        if (isCurrent) return 'Active';
        return 'Inactive';
    };

    const getStatusColor = () => {
        if (isExpired) return colors.error;
        if (isUpcoming) return colors.warning;
        if (isCurrent) return colors.success;
        return colors.textSecondary;
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        });
    };

    const handleQuickAction = (action: 'edit' | 'delete' | 'duplicate', event: any) => {
        event.stopPropagation();
        switch (action) {
            case 'edit':
                onEdit?.(promotion.id);
                break;
            case 'delete':
                onDelete?.(promotion.id);
                break;
            case 'duplicate':
                onDuplicate?.(promotion.id);
                break;
        }
    };

    return (
        <TouchableOpacity
            style={[
                styles.container,
                !isActive && styles.inactiveContainer,
            ]}
            onPress={() => onPress(promotion.id)}
            activeOpacity={0.7}
        >
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <View style={styles.iconContainer}>
                        <Percent size={20} color={colors.primary} />
                    </View>
                    <View style={styles.headerText}>
                        <Text style={styles.name} numberOfLines={1}>
                            {promotion.name}
                        </Text>
                        <View style={styles.metadataRow}>
                            <View style={styles.discountBadge}>
                                <Text style={styles.discountText}>
                                    {promotion.discount_percentage}% OFF
                                </Text>
                            </View>
                            <View style={styles.statusContainer}>
                                {getStatusIcon()}
                                <Text style={[styles.statusText, { color: getStatusColor() }]}>
                                    {getStatusText()}
                                </Text>
                            </View>
                        </View>
                    </View>
                </View>
                {showActions && (
                    <View style={styles.actionsContainer}>
                        <TouchableOpacity
                            style={styles.actionButton}
                            onPress={(e) => handleQuickAction('edit', e)}
                        >
                            <Edit3 size={16} color={colors.primary} />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.actionButton}
                            onPress={(e) => handleQuickAction('duplicate', e)}
                        >
                            <Copy size={16} color={colors.textSecondary} />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.actionButton}
                            onPress={(e) => handleQuickAction('delete', e)}
                        >
                            <Trash2 size={16} color={colors.error} />
                        </TouchableOpacity>
                    </View>
                )}
            </View>

            {promotion.description && (
                <Text style={styles.description} numberOfLines={2}>
                    {promotion.description}
                </Text>
            )}

            <View style={styles.footer}>
                <View style={styles.dateContainer}>
                    <Calendar size={14} color={colors.textSecondary} />
                    <Text style={styles.dateText}>
                        {formatDate(promotion.start_date)} - {formatDate(promotion.end_date)}
                    </Text>
                </View>
                {promotion.is_first_time_booking_only && (
                    <View style={styles.specialBadge}>
                        <Users size={12} color={colors.secondary} />
                        <Text style={styles.specialText}>First-time only</Text>
                    </View>
                )}
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: colors.card,
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: colors.border,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    inactiveContainer: {
        opacity: 0.7,
        backgroundColor: colors.backgroundSecondary,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    headerLeft: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.primary + '15',
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerText: {
        flex: 1,
    },
    name: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 4,
    },
    metadataRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    discountBadge: {
        backgroundColor: colors.success + '15',
        borderRadius: 12,
        paddingHorizontal: 8,
        paddingVertical: 2,
    },
    discountText: {
        fontSize: 11,
        fontWeight: '600',
        color: colors.success,
    },
    statusContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    statusText: {
        fontSize: 12,
        fontWeight: '500',
    },
    actionsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    actionButton: {
        padding: 6,
        borderRadius: 6,
        backgroundColor: colors.backgroundSecondary,
    },
    description: {
        fontSize: 14,
        color: colors.textSecondary,
        lineHeight: 20,
        marginBottom: 12,
    },
    footer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    dateContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        flex: 1,
    },
    dateText: {
        fontSize: 12,
        color: colors.textSecondary,
        fontWeight: '500',
    },
    specialBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: colors.secondary + '15',
        borderRadius: 10,
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
    specialText: {
        fontSize: 10,
        fontWeight: '500',
        color: colors.secondary,
    },
});

export default PromotionItem; 