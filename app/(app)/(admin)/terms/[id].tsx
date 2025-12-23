import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Dimensions,
  RefreshControl,
  Share,
} from 'react-native';
import { Stack, useLocalSearchParams, router } from 'expo-router';
import { colors } from '@/constants/adminColors';
import { useContentManagement } from '@/hooks/useContentManagement';
import { useAdminPermissions } from '@/hooks/useAdminPermissions';
import { TermsAndConditions } from '@/types/content';
import {
  ArrowLeft,
  Edit,
  Trash2,
  FileText,
  Calendar,
  Clock,
  Activity,
  Hash,
  Eye,
  Type,
  AlertCircle,
  CheckCircle,
  XCircle,
  Share2,
  RotateCcw,
  FileEdit,
} from 'lucide-react-native';

// Components
import Button from '@/components/admin/Button';
import LoadingSpinner from '@/components/admin/LoadingSpinner';
import { useAlertContext } from '@/components/AlertProvider';
import { formatDateInMaldives, parseMaldivesDate } from '@/utils/timezoneUtils';

const { width: screenWidth } = Dimensions.get('window');

export default function TermDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { canViewContent, canManageContent } = useAdminPermissions();
  const { showError, showSuccess, showConfirmation } = useAlertContext();

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

  const isTablet = screenWidth >= 768;
  const term = currentTerms;

  const loadTermData = async () => {
    if (!id) return;
    try {
      await fetchTermsById(id);
    } catch (error) {
      showError('Error', 'Failed to load terms and conditions details');
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
      // Check if we already have the data for this ID to avoid unnecessary API calls
      if (term && term.id === id) {
        setHasInitialized(true);
        return;
      }

      loadTermData().finally(() => {
        setHasInitialized(true);
      });
    }
  }, [id, hasInitialized, term]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      resetCurrentTerms();
      clearError();
    };
  }, []);

  const handleEdit = () => {
    if (!term || !canManageContent()) {
      showError(
        'Access Denied',
        "You don't have permission to edit terms and conditions."
      );
      return;
    }
    router.push(`./edit/${term.id}` as any);
  };

  const handleDelete = async () => {
    if (!term || !canManageContent()) {
      showError(
        'Access Denied',
        "You don't have permission to delete terms and conditions."
      );
      return;
    }

    showConfirmation(
      'Delete Terms',
      `Are you sure you want to delete "${term.title}"? This action cannot be undone.`,
      async () => {
        setIsDeleting(true);
        try {
          await deleteTerms(term.id);
          showSuccess(
            'Success',
            'Terms and conditions deleted successfully',
            () => router.back()
          );
        } catch (error) {
          showError('Error', 'Failed to delete terms and conditions');
        } finally {
          setIsDeleting(false);
        }
      },
      undefined,
      true // Mark as destructive action
    );
  };

  const handleShare = async () => {
    if (!term) return;

    const content = `${term.title}\nVersion: ${term.version}\n\nEffective Date: ${formatDate(term.effective_date)}\n\n${term.content}`;

    try {
      await Share.share({
        message: content,
        title: term.title,
      });
    } catch (error) {
      console.error('Error sharing terms:', error);
    }
  };

  const handleRetry = () => {
    clearError();
    setHasInitialized(false);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    // Use Maldives timezone for consistent date display
    return formatDateInMaldives(dateString, 'full');
  };

  const formatDateTime = (dateString: string) => {
    if (!dateString) return 'N/A';
    // Use Maldives timezone for consistent datetime display
    return formatDateInMaldives(dateString, 'datetime');
  };

  const getTermsStatus = (terms: TermsAndConditions) => {
    if (!terms || !terms.effective_date) {
      return {
        status: 'Unknown',
        color: colors.textSecondary,
        light: colors.backgroundTertiary,
        icon: <XCircle size={20} color={colors.textSecondary} />,
      };
    }

    // Use Maldives timezone for date comparison
    const now = Date.now();
    const effective = parseMaldivesDate(terms.effective_date);

    if (!terms.is_active) {
      return {
        status: 'Inactive',
        color: colors.textSecondary,
        light: colors.backgroundTertiary,
        icon: <XCircle size={20} color={colors.textSecondary} />,
      };
    }

    if (effective.getTime() <= now) {
      return {
        status: 'Current',
        color: colors.success,
        light: colors.successLight,
        icon: <CheckCircle size={20} color={colors.success} />,
      };
    }

    return {
      status: 'Upcoming',
      color: colors.warning,
      light: colors.warningLight,
      icon: <Clock size={20} color={colors.warning} />,
    };
  };

  const getVersionColor = (version: string) => {
    if (!version) return colors.primary;

    const versionNum = parseFloat(version);
    if (versionNum >= 3.0) return colors.error;
    if (versionNum >= 2.0) return colors.warning;
    if (versionNum >= 1.0) return colors.success;
    return colors.primary;
  };

  const getContentStats = (content: string) => {
    const words = content.trim() ? content.trim().split(/\s+/).length : 0;
    const characters = content.length;
    const readingTime = Math.ceil(words / 200); // Average reading speed

    return { words, characters, readingTime };
  };

  const currentTermsStatus = term
    ? getTermsStatus(term)
    : {
        status: 'Unknown',
        color: colors.textSecondary,
        light: colors.backgroundTertiary,
        icon: <XCircle size={20} color={colors.textSecondary} />,
      };
  const versionColor = getVersionColor(term?.version || '');
  const contentStats = getContentStats(term?.content || '');

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
            <FileText size={48} color={colors.textSecondary} />
          </View>
          <Text style={styles.noPermissionTitle}>Access Denied</Text>
          <Text style={styles.noPermissionText}>
            You don't have permission to view terms and conditions.
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

  // Loading state
  if (loading.singleTerms || (!term && hasInitialized)) {
    return (
      <View style={styles.container}>
        <Stack.Screen
          options={{
            title: loading.singleTerms ? 'Loading...' : 'Not Found',
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
          {loading.singleTerms ? (
            <>
              <LoadingSpinner />
              <Text style={styles.loadingText}>
                Loading terms and conditions...
              </Text>
            </>
          ) : (
            <>
              <View style={styles.notFoundIcon}>
                <FileText size={64} color={colors.textTertiary} />
              </View>
              <Text style={styles.notFoundTitle}>Terms Not Found</Text>
              <Text style={styles.notFoundText}>
                The terms and conditions you're looking for don't exist or have
                been deleted.
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
          <Text style={styles.errorTitle}>Unable to Load Terms</Text>
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

  if (!term) {
    return (
      <View style={styles.container}>
        <Stack.Screen
          options={{
            title: 'Terms & Conditions',
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
          title: term.title,
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
                  disabled={isDeleting}
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
        {/* Terms Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View
              style={[
                styles.termsIcon,
                { backgroundColor: `${versionColor}15` },
              ]}
            >
              <FileText size={24} color={versionColor} />
            </View>
            <View style={styles.headerContent}>
              <Text style={styles.termsTitle}>{term.title}</Text>
              <View style={styles.termsMeta}>
                <Activity size={16} color={currentTermsStatus.color} />
                <Text
                  style={[
                    styles.statusText,
                    { color: currentTermsStatus.color },
                  ]}
                >
                  {currentTermsStatus.status}
                </Text>
                <Text style={styles.versionText}>v{term.version}</Text>
              </View>
            </View>
          </View>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: currentTermsStatus.light },
            ]}
          >
            <View
              style={[
                styles.statusDot,
                { backgroundColor: currentTermsStatus.color },
              ]}
            />
            <Text
              style={[
                styles.statusBadgeText,
                { color: currentTermsStatus.color },
              ]}
            >
              {currentTermsStatus.status}
            </Text>
          </View>
        </View>

        {/* Version Highlight */}
        <View style={styles.versionSection}>
          <View
            style={[
              styles.versionCard,
              { backgroundColor: `${versionColor}15` },
            ]}
          >
            <View style={styles.versionIcon}>
              <Hash size={24} color={versionColor} />
            </View>
            <View style={styles.versionContent}>
              <Text style={[styles.versionNumber, { color: versionColor }]}>
                v{term.version}
              </Text>
              <Text style={[styles.versionLabel, { color: versionColor }]}>
                VERSION
              </Text>
            </View>
          </View>
        </View>

        {/* Quick Stats */}
        <View style={styles.quickStats}>
          <View style={styles.statsGrid}>
            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <View
                  style={[
                    styles.statCardIcon,
                    { backgroundColor: `${versionColor}15` },
                  ]}
                >
                  <Hash size={20} color={versionColor} />
                </View>
                <View style={styles.statCardContent}>
                  <Text style={styles.statCardValue}>v{term.version}</Text>
                  <Text style={styles.statCardLabel}>Version</Text>
                </View>
              </View>

              <View style={styles.statCard}>
                <View
                  style={[
                    styles.statCardIcon,
                    { backgroundColor: currentTermsStatus.light },
                  ]}
                >
                  {currentTermsStatus.icon}
                </View>
                <View style={styles.statCardContent}>
                  <Text style={styles.statCardValue}>
                    {currentTermsStatus.status}
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
                  <Type size={20} color={colors.info} />
                </View>
                <View style={styles.statCardContent}>
                  <Text style={styles.statCardValue}>
                    {contentStats.words.toLocaleString()}
                  </Text>
                  <Text style={styles.statCardLabel}>Words</Text>
                </View>
              </View>

              <View style={styles.statCard}>
                <View
                  style={[
                    styles.statCardIcon,
                    { backgroundColor: colors.warningLight },
                  ]}
                >
                  <Eye size={20} color={colors.warning} />
                </View>
                <View style={styles.statCardContent}>
                  <Text style={styles.statCardValue}>
                    ~{contentStats.readingTime}
                  </Text>
                  <Text style={styles.statCardLabel}>Min Read</Text>
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
                  <Text style={styles.infoLabel}>Title</Text>
                  <Text style={styles.infoValue}>{term.title}</Text>
                </View>
              </View>

              <View style={styles.infoItem}>
                <View
                  style={[
                    styles.infoIcon,
                    { backgroundColor: `${versionColor}15` },
                  ]}
                >
                  <Hash size={20} color={versionColor} />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Version</Text>
                  <Text style={[styles.infoValue, { color: versionColor }]}>
                    v{term.version}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.infoRow}>
              <View style={styles.infoItem}>
                <View
                  style={[
                    styles.infoIcon,
                    { backgroundColor: currentTermsStatus.light },
                  ]}
                >
                  <Activity size={20} color={currentTermsStatus.color} />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Status</Text>
                  <Text
                    style={[
                      styles.infoValue,
                      { color: currentTermsStatus.color },
                    ]}
                  >
                    {currentTermsStatus.status}
                  </Text>
                </View>
              </View>

              <View style={styles.infoItem}>
                <View
                  style={[
                    styles.infoIcon,
                    { backgroundColor: colors.successLight },
                  ]}
                >
                  <Calendar size={20} color={colors.success} />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Effective Date</Text>
                  <Text style={[styles.infoValue, { color: colors.success }]}>
                    {formatDate(term.effective_date)}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Content Preview - FULL CONTENT */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Terms Content</Text>
          <View style={styles.contentCard}>
            <View style={styles.contentHeader}>
              <View style={styles.contentIcon}>
                <FileEdit size={20} color={colors.info} />
              </View>
              <View style={styles.contentStats}>
                <View style={styles.contentStat}>
                  <Type size={14} color={colors.textSecondary} />
                  <Text style={styles.contentStatText}>
                    {contentStats.words} words
                  </Text>
                </View>
                <View style={styles.contentStat}>
                  <Hash size={14} color={colors.textSecondary} />
                  <Text style={styles.contentStatText}>
                    {contentStats.characters} chars
                  </Text>
                </View>
                <View style={styles.contentStat}>
                  <Eye size={14} color={colors.textSecondary} />
                  <Text style={styles.contentStatText}>
                    ~{contentStats.readingTime} min
                  </Text>
                </View>
              </View>
            </View>
            <View style={styles.contentDivider} />
            <Text style={styles.contentText} selectable>
              {term.content}
            </Text>
          </View>
        </View>

        {/* Effective Period */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Effective Period</Text>

          <View style={styles.validityCard}>
            <View style={styles.validityItem}>
              <View style={styles.validityIcon}>
                <Calendar size={20} color={colors.success} />
              </View>
              <View style={styles.validityContent}>
                <Text style={styles.validityLabel}>Effective Date</Text>
                <Text style={styles.validityValue}>
                  {formatDate(term.effective_date)}
                </Text>
              </View>
            </View>

            <View style={styles.statusInfo}>
              {currentTermsStatus.icon}
              <Text
                style={[
                  styles.statusInfoText,
                  { color: currentTermsStatus.color },
                ]}
              >
                Status: {currentTermsStatus.status}
                {term.is_active && currentTermsStatus.status === 'Current'
                  ? ' - These terms are currently in effect'
                  : term.is_active && currentTermsStatus.status === 'Upcoming'
                    ? ' - These terms will become effective on the specified date'
                    : ' - These terms are not currently active'}
              </Text>
            </View>
          </View>
        </View>

        {/* System Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>System Information</Text>

          <View style={styles.systemInfo}>
            <View style={styles.systemRow}>
              <Text style={styles.systemLabel}>Terms ID</Text>
              <Text style={styles.systemValue} selectable>
                {term.id}
              </Text>
            </View>

            <View style={styles.systemRow}>
              <Text style={styles.systemLabel}>Created Date</Text>
              <Text style={styles.systemValue}>
                {formatDateTime(term.created_at)}
              </Text>
            </View>

            <View style={styles.systemRow}>
              <Text style={styles.systemLabel}>Last Updated</Text>
              <Text style={styles.systemValue}>
                {formatDateTime(term.updated_at)}
              </Text>
            </View>

            <View style={styles.systemRow}>
              <Text style={styles.systemLabel}>Active Status</Text>
              <Text
                style={[
                  styles.systemValue,
                  {
                    color: term.is_active
                      ? colors.success
                      : colors.textSecondary,
                  },
                ]}
              >
                {term.is_active ? 'Active' : 'Inactive'}
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
              title='Edit Terms'
              onPress={handleEdit}
              variant='primary'
              disabled={isDeleting}
              icon={<Edit size={20} color={colors.white} />}
            />
          )}
          {canManageContent() && (
            <Button
              title='Delete Terms'
              onPress={handleDelete}
              variant='outline'
              loading={isDeleting}
              disabled={isDeleting}
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
  termsIcon: {
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
  termsTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 6,
    lineHeight: 30,
  },
  termsMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusText: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
  versionText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    backgroundColor: colors.backgroundTertiary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 4,
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
  versionSection: {
    marginBottom: 24,
  },
  versionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 12,
    gap: 16,
  },
  versionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
  },
  versionContent: {
    alignItems: 'center',
    flex: 1,
  },
  versionNumber: {
    fontSize: 32,
    fontWeight: '800',
    lineHeight: 36,
  },
  versionLabel: {
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
  contentCard: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 12,
    overflow: 'hidden',
  },
  contentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: colors.infoLight,
  },
  contentIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentStats: {
    flexDirection: 'row',
    gap: 16,
  },
  contentStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  contentStatText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  contentDivider: {
    height: 1,
    backgroundColor: colors.borderLight,
  },
  contentText: {
    fontSize: 16,
    color: colors.text,
    lineHeight: 24,
    padding: 20,
  },
  validityCard: {
    gap: 16,
  },
  validityItem: {
    flexDirection: 'row',
    alignItems: 'center',
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
  statusInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 8,
  },
  statusInfoText: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
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
