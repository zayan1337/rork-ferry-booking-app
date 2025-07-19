import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Alert,
} from 'react-native';
import { colors } from '@/constants/adminColors';
import {
    FileText,
    Globe,
    Settings,
    Eye,
    Edit3,
    Trash2,
    Clock,
    AlertCircle,
    Check,
    X,
} from 'lucide-react-native';
import { TermsAndConditions, Translation, AdminSetting } from '@/hooks/useContentManagement';

// ============================================================================
// TERMS AND CONDITIONS ITEM
// ============================================================================

interface TermsItemProps {
    terms: TermsAndConditions;
    onPress: (id: string) => void;
    onEdit?: (id: string) => void;
    onDelete?: (id: string) => void;
    showActions?: boolean;
}

export const TermsItem: React.FC<TermsItemProps> = ({
    terms,
    onPress,
    onEdit,
    onDelete,
    showActions = true,
}) => {
    const handleDelete = () => {
        Alert.alert(
            'Delete Terms',
            `Are you sure you want to delete "${terms.title}"?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => onDelete?.(terms.id),
                },
            ]
        );
    };

    return (
        <TouchableOpacity
            style={styles.itemContainer}
            onPress={() => onPress(terms.id)}
            activeOpacity={0.7}
        >
            <View style={styles.itemContent}>
                <View style={styles.itemHeader}>
                    <View style={styles.itemIcon}>
                        <FileText size={20} color={colors.primary} />
                    </View>
                    <View style={styles.itemInfo}>
                        <Text style={styles.itemTitle}>{terms.title}</Text>
                        <Text style={styles.itemSubtitle}>Version {terms.version}</Text>
                        <Text style={styles.itemMeta}>
                            Effective: {new Date(terms.effective_date).toLocaleDateString()}
                        </Text>
                    </View>
                    <View style={styles.itemStatus}>
                        {terms.is_active ? (
                            <View style={styles.statusActive}>
                                <Check size={12} color={colors.success} />
                                <Text style={styles.statusActiveText}>Active</Text>
                            </View>
                        ) : (
                            <View style={styles.statusInactive}>
                                <X size={12} color={colors.error} />
                                <Text style={styles.statusInactiveText}>Inactive</Text>
                            </View>
                        )}
                    </View>
                </View>

                {terms.content && (
                    <Text style={styles.itemDescription} numberOfLines={2}>
                        {terms.content}
                    </Text>
                )}

                <View style={styles.itemFooter}>
                    <View style={styles.itemDate}>
                        <Clock size={12} color={colors.textSecondary} />
                        <Text style={styles.itemDateText}>
                            Updated {new Date(terms.updated_at || terms.created_at).toLocaleDateString()}
                        </Text>
                    </View>

                    {showActions && (
                        <View style={styles.itemActions}>
                            <TouchableOpacity
                                style={styles.actionButton}
                                onPress={() => onPress(terms.id)}
                            >
                                <Eye size={16} color={colors.textSecondary} />
                            </TouchableOpacity>
                            {onEdit && (
                                <TouchableOpacity
                                    style={styles.actionButton}
                                    onPress={() => onEdit(terms.id)}
                                >
                                    <Edit3 size={16} color={colors.primary} />
                                </TouchableOpacity>
                            )}
                            {onDelete && (
                                <TouchableOpacity
                                    style={styles.actionButton}
                                    onPress={handleDelete}
                                >
                                    <Trash2 size={16} color={colors.error} />
                                </TouchableOpacity>
                            )}
                        </View>
                    )}
                </View>
            </View>
        </TouchableOpacity>
    );
};

// ============================================================================
// TRANSLATION ITEM
// ============================================================================

interface TranslationItemProps {
    translation: Translation;
    onPress: (id: string) => void;
    onEdit?: (id: string) => void;
    onDelete?: (id: string) => void;
    showActions?: boolean;
}

export const TranslationItem: React.FC<TranslationItemProps> = ({
    translation,
    onPress,
    onEdit,
    onDelete,
    showActions = true,
}) => {
    const handleDelete = () => {
        Alert.alert(
            'Delete Translation',
            `Are you sure you want to delete the translation for "${translation.key}"?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => onDelete?.(translation.id),
                },
            ]
        );
    };

    const getLanguageName = (code: string) => {
        const languages: Record<string, string> = {
            'en': 'English',
            'dv': 'Dhivehi',
            'ar': 'Arabic',
            'fr': 'French',
            'de': 'German',
            'es': 'Spanish',
        };
        return languages[code] || code.toUpperCase();
    };

    return (
        <TouchableOpacity
            style={styles.itemContainer}
            onPress={() => onPress(translation.id)}
            activeOpacity={0.7}
        >
            <View style={styles.itemContent}>
                <View style={styles.itemHeader}>
                    <View style={styles.itemIcon}>
                        <Globe size={20} color={colors.primary} />
                    </View>
                    <View style={styles.itemInfo}>
                        <Text style={styles.itemTitle}>{translation.key}</Text>
                        <Text style={styles.itemSubtitle}>
                            {getLanguageName(translation.language_code)}
                        </Text>
                        {translation.context && (
                            <Text style={styles.itemMeta}>Context: {translation.context}</Text>
                        )}
                    </View>
                    <View style={styles.itemStatus}>
                        {translation.is_active ? (
                            <View style={styles.statusActive}>
                                <Check size={12} color={colors.success} />
                                <Text style={styles.statusActiveText}>Active</Text>
                            </View>
                        ) : (
                            <View style={styles.statusInactive}>
                                <X size={12} color={colors.error} />
                                <Text style={styles.statusInactiveText}>Inactive</Text>
                            </View>
                        )}
                    </View>
                </View>

                <Text style={styles.translationText} numberOfLines={2}>
                    "{translation.translation}"
                </Text>

                <View style={styles.itemFooter}>
                    <View style={styles.itemDate}>
                        <Clock size={12} color={colors.textSecondary} />
                        <Text style={styles.itemDateText}>
                            Updated {new Date(translation.updated_at || translation.created_at).toLocaleDateString()}
                        </Text>
                    </View>

                    {showActions && (
                        <View style={styles.itemActions}>
                            <TouchableOpacity
                                style={styles.actionButton}
                                onPress={() => onPress(translation.id)}
                            >
                                <Eye size={16} color={colors.textSecondary} />
                            </TouchableOpacity>
                            {onEdit && (
                                <TouchableOpacity
                                    style={styles.actionButton}
                                    onPress={() => onEdit(translation.id)}
                                >
                                    <Edit3 size={16} color={colors.primary} />
                                </TouchableOpacity>
                            )}
                            {onDelete && (
                                <TouchableOpacity
                                    style={styles.actionButton}
                                    onPress={handleDelete}
                                >
                                    <Trash2 size={16} color={colors.error} />
                                </TouchableOpacity>
                            )}
                        </View>
                    )}
                </View>
            </View>
        </TouchableOpacity>
    );
};

