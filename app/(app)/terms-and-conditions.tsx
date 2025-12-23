import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import {
  ChevronDown,
  ChevronRight,
  FileText,
  Clock,
  AlertCircle,
  RefreshCw,
} from 'lucide-react-native';
import { useTermsStore } from '@/store';
import Colors from '@/constants/colors';
import Card from '@/components/Card';
import Button from '@/components/Button';
import { useAlertContext } from '@/components/AlertProvider';
import { formatDateInMaldives } from '@/utils/timezoneUtils';

export default function TermsAndConditionsScreen() {
  const { showError } = useAlertContext();
  const { terms, isLoading, error, fetchTerms, clearError } = useTermsStore();
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set()
  );
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadTerms();
  }, []);

  const loadTerms = async () => {
    try {
      await fetchTerms();
    } catch (error) {
      showError(
        'Connection Error',
        'Unable to load terms and conditions. Please check your internet connection and try again.',
        () => {
          // Retry option
          loadTerms();
        }
      );
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchTerms();
    } catch (error) {
      // Error is handled by the store
    } finally {
      setRefreshing(false);
    }
  };

  const toggleSection = (termId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(termId)) {
      newExpanded.delete(termId);
    } else {
      newExpanded.add(termId);
    }
    setExpandedSections(newExpanded);
  };

  const formatDate = (dateString: string) => {
    // Use Maldives timezone for consistent date display
    return formatDateInMaldives(dateString, 'full');
  };

  const formatContent = (content: string) => {
    // Split content by double line breaks to create paragraphs
    const paragraphs = content.split('\r\n\r\n').filter(p => p.trim());

    return paragraphs.map((paragraph, index) => {
      const trimmedParagraph = paragraph.trim();

      // Check if paragraph is a main heading (all caps)
      const isMainHeading =
        /^[A-Z\s]+$/.test(trimmedParagraph) && trimmedParagraph.length < 100;

      // Check if paragraph is a numbered list item or bullet point
      const isListItem =
        /^\s*\d+\./.test(trimmedParagraph) || /^\s*[-•]/.test(trimmedParagraph);

      // Check if paragraph is a sub-heading (starts with number and period)
      const isSubHeading = /^\d+\..+/.test(trimmedParagraph) && !isListItem;

      return (
        <Text
          key={index}
          style={[
            styles.contentText,
            isMainHeading && styles.mainHeadingText,
            isSubHeading && styles.subHeadingText,
            isListItem && styles.listItemText,
            index > 0 && styles.paragraphSpacing,
          ]}
        >
          {trimmedParagraph}
        </Text>
      );
    });
  };

  const handleGoBack = () => {
    router.back();
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <View style={styles.loadingContent}>
            <ActivityIndicator size='large' color={Colors.primary} />
            <Text style={styles.loadingText}>
              Loading terms and conditions...
            </Text>
            <Text style={styles.loadingSubtext}>
              Please wait while we fetch the latest terms
            </Text>
          </View>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <View style={styles.errorContent}>
            <AlertCircle
              size={48}
              color={Colors.error}
              style={styles.errorIcon}
            />
            <Text style={styles.errorTitle}>Unable to Load Terms</Text>
            <Text style={styles.errorText}>
              {error ||
                'Something went wrong while loading the terms and conditions.'}
            </Text>
            <View style={styles.errorActions}>
              <Button
                title='Try Again'
                onPress={() => {
                  clearError();
                  loadTerms();
                }}
                style={styles.retryButton}
                icon={<RefreshCw size={16} color='white' />}
              />
              <Button
                title='Go Back'
                onPress={() => router.back()}
                variant='outline'
              />
            </View>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[Colors.primary]}
            tintColor={Colors.primary}
          />
        }
      >
        {/* Introduction */}
        <Card variant='elevated' style={styles.introCard}>
          <View style={styles.introHeader}>
            <FileText size={24} color={Colors.primary} />
            <Text style={styles.introTitle}>Terms & Conditions</Text>
          </View>
          <Text style={styles.introText}>
            Please read these terms and conditions carefully before using our
            ferry booking service. By creating an account or making a booking,
            you agree to comply with and be bound by the following terms.
          </Text>
          {terms.length > 0 && (
            <View style={styles.introMeta}>
              <View style={styles.metaItem}>
                <Clock size={14} color={Colors.textSecondary} />
                <Text style={styles.lastUpdated}>
                  Last updated: {formatDate(terms[0].updated_at)}
                </Text>
              </View>
              {/* <View style={styles.metaItem}>
                <CheckCircle size={14} color={Colors.success} />
                <Text style={styles.activeTermsCount}>
                  {terms.filter(t => t.is_active).length} active sections
                </Text>
              </View> */}
            </View>
          )}
        </Card>

        {/* Terms Sections */}
        {terms.map((term, index) => (
          <Card key={term.id} variant='elevated' style={styles.termCard}>
            <Pressable
              style={styles.termHeader}
              onPress={() => toggleSection(term.id)}
            >
              <View style={styles.termHeaderContent}>
                <Text style={styles.termTitle}>{term.title}</Text>
                <View style={styles.termMeta}>
                  <Text style={styles.termVersion}>Version {term.version}</Text>
                  <Text style={styles.termDate}>
                    Effective: {formatDate(term.effective_date)}
                  </Text>
                </View>
              </View>
              {expandedSections.has(term.id) ? (
                <ChevronDown size={20} color={Colors.primary} />
              ) : (
                <ChevronRight size={20} color={Colors.primary} />
              )}
            </Pressable>

            {expandedSections.has(term.id) && (
              <View style={styles.termContent}>
                <View style={styles.contentDivider} />
                {formatContent(term.content)}
              </View>
            )}
          </Card>
        ))}

        {terms.length === 0 && !isLoading && !error && (
          <Card variant='elevated' style={styles.emptyCard}>
            <FileText
              size={48}
              color={Colors.textSecondary}
              style={styles.emptyIcon}
            />
            <Text style={styles.emptyTitle}>No Terms Available</Text>
            <Text style={styles.emptyText}>
              Terms and conditions are currently being updated. Please check
              back later or contact support if this issue persists.
            </Text>
            <Button
              title='Refresh'
              onPress={handleRefresh}
              variant='outline'
              style={styles.refreshButton}
              icon={<RefreshCw size={16} color={Colors.primary} />}
            />
          </Card>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            If you have any questions about these terms and conditions, please
            contact our customer service team.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingContent: {
    alignItems: 'center',
    maxWidth: 280,
  },
  loadingText: {
    fontSize: 16,
    color: Colors.text,
    marginTop: 16,
    textAlign: 'center',
    fontWeight: '500',
  },
  loadingSubtext: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorContent: {
    alignItems: 'center',
    maxWidth: 320,
  },
  errorIcon: {
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.error,
    marginBottom: 8,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  errorActions: {
    flexDirection: 'row',
    gap: 12,
  },
  retryButton: {
    minWidth: 120,
  },
  introCard: {
    marginBottom: 20,
  },
  introHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  introTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
    marginLeft: 8,
  },
  introText: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 16,
  },
  introMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  lastUpdated: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginLeft: 4,
  },
  termCard: {
    marginBottom: 12,
  },
  termHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  termHeaderContent: {
    flex: 1,
    marginRight: 12,
  },
  termTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  termMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  termVersion: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '500',
  },
  termDate: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  termContent: {
    marginTop: 8,
  },
  contentDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginBottom: 16,
  },
  contentText: {
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
  },
  mainHeadingText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: 8,
  },
  subHeadingText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  listItemText: {
    marginLeft: 12,
    paddingLeft: 8,
  },
  paragraphSpacing: {
    marginTop: 12,
  },
  emptyCard: {
    alignItems: 'center',
    padding: 40,
  },
  emptyIcon: {
    marginBottom: 16,
    opacity: 0.5,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  refreshButton: {
    minWidth: 120,
  },
  footer: {
    marginTop: 32,
    padding: 20,
    backgroundColor: Colors.highlight,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  footerText: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    fontStyle: 'italic',
  },
});
