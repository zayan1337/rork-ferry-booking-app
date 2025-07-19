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
import { useContentManagement } from "@/hooks/useContentManagement";
import { useAdminPermissions } from "@/hooks/useAdminPermissions";
import { TermsAndConditions } from "@/types/content";
import {
    ArrowLeft,
    Edit3,
    Trash2,
    FileText,
    Calendar,
    Clock,
    CheckCircle,
    XCircle,
    Eye,
    Share2,
    AlertTriangle,
} from "lucide-react-native";

// Components
import Button from "@/components/admin/Button";
import LoadingSpinner from "@/components/admin/LoadingSpinner";
import EmptyState from "@/components/admin/EmptyState";

const { width: screenWidth } = Dimensions.get('window');
const isTablet = screenWidth >= 768;

export default function TermDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const { canViewContent, canManageContent } = useAdminPermissions();

    const {
        currentTerms,
        loading,
        fetchTermsById,
        deleteTerms,
        error,
        clearError,
        resetCurrentTerms,
    } = useContentManagement();

    const [hasInitialized, setHasInitialized] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    // Fetch term data on component mount
    useEffect(() => {
        if (canViewContent() && id && !hasInitialized) {
            fetchTermsById(id).finally(() => {
                setHasInitialized(true);
            });
        }
    }, [id, hasInitialized]); // Removed function dependencies

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            resetCurrentTerms();
            clearError();
        };
    }, []); // Empty dependency array for cleanup only

    // Use currentTerms from the store
    const term = currentTerms;

    const handleEdit = () => {
        if (!term) return;

        if (canManageContent()) {
            router.push(`./edit/${term.id}` as any);
        } else {
            Alert.alert("Access Denied", "You don't have permission to edit terms and conditions.");
        }
    };

    const handleDelete = () => {
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
                            Alert.alert(
                                "Success",
                                "Terms and conditions deleted successfully",
                                [
                                    {
                                        text: "OK",
                                        onPress: () => router.back()
                                    }
                                ]
                            );
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

    const handleShare = async () => {
        if (!term) return;

        const content = `${term.title}\nVersion: ${term.version}\nEffective Date: ${new Date(term.effective_date).toLocaleDateString()}\n\n${term.content}`;

        try {
            await Share.share({
                message: content,
                title: term.title,
            });
        } catch (error) {
            console.error('Error sharing terms:', error);
        }
    };

    // Permission check
    if (!canViewContent()) {
        return (
            <View style={styles.container}>
                <Stack.Screen
                    options={{
                        title: "Terms & Conditions",
                        headerShown: true,
                    }}
                />
                <EmptyState
                    icon={<AlertTriangle size={48} color={colors.warning} />}
                    title="Access Denied"
                    message="You don't have permission to view terms and conditions."
                />
            </View>
        );
    }

    // Loading state
    if ((loading.singleTerms || loading.terms) && !hasInitialized) {
        return (
            <View style={styles.container}>
                <Stack.Screen
                    options={{
                        title: "Terms & Conditions",
                        headerShown: true,
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
    if (hasInitialized && !term && !loading.singleTerms) {
        return (
            <View style={styles.container}>
                <Stack.Screen
                    options={{
                        title: "Terms Not Found",
                        headerShown: true,
                    }}
                />
                <EmptyState
                    icon={<FileText size={48} color={colors.textSecondary} />}
                    title="Terms & Conditions Not Found"
                    message="The terms and conditions you're looking for don't exist or have been removed."
                    action={
                        <Button
                            title="Go Back"
                            variant="primary"
                            onPress={() => router.back()}
                            icon={<ArrowLeft size={16} color={colors.white} />}
                        />
                    }
                />
            </View>
        );
    }

    // Error state
    if (error && hasInitialized) {
        return (
            <View style={styles.container}>
                <Stack.Screen
                    options={{
                        title: "Error",
                        headerShown: true,
                    }}
                />
                <EmptyState
                    icon={<AlertTriangle size={48} color={colors.error} />}
                    title="Error Loading Terms"
                    message={error}
                    action={
                        <Button
                            title="Try Again"
                            variant="primary"
                            onPress={() => {
                                clearError();
                                setHasInitialized(false);
                            }}
                            icon={<Eye size={16} color={colors.white} />}
                        />
                    }
                />
            </View>
        );
    }

    if (!term) {
        return (
            <View style={styles.container}>
                <Stack.Screen
                    options={{
                        title: "Terms & Conditions",
                        headerShown: true,
                    }}
                />
                <View style={styles.loadingContainer}>
                    <LoadingSpinner />
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Stack.Screen
                options={{
                    title: term.title,
                    headerShown: true,
                    headerRight: () => (
                        <View style={styles.headerActions}>
                            <TouchableOpacity
                                style={styles.headerAction}
                                onPress={handleShare}
                            >
                                <Share2 size={20} color={colors.textSecondary} />
                            </TouchableOpacity>
                            {canManageContent() && (
                                <>
                                    <TouchableOpacity
                                        style={styles.headerAction}
                                        onPress={handleEdit}
                                        disabled={isDeleting}
                                    >
                                        <Edit3 size={20} color={isDeleting ? colors.textSecondary : colors.primary} />
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={styles.headerAction}
                                        onPress={handleDelete}
                                        disabled={isDeleting}
                                    >
                                        <Trash2 size={20} color={isDeleting ? colors.textSecondary : colors.error} />
                                    </TouchableOpacity>
                                </>
                            )}
                        </View>
                    ),
                }}
            />

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Header Card */}
                <View style={styles.headerCard}>
                    <View style={styles.headerIcon}>
                        <FileText size={32} color={colors.primary} />
                    </View>
                    <View style={styles.headerInfo}>
                        <Text style={styles.title}>{term.title}</Text>
                        <Text style={styles.version}>Version {term.version}</Text>
                        <View style={styles.statusContainer}>
                            {term.is_active ? (
                                <View style={styles.statusActive}>
                                    <CheckCircle size={16} color={colors.success} />
                                    <Text style={styles.statusActiveText}>Active</Text>
                                </View>
                            ) : (
                                <View style={styles.statusInactive}>
                                    <XCircle size={16} color={colors.error} />
                                    <Text style={styles.statusInactiveText}>Inactive</Text>
                                </View>
                            )}
                        </View>
                    </View>
                </View>

                {/* Metadata Card */}
                <View style={styles.metadataCard}>
                    <Text style={styles.cardTitle}>Details</Text>

                    <View style={styles.metadataItem}>
                        <View style={styles.metadataIcon}>
                            <Calendar size={16} color={colors.primary} />
                        </View>
                        <View style={styles.metadataContent}>
                            <Text style={styles.metadataLabel}>Effective Date</Text>
                            <Text style={styles.metadataValue}>
                                {new Date(term.effective_date).toLocaleDateString('en-US', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric',
                                })}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.metadataItem}>
                        <View style={styles.metadataIcon}>
                            <Clock size={16} color={colors.primary} />
                        </View>
                        <View style={styles.metadataContent}>
                            <Text style={styles.metadataLabel}>Created</Text>
                            <Text style={styles.metadataValue}>
                                {new Date(term.created_at).toLocaleDateString('en-US', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric',
                                })}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.metadataItem}>
                        <View style={styles.metadataIcon}>
                            <Clock size={16} color={colors.primary} />
                        </View>
                        <View style={styles.metadataContent}>
                            <Text style={styles.metadataLabel}>Last Updated</Text>
                            <Text style={styles.metadataValue}>
                                {new Date(term.updated_at).toLocaleDateString('en-US', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric',
                                })}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Content Card */}
                <View style={styles.contentCard}>
                    <Text style={styles.cardTitle}>Content</Text>
                    <Text style={styles.content}>{term.content}</Text>
                </View>

                {/* Actions */}
                {canManageContent() && (
                    <View style={styles.actionsCard}>
                        <Text style={styles.cardTitle}>Actions</Text>
                        <View style={styles.actionsContainer}>
                            <Button
                                title="Share"
                                variant="outline"
                                onPress={handleShare}
                                icon={<Share2 size={16} color={colors.primary} />}
                                disabled={isDeleting}
                            />
                            <Button
                                title="Edit"
                                variant="primary"
                                onPress={handleEdit}
                                icon={<Edit3 size={16} color={colors.white} />}
                                disabled={isDeleting}
                            />
                            <Button
                                title="Delete"
                                variant="ghost"
                                onPress={handleDelete}
                                loading={isDeleting}
                                disabled={isDeleting}
                                icon={<Trash2 size={16} color={colors.error} />}
                                style={styles.deleteButton}
                            />
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
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 16,
        gap: 16,
    },
    headerActions: {
        flexDirection: 'row',
        gap: 8,
    },
    headerAction: {
        padding: 8,
    },
    headerCard: {
        backgroundColor: colors.card,
        borderRadius: 12,
        padding: 20,
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 16,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    headerIcon: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: colors.primary + '15',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerInfo: {
        flex: 1,
        gap: 8,
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
        color: colors.text,
        lineHeight: 26,
    },
    version: {
        fontSize: 14,
        color: colors.textSecondary,
        fontWeight: '500',
    },
    statusContainer: {
        marginTop: 4,
    },
    statusActive: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: colors.success + '15',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        alignSelf: 'flex-start',
    },
    statusActiveText: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.success,
    },
    statusInactive: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: colors.error + '15',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        alignSelf: 'flex-start',
    },
    statusInactiveText: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.error,
    },
    metadataCard: {
        backgroundColor: colors.card,
        borderRadius: 12,
        padding: 20,
        gap: 16,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.text,
    },
    metadataItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    metadataIcon: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: colors.primary + '15',
        justifyContent: 'center',
        alignItems: 'center',
    },
    metadataContent: {
        flex: 1,
        gap: 2,
    },
    metadataLabel: {
        fontSize: 14,
        color: colors.textSecondary,
        fontWeight: '500',
    },
    metadataValue: {
        fontSize: 16,
        color: colors.text,
        fontWeight: '600',
    },
    contentCard: {
        backgroundColor: colors.card,
        borderRadius: 12,
        padding: 20,
        gap: 16,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    content: {
        fontSize: 16,
        color: colors.text,
        lineHeight: 24,
    },
    actionsCard: {
        backgroundColor: colors.card,
        borderRadius: 12,
        padding: 20,
        gap: 16,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    actionsContainer: {
        flexDirection: 'row',
        gap: 12,
    },
    deleteButton: {
        borderColor: colors.error + '30',
    },
}); 