import React from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Dimensions,
} from "react-native";
import { colors } from "@/constants/adminColors";
import { Promotion } from "@/types/content";
import {
    Percent,
    Calendar,
    Tag,
    Edit,
    Trash2,
    Clock,
    CheckCircle,
    XCircle,
    Copy,
    Users,
} from "lucide-react-native";

const { width: screenWidth } = Dimensions.get('window');
const isTablet = screenWidth >= 768;

interface PromotionItemProps {
    promotion: Promotion;
    onPress: (id: string) => void;
    onEdit?: (id: string) => void;
    onDelete?: (id: string) => void;
    onDuplicate?: (id: string) => void;
    showActions?: boolean;
}

const PromotionItem: React.FC<PromotionItemProps> = ({
    promotion,
    onPress,
    onEdit,
    onDelete,
    onDuplicate,
    showActions = true,
}) => {
    const handlePress = () => {
        onPress(promotion.id);
    };

    const handleEdit = () => {
        onEdit?.(promotion.id);
    };

    const handleDelete = () => {
        onDelete?.(promotion.id);
    };

    const handleDuplicate = () => {
        onDuplicate?.(promotion.id);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString();
    };

    const isActive = promotion.is_active;
    const isExpired = new Date(promotion.end_date) < new Date();
    const isUpcoming = new Date(promotion.start_date) > new Date();
    const isCurrent = !isExpired && !isUpcoming && isActive;

    const getStatusColor = () => {
        if (isExpired) return colors.error;
        if (isUpcoming) return colors.warning;
        if (isCurrent) return colors.success;
        return colors.textSecondary;
    };

    const getStatusIcon = () => {
        if (isExpired) return XCircle;
        if (isUpcoming) return Clock;
        if (isCurrent) return CheckCircle;
        return XCircle;
    };

    const getStatusText = () => {
        if (isExpired) return 'Expired';
        if (isUpcoming) return 'Upcoming';
        if (isCurrent) return 'Active';
        return 'Inactive';
    };

    const StatusIcon = getStatusIcon();

    const truncateDescription = (description: string, maxLength: number = 120) => {
        if (description.length <= maxLength) return description;
        return description.substring(0, maxLength) + '...';
    };

    return (
        <TouchableOpacity
            style={styles.container}
            onPress={handlePress}
            activeOpacity={0.7}
        >
            <View style={styles.content}>
                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.iconContainer}>
                        <Percent
                            size={20}
                            color={isActive ? colors.primary : colors.textSecondary}
                        />
                    </View>

                    <View style={styles.headerInfo}>
                        <Text style={styles.title} numberOfLines={2}>
                            {promotion.name}
                        </Text>

                        <View style={styles.metaRow}>
                            <View style={styles.discountContainer}>
                                <Tag size={12} color={colors.success} />
                                <Text style={styles.discount}>{promotion.discount_percentage}% OFF</Text>
                            </View>

                            <View style={styles.statusContainer}>
                                <StatusIcon
                                    size={12}
                                    color={getStatusColor()}
                                />
                                <Text style={[styles.status, { color: getStatusColor() }]}>
                                    {getStatusText()}
                                </Text>
                            </View>
                        </View>
                    </View>

                    {showActions && (
                        <View style={styles.actionsContainer}>
                            {onDuplicate && (
                                <TouchableOpacity
                                    style={styles.actionButton}
                                    onPress={handleDuplicate}
                                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                >
                                    <Copy size={16} color={colors.textSecondary} />
                                </TouchableOpacity>
                            )}

                            {onEdit && (
                                <TouchableOpacity
                                    style={styles.actionButton}
                                    onPress={handleEdit}
                                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                >
                                    <Edit size={16} color={colors.primary} />
                                </TouchableOpacity>
                            )}

                            {onDelete && (
                                <TouchableOpacity
                                    style={styles.actionButton}
                                    onPress={handleDelete}
                                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                >
                                    <Trash2 size={16} color={colors.error} />
                                </TouchableOpacity>
                            )}
                        </View>
                    )}
                </View>

                {/* Description Preview */}
                {promotion.description && (
                    <View style={styles.contentPreview}>
                        <Text style={styles.contentText} numberOfLines={3}>
                            {truncateDescription(promotion.description)}
                        </Text>
                    </View>
                )}

                {/* Footer */}
                <View style={styles.footer}>
                    <View style={styles.footerLeft}>
                        <View style={styles.dateContainer}>
                            <Calendar size={12} color={colors.textSecondary} />
                            <Text style={styles.date}>
                                {formatDate(promotion.start_date)} - {formatDate(promotion.end_date)}
                            </Text>
                        </View>

                        {promotion.is_first_time_booking_only && (
                            <View style={styles.specialContainer}>
                                <Users size={12} color={colors.secondary} />
                                <Text style={styles.special}>First-time booking only</Text>
                            </View>
                        )}
                    </View>

                    <View style={styles.footerRight}>
                        <View style={styles.timestampContainer}>
                            <Clock size={12} color={colors.textSecondary} />
                            <Text style={styles.timestamp}>
                                {formatDate(promotion.updated_at || promotion.created_at)}
                            </Text>
                        </View>
                    </View>
                </View>
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: colors.card,
        borderRadius: 12,
        marginBottom: 12,
        marginHorizontal: isTablet ? 0 : 16,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
        overflow: 'hidden',
    },
    content: {
        padding: 16,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.primary + '10',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    headerInfo: {
        flex: 1,
        gap: 6,
    },
    title: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text,
        lineHeight: 22,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    discountContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: colors.success + '15',
        borderRadius: 12,
        paddingHorizontal: 8,
        paddingVertical: 2,
    },
    discount: {
        fontSize: 12,
        color: colors.success,
        fontWeight: '600',
    },
    statusContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    status: {
        fontSize: 12,
        fontWeight: '500',
    },
    actionsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    actionButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: colors.backgroundSecondary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    contentPreview: {
        marginBottom: 12,
        paddingHorizontal: 4,
    },
    contentText: {
        fontSize: 14,
        color: colors.textSecondary,
        lineHeight: 20,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    footerLeft: {
        flex: 1,
        gap: 6,
    },
    footerRight: {
        alignItems: 'flex-end',
    },
    dateContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    date: {
        fontSize: 12,
        color: colors.textSecondary,
    },
    specialContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    special: {
        fontSize: 11,
        color: colors.secondary,
        fontWeight: '500',
    },
    timestampContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    timestamp: {
        fontSize: 11,
        color: colors.textSecondary,
    },
});

export default PromotionItem; 