// ============================================================================
// ADMIN SETTING ITEM
// ============================================================================

interface SettingItemProps {
    setting: AdminSetting;
    onPress: (id: string) => void;
    onEdit?: (id: string) => void;
    onDelete?: (id: string) => void;
    showActions?: boolean;
}

export const SettingItem: React.FC<SettingItemProps> = ({
    setting,
    onPress,
    onEdit,
    onDelete,
    showActions = true,
}) => {
    const handleDelete = () => {
        if (setting.is_system) {
            Alert.alert(
                'Cannot Delete',
                'System settings cannot be deleted.',
                [{ text: 'OK' }]
            );
            return;
        }

        Alert.alert(
            'Delete Setting',
            `Are you sure you want to delete "${setting.setting_key}"?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => onDelete?.(setting.id),
                },
            ]
        );
    };

    const getDisplayValue = (value: any, type: string, isSensitive: boolean) => {
        if (isSensitive) {
            return '••••••••';
        }

        switch (type) {
            case 'boolean':
                return value ? 'True' : 'False';
            case 'json':
                return JSON.stringify(value).substring(0, 50) + '...';
            default:
                return String(value);
        }
    };

    const getCategoryColor = (category: string) => {
        const colors_map: Record<string, string> = {
            'system': colors.error,
            'payment': colors.warning,
            'booking': colors.primary,
            'notification': colors.info,
            'security': colors.success,
        };
        return colors_map[category] || colors.textSecondary;
    };

    return (
        <TouchableOpacity
            style={[
                styles.itemContainer,
                setting.is_system && styles.systemSettingContainer,
            ]}
            onPress={() => onPress(setting.id)}
            activeOpacity={0.7}
        >
            <View style={styles.itemContent}>
                <View style={styles.itemHeader}>
                    <View style={styles.itemIcon}>
                        <Settings size={20} color={colors.primary} />
                    </View>
                    <View style={styles.itemInfo}>
                        <View style={styles.settingKeyContainer}>
                            <Text style={styles.itemTitle}>{setting.setting_key}</Text>
                            {setting.is_system && (
                                <View style={styles.systemBadge}>
                                    <AlertCircle size={10} color={colors.error} />
                                    <Text style={styles.systemBadgeText}>System</Text>
                                </View>
                            )}
                            {setting.is_sensitive && (
                                <View style={styles.sensitiveBadge}>
                                    <AlertCircle size={10} color={colors.warning} />
                                    <Text style={styles.sensitiveBadgeText}>Sensitive</Text>
                                </View>
                            )}
                        </View>
                        <View style={styles.categoryContainer}>
                            <View style={[
                                styles.categoryBadge,
                                { backgroundColor: getCategoryColor(setting.category) + '20' }
                            ]}>
                                <Text style={[
                                    styles.categoryText,
                                    { color: getCategoryColor(setting.category) }
                                ]}>
                                    {setting.category}
                                </Text>
                            </View>
                            <Text style={styles.settingType}>
                                {setting.setting_type}
                            </Text>
                        </View>
                        {setting.description && (
                            <Text style={styles.itemMeta}>{setting.description}</Text>
                        )}
                    </View>
                </View>

                <View style={styles.settingValue}>
                    <Text style={styles.settingValueLabel}>Value:</Text>
                    <Text style={styles.settingValueText}>
                        {getDisplayValue(setting.setting_value, setting.setting_type, setting.is_sensitive || false)}
                    </Text>
                </View>

                <View style={styles.itemFooter}>
                    <View style={styles.itemDate}>
                        <Clock size={12} color={colors.textSecondary} />
                        <Text style={styles.itemDateText}>
                            Updated {new Date(setting.updated_at).toLocaleDateString()}
                        </Text>
                    </View>

                    {showActions && (
                        <View style={styles.itemActions}>
                            <TouchableOpacity
                                style={styles.actionButton}
                                onPress={() => onPress(setting.id)}
                            >
                                <Eye size={16} color={colors.textSecondary} />
                            </TouchableOpacity>
                            {onEdit && (
                                <TouchableOpacity
                                    style={styles.actionButton}
                                    onPress={() => onEdit(setting.id)}
                                >
                                    <Edit3 size={16} color={colors.primary} />
                                </TouchableOpacity>
                            )}
                            {onDelete && !setting.is_system && (
                                <TouchableOpacity
                                    style={styles.actionButton}
                                    onPress={handleDelete}
                                >
                                    <Trash2 size={16} color={colors.error} />
                                </TouchableOpacity>
                            )}
                        </View>
                    )}
                </View>
            </View>
        </TouchableOpacity>
    );
};

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
    itemContainer: {
        backgroundColor: colors.card,
        borderRadius: 12,
        marginBottom: 12,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    systemSettingContainer: {
        borderLeftWidth: 4,
        borderLeftColor: colors.error,
    },
    itemContent: {
        padding: 16,
    },
    itemHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    itemIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.primary + '10',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    itemInfo: {
        flex: 1,
        gap: 4,
    },
    itemTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 2,
    },
    itemSubtitle: {
        fontSize: 14,
        color: colors.textSecondary,
        fontWeight: '500',
    },
    itemMeta: {
        fontSize: 12,
        color: colors.textSecondary,
    },
    itemDescription: {
        fontSize: 14,
        color: colors.textSecondary,
        lineHeight: 20,
        marginBottom: 12,
        fontStyle: 'italic',
    },
    translationText: {
        fontSize: 14,
        color: colors.text,
        lineHeight: 20,
        marginBottom: 12,
        fontStyle: 'italic',
        backgroundColor: colors.backgroundSecondary,
        padding: 8,
        borderRadius: 6,
    },
    itemStatus: {
        marginLeft: 8,
    },
    statusActive: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.success + '10',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        gap: 4,
    },
    statusActiveText: {
        fontSize: 12,
        color: colors.success,
        fontWeight: '500',
    },
    statusInactive: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.error + '10',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        gap: 4,
    },
    statusInactiveText: {
        fontSize: 12,
        color: colors.error,
        fontWeight: '500',
    },
    itemFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    itemDate: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    itemDateText: {
        fontSize: 12,
        color: colors.textSecondary,
    },
    itemActions: {
        flexDirection: 'row',
        gap: 8,
    },
    actionButton: {
        padding: 8,
        borderRadius: 6,
        backgroundColor: colors.backgroundSecondary,
    },
    settingKeyContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        flexWrap: 'wrap',
    },
    systemBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.error + '10',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 8,
        gap: 2,
    },
    systemBadgeText: {
        fontSize: 10,
        color: colors.error,
        fontWeight: '600',
    },
    sensitiveBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.warning + '10',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 8,
        gap: 2,
    },
    sensitiveBadgeText: {
        fontSize: 10,
        color: colors.warning,
        fontWeight: '600',
    },
    categoryContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    categoryBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10,
    },
    categoryText: {
        fontSize: 11,
        fontWeight: '600',
        textTransform: 'uppercase',
    },
    settingType: {
        fontSize: 11,
        color: colors.textSecondary,
        fontWeight: '500',
    },
    settingValue: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.backgroundSecondary,
        padding: 8,
        borderRadius: 6,
        marginBottom: 12,
        gap: 8,
    },
    settingValueLabel: {
        fontSize: 12,
        color: colors.textSecondary,
        fontWeight: '600',
    },
    settingValueText: {
        fontSize: 12,
        color: colors.text,
        fontFamily: 'monospace',
        flex: 1,
    },
}); 