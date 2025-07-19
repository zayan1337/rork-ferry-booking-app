import React from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Dimensions,
} from "react-native";
import { colors } from "@/constants/adminColors";
import { Translation } from "@/types/content";
import {
    Globe,
    Calendar,
    User,
    Edit,
    Trash2,
    MoreHorizontal,
    Tag,
    Clock,
    CheckCircle,
    XCircle,
    Copy,
    MessageSquare,
    Hash,
} from "lucide-react-native";

const { width: screenWidth } = Dimensions.get('window');
const isTablet = screenWidth >= 768;

interface TranslationItemProps {
    translation: Translation;
    onPress: (id: string) => void;
    onEdit?: (id: string) => void;
    onDelete?: (id: string) => void;
    onDuplicate?: (id: string) => void;
    showActions?: boolean;
}

const TranslationItem: React.FC<TranslationItemProps> = ({
    translation,
    onPress,
    onEdit,
    onDelete,
    onDuplicate,
    showActions = true,
}) => {
    const handlePress = () => {
        onPress(translation.id);
    };

    const handleEdit = () => {
        onEdit?.(translation.id);
    };

    const handleDelete = () => {
        onDelete?.(translation.id);
    };

    const handleDuplicate = () => {
        onDuplicate?.(translation.id);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString();
    };

    const getStatusColor = () => {
        return translation.is_active ? colors.success : colors.warning;
    };

    const getStatusIcon = () => {
        return translation.is_active ? CheckCircle : XCircle;
    };

    const StatusIcon = getStatusIcon();

    const truncateText = (text: string, maxLength: number = 100) => {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    };

    const getCharacterCount = (text: string) => {
        return text.length;
    };

    const getLanguageDisplayName = (languageCode: string) => {
        const languageMap: Record<string, string> = {
            'en': 'English',
            'dv': 'Dhivehi',
            'ar': 'Arabic',
            'hi': 'Hindi',
            'fr': 'French',
            'es': 'Spanish',
            'de': 'German',
            'zh': 'Chinese',
            'ja': 'Japanese',
            'ko': 'Korean',
        };
        return languageMap[languageCode] || languageCode.toUpperCase();
    };

    const getLanguageFlag = (languageCode: string) => {
        const flagMap: Record<string, string> = {
            'en': '🇺🇸',
            'dv': '🇲🇻',
            'ar': '🇸🇦',
            'hi': '🇮🇳',
            'fr': '🇫🇷',
            'es': '🇪🇸',
            'de': '🇩🇪',
            'zh': '🇨🇳',
            'ja': '🇯🇵',
            'ko': '🇰🇷',
        };
        return flagMap[languageCode] || '🌐';
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
                        <Globe
                            size={20}
                            color={translation.is_active ? colors.primary : colors.textSecondary}
                        />
                    </View>

                    <View style={styles.headerInfo}>
                        <Text style={styles.key} numberOfLines={1}>
                            {translation.key}
                        </Text>

                        <View style={styles.metaRow}>
                            <View style={styles.languageContainer}>
                                <Text style={styles.languageFlag}>
                                    {getLanguageFlag(translation.language_code)}
                                </Text>
                                <Text style={styles.language}>
                                    {getLanguageDisplayName(translation.language_code)}
                                </Text>
                            </View>

                            <View style={styles.statusContainer}>
                                <StatusIcon
                                    size={12}
                                    color={getStatusColor()}
                                />
                                <Text style={[styles.status, { color: getStatusColor() }]}>
                                    {translation.is_active ? 'Active' : 'Inactive'}
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

                {/* Translation Preview */}
                <View style={styles.translationPreview}>
                    <Text style={styles.translationText} numberOfLines={2}>
                        {truncateText(translation.translation)}
                    </Text>
                </View>

                {/* Context (if available) */}
                {translation.context && (
                    <View style={styles.contextContainer}>
                        <MessageSquare size={12} color={colors.textSecondary} />
                        <Text style={styles.contextText} numberOfLines={1}>
                            {translation.context}
                        </Text>
                    </View>
                )}

                {/* Footer */}
                <View style={styles.footer}>
                    <View style={styles.footerLeft}>
                        <View style={styles.statsContainer}>
                            <Text style={styles.stats}>
                                {getCharacterCount(translation.translation)} chars
                            </Text>
                        </View>
                    </View>

                    <View style={styles.footerRight}>
                        <View style={styles.timestampContainer}>
                            <Clock size={12} color={colors.textSecondary} />
                            <Text style={styles.timestamp}>
                                {formatDate(translation.updated_at || translation.created_at)}
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
    key: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text,
        fontFamily: 'monospace',
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    languageContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    languageFlag: {
        fontSize: 14,
    },
    language: {
        fontSize: 12,
        color: colors.textSecondary,
        fontWeight: '500',
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
    translationPreview: {
        marginBottom: 8,
        paddingHorizontal: 4,
    },
    translationText: {
        fontSize: 14,
        color: colors.text,
        lineHeight: 20,
        fontStyle: 'italic',
    },
    contextContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 8,
        paddingHorizontal: 4,
    },
    contextText: {
        fontSize: 12,
        color: colors.textSecondary,
        fontStyle: 'italic',
        flex: 1,
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
    },
    footerRight: {
        alignItems: 'flex-end',
    },
    statsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    stats: {
        fontSize: 11,
        color: colors.textSecondary,
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

export default TranslationItem; 