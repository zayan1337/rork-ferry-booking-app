import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Alert,
    Share,
    TouchableOpacity,
} from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { colors } from '@/constants/adminColors';
import { useContentManagement } from '@/hooks/useContentManagement';
import { useAdminPermissions } from '@/hooks/useAdminPermissions';
import { Promotion } from '@/types/content';
import {
    Percent,
    Calendar,
    Users,
    Edit3,
    Trash2,
    Copy,
    Share2,
    CheckCircle,
    XCircle,
    Clock,
    Info,
    ArrowLeft,
    AlertTriangle,
    Eye,
} from 'lucide-react-native';

// Components
import Button from '@/components/admin/Button';
import LoadingSpinner from '@/components/admin/LoadingSpinner';
import EmptyState from '@/components/admin/EmptyState';
import StatusBadge from '@/components/admin/StatusBadge';

export default function PromotionDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const { canManageContent, canViewContent } = useAdminPermissions();
    const {
        currentPromotion,
        loading,
        deletePromotion,
        duplicatePromotion,
        fetchPromotionById,
        resetCurrentPromotion,
        error,
        clearError,
    } = useContentManagement();

    const [hasInitialized, setHasInitialized] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isDuplicating, setIsDuplicating] = useState(false);

    useEffect(() => {
        if (canViewContent() && id && !hasInitialized) {
            fetchPromotionById(id).finally(() => {
                setHasInitialized(true);
            });
        }
    }, [id, hasInitialized]); // Removed function dependencies

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            resetCurrentPromotion();
            clearError();
        };
    }, []); // Empty dependency array for cleanup only

    // Use currentPromotion from the store
    const promotion = currentPromotion;

    const handleEdit = () => {
        if (canManageContent() && promotion) {
            router.push(`./edit/${promotion.id}` as any);
        }
    };

    const handleDelete = () => {
        if (!canManageContent() || !promotion) return;

        Alert.alert(
            'Delete Promotion',
            `Are you sure you want to delete "${promotion.name}"? This action cannot be undone.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        setIsDeleting(true);
                        try {
                            await deletePromotion(promotion.id);
                            Alert.alert(
                                'Success',
                                'Promotion deleted successfully.',
                                [
                                    {
                                        text: 'OK',
                                        onPress: () => router.back()
                                    }
                                ]
                            );
                        } catch (error) {
                            Alert.alert('Error', 'Failed to delete promotion.');
                        } finally {
                            setIsDeleting(false);
                        }
                    }
                }
            ]
        );
    };

    const handleDuplicate = async () => {
        if (!canManageContent() || !promotion) return;

        setIsDuplicating(true);
        try {
            await duplicatePromotion(promotion.id);
            Alert.alert('Success', 'Promotion duplicated successfully.');
        } catch (error) {
            Alert.alert('Error', 'Failed to duplicate promotion.');
        } finally {
            setIsDuplicating(false);
        }
    };

    const handleShare = async () => {
        if (!promotion) return;

        const content = `${promotion.name}\n${promotion.discount_percentage}% OFF\n\nValid from ${formatDate(promotion.start_date)} to ${formatDate(promotion.end_date)}\n\n${promotion.description || ''}`;

        try {
            await Share.share({
                message: content,
                title: promotion.name,
            });
        } catch (error) {
            console.error('Error sharing promotion:', error);
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    };

    const getPromotionStatus = () => {
        if (!promotion) return { status: 'inactive', color: colors.textSecondary };

        if (!promotion.is_active) {
            return { status: 'Inactive', color: colors.textSecondary };
        }

        const now = new Date();
        const start = new Date(promotion.start_date);
        const end = new Date(promotion.end_date);

        if (start > now) {
            return { status: 'Upcoming', color: colors.warning };
        }
        if (end < now) {
            return { status: 'Expired', color: colors.error };
        }
        return { status: 'Active', color: colors.success };
    };

    const getStatusIcon = () => {
        const { color } = getPromotionStatus();

        if (color === colors.success) return <CheckCircle size={16} color={color} />;
        if (color === colors.warning) return <Clock size={16} color={color} />;
        if (color === colors.error) return <XCircle size={16} color={color} />;
        return <XCircle size={16} color={color} />;
    };

    // Permission check
    if (!canViewContent()) {
        return (
            <View style={styles.container}>
                <Stack.Screen
                    options={{
                        title: 'Promotion Details',
                        headerShown: true,
                    }}
                />
                <EmptyState
                    icon={<AlertTriangle size={48} color={colors.warning} />}
                    title="Access Denied"
                    message="You don't have permission to view promotion details."
                />
            </View>
        );
    }

    // Loading state
    if ((loading.singlePromotion || loading.promotions) && !hasInitialized) {
        return (
            <View style={styles.container}>
                <Stack.Screen
                    options={{
                        title: 'Promotion Details',
                        headerShown: true,
                    }}
                />
                <View style={styles.loadingContainer}>
                    <LoadingSpinner />
                    <Text style={styles.loadingText}>Loading promotion...</Text>
                </View>
            </View>
        );
    }

    // Not found state
    if (hasInitialized && !promotion && !loading.singlePromotion) {
        return (
            <View style={styles.container}>
                <Stack.Screen
                    options={{
                        title: 'Promotion Not Found',
                        headerShown: true,
                    }}
                />
                <EmptyState
                    icon={<Percent size={48} color={colors.textSecondary} />}
                    title="Promotion Not Found"
                    message="The promotion you're looking for doesn't exist or has been removed."
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
                        title: 'Error',
                        headerShown: true,
                    }}
                />
                <EmptyState
                    icon={<AlertTriangle size={48} color={colors.error} />}
                    title="Error Loading Promotion"
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

    if (!promotion) {
        return (
            <View style={styles.container}>
                <Stack.Screen
                    options={{
                        title: 'Promotion Details',
                        headerShown: true,
                    }}
                />
                <View style={styles.loadingContainer}>
                    <LoadingSpinner />
                </View>
            </View>
        );
    }

    const { status, color } = getPromotionStatus();

    return (
        <View style={styles.container}>
            <Stack.Screen
                options={{
                    title: promotion.name,
                    headerShown: true,
                }}
            />

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.headerIcon}>
                        <Percent size={32} color={colors.primary} />
                    </View>
                    <View style={styles.headerContent}>
                        <Text style={styles.title}>{promotion.name}</Text>
                        <View style={styles.statusContainer}>
                            {getStatusIcon()}
                            <Text style={[styles.statusText, { color }]}>{status}</Text>
                        </View>
                    </View>
                </View>

                {/* Discount Badge */}
                <View style={styles.discountContainer}>
                    <View style={styles.discountBadge}>
                        <Text style={styles.discountPercentage}>
                            {promotion.discount_percentage}%
                        </Text>
                        <Text style={styles.discountText}>OFF</Text>
                    </View>
                </View>

                {/* Details */}
                <View style={styles.detailsContainer}>
                    {/* Description */}
                    {promotion.description && (
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Description</Text>
                            <Text style={styles.description}>{promotion.description}</Text>
                        </View>
                    )}

                    {/* Validity Period */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Validity Period</Text>
                        <View style={styles.dateRow}>
                            <Calendar size={16} color={colors.textSecondary} />
                            <Text style={styles.dateText}>
                                {formatDate(promotion.start_date)} - {formatDate(promotion.end_date)}
                            </Text>
                        </View>
                    </View>

                    {/* Restrictions */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Restrictions</Text>
                        <View style={styles.restrictionRow}>
                            <Users size={16} color={colors.textSecondary} />
                            <Text style={styles.restrictionText}>
                                {promotion.is_first_time_booking_only
                                    ? 'Available for first-time customers only'
                                    : 'Available for all customers'
                                }
                            </Text>
                        </View>
                    </View>

                    {/* Metadata */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Information</Text>
                        <View style={styles.metadataRow}>
                            <Clock size={16} color={colors.textSecondary} />
                            <Text style={styles.metadataText}>
                                Created: {formatDate(promotion.created_at)}
                            </Text>
                        </View>
                        <View style={styles.metadataRow}>
                            <Clock size={16} color={colors.textSecondary} />
                            <Text style={styles.metadataText}>
                                Updated: {formatDate(promotion.updated_at)}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Actions */}
                {canManageContent() && (
                    <View style={styles.actionsContainer}>
                        <Button
                            title="Share"
                            variant="ghost"
                            onPress={handleShare}
                            icon={<Share2 size={16} color={colors.textSecondary} />}
                        />
                        <Button
                            title="Duplicate"
                            variant="outline"
                            onPress={handleDuplicate}
                            loading={isDuplicating}
                            disabled={isDuplicating || isDeleting}
                            icon={<Copy size={16} color={colors.primary} />}
                        />
                        <Button
                            title="Edit"
                            variant="primary"
                            onPress={handleEdit}
                            disabled={isDeleting || isDuplicating}
                            icon={<Edit3 size={16} color={colors.white} />}
                        />
                        <Button
                            title="Delete"
                            variant="ghost"
                            onPress={handleDelete}
                            loading={isDeleting}
                            disabled={isDeleting || isDuplicating}
                            icon={<Trash2 size={16} color={colors.error} />}
                            style={styles.deleteButton}
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
    content: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 20,
        backgroundColor: colors.card,
        borderBottomWidth: 1,
        borderBottomColor: colors.background,
    },
    headerIcon: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: colors.primary + '15',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    headerContent: {
        flex: 1,
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
        color: colors.text,
        marginBottom: 8,
    },
    statusContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    statusText: {
        fontSize: 14,
        fontWeight: '600',
    },
    discountContainer: {
        padding: 20,
        alignItems: 'center',
        backgroundColor: colors.card,
        borderBottomWidth: 1,
        borderBottomColor: colors.background,
    },
    discountBadge: {
        backgroundColor: colors.success + '15',
        borderRadius: 20,
        paddingHorizontal: 24,
        paddingVertical: 16,
        alignItems: 'center',
    },
    discountPercentage: {
        fontSize: 32,
        fontWeight: '800',
        color: colors.success,
    },
    discountText: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.success,
        marginTop: 4,
    },
    detailsContainer: {
        flex: 1,
        padding: 20,
        gap: 24,
    },
    section: {
        gap: 12,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.text,
    },
    description: {
        fontSize: 16,
        color: colors.textSecondary,
        lineHeight: 24,
    },
    dateRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    dateText: {
        fontSize: 16,
        color: colors.text,
        fontWeight: '500',
    },
    restrictionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    restrictionText: {
        fontSize: 16,
        color: colors.text,
        flex: 1,
    },
    metadataRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
    },
    metadataText: {
        fontSize: 14,
        color: colors.textSecondary,
    },
    actionsContainer: {
        flexDirection: 'row',
        gap: 12,
        padding: 20,
        backgroundColor: colors.card,
        borderTopWidth: 1,
        borderTopColor: colors.background,
    },
    deleteButton: {
        borderColor: colors.error + '30',
    },
}); 