import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Alert,
    Dimensions,
    Share,
} from "react-native";
import { Stack, useLocalSearchParams, router } from "expo-router";
import { colors } from "@/constants/adminColors";
import { useContentStore } from "@/store/admin/contentStore";
import { useAdminPermissions } from "@/hooks/useAdminPermissions";
import { Translation } from "@/types/content";
import {
    ArrowLeft,
    Edit3,
    Trash2,
    Globe,
    Key,
    Type,
    MessageSquare,
    Tag,
    Clock,
    Copy,
    Share2,
    Code,
} from "lucide-react-native";

// Components
import Button from "@/components/admin/Button";
import LoadingSpinner from "@/components/admin/LoadingSpinner";

const { width: screenWidth } = Dimensions.get('window');
const isTablet = screenWidth >= 768;

export default function TranslationDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const { canViewContent, canManageContent } = useAdminPermissions();

    const {
        translations,
        loading,
        fetchTranslations,
        deleteTranslation,
        getTranslation,
    } = useContentStore();

    const [translation, setTranslation] = useState<Translation | null>(null);

    useEffect(() => {
        if (canViewContent()) {
            if (translations.length === 0) {
                fetchTranslations();
            } else {
                const foundTranslation = getTranslation(id);
                setTranslation(foundTranslation || null);
            }
        }
    }, [id, translations]);

    useEffect(() => {
        if (translations.length > 0) {
            const foundTranslation = getTranslation(id);
            setTranslation(foundTranslation || null);
        }
    }, [translations, id]);

    const handleEdit = () => {
        if (!translation) return;

        if (canManageContent()) {
            router.push(`./edit/${translation.id}` as any);
        } else {
            Alert.alert("Access Denied", "You don't have permission to edit translations.");
        }
    };

    const handleDelete = () => {
        if (!translation || !canManageContent()) {
            Alert.alert("Access Denied", "You don't have permission to delete translations.");
            return;
        }

        Alert.alert(
            "Delete Translation",
            `Are you sure you want to delete the translation for "${translation.key}"?`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await deleteTranslation(translation.id);
                            Alert.alert("Success", "Translation deleted successfully");
                            router.back();
                        } catch (error) {
                            Alert.alert("Error", "Failed to delete translation");
                        }
                    }
                }
            ]
        );
    };

    const handleCopyKey = async () => {
        if (!translation) return;

        try {
            await Share.share({
                message: translation.key,
            });
        } catch (error) {
            console.error("Error sharing translation key:", error);
        }
    };

    const handleCopyTranslation = async () => {
        if (!translation) return;

        try {
            await Share.share({
                message: translation.translation,
            });
        } catch (error) {
            console.error("Error sharing translation:", error);
        }
    };

    const handleShare = async () => {
        if (!translation) return;

        try {
            await Share.share({
                message: `Translation Key: ${translation.key}\nLanguage: ${translation.language_code}\nTranslation: ${translation.translation}${translation.context ? `\nContext: ${translation.context}` : ''}`,
                title: `Translation: ${translation.key}`,
            });
        } catch (error) {
            console.error("Error sharing translation:", error);
        }
    };

    // Permission check
    if (!canViewContent()) {
        return (
            <View style={styles.container}>
                <Stack.Screen
                    options={{
                        title: "Translation Details",
                        headerLeft: () => (
                            <TouchableOpacity onPress={() => router.back()}>
                                <ArrowLeft size={24} color={colors.primary} />
                            </TouchableOpacity>
                        ),
                    }}
                />
                <View style={styles.noPermissionContainer}>
                    <Globe size={48} color={colors.textSecondary} />
                    <Text style={styles.noPermissionTitle}>Access Denied</Text>
                    <Text style={styles.noPermissionText}>
                        You don't have permission to view translations.
                    </Text>
                </View>
            </View>
        );
    }

    // Loading state
    if (loading.translations && !translation) {
        return (
            <View style={styles.container}>
                <Stack.Screen
                    options={{
                        title: "Translation Details",
                        headerLeft: () => (
                            <TouchableOpacity onPress={() => router.back()}>
                                <ArrowLeft size={24} color={colors.primary} />
                            </TouchableOpacity>
                        ),
                    }}
                />
                <View style={styles.loadingContainer}>
                    <LoadingSpinner />
                    <Text style={styles.loadingText}>Loading translation...</Text>
                </View>
            </View>
        );
    }

    // Not found state
    if (!translation) {
        return (
            <View style={styles.container}>
                <Stack.Screen
                    options={{
                        title: "Translation Not Found",
                        headerLeft: () => (
                            <TouchableOpacity onPress={() => router.back()}>
                                <ArrowLeft size={24} color={colors.primary} />
                            </TouchableOpacity>
                        ),
                    }}
                />
                <View style={styles.notFoundContainer}>
                    <Globe size={64} color={colors.textSecondary} />
                    <Text style={styles.notFoundTitle}>Translation Not Found</Text>
                    <Text style={styles.notFoundText}>
                        The translation you're looking for doesn't exist or has been deleted.
                    </Text>
                    <Button
                        title="Go Back"
                        variant="primary"
                        onPress={() => router.back()}
                        style={styles.backButton}
                    />
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Stack.Screen
                options={{
                    title: translation.key,
                    headerLeft: () => (
                        <TouchableOpacity onPress={() => router.back()}>
                            <ArrowLeft size={24} color={colors.primary} />
                        </TouchableOpacity>
                    ),
                    headerRight: () => (
                        <View style={styles.headerActions}>
                            <TouchableOpacity
                                style={styles.headerAction}
                                onPress={handleShare}
                            >
                                <Share2 size={20} color={colors.primary} />
                            </TouchableOpacity>
                            {canManageContent() && (
                                <>
                                    <TouchableOpacity
                                        style={styles.headerAction}
                                        onPress={handleEdit}
                                    >
                                        <Edit3 size={20} color={colors.primary} />
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={styles.headerAction}
                                        onPress={handleDelete}
                                    >
                                        <Trash2 size={20} color={colors.error} />
                                    </TouchableOpacity>
                                </>
                            )}
                        </View>
                    ),
                }}
            />

            <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
                <View style={styles.contentContainer}>
                    {/* Header Card */}
                    <View style={styles.headerCard}>
                        <View style={styles.headerInfo}>
                            <View style={styles.iconContainer}>
                                <Globe size={24} color={colors.primary} />
                            </View>
                            <View style={styles.headerTextContainer}>
                                <Text style={styles.keyText}>{translation.key}</Text>
                                <Text style={styles.languageText}>
                                    Language: {translation.language_code.toUpperCase()}
                                </Text>
                            </View>
                        </View>
                        {translation.context && (
                            <View style={styles.contextBadge}>
                                <Tag size={12} color={colors.secondary} />
                                <Text style={styles.contextText}>{translation.context}</Text>
                            </View>
                        )}
                    </View>

                    {/* Translation Content */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Type size={20} color={colors.primary} />
                            <Text style={styles.sectionTitle}>Translation</Text>
                            <TouchableOpacity
                                style={styles.copyButton}
                                onPress={handleCopyTranslation}
                            >
                                <Copy size={16} color={colors.primary} />
                            </TouchableOpacity>
                        </View>
                        <View style={styles.translationContainer}>
                            <Text style={styles.translationText}>{translation.translation}</Text>
                        </View>
                    </View>

                    {/* Translation Key */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Key size={20} color={colors.primary} />
                            <Text style={styles.sectionTitle}>Translation Key</Text>
                            <TouchableOpacity
                                style={styles.copyButton}
                                onPress={handleCopyKey}
                            >
                                <Copy size={16} color={colors.primary} />
                            </TouchableOpacity>
                        </View>
                        <View style={styles.keyContainer}>
                            <Text style={styles.keyCode}>{translation.key}</Text>
                        </View>
                    </View>

                    {/* Language Information */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Globe size={20} color={colors.primary} />
                            <Text style={styles.sectionTitle}>Language</Text>
                        </View>
                        <View style={styles.infoContainer}>
                            <Text style={styles.infoText}>
                                Language Code: <Text style={styles.infoValue}>{translation.language_code}</Text>
                            </Text>
                        </View>
                    </View>

                    {/* Context (if available) */}
                    {translation.context && (
                        <View style={styles.section}>
                            <View style={styles.sectionHeader}>
                                <Tag size={20} color={colors.primary} />
                                <Text style={styles.sectionTitle}>Context</Text>
                            </View>
                            <View style={styles.infoContainer}>
                                <Text style={styles.infoText}>{translation.context}</Text>
                            </View>
                        </View>
                    )}

                    {/* Description (if available) */}
                    {translation.description && (
                        <View style={styles.section}>
                            <View style={styles.sectionHeader}>
                                <MessageSquare size={20} color={colors.primary} />
                                <Text style={styles.sectionTitle}>Description</Text>
                            </View>
                            <View style={styles.infoContainer}>
                                <Text style={styles.infoText}>{translation.description}</Text>
                            </View>
                        </View>
                    )}

                    {/* Metadata */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Clock size={20} color={colors.primary} />
                            <Text style={styles.sectionTitle}>Information</Text>
                        </View>
                        <View style={styles.metadataContainer}>
                            <View style={styles.metadataRow}>
                                <Text style={styles.metadataLabel}>Created:</Text>
                                <Text style={styles.metadataValue}>
                                    {new Date(translation.created_at).toLocaleDateString()}
                                </Text>
                            </View>
                            <View style={styles.metadataRow}>
                                <Text style={styles.metadataLabel}>Last Updated:</Text>
                                <Text style={styles.metadataValue}>
                                    {new Date(translation.updated_at).toLocaleDateString()}
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* Actions */}
                    {canManageContent() && (
                        <View style={styles.actionsSection}>
                            <Button
                                title="Edit Translation"
                                variant="primary"
                                onPress={handleEdit}
                                icon={<Edit3 size={16} color={colors.white} />}
                                style={styles.actionButton}
                            />
                            <Button
                                title="Delete Translation"
                                variant="outline"
                                onPress={handleDelete}
                                icon={<Trash2 size={16} color={colors.error} />}
                                style={[styles.actionButton, styles.deleteButton]}
                            />
                        </View>
                    )}
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    noPermissionContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 32,
    },
    noPermissionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.text,
        marginTop: 16,
        marginBottom: 8,
        textAlign: 'center',
    },
    noPermissionText: {
        fontSize: 14,
        color: colors.textSecondary,
        textAlign: 'center',
        lineHeight: 20,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 16,
    },
    loadingText: {
        fontSize: 16,
        color: colors.textSecondary,
    },
    notFoundContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 32,
    },
    notFoundTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.text,
        marginTop: 16,
        marginBottom: 8,
        textAlign: 'center',
    },
    notFoundText: {
        fontSize: 14,
        color: colors.textSecondary,
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 24,
    },
    backButton: {
        minWidth: 120,
    },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    headerAction: {
        padding: 4,
    },
    scrollContainer: {
        flex: 1,
    },
    contentContainer: {
        padding: 16,
    },
    headerCard: {
        backgroundColor: colors.card,
        borderRadius: 12,
        padding: 20,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: colors.border,
    },
    headerInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: colors.primary + '15',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    headerTextContainer: {
        flex: 1,
    },
    keyText: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 4,
    },
    languageText: {
        fontSize: 14,
        color: colors.textSecondary,
    },
    contextBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        backgroundColor: colors.secondary + '15',
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 6,
        gap: 6,
    },
    contextText: {
        fontSize: 12,
        fontWeight: '500',
        color: colors.secondary,
    },
    section: {
        backgroundColor: colors.card,
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: colors.border,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        gap: 8,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text,
        flex: 1,
    },
    copyButton: {
        padding: 4,
    },
    translationContainer: {
        backgroundColor: colors.backgroundSecondary,
        borderRadius: 8,
        padding: 16,
        borderWidth: 1,
        borderColor: colors.border,
    },
    translationText: {
        fontSize: 16,
        color: colors.text,
        lineHeight: 24,
    },
    keyContainer: {
        backgroundColor: colors.backgroundSecondary,
        borderRadius: 8,
        padding: 16,
        borderWidth: 1,
        borderColor: colors.border,
    },
    keyCode: {
        fontSize: 14,
        fontFamily: 'monospace',
        color: colors.text,
        lineHeight: 20,
    },
    infoContainer: {
        backgroundColor: colors.backgroundSecondary,
        borderRadius: 8,
        padding: 16,
        borderWidth: 1,
        borderColor: colors.border,
    },
    infoText: {
        fontSize: 14,
        color: colors.text,
        lineHeight: 20,
    },
    infoValue: {
        fontWeight: '600',
        color: colors.primary,
    },
    metadataContainer: {
        backgroundColor: colors.backgroundSecondary,
        borderRadius: 8,
        padding: 16,
        borderWidth: 1,
        borderColor: colors.border,
    },
    metadataRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 4,
    },
    metadataLabel: {
        fontSize: 14,
        color: colors.textSecondary,
    },
    metadataValue: {
        fontSize: 14,
        fontWeight: '500',
        color: colors.text,
    },
    actionsSection: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 8,
        paddingBottom: 32,
    },
    actionButton: {
        flex: 1,
    },
    deleteButton: {
        borderColor: colors.error,
    },
}); 