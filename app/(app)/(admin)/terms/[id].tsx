import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Alert,
    Dimensions,
    RefreshControl,
} from "react-native";
import { Stack, useLocalSearchParams, router } from "expo-router";
import { colors } from "@/constants/adminColors";
import { useContentManagement } from "@/hooks/useContentManagement";
import { useAdminPermissions } from "@/hooks/useAdminPermissions";
import { TermsAndConditions } from "@/types/content";
import {
    ArrowLeft,
    Edit,
    Trash2,
    FileText,
    Calendar,
    Clock,
    Activity,
    Hash,
    Settings,
    Info,
    Eye,
    Type,
    AlertCircle,
} from "lucide-react-native";

// Components
import Button from "@/components/admin/Button";
import LoadingSpinner from "@/components/admin/LoadingSpinner";

const { width: screenWidth } = Dimensions.get('window');

export default function TermDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const { canViewContent, canManageContent } = useAdminPermissions();

    const {
        currentTerms,
        terms,
        loading,
        fetchTermsById,
        deleteTerms,
        error,
        clearError,
        resetCurrentTerms,
    } = useContentManagement();

    const [hasInitialized, setHasInitialized] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Use currentTerms from the store
    const term = currentTerms;

    const loadTermData = async () => {
        if (!id) return;
        try {
            await fetchTermsById(id);
        } catch (error) {
            console.error('Error loading term:', error);
            Alert.alert("Error", "Failed to load terms and conditions details");
        }
    };

    const handleRefresh = async () => {
        setIsRefreshing(true);
        await loadTermData();
        setIsRefreshing(false);
    };

    // Fetch term data on component mount
    useEffect(() => {
        if (canViewContent() && id && !hasInitialized) {
            loadTermData().finally(() => {
                setHasInitialized(true);
            });
        }
    }, [id, hasInitialized]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            resetCurrentTerms();
            clearError();
        };
    }, []);

    const handleEdit = () => {
        if (!term || !canManageContent()) {
            Alert.alert("Access Denied", "You don't have permission to edit terms and conditions.");
            return;
        }
        router.push(`./edit/${term.id}` as any);
    };

    const handleDelete = async () => {
        if (!term || !canManageContent()) {
            Alert.alert("Access Denied", "You don't have permission to delete terms and conditions.");
            return;
        }

        Alert.alert(
            "Delete Terms",
            `Are you sure you want to delete "${term.title}"? This action cannot be undone.`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        setIsDeleting(true);
                        try {
                            await deleteTerms(term.id);
                            Alert.alert("Success", "Terms and conditions deleted successfully");
                            router.back();
                        } catch (error) {
                            Alert.alert("Error", "Failed to delete terms and conditions");
                        } finally {
                            setIsDeleting(false);
                        }
                    },
                },
            ]
        );
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    const getVersionColor = (version: string) => {
        // Different colors for different version patterns
        if (version.startsWith('1.')) return colors.primary;
        if (version.startsWith('2.')) return colors.info;
        if (version.startsWith('3.')) return colors.warning;
        return colors.textSecondary;
    };

    const getVersionLabel = (version: string) => {
        return `Version ${version}`;
    };

    const getContentStats = () => {
        if (!term) return { words: 0, characters: 0, readingTime: 0 };

        const words = term.content.trim().split(/\s+/).length;
        const characters = term.content.length;
        const readingTime = Math.ceil(words / 200); // Average reading speed

        return { words, characters, readingTime };
    };

    const contentStats = getContentStats();

    // Permission check
    if (!canViewContent()) {
        return (
            <View style={styles.container}>
                <Stack.Screen
                    options={{
                        title: "Access Denied",
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
                <View style={styles.noPermissionContainer}>
                    <View style={styles.noAccessIcon}>
                        <AlertCircle size={48} color={colors.warning} />
                    </View>
                    <Text style={styles.noPermissionTitle}>Access Denied</Text>
                    <Text style={styles.noPermissionText}>
                        You don't have permission to view terms and conditions.
                    </Text>
                    <Button
                        title="Go Back"
                        variant="primary"
                        onPress={() => router.back()}
                    />
                </View>
            </View>
        );
    }

    // Loading state
    if (loading.singleTerms && !term) {
        return (
            <View style={styles.container}>
                <Stack.Screen
                    options={{
                        title: "Loading...",
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
                <View style={styles.loadingContainer}>
                    <LoadingSpinner />
                    <Text style={styles.loadingText}>Loading terms and conditions...</Text>
                </View>
            </View>
        );
    }

    // Not found state
    if (!term && hasInitialized) {
        return (
            <View style={styles.container}>
                <Stack.Screen
                    options={{
                        title: "Terms Not Found",
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
                <View style={styles.errorContainer}>
                    <View style={styles.errorIcon}>
                        <AlertCircle size={48} color={colors.warning} />
                    </View>
                    <Text style={styles.errorTitle}>Terms Not Found</Text>
                    <Text style={styles.errorText}>
                        The terms and conditions you're looking for don't exist or have been removed.
                    </Text>
                    <Button
                        title="Go Back"
                        variant="primary"
                        onPress={() => router.back()}
                    />
                </View>
            </View>
        );
    }

    if (!term) return null;

    return (
        <View style={styles.container}>
            <Stack.Screen
                options={{
                    title: term.title,
                    headerLeft: () => (
                        <TouchableOpacity
                            style={styles.backButton}
                            onPress={() => router.back()}
                        >
                            <ArrowLeft size={24} color={colors.primary} />
                        </TouchableOpacity>
                    ),
                    headerRight: () => (
                        <View style={styles.headerActions}>
                            {canManageContent() && (
                                <>
                                    <TouchableOpacity
                                        onPress={handleEdit}
                                        style={styles.headerActionButton}
                                    >
                                        <Edit size={20} color={colors.primary} />
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        onPress={handleDelete}
                                        style={[styles.headerActionButton, styles.deleteActionButton]}
                                        disabled={isDeleting}
                                    >
                                        <Trash2 size={20} color={colors.error} />
                                    </TouchableOpacity>
                                </>
                            )}
                        </View>
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
                {/* Terms Header */}
                <View style={styles.header}>
                    <View style={styles.headerLeft}>
                        <View style={[styles.termsIcon, { backgroundColor: getVersionColor(term.version) + '15' }]}>
                            <FileText size={24} color={getVersionColor(term.version)} />
                        </View>
                        <View style={styles.headerContent}>
                            <Text style={styles.termsName}>{term.title}</Text>
                            <View style={styles.termsVersion}>
                                <Hash size={16} color={getVersionColor(term.version)} />
                                <Text style={[styles.versionText, { color: getVersionColor(term.version) }]}>
                                    {getVersionLabel(term.version)}
                                </Text>
                            </View>
                        </View>
                    </View>
                    <View style={[
                        styles.statusBadge,
                        term.is_active ? styles.statusActive : styles.statusInactive
                    ]}>
                        <View style={[
                            styles.statusDot,
                            { backgroundColor: term.is_active ? colors.success : colors.textSecondary }
                        ]} />
                        <Text style={[
                            styles.statusText,
                            term.is_active ? styles.statusTextActive : styles.statusTextInactive
                        ]}>
                            {term.is_active ? 'Active' : 'Inactive'}
                        </Text>
                    </View>
                </View>

                {/* Quick Stats */}
                <View style={styles.quickStats}>
                    <View style={styles.statsGrid}>
                        <View style={styles.statsRow}>
                            <View style={styles.statCard}>
                                <View style={styles.statCardIcon}>
                                    <Type size={20} color={colors.primary} />
                                </View>
                                <View style={styles.statCardContent}>
                                    <Text style={styles.statCardValue}>{contentStats.words}</Text>
                                    <Text style={styles.statCardLabel}>Words</Text>
                                </View>
                            </View>

                            <View style={styles.statCard}>
                                <View style={[styles.statCardIcon, { backgroundColor: colors.successLight }]}>
                                    <Activity size={20} color={colors.success} />
                                </View>
                                <View style={styles.statCardContent}>
                                    <Text style={styles.statCardValue}>{contentStats.characters}</Text>
                                    <Text style={styles.statCardLabel}>Characters</Text>
                                </View>
                            </View>
                        </View>

                        <View style={styles.statsRow}>
                            <View style={styles.statCard}>
                                <View style={[styles.statCardIcon, { backgroundColor: colors.infoLight }]}>
                                    <Clock size={20} color={colors.info} />
                                </View>
                                <View style={styles.statCardContent}>
                                    <Text style={styles.statCardValue}>{contentStats.readingTime}</Text>
                                    <Text style={styles.statCardLabel}>Min Read</Text>
                                </View>
                            </View>

                            <View style={styles.statCard}>
                                <View style={[styles.statCardIcon, { backgroundColor: colors.warningLight }]}>
                                    <Eye size={20} color={colors.warning} />
                                </View>
                                <View style={styles.statCardContent}>
                                    <Text style={styles.statCardValue}>{term.is_active ? 'Live' : 'Draft'}</Text>
                                    <Text style={styles.statCardLabel}>Status</Text>
                                </View>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Terms Information */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Terms Information</Text>

                    <View style={styles.infoGrid}>
                        <View style={styles.infoRow}>
                            <View style={styles.infoItem}>
                                <View style={styles.infoIcon}>
                                    <FileText size={20} color={colors.primary} />
                                </View>
                                <View style={styles.infoContent}>
                                    <Text style={styles.infoLabel}>Document Title</Text>
                                    <Text style={styles.infoValue}>{term.title}</Text>
                                </View>
                            </View>

                            <View style={styles.infoItem}>
                                <View style={[styles.infoIcon, { backgroundColor: getVersionColor(term.version) + '15' }]}>
                                    <Hash size={20} color={getVersionColor(term.version)} />
                                </View>
                                <View style={styles.infoContent}>
                                    <Text style={styles.infoLabel}>Version</Text>
                                    <Text style={[styles.infoValue, { color: getVersionColor(term.version) }]}>
                                        {term.version}
                                    </Text>
                                </View>
                            </View>
                        </View>

                        <View style={styles.infoRow}>
                            <View style={styles.infoItem}>
                                <View style={[
                                    styles.infoIcon,
                                    { backgroundColor: term.is_active ? colors.successLight : colors.backgroundTertiary }
                                ]}>
                                    <Settings size={20} color={term.is_active ? colors.success : colors.textSecondary} />
                                </View>
                                <View style={styles.infoContent}>
                                    <Text style={styles.infoLabel}>Status</Text>
                                    <Text style={[
                                        styles.infoValue,
                                        { color: term.is_active ? colors.success : colors.textSecondary }
                                    ]}>
                                        {term.is_active ? 'Active' : 'Inactive'}
                                    </Text>
                                </View>
                            </View>

                            <View style={styles.infoItem}>
                                <View style={styles.infoIcon}>
                                    <Calendar size={20} color={colors.textSecondary} />
                                </View>
                                <View style={styles.infoContent}>
                                    <Text style={styles.infoLabel}>Effective Date</Text>
                                    <Text style={styles.infoValue}>
                                        {formatDate(term.effective_date)}
                                    </Text>
                                </View>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Content Overview */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Content Overview</Text>

                    <View style={styles.contentSummary}>
                        <View style={styles.summaryCard}>
                            <View style={styles.summaryIcon}>
                                <Info size={20} color={colors.info} />
                            </View>
                            <Text style={styles.contentDescription}>
                                This document contains {contentStats.words} words across {contentStats.characters} characters.
                                Estimated reading time is approximately {contentStats.readingTime} minute{contentStats.readingTime !== 1 ? 's' : ''}.
                            </Text>
                        </View>

                        <View style={styles.contentPreview}>
                            <Text style={styles.contentPreviewTitle}>Content Preview</Text>
                            <Text style={styles.contentPreviewText} numberOfLines={4}>
                                {term.content}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* System Information */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>System Information</Text>

                    <View style={styles.systemInfo}>
                        <View style={styles.systemRow}>
                            <Text style={styles.systemLabel}>Document ID</Text>
                            <Text style={styles.systemValue} selectable>{term.id}</Text>
                        </View>

                        <View style={styles.systemRow}>
                            <Text style={styles.systemLabel}>Created Date</Text>
                            <Text style={styles.systemValue}>
                                {formatDate(term.created_at)}
                            </Text>
                        </View>

                        <View style={styles.systemRow}>
                            <Text style={styles.systemLabel}>Last Updated</Text>
                            <Text style={styles.systemValue}>
                                {formatDate(term.updated_at)}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Action Buttons */}
                {canManageContent() && (
                    <View style={styles.actionsContainer}>
                        <Button
                            title="Edit Terms"
                            onPress={handleEdit}
                            variant="primary"
                            icon={<Edit size={20} color={colors.white} />}
                        />
                        <Button
                            title="Delete Terms"
                            onPress={handleDelete}
                            variant="outline"
                            loading={isDeleting}
                            style={styles.deleteButton}
                            icon={<Trash2 size={20} color={colors.error} />}
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
    scrollView: {
        flex: 1,
    },
    contentContainer: {
        flexGrow: 1,
        padding: 20,
        paddingBottom: 40,
    },
    noPermissionContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
        gap: 20,
    },
    noAccessIcon: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: colors.warningLight,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 8,
    },
    noPermissionTitle: {
        fontSize: 20,
        fontWeight: "700",
        color: colors.text,
        textAlign: "center",
        marginBottom: 8,
    },
    noPermissionText: {
        fontSize: 16,
        color: colors.textSecondary,
        textAlign: "center",
        maxWidth: 280,
        lineHeight: 22,
        marginBottom: 20,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        gap: 16,
    },
    loadingText: {
        fontSize: 16,
        color: colors.textSecondary,
        fontWeight: "500",
    },
    errorContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
        gap: 20,
    },
    errorIcon: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: colors.warningLight,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 8,
    },
    errorTitle: {
        fontSize: 20,
        fontWeight: "700",
        color: colors.text,
        textAlign: "center",
        marginBottom: 8,
    },
    errorText: {
        fontSize: 15,
        color: colors.textSecondary,
        textAlign: "center",
        maxWidth: 300,
        lineHeight: 22,
        marginBottom: 20,
    },
    backButton: {
        padding: 8,
        marginLeft: -8,
    },
    headerActions: {
        flexDirection: "row",
        gap: 8,
    },
    headerActionButton: {
        padding: 8,
        borderRadius: 20,
        backgroundColor: colors.card,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    deleteActionButton: {
        backgroundColor: colors.errorLight,
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        backgroundColor: colors.card,
        padding: 24,
        borderRadius: 16,
        marginBottom: 24,
        shadowColor: colors.shadowMedium,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
    },
    headerLeft: {
        flexDirection: "row",
        alignItems: "center",
        flex: 1,
    },
    termsIcon: {
        width: 56,
        height: 56,
        borderRadius: 28,
        alignItems: "center",
        justifyContent: "center",
        marginRight: 16,
    },
    headerContent: {
        flex: 1,
    },
    termsName: {
        fontSize: 24,
        fontWeight: "700",
        color: colors.text,
        marginBottom: 6,
        lineHeight: 30,
    },
    termsVersion: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },
    versionText: {
        fontSize: 15,
        fontWeight: "600",
        letterSpacing: 0.1,
    },
    statusBadge: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12,
        gap: 6,
    },
    statusActive: {
        backgroundColor: colors.successLight,
    },
    statusInactive: {
        backgroundColor: colors.backgroundTertiary,
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    statusText: {
        fontSize: 13,
        fontWeight: "600",
        letterSpacing: 0.2,
    },
    statusTextActive: {
        color: colors.success,
    },
    statusTextInactive: {
        color: colors.textSecondary,
    },
    quickStats: {
        marginBottom: 24,
    },
    statsGrid: {
        gap: 12,
    },
    statsRow: {
        flexDirection: "row",
        gap: 12,
    },
    statCard: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: colors.card,
        padding: 16,
        borderRadius: 12,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 2,
        gap: 12,
    },
    statCardIcon: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: colors.primaryLight,
        alignItems: "center",
        justifyContent: "center",
    },
    statCardContent: {
        flex: 1,
    },
    statCardValue: {
        fontSize: 18,
        fontWeight: "700",
        color: colors.text,
        lineHeight: 22,
        marginBottom: 2,
    },
    statCardLabel: {
        fontSize: 12,
        color: colors.textSecondary,
        fontWeight: "600",
        textTransform: "uppercase",
        letterSpacing: 0.5,
    },
    section: {
        backgroundColor: colors.card,
        borderRadius: 16,
        padding: 24,
        marginBottom: 20,
        shadowColor: colors.shadowMedium,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: colors.text,
        marginBottom: 20,
        lineHeight: 24,
    },
    infoGrid: {
        gap: 20,
    },
    infoRow: {
        flexDirection: "row",
        gap: 16,
    },
    infoItem: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    infoIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.primaryLight,
        alignItems: "center",
        justifyContent: "center",
    },
    infoContent: {
        flex: 1,
    },
    infoLabel: {
        fontSize: 12,
        color: colors.textTertiary,
        textTransform: "uppercase",
        letterSpacing: 0.5,
        fontWeight: "600",
        marginBottom: 4,
    },
    infoValue: {
        fontSize: 16,
        fontWeight: "600",
        color: colors.text,
        lineHeight: 20,
    },
    contentSummary: {
        gap: 20,
    },
    summaryCard: {
        flexDirection: "row",
        alignItems: "flex-start",
        backgroundColor: colors.infoLight,
        padding: 16,
        borderRadius: 12,
        gap: 12,
    },
    summaryIcon: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: colors.info + '20',
        alignItems: "center",
        justifyContent: "center",
        marginTop: 2,
    },
    contentDescription: {
        flex: 1,
        fontSize: 14,
        color: colors.info,
        lineHeight: 20,
        fontWeight: "500",
    },
    contentPreview: {
        backgroundColor: colors.backgroundTertiary,
        padding: 16,
        borderRadius: 12,
    },
    contentPreviewTitle: {
        fontSize: 14,
        fontWeight: "600",
        color: colors.text,
        marginBottom: 8,
    },
    contentPreviewText: {
        fontSize: 14,
        color: colors.textSecondary,
        lineHeight: 20,
    },
    systemInfo: {
        gap: 16,
    },
    systemRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderLight,
    },
    systemLabel: {
        fontSize: 14,
        color: colors.textSecondary,
        fontWeight: "600",
        flex: 1,
    },
    systemValue: {
        fontSize: 14,
        color: colors.text,
        fontWeight: "500",
        flex: 2,
        textAlign: "right",
        lineHeight: 18,
    },
    actionsContainer: {
        gap: 16,
        marginTop: 8,
    },
    deleteButton: {
        borderColor: colors.error,
    },
}); 