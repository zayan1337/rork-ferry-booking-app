import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Alert,
    Dimensions,
} from "react-native";
import { Stack, useLocalSearchParams, router } from "expo-router";
import { colors } from "@/constants/adminColors";
import { useContentStore } from "@/store/admin/contentStore";
import { useAdminPermissions } from "@/hooks/useAdminPermissions";
import { AdminManagement } from "@/types";
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
    Share,
} from "lucide-react-native";

// Components
import Button from "@/components/admin/Button";
import LoadingSpinner from "@/components/admin/LoadingSpinner";

const { width: screenWidth } = Dimensions.get('window');
const isTablet = screenWidth >= 768;

type TermsAndConditions = AdminManagement.TermsAndConditions;

export default function TermDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const { canViewContent, canManageContent } = useAdminPermissions();

    const {
        terms,
        loading,
        fetchTerms,
        deleteTerms,
        getTerms,
    } = useContentStore();

    const [term, setTerm] = useState<TermsAndConditions | null>(null);

    useEffect(() => {
        if (canViewContent()) {
            if (terms.length === 0) {
                fetchTerms();
            } else {
                const foundTerm = getTerms(id);
                setTerm(foundTerm || null);
            }
        }
    }, [id, terms]);

    useEffect(() => {
        if (terms.length > 0) {
            const foundTerm = getTerms(id);
            setTerm(foundTerm || null);
        }
    }, [terms, id]);

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
            `Are you sure you want to delete "${term.title}"?`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await deleteTerms(term.id);
                            Alert.alert("Success", "Terms and conditions deleted successfully");
                            router.back();
                        } catch (error) {
                            Alert.alert("Error", "Failed to delete terms and conditions");
                        }
                    },
                },
            ]
        );
    };

    const handleShare = () => {
        if (!term) return;
        // Implement share functionality
        Alert.alert("Share", "Share functionality would be implemented here");
    };

    // Permission check
    if (!canViewContent()) {
        return (
            <View style={styles.noPermissionContainer}>
                <Text style={styles.noPermissionText}>
                    You don't have permission to view terms and conditions.
                </Text>
            </View>
        );
    }

    // Loading state
    if (loading.terms || !term) {
        return (
            <View style={styles.loadingContainer}>
                <LoadingSpinner />
                <Text style={styles.loadingText}>Loading terms and conditions...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Stack.Screen
                options={{
                    title: term.title,
                    headerLeft: () => (
                        <TouchableOpacity
                            onPress={() => router.back()}
                            style={styles.backButton}
                        >
                            <ArrowLeft size={24} color={colors.text} />
                        </TouchableOpacity>
                    ),
                    headerRight: () => (
                        <View style={styles.headerActions}>
                            <TouchableOpacity
                                style={styles.headerAction}
                                onPress={handleShare}
                            >
                                <Share size={20} color={colors.textSecondary} />
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
                                {new Date(term.effective_date).toLocaleDateString()}
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
                                {new Date(term.created_at).toLocaleDateString()}
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
                                {new Date(term.updated_at).toLocaleDateString()}
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
                        <View style={styles.actionButtons}>
                            <Button
                                title="Edit Terms"
                                onPress={handleEdit}
                                variant="outline"
                                icon={<Edit3 size={16} color={colors.primary} />}
                                style={styles.actionButton}
                            />
                            <Button
                                title="Delete Terms"
                                onPress={handleDelete}
                                variant="outline"
                                style={[styles.actionButton, styles.deleteActionButton]}
                                icon={<Trash2 size={16} color={colors.error} />}
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
    backButton: {
        padding: 8,
        marginLeft: -8,
    },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    headerAction: {
        padding: 8,
        borderRadius: 8,
        backgroundColor: colors.card,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 16,
        gap: 16,
    },
    headerCard: {
        backgroundColor: colors.card,
        borderRadius: 16,
        padding: 20,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    headerIcon: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: colors.primary + '15',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    headerInfo: {
        flex: 1,
        gap: 4,
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
        color: colors.text,
        marginBottom: 4,
    },
    version: {
        fontSize: 16,
        color: colors.primary,
        fontWeight: '600',
        marginBottom: 8,
    },
    statusContainer: {
        alignSelf: 'flex-start',
    },
    statusActive: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.success + '20',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        gap: 6,
    },
    statusActiveText: {
        fontSize: 14,
        color: colors.success,
        fontWeight: '600',
    },
    statusInactive: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.error + '20',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        gap: 6,
    },
    statusInactiveText: {
        fontSize: 14,
        color: colors.error,
        fontWeight: '600',
    },
    metadataCard: {
        backgroundColor: colors.card,
        borderRadius: 16,
        padding: 20,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.text,
        marginBottom: 16,
    },
    metadataItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.backgroundSecondary,
    },
    metadataIcon: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: colors.primary + '10',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
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
        borderRadius: 16,
        padding: 20,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    content: {
        fontSize: 16,
        color: colors.text,
        lineHeight: 24,
    },
    actionsCard: {
        backgroundColor: colors.card,
        borderRadius: 16,
        padding: 20,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    actionButtons: {
        flexDirection: isTablet ? 'row' : 'column',
        gap: 12,
    },
    actionButton: {
        flex: isTablet ? 1 : undefined,
    },
    deleteActionButton: {
        borderColor: colors.error,
    },
    noPermissionContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 32,
    },
    noPermissionText: {
        fontSize: 16,
        color: colors.textSecondary,
        textAlign: 'center',
    },
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
    },
    loadingText: {
        fontSize: 16,
        color: colors.textSecondary,
    },
}); 