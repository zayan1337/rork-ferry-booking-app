import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Share,
  Pressable,
  RefreshControl,
  Dimensions,
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
  Edit,
  Trash2,
  Copy,
  Share2,
  CheckCircle,
  XCircle,
  Clock,
  Info,
  ArrowLeft,
  AlertCircle,
  Activity,
  RotateCcw,
  Tag,
} from 'lucide-react-native';

// Components
import Button from '@/components/admin/Button';
import LoadingSpinner from '@/components/admin/LoadingSpinner';
import { useAlertContext } from '@/components/AlertProvider';

const { width: screenWidth } = Dimensions.get('window');

export default function PromotionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { canManageContent, canViewContent } = useAdminPermissions();
  const { showError, showSuccess, showConfirmation } = useAlertContext();
  const {
    currentPromotion,
    loading,
    deletePromotion,
    duplicatePromotion,
    fetchPromotionById,
    resetCurrentPromotion,
    error,
    clearError,
    refreshAll,
    promotions,
  } = useContentManagement();

  const [hasInitialized, setHasInitialized] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDuplicating, setIsDuplicating] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const isTablet = screenWidth >= 768;
  const promotion = currentPromotion;

  const loadPromotionData = async () => {
    if (!id) return;

    try {
      await fetchPromotionById(id);
    } catch (error) {
      showError('Error', 'Failed to load promotion details');
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadPromotionData();
    setIsRefreshing(false);
  };

  const handleEdit = () => {
    if (!canManageContent()) {
      showError(
        'Access Denied',
        "You don't have permission to edit promotions."
      );
      return;
    }
    router.push(`../promotion/edit/${id}` as any);
  };

  const handleDelete = () => {
    if (!canManageContent() || !promotion) return;

    showConfirmation(
      'Delete Promotion',
      `Are you sure you want to delete "${promotion.name}"? This action cannot be undone.`,
      async () => {
        setIsDeleting(true);
        try {
          await deletePromotion(promotion.id);
          showSuccess('Success', 'Promotion deleted successfully', () =>
            router.back()
          );
        } catch (error) {
          showError('Error', 'Failed to delete promotion');
        } finally {
          setIsDeleting(false);
        }
      },
      undefined,
      true // Mark as destructive action
    );
  };

  const handleDuplicate = async () => {
    if (!canManageContent() || !promotion) return;

    setIsDuplicating(true);
    try {
      await duplicatePromotion(promotion.id);
      showSuccess('Success', 'Promotion duplicated successfully');
    } catch (error) {
      showError('Error', 'Failed to duplicate promotion');
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

  const handleRetry = () => {
    clearError();
    setHasInitialized(false);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const getDurationDays = () => {
    if (!promotion || !promotion.start_date || !promotion.end_date) {
      return 0;
    }
    const start = new Date(promotion.start_date);
    const end = new Date(promotion.end_date);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getPromotionStatus = (promotion: Promotion) => {
    if (!promotion || !promotion.start_date || !promotion.end_date) {
      return {
        status: 'Unknown',
        color: colors.textSecondary,
        light: colors.backgroundTertiary,
        icon: <XCircle size={20} color={colors.textSecondary} />,
      };
    }

    const now = new Date();
    const start = new Date(promotion.start_date);
    const end = new Date(promotion.end_date);

    if (!promotion.is_active) {
      return {
        status: 'Inactive',
        color: colors.textSecondary,
        light: colors.backgroundTertiary,
        icon: <XCircle size={20} color={colors.textSecondary} />,
      };
    }

    if (start <= now && end >= now) {
      return {
        status: 'Current',
        color: colors.success,
        light: colors.successLight,
        icon: <CheckCircle size={20} color={colors.success} />,
      };
    }

    if (start > now) {
      return {
        status: 'Upcoming',
        color: colors.warning,
        light: colors.warningLight,
        icon: <Clock size={20} color={colors.warning} />,
      };
    }

    return {
      status: 'Expired',
      color: colors.error,
      light: colors.errorLight,
      icon: <XCircle size={20} color={colors.error} />,
    };
  };

  const getDiscountColor = () => {
    if (!promotion || typeof promotion.discount_percentage !== 'number')
      return colors.primary;

    if (promotion.discount_percentage >= 50) return colors.error;
    if (promotion.discount_percentage >= 30) return colors.warning;
    if (promotion.discount_percentage >= 15) return colors.success;
    return colors.primary;
  };

  const currentPromotionStatus = promotion
    ? getPromotionStatus(promotion)
    : {
        status: 'Unknown',
        color: colors.textSecondary,
        light: colors.backgroundTertiary,
        icon: <XCircle size={20} color={colors.textSecondary} />,
      };
  const discountColor = getDiscountColor();

  useEffect(() => {
    const initializeData = async () => {
      if (id && !hasInitialized) {
        setHasInitialized(true);
        try {
          await loadPromotionData();
        } catch (error) {
          console.error('Error loading promotion data:', error);
        }
      }
    };

    if (canViewContent() && id) {
      initializeData();
    }
  }, [id, canViewContent]);

  useEffect(() => {
    return () => {
      resetCurrentPromotion();
      clearError();
    };
  }, []);

  // Permission check
  if (!canViewContent()) {
    return (
      <View style={styles.container}>
        <Stack.Screen
          options={{
            title: 'Access Denied',
            headerLeft: () => (
              <Pressable
                onPress={() => router.back()}
                style={styles.backButton}
              >
                <ArrowLeft size={24} color={colors.primary} />
              </Pressable>
            ),
          }}
        />
        <View style={styles.noPermissionContainer}>
          <View style={styles.noAccessIcon}>
            <AlertCircle size={48} color={colors.warning} />
          </View>
          <Text style={styles.noPermissionTitle}>Access Denied</Text>
          <Text style={styles.noPermissionText}>
            You don't have permission to view promotion details.
          </Text>
          <Button
            title='Go Back'
            variant='primary'
            onPress={() => router.back()}
          />
        </View>
      </View>
    );
  }

  // Early return for permission check
  if (!canViewContent()) {
    return (
      <View style={styles.container}>
        <Stack.Screen
          options={{
            title: 'Access Denied',
            headerLeft: () => (
              <Pressable
                onPress={() => router.back()}
                style={styles.backButton}
              >
                <ArrowLeft size={24} color={colors.primary} />
              </Pressable>
            ),
          }}
        />
        <View style={styles.noPermissionContainer}>
          <View style={styles.noAccessIcon}>
            <Percent size={48} color={colors.textSecondary} />
          </View>
          <Text style={styles.noPermissionTitle}>Access Denied</Text>
          <Text style={styles.noPermissionText}>
            You don't have permission to view promotions.
          </Text>
          <Button
            title='Go Back'
            variant='primary'
            onPress={() => router.back()}
          />
        </View>
      </View>
    );
  }

  // Early return for loading or missing promotion
  if (loading.singlePromotion || (!promotion && hasInitialized)) {
    return (
      <View style={styles.container}>
        <Stack.Screen
          options={{
            title: loading.singlePromotion ? 'Loading...' : 'Not Found',
            headerLeft: () => (
              <Pressable
                onPress={() => router.back()}
                style={styles.backButton}
              >
                <ArrowLeft size={24} color={colors.primary} />
              </Pressable>
            ),
          }}
        />
        <View style={styles.loadingContainer}>
          {loading.singlePromotion ? (
            <>
              <LoadingSpinner />
              <Text style={styles.loadingText}>Loading promotion...</Text>
            </>
          ) : (
            <>
              <View style={styles.notFoundIcon}>
                <Percent size={64} color={colors.textTertiary} />
              </View>
              <Text style={styles.notFoundTitle}>Promotion Not Found</Text>
              <Text style={styles.notFoundText}>
                The promotion you're looking for doesn't exist or has been
                deleted.
              </Text>
              <Button
                title='Go Back'
                variant='primary'
                onPress={() => router.back()}
              />
            </>
          )}
        </View>
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
            headerLeft: () => (
              <Pressable
                onPress={() => router.back()}
                style={styles.backButton}
              >
                <ArrowLeft size={24} color={colors.primary} />
              </Pressable>
            ),
          }}
        />
        <View style={styles.errorContainer}>
          <View style={styles.errorIcon}>
            <AlertCircle size={48} color={colors.error} />
          </View>
          <Text style={styles.errorTitle}>Unable to Load Promotion</Text>
          <Text style={styles.errorText}>{error}</Text>
          <View style={styles.errorButtons}>
            <Button
              title='Try Again'
              variant='primary'
              onPress={handleRetry}
              icon={<RotateCcw size={20} color={colors.white} />}
            />
            <Button
              title='Go Back'
              variant='outline'
              onPress={() => router.back()}
            />
          </View>
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
            headerLeft: () => (
              <Pressable
                onPress={() => router.back()}
                style={styles.backButton}
              >
                <ArrowLeft size={24} color={colors.primary} />
              </Pressable>
            ),
          }}
        />
        <View style={styles.errorContainer}>
          <View style={styles.errorIcon}>
            <AlertCircle size={48} color={colors.warning} />
          </View>
          <Text style={styles.errorTitle}>Promotion Not Found</Text>
          <Text style={styles.errorText}>
            The promotion you're looking for doesn't exist or has been removed.
          </Text>
          <Button
            title='Go Back'
            variant='primary'
            onPress={() => router.back()}
          />
        </View>
      </View>
    );
  }

  if (!promotion) {
    return (
      <View style={styles.container}>
        <Stack.Screen
          options={{
            title: 'Promotion Details',
            headerLeft: () => (
              <Pressable
                onPress={() => router.back()}
                style={styles.backButton}
              >
                <ArrowLeft size={24} color={colors.primary} />
              </Pressable>
            ),
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
          title: promotion.name,
          headerLeft: () => (
            <Pressable style={styles.backButton} onPress={() => router.back()}>
              <ArrowLeft size={24} color={colors.primary} />
            </Pressable>
          ),
          headerRight: () => (
            <View style={styles.headerActions}>
              {canManageContent() && (
                <Pressable
                  onPress={handleEdit}
                  style={styles.headerActionButton}
                  disabled={isDeleting}
                >
                  <Edit size={20} color={colors.primary} />
                </Pressable>
              )}
              {canManageContent() && (
                <Pressable
                  onPress={handleDelete}
                  style={[styles.headerActionButton, styles.deleteActionButton]}
                  disabled={isDeleting || isDuplicating}
                >
                  <Trash2 size={20} color={colors.error} />
                </Pressable>
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
        {/* Promotion Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View
              style={[
                styles.promotionIcon,
                { backgroundColor: `${discountColor}15` },
              ]}
            >
              <Percent size={24} color={discountColor} />
            </View>
            <View style={styles.headerContent}>
              <Text style={styles.promotionName}>{promotion.name}</Text>
              <View style={styles.promotionMeta}>
                <Activity size={16} color={currentPromotionStatus.color} />
                <Text
                  style={[
                    styles.statusText,
                    { color: currentPromotionStatus.color },
                  ]}
                >
                  {currentPromotionStatus.status}
                </Text>
              </View>
            </View>
          </View>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: currentPromotionStatus.light },
            ]}
          >
            <View
              style={[
                styles.statusDot,
                { backgroundColor: currentPromotionStatus.color },
              ]}
            />
            <Text
              style={[
                styles.statusBadgeText,
                { color: currentPromotionStatus.color },
              ]}
            >
              {currentPromotionStatus.status}
            </Text>
          </View>
        </View>

        {/* Discount Highlight */}
        <View style={styles.discountSection}>
          <View
            style={[
              styles.discountCard,
              { backgroundColor: `${discountColor}15` },
            ]}
          >
            <View style={styles.discountIcon}>
              <Tag size={24} color={discountColor} />
            </View>
            <View style={styles.discountContent}>
              <Text
                style={[styles.discountPercentage, { color: discountColor }]}
              >
                {promotion.discount_percentage}%
              </Text>
              <Text style={[styles.discountLabel, { color: discountColor }]}>
                OFF
              </Text>
            </View>
          </View>
        </View>

        {/* Quick Stats */}
        <View style={styles.quickStats}>
          <View style={styles.statsGrid}>
            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <View style={styles.statCardIcon}>
                  <Percent size={20} color={colors.primary} />
                </View>
                <View style={styles.statCardContent}>
                  <Text style={styles.statCardValue}>
                    {promotion.discount_percentage}%
                  </Text>
                  <Text style={styles.statCardLabel}>Discount</Text>
                </View>
              </View>

              <View style={styles.statCard}>
                <View
                  style={[
                    styles.statCardIcon,
                    { backgroundColor: currentPromotionStatus.light },
                  ]}
                >
                  {currentPromotionStatus.icon}
                </View>
                <View style={styles.statCardContent}>
                  <Text style={styles.statCardValue}>
                    {currentPromotionStatus.status}
                  </Text>
                  <Text style={styles.statCardLabel}>Status</Text>
                </View>
              </View>
            </View>

            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <View
                  style={[
                    styles.statCardIcon,
                    { backgroundColor: colors.infoLight },
                  ]}
                >
                  <Calendar size={20} color={colors.info} />
                </View>
                <View style={styles.statCardContent}>
                  <Text style={styles.statCardValue}>{getDurationDays()}</Text>
                  <Text style={styles.statCardLabel}>Duration Days</Text>
                </View>
              </View>

              <View style={styles.statCard}>
                <View
                  style={[
                    styles.statCardIcon,
                    { backgroundColor: colors.warningLight },
                  ]}
                >
                  <Users size={20} color={colors.warning} />
                </View>
                <View style={styles.statCardContent}>
                  <Text style={styles.statCardValue}>
                    {promotion.is_first_time_booking_only
                      ? 'First-time'
                      : 'All Users'}
                  </Text>
                  <Text style={styles.statCardLabel}>Target</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Promotion Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Promotion Information</Text>

          <View style={styles.infoGrid}>
            <View style={styles.infoRow}>
              <View style={styles.infoItem}>
                <View style={styles.infoIcon}>
                  <Tag size={20} color={colors.primary} />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Promotion Name</Text>
                  <Text style={styles.infoValue}>{promotion.name}</Text>
                </View>
              </View>

              <View style={styles.infoItem}>
                <View
                  style={[
                    styles.infoIcon,
                    { backgroundColor: `${discountColor}15` },
                  ]}
                >
                  <Percent size={20} color={discountColor} />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Discount</Text>
                  <Text style={[styles.infoValue, { color: discountColor }]}>
                    {promotion.discount_percentage}% OFF
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.infoRow}>
              <View style={styles.infoItem}>
                <View
                  style={[
                    styles.infoIcon,
                    { backgroundColor: currentPromotionStatus.light },
                  ]}
                >
                  <Activity size={20} color={currentPromotionStatus.color} />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Status</Text>
                  <Text
                    style={[
                      styles.infoValue,
                      { color: currentPromotionStatus.color },
                    ]}
                  >
                    {currentPromotionStatus.status}
                  </Text>
                </View>
              </View>

              <View style={styles.infoItem}>
                <View style={styles.infoIcon}>
                  <Users size={20} color={colors.success} />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Target Audience</Text>
                  <Text style={[styles.infoValue, { color: colors.success }]}>
                    {promotion.is_first_time_booking_only
                      ? 'New Customers Only'
                      : 'All Customers'}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Description */}
        {promotion.description && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Description</Text>
            <View style={styles.descriptionCard}>
              <View style={styles.descriptionIcon}>
                <Info size={20} color={colors.info} />
              </View>
              <Text style={styles.description}>{promotion.description}</Text>
            </View>
          </View>
        )}

        {/* Validity Period */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Validity Period</Text>

          <View style={styles.validityCard}>
            <View style={styles.validityRow}>
              <View style={styles.validityItem}>
                <View style={styles.validityIcon}>
                  <Calendar size={20} color={colors.success} />
                </View>
                <View style={styles.validityContent}>
                  <Text style={styles.validityLabel}>Start Date</Text>
                  <Text style={styles.validityValue}>
                    {formatDate(promotion.start_date)}
                  </Text>
                </View>
              </View>

              <View style={styles.validityItem}>
                <View style={styles.validityIcon}>
                  <Calendar size={20} color={colors.error} />
                </View>
                <View style={styles.validityContent}>
                  <Text style={styles.validityLabel}>End Date</Text>
                  <Text style={styles.validityValue}>
                    {formatDate(promotion.end_date)}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.durationInfo}>
              <Clock size={16} color={colors.textSecondary} />
              <Text style={styles.durationText}>
                Duration:{' '}
                {Math.ceil(
                  (new Date(promotion.end_date).getTime() -
                    new Date(promotion.start_date).getTime()) /
                    (1000 * 60 * 60 * 24)
                )}{' '}
                days
              </Text>
            </View>
          </View>
        </View>

        {/* System Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>System Information</Text>

          <View style={styles.systemInfo}>
            <View style={styles.systemRow}>
              <Text style={styles.systemLabel}>Promotion ID</Text>
              <Text style={styles.systemValue} selectable>
                {promotion.id}
              </Text>
            </View>

            <View style={styles.systemRow}>
              <Text style={styles.systemLabel}>Created Date</Text>
              <Text style={styles.systemValue}>
                {formatDateTime(promotion.created_at)}
              </Text>
            </View>

            <View style={styles.systemRow}>
              <Text style={styles.systemLabel}>Last Updated</Text>
              <Text style={styles.systemValue}>
                {formatDateTime(promotion.updated_at)}
              </Text>
            </View>

            <View style={styles.systemRow}>
              <Text style={styles.systemLabel}>Active Status</Text>
              <Text
                style={[
                  styles.systemValue,
                  {
                    color: promotion.is_active
                      ? colors.success
                      : colors.textSecondary,
                  },
                ]}
              >
                {promotion.is_active ? 'Active' : 'Inactive'}
              </Text>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          <Button
            title='Share'
            variant='outline'
            onPress={handleShare}
            icon={<Share2 size={20} color={colors.primary} />}
          />
          {canManageContent() && (
            <Button
              title='Duplicate'
              variant='outline'
              onPress={handleDuplicate}
              loading={isDuplicating}
              disabled={isDuplicating || isDeleting}
              icon={<Copy size={20} color={colors.primary} />}
            />
          )}
          {canManageContent() && (
            <Button
              title='Edit Promotion'
              onPress={handleEdit}
              variant='primary'
              disabled={isDeleting || isDuplicating}
              icon={<Edit size={20} color={colors.white} />}
            />
          )}
          {canManageContent() && (
            <Button
              title='Delete Promotion'
              onPress={handleDelete}
              variant='outline'
              loading={isDeleting}
              disabled={isDeleting || isDuplicating}
              style={styles.deleteButton}
              icon={<Trash2 size={20} color={colors.error} />}
            />
          )}
        </View>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    padding: 20,
  },
  loadingText: {
    fontSize: 16,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  noPermissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    gap: 20,
  },
  noAccessIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.warningLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  noPermissionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  noPermissionText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 22,
    marginBottom: 20,
  },
  notFoundIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.backgroundTertiary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  notFoundTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  notFoundText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 320,
    lineHeight: 24,
    marginBottom: 20,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    gap: 20,
  },
  errorIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.errorLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 300,
    lineHeight: 22,
    marginBottom: 20,
  },
  errorButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerActions: {
    flexDirection: 'row',
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  promotionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  headerContent: {
    flex: 1,
  },
  promotionName: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 6,
    lineHeight: 30,
  },
  promotionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusText: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  discountSection: {
    marginBottom: 24,
  },
  discountCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 12,
    gap: 16,
  },
  discountIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
  },
  discountContent: {
    alignItems: 'center',
    flex: 1,
  },
  discountPercentage: {
    fontSize: 32,
    fontWeight: '800',
    lineHeight: 36,
  },
  discountLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
    letterSpacing: 1,
  },
  quickStats: {
    marginBottom: 24,
  },
  statsGrid: {
    gap: 12,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  statCardContent: {
    flex: 1,
  },
  statCardValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    lineHeight: 22,
    marginBottom: 2,
  },
  statCardLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  section: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
  },
  infoGrid: {
    gap: 16,
  },
  infoRow: {
    flexDirection: 'row',
    gap: 16,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
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
    color: colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: '600',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    lineHeight: 20,
  },
  descriptionCard: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    backgroundColor: colors.infoLight,
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: colors.info,
  },
  descriptionIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  description: {
    fontSize: 16,
    color: colors.text,
    lineHeight: 24,
    flex: 1,
  },
  validityCard: {
    gap: 16,
  },
  validityRow: {
    flexDirection: 'row',
    gap: 16,
  },
  validityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
    padding: 16,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 12,
  },
  validityIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  validityContent: {
    flex: 1,
  },
  validityLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
    marginBottom: 2,
  },
  validityValue: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '600',
  },
  durationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 8,
  },
  durationText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  systemInfo: {
    gap: 16,
  },
  systemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  systemLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '600',
    flex: 1,
  },
  systemValue: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
    flex: 2,
    textAlign: 'right',
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
