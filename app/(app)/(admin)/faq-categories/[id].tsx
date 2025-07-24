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
import { FAQCategory } from "@/types/admin/management";
import {
    ArrowLeft,
    Edit,
    Trash2,
    Folder,
    Calendar,
    Hash,
    FileText,
    Tag,
    Activity,
    MessageSquare,
} from "lucide-react-native";

// Components
import Button from "@/components/admin/Button";
import LoadingSpinner from "@/components/admin/LoadingSpinner";

const { width: screenWidth } = Dimensions.get('window');

export default function FAQCategoryDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const { canManageSettings } = useAdminPermissions();
    const {
        loadCategory,
        deleteCategory,
        categories,
        faqs,
        refreshAll
    } = useFAQManagement();

    const [category, setCategory] = useState<FAQCategory | null>(null);
    const [loading, setLoading] = useState(true);
    const [deleting, setDeleting] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const isTablet = screenWidth >= 768;

    // Get category FAQs
    const categoryFAQs = faqs.filter(faq => faq.category_id === id);

    const loadCategoryData = async () => {
        if (!id) return;

        try {
            setLoading(true);
            const categoryData = categories.find(c => c.id === id);
            if (categoryData) {
                setCategory(categoryData);
            } else {
                // If not in store, try to load fresh data
                await refreshAll();
                const freshCategory = categories.find(c => c.id === id);
                setCategory(freshCategory || null);
            }
        } catch (error) {
            console.error("Error loading FAQ category:", error);
            Alert.alert("Error", "Failed to load FAQ category details");
        } finally {
            setLoading(false);
        }
    };

    const handleRefresh = async () => {
        setIsRefreshing(true);
        await loadCategoryData();
        setIsRefreshing(false);
    };

    const handleEdit = () => {
        if (!canManageSettings()) {
            Alert.alert("Access Denied", "You don't have permission to edit FAQ categories.");
            return;
        }
        router.push(`../faq-categories/edit/${id}` as any);
    };

    const handleDelete = () => {
        if (!canManageSettings()) {
            Alert.alert("Access Denied", "You don't have permission to delete FAQ categories.");
            return;
        }

        if (categoryFAQs.length > 0) {
            Alert.alert(
                "Cannot Delete Category",
                `This category contains ${categoryFAQs.length} FAQ(s). Please move or delete the FAQs first.`
            );
            return;
        }

        Alert.alert(
            "Delete FAQ Category",
            `Are you sure you want to delete "${category?.name}"? This action cannot be undone.`,
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
                            await deleteCategory(id);
                            Alert.alert("Success", "FAQ category deleted successfully");
                            router.back();
                        } catch (error) {
                            console.error("Error deleting FAQ category:", error);
                            Alert.alert("Error", "Failed to delete FAQ category");
                        } finally {
                            setDeleting(false);
                        }
                    },
                },
            ]
        );
    };

    useEffect(() => {
        loadCategoryData();
    }, [id]);

    if (loading) {
        return (
            <View style={styles.container}>
                <Stack.Screen
                    options={{
                        title: "FAQ Category Details",
                        headerLeft: () => (
                            <TouchableOpacity
                                onPress={() => router.back()}
                                style={styles.backButton}
                            >
                                <ArrowLeft size={24} color={colors.primary} />
                            </TouchableOpacity>
                        ),
                    }}
                />
                <LoadingSpinner />
            </View>
        );
    }

    if (!category) {
        return (
            <View style={styles.container}>
                <Stack.Screen
                    options={{
                        title: "FAQ Category Not Found",
                        headerLeft: () => (
                            <TouchableOpacity
                                onPress={() => router.back()}
                                style={styles.backButton}
                            >
                                <ArrowLeft size={24} color={colors.primary} />
                            </TouchableOpacity>
                        ),
                    }}
                />
                <View style={styles.notFound}>
                    <Folder size={64} color={colors.textSecondary} />
                    <Text style={styles.notFoundTitle}>Category Not Found</Text>
                    <Text style={styles.notFoundText}>
                        The FAQ category you're looking for doesn't exist.
                    </Text>
                    <Button
                        title="Go Back"
                        onPress={() => router.back()}
                        variant="outline"
                        style={styles.goBackButton}
                    />
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Stack.Screen
                options={{
                    title: category.name,
                    headerLeft: () => (
                        <TouchableOpacity
                            onPress={() => router.back()}
                            style={styles.backButton}
                        >
                            <ArrowLeft size={24} color={colors.primary} />
                        </TouchableOpacity>
                    ),
                    headerRight: () => (
                        canManageSettings() ? (
                            <View style={styles.headerActions}>
                                <TouchableOpacity
                                    onPress={handleEdit}
                                    style={styles.headerAction}
                                    disabled={deleting}
                                >
                                    <Edit size={20} color={colors.primary} />
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={handleDelete}
                                    style={styles.headerAction}
                                    disabled={deleting}
                                >
                                    <Trash2 size={20} color={colors.error} />
                                </TouchableOpacity>
                            </View>
                        ) : null
                    ),
                }}
            />

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={[
                    styles.scrollContent,
                    isTablet && styles.scrollContentTablet
                ]}
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
                {/* Header Card */}
                <View style={styles.headerCard}>
                    <View style={styles.categoryIcon}>
                        <Folder size={32} color={colors.primary} />
                    </View>
                    <View style={styles.categoryHeader}>
                        <Text style={styles.categoryName}>{category.name}</Text>
                        <Text style={styles.categorySubtitle}>
                            FAQ Category • {categoryFAQs.length} FAQ{categoryFAQs.length !== 1 ? 's' : ''}
                        </Text>
                    </View>
                </View>

                {/* Details Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Category Details</Text>

                    <View style={styles.detailsGrid}>
                        <View style={styles.detailCard}>
                            <View style={styles.detailIcon}>
                                <Hash size={20} color={colors.info} />
                            </View>
                            <View style={styles.detailContent}>
                                <Text style={styles.detailLabel}>Category ID</Text>
                                <Text style={styles.detailValue}>{category.id}</Text>
                            </View>
                        </View>

                        <View style={styles.detailCard}>
                            <View style={styles.detailIcon}>
                                <MessageSquare size={20} color={colors.success} />
                            </View>
                            <View style={styles.detailContent}>
                                <Text style={styles.detailLabel}>FAQ Count</Text>
                                <Text style={styles.detailValue}>{categoryFAQs.length}</Text>
                            </View>
                        </View>

                        <View style={styles.detailCard}>
                            <View style={styles.detailIcon}>
                                <Calendar size={20} color={colors.warning} />
                            </View>
                            <View style={styles.detailContent}>
                                <Text style={styles.detailLabel}>Created</Text>
                                <Text style={styles.detailValue}>
                                    {new Date(category.created_at).toLocaleDateString()}
                                </Text>
                            </View>
                        </View>

                        <View style={styles.detailCard}>
                            <View style={styles.detailIcon}>
                                <Activity size={20} color={colors.primary} />
                            </View>
                            <View style={styles.detailContent}>
                                <Text style={styles.detailLabel}>Order Index</Text>
                                <Text style={styles.detailValue}>{category.order_index || 0}</Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* FAQs Section */}
                {categoryFAQs.length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>FAQs in this Category</Text>
                        <View style={styles.faqsList}>
                            {categoryFAQs.map((faq, index) => (
                                <TouchableOpacity
                                    key={faq.id}
                                    style={styles.faqItem}
                                    onPress={() => router.push(`../faq/${faq.id}` as any)}
                                >
                                    <View style={styles.faqIcon}>
                                        <FileText size={16} color={colors.primary} />
                                    </View>
                                    <View style={styles.faqContent}>
                                        <Text style={styles.faqQuestion} numberOfLines={2}>
                                            {faq.question}
                                        </Text>
                                        <Text style={styles.faqMeta}>
                                            Updated {new Date(faq.updated_at).toLocaleDateString()}
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                )}

                {/* Action Buttons */}
                {canManageSettings() && (
                    <View style={styles.actionSection}>
                        <Button
                            title="Edit Category"
                            onPress={handleEdit}
                            variant="primary"
                            icon={<Edit size={16} color={colors.white} />}
                            style={styles.actionButton}
                            disabled={deleting}
                        />
                        <Button
                            title={deleting ? "Deleting..." : "Delete Category"}
                            onPress={handleDelete}
                            variant="danger"
                            icon={<Trash2 size={16} color={colors.white} />}
                            style={styles.actionButton}
                            disabled={deleting || categoryFAQs.length > 0}
                        />
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
    backButton: {
        padding: 8,
        marginLeft: -8,
    },
    headerActions: {
        flexDirection: 'row',
        gap: 8,
    },
    headerAction: {
        padding: 8,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 16,
        paddingBottom: 32,
    },
    scrollContentTablet: {
        maxWidth: 800,
        alignSelf: 'center',
        width: '100%',
    },
    headerCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.card,
        borderRadius: 16,
        padding: 20,
        marginBottom: 24,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    categoryIcon: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: colors.primaryLight,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    categoryHeader: {
        flex: 1,
    },
    categoryName: {
        fontSize: 24,
        fontWeight: '700',
        color: colors.text,
        marginBottom: 4,
    },
    categorySubtitle: {
        fontSize: 16,
        color: colors.textSecondary,
        lineHeight: 20,
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 16,
    },
    detailsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    detailCard: {
        flex: 1,
        minWidth: 150,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.card,
        borderRadius: 12,
        padding: 16,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    detailIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.background,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    detailContent: {
        flex: 1,
    },
    detailLabel: {
        fontSize: 12,
        color: colors.textSecondary,
        marginBottom: 4,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    detailValue: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text,
    },
    faqsList: {
        gap: 8,
    },
    faqItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.card,
        borderRadius: 12,
        padding: 16,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    faqIcon: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: colors.primaryLight,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    faqContent: {
        flex: 1,
    },
    faqQuestion: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 4,
    },
    faqMeta: {
        fontSize: 14,
        color: colors.textSecondary,
    },
    actionSection: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 8,
    },
    actionButton: {
        flex: 1,
    },
    notFound: {
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
        textAlign: 'center',
    },
    notFoundText: {
        fontSize: 16,
        color: colors.textSecondary,
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 32,
    },
    goBackButton: {
        width: 200,
    },
}); 