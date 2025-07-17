import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Alert,
    RefreshControl,
    Dimensions,
} from "react-native";
import { Stack, useLocalSearchParams, router } from "expo-router";
import { colors } from "@/constants/adminColors";
import { useAdminPermissions } from "@/hooks/useAdminPermissions";
import { useFAQManagement } from "@/hooks/useFAQManagement";
import { FAQ } from "@/types/content";
import {
    ArrowLeft,
    Edit,
    Trash2,
    HelpCircle,
    Calendar,
    User,
    MessageSquare,
    FileText,
    Tag,
    Activity,
    Clock,
    Hash,
    Copy,
} from "lucide-react-native";

// Components
import Button from "@/components/admin/Button";
import LoadingSpinner from "@/components/admin/LoadingSpinner";

const { width: screenWidth } = Dimensions.get('window');

export default function FAQDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const { canManageSettings } = useAdminPermissions();
    const { loadFAQ, deleteFAQ, duplicateFAQ, getCategoryById } = useFAQManagement();

    const [faq, setFaq] = useState<FAQ | null>(null);
    const [loading, setLoading] = useState(true);
    const [deleting, setDeleting] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const isTablet = screenWidth >= 768;

    const loadFAQData = async () => {
        if (!id) return;

        try {
            setLoading(true);
            const faqData = await loadFAQ(id);
            setFaq(faqData);
        } catch (error) {
            console.error("Error loading FAQ:", error);
            Alert.alert("Error", "Failed to load FAQ details");
        } finally {
            setLoading(false);
        }
    };

    const handleRefresh = async () => {
        setIsRefreshing(true);
        await loadFAQData();
        setIsRefreshing(false);
    };

    const handleEdit = () => {
        if (!canManageSettings()) {
            Alert.alert("Access Denied", "You don't have permission to edit FAQs.");
            return;
        }
        router.push(`../faq/edit/${id}` as any);
    };

    const handleDelete = () => {
        if (!canManageSettings()) {
            Alert.alert("Access Denied", "You don't have permission to delete FAQs.");
            return;
        }

        Alert.alert(
            "Delete FAQ",
            `Are you sure you want to delete "${faq?.question}"? This action cannot be undone.`,
            [
                {
                    text: "Cancel",
                    style: "cancel",
                },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        setDeleting(true);
                        try {
                            await deleteFAQ(id);
                            Alert.alert("Success", "FAQ deleted successfully");
                            router.back();
                        } catch (error) {
                            console.error("Error deleting FAQ:", error);
                            Alert.alert("Error", "Failed to delete FAQ");
                        } finally {
                            setDeleting(false);
                        }
                    },
                },
            ]
        );
    };

    const handleDuplicate = async () => {
        if (!canManageSettings()) {
            Alert.alert("Access Denied", "You don't have permission to create FAQs.");
            return;
        }

        try {
            const duplicatedFAQ = await duplicateFAQ(id);
            Alert.alert(
                "FAQ Duplicated",
                "FAQ has been duplicated successfully. The copy is marked as inactive.",
                [
                    {
                        text: "View Copy",
                        onPress: () => router.push(`../faq/${duplicatedFAQ.id}` as any),
                    },
                    { text: "Stay Here", style: "cancel" },
                ]
            );
        } catch (error) {
            console.error("Error duplicating FAQ:", error);
            Alert.alert("Error", "Failed to duplicate FAQ");
        }
    };

    useEffect(() => {
        loadFAQData();
    }, [id]);

    if (loading) {
        return (
            <View style={styles.container}>
                <Stack.Screen options={{ title: "FAQ Details" }} />
                <View style={styles.loadingContainer}>
                    <LoadingSpinner />
                    <Text style={styles.loadingText}>Loading FAQ...</Text>
                </View>
            </View>
        );
    }

    if (!faq) {
        return (
            <View style={styles.container}>
                <Stack.Screen options={{ title: "FAQ Not Found" }} />
                <View style={styles.notFoundContainer}>
                    <HelpCircle size={64} color={colors.textTertiary} />
                    <Text style={styles.notFoundTitle}>FAQ Not Found</Text>
                    <Text style={styles.notFoundText}>
                        The FAQ you're looking for doesn't exist or has been removed.
                    </Text>
                    <Button
                        title="Go Back"
                        onPress={() => router.back()}
                        variant="outline"
                        style={styles.backButton}
                    />
                </View>
            </View>
        );
    }

    const category = getCategoryById(faq.category_id);
    const getCategoryColor = (categoryName?: string) => {
        if (!categoryName) return colors.textSecondary;

        const colorOptions = [
            colors.primary, colors.info, colors.success, colors.warning,
            '#9333ea', '#dc2626', '#059669', '#0891b2'
        ];

        let hash = 0;
        for (let i = 0; i < categoryName.length; i++) {
            hash = categoryName.charCodeAt(i) + ((hash << 5) - hash);
        }

        return colorOptions[Math.abs(hash) % colorOptions.length];
    };

    const categoryColor = getCategoryColor(category?.name);

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    return (
        <View style={styles.container}>
            <Stack.Screen
                options={{
                    title: "FAQ Details",
                    headerLeft: () => (
                        <TouchableOpacity
                            onPress={() => router.back()}
                            style={styles.headerBackButton}
                        >
                            <ArrowLeft size={24} color={colors.primary} />
                        </TouchableOpacity>
                    ),
                }}
            />

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.contentContainer}
                refreshControl={
                    <RefreshControl
                        refreshing={isRefreshing}
                        onRefresh={handleRefresh}
                        colors={[colors.primary]}
                        tintColor={colors.primary}
                    />
                }
                showsVerticalScrollIndicator={false}
            >
                {/* FAQ Header */}
                <View style={styles.header}>
                    <View style={styles.headerLeft}>
                        <View style={[styles.faqIcon, { backgroundColor: categoryColor + '15' }]}>
                            <HelpCircle size={24} color={categoryColor} />
                        </View>
                        <View style={styles.headerContent}>
                            <Text style={styles.faqQuestion}>{faq.question}</Text>
                            <View style={styles.faqMetadata}>
                                <View style={[styles.categoryBadge, { backgroundColor: categoryColor + '15' }]}>
                                    <Tag size={12} color={categoryColor} />
                                    <Text style={[styles.categoryText, { color: categoryColor }]}>
                                        {category?.name || 'Uncategorized'}
                                    </Text>
                                </View>
                            </View>
                        </View>
                    </View>
                    <View style={[
                        styles.statusBadge,
                        faq.is_active ? styles.statusActive : styles.statusInactive
                    ]}>
                        <View style={[
                            styles.statusDot,
                            { backgroundColor: faq.is_active ? colors.success : colors.textSecondary }
                        ]} />
                        <Text style={[
                            styles.statusText,
                            faq.is_active ? styles.statusTextActive : styles.statusTextInactive
                        ]}>
                            {faq.is_active ? 'Active' : 'Inactive'}
                        </Text>
                    </View>
                </View>

                {/* Action Buttons */}
                {canManageSettings() && (
                    <View style={styles.actionButtons}>
                        <Button
                            title="Edit FAQ"
                            onPress={handleEdit}
                            variant="primary"
                            icon={<Edit size={20} color={colors.white} />}
                            style={styles.actionButton}
                        />
                        <Button
                            title="Duplicate"
                            onPress={handleDuplicate}
                            variant="outline"
                            icon={<Copy size={20} color={colors.primary} />}
                            style={styles.actionButton}
                        />
                        <Button
                            title="Delete"
                            onPress={handleDelete}
                            variant="outline"
                            icon={<Trash2 size={20} color={colors.error} />}
                            loading={deleting}
                            disabled={deleting}
                            style={[styles.actionButton, styles.deleteButton]}
                        />
                    </View>
                )}

                {/* FAQ Answer */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Answer</Text>
                    <View style={styles.answerCard}>
                        <View style={styles.answerIcon}>
                            <FileText size={20} color={colors.info} />
                        </View>
                        <Text style={styles.answerText}>{faq.answer}</Text>
                    </View>
                </View>

                {/* FAQ Information */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>FAQ Information</Text>

                    <View style={styles.infoGrid}>
                        <View style={styles.infoRow}>
                            <View style={styles.infoItem}>
                                <View style={styles.infoIcon}>
                                    <Tag size={20} color={categoryColor} />
                                </View>
                                <View style={styles.infoContent}>
                                    <Text style={styles.infoLabel}>Category</Text>
                                    <Text style={[styles.infoValue, { color: categoryColor }]}>
                                        {category?.name || 'Uncategorized'}
                                    </Text>
                                </View>
                            </View>

                            <View style={styles.infoItem}>
                                <View style={[styles.infoIcon, { backgroundColor: colors.infoLight }]}>
                                    <Hash size={20} color={colors.info} />
                                </View>
                                <View style={styles.infoContent}>
                                    <Text style={styles.infoLabel}>Display Order</Text>
                                    <Text style={styles.infoValue}>{faq.order_index}</Text>
                                </View>
                            </View>
                        </View>

                        <View style={styles.infoRow}>
                            <View style={styles.infoItem}>
                                <View style={[styles.infoIcon, { backgroundColor: colors.successLight }]}>
                                    <Calendar size={20} color={colors.success} />
                                </View>
                                <View style={styles.infoContent}>
                                    <Text style={styles.infoLabel}>Created</Text>
                                    <Text style={styles.infoValue}>
                                        {formatDate(faq.created_at)}
                                    </Text>
                                </View>
                            </View>

                            {faq.updated_at !== faq.created_at && (
                                <View style={styles.infoItem}>
                                    <View style={[styles.infoIcon, { backgroundColor: colors.warningLight }]}>
                                        <Clock size={20} color={colors.warning} />
                                    </View>
                                    <View style={styles.infoContent}>
                                        <Text style={styles.infoLabel}>Last Updated</Text>
                                        <Text style={styles.infoValue}>
                                            {formatDate(faq.updated_at)}
                                        </Text>
                                    </View>
                                </View>
                            )}
                        </View>
                    </View>
                </View>

                {/* Category Information */}
                {category && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Category Details</Text>
                        <View style={styles.categoryCard}>
                            <View style={[styles.categoryIcon, { backgroundColor: categoryColor + '15' }]}>
                                <Tag size={20} color={categoryColor} />
                            </View>
                            <View style={styles.categoryContent}>
                                <Text style={styles.categoryName}>{category.name}</Text>
                                {category.description && (
                                    <Text style={styles.categoryDescription}>
                                        {category.description}
                                    </Text>
                                )}
                            </View>
                        </View>
                    </View>
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.backgroundSecondary,
    },
    headerBackButton: {
        padding: 8,
        marginLeft: -8,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 16,
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
        fontSize: 24,
        fontWeight: '600',
        color: colors.text,
        marginTop: 24,
        marginBottom: 12,
    },
    notFoundText: {
        fontSize: 16,
        color: colors.textSecondary,
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 32,
    },
    backButton: {
        width: 200,
    },
    scrollView: {
        flex: 1,
    },
    contentContainer: {
        padding: 16,
        paddingBottom: 32,
    },
    header: {
        backgroundColor: colors.card,
        borderRadius: 16,
        padding: 20,
        marginBottom: 20,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 16,
    },
    faqIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    headerContent: {
        flex: 1,
    },
    faqQuestion: {
        fontSize: 20,
        fontWeight: '700',
        color: colors.text,
        lineHeight: 26,
        marginBottom: 12,
    },
    faqMetadata: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    categoryBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 12,
        gap: 6,
    },
    categoryText: {
        fontSize: 14,
        fontWeight: '600',
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        gap: 6,
        alignSelf: 'flex-start',
    },
    statusActive: {
        backgroundColor: colors.successLight,
    },
    statusInactive: {
        backgroundColor: colors.background,
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    statusText: {
        fontSize: 14,
        fontWeight: '600',
    },
    statusTextActive: {
        color: colors.success,
    },
    statusTextInactive: {
        color: colors.textSecondary,
    },
    actionButtons: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 20,
    },
    actionButton: {
        flex: 1,
    },
    deleteButton: {
        borderColor: colors.error,
    },
    section: {
        backgroundColor: colors.card,
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 16,
    },
    answerCard: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
    },
    answerIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.infoLight,
        alignItems: 'center',
        justifyContent: 'center',
    },
    answerText: {
        flex: 1,
        fontSize: 16,
        color: colors.text,
        lineHeight: 24,
    },
    infoGrid: {
        gap: 16,
    },
    infoRow: {
        flexDirection: 'row',
        gap: 16,
    },
    infoItem: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    infoIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.primaryLight,
        alignItems: 'center',
        justifyContent: 'center',
    },
    infoContent: {
        flex: 1,
    },
    infoLabel: {
        fontSize: 12,
        fontWeight: '500',
        color: colors.textSecondary,
        marginBottom: 2,
    },
    infoValue: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.text,
    },
    categoryCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    categoryIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    categoryContent: {
        flex: 1,
    },
    categoryName: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 4,
    },
    categoryDescription: {
        fontSize: 14,
        color: colors.textSecondary,
        lineHeight: 20,
    },
}); 