import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { colors } from '@/constants/adminColors';
import {
  ArrowLeft,
  AlertCircle,
  Edit,
  Trash2,
  Send,
  Clock,
} from 'lucide-react-native';
import { useAdminPermissions } from '@/hooks/useAdminPermissions';
import { useEmailCampaignStore } from '@/store/admin/emailCampaignStore';
import { useAlertContext } from '@/components/AlertProvider';
import { formatDateInMaldives } from '@/utils/timezoneUtils';
import Button from '@/components/admin/Button';

export default function EmailTemplateDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { canManageSettings } = useAdminPermissions();
  const { showConfirmation, showSuccess, showError } = useAlertContext();
  const { templates, fetchTemplates, deleteTemplate } = useEmailCampaignStore();

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTemplate();
  }, [id]);

  const loadTemplate = async () => {
    setLoading(true);
    await fetchTemplates();
    setLoading(false);
  };

  const template = templates.find(t => t.id === id);

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'emergency':
        return colors.danger;
      case 'operational':
        return colors.warning;
      case 'marketing':
        return colors.success;
      case 'transactional':
        return colors.info;
      default:
        return colors.primary;
    }
  };

  const handleDeleteTemplate = () => {
    if (!template) return;
    showConfirmation(
      'Delete Template',
      `Are you sure you want to delete "${template.name}"?`,
      async () => {
        const success = await deleteTemplate(template.id);
        if (success) {
          showSuccess('Success', 'Template deleted.');
          router.back();
        } else {
          showError('Error', 'Failed to delete template.');
        }
      },
      undefined,
      true
    );
  };

  const handleUseTemplate = () => {
    if (!template) return;
    router.push({
      pathname: '../email-campaign/new' as any,
      params: { templateId: template.id },
    });
  };

  if (!canManageSettings()) {
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
            You don't have permission to view template details.
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

  if (loading) {
    return (
      <View style={styles.container}>
        <Stack.Screen
          options={{
            title: 'Loading...',
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
          <ActivityIndicator size='large' color={colors.primary} />
          <Text style={styles.loadingText}>Loading template...</Text>
        </View>
      </View>
    );
  }

  if (!template) {
    return (
      <View style={styles.container}>
        <Stack.Screen
          options={{
            title: 'Not Found',
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
          <AlertCircle size={48} color={colors.danger} />
          <Text style={styles.noPermissionTitle}>Template Not Found</Text>
          <Text style={styles.noPermissionText}>
            The template you're looking for doesn't exist.
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

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: template.name,
          headerLeft: () => (
            <Pressable onPress={() => router.back()} style={styles.backButton}>
              <ArrowLeft size={24} color={colors.primary} />
            </Pressable>
          ),
        }}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
      >
        {/* Overview */}
        <View style={styles.section}>
          <View style={styles.headerRow}>
            <View
              style={[
                styles.categoryBadge,
                { backgroundColor: `${getCategoryColor(template.category)}20` },
              ]}
            >
              <Text
                style={[
                  styles.categoryText,
                  { color: getCategoryColor(template.category) },
                ]}
              >
                {template.category.toUpperCase()}
              </Text>
            </View>
            <Text style={styles.dateText}>
              Updated {formatDateInMaldives(template.updated_at, 'short-date')}
            </Text>
          </View>

          <Text style={styles.templateSubject}>{template.subject}</Text>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Send size={16} color={colors.primary} />
              <Text style={styles.statText}>
                Used {template.usage_count} times
              </Text>
            </View>
            <View style={styles.statItem}>
              <Clock size={16} color={colors.textSecondary} />
              <Text style={styles.statText}>
                {formatDateInMaldives(template.created_at, 'short-date')}
              </Text>
            </View>
          </View>
        </View>

        {/* Content Preview */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Template Content</Text>
          <View style={styles.contentPreview}>
            <Text style={styles.contentText}>
              {template.html_content || 'No content available'}
            </Text>
          </View>
        </View>

        {/* Variables */}
        {template.variables && template.variables.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Template Variables</Text>
            <View style={styles.variablesGrid}>
              {template.variables.map((variable, index) => (
                <View key={index} style={styles.variableItem}>
                  <Text style={styles.variableCode}>{`{{${variable}}}`}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Actions</Text>
          <View style={styles.actionsGrid}>
            <Pressable style={styles.actionCard} onPress={handleUseTemplate}>
              <View
                style={[
                  styles.actionIcon,
                  { backgroundColor: `${colors.primary}15` },
                ]}
              >
                <Send size={20} color={colors.primary} />
              </View>
              <Text style={styles.actionLabel}>Use in Campaign</Text>
            </Pressable>
            <Pressable
              style={styles.actionCard}
              onPress={() =>
                router.push(`../email-template/edit/${template.id}` as any)
              }
            >
              <View
                style={[
                  styles.actionIcon,
                  { backgroundColor: `${colors.warning}15` },
                ]}
              >
                <Edit size={20} color={colors.warning} />
              </View>
              <Text style={styles.actionLabel}>Edit Template</Text>
            </Pressable>
            <Pressable style={styles.actionCard} onPress={handleDeleteTemplate}>
              <View
                style={[
                  styles.actionIcon,
                  { backgroundColor: `${colors.danger}15` },
                ]}
              >
                <Trash2 size={20} color={colors.danger} />
              </View>
              <Text style={[styles.actionLabel, { color: colors.danger }]}>
                Delete Template
              </Text>
            </Pressable>
          </View>
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
    padding: 16,
    paddingBottom: 40,
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
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  section: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '700',
  },
  dateText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  templateSubject: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 20,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  contentPreview: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  contentText: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 22,
    fontFamily: 'monospace',
  },
  variablesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  variableItem: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  variableCode: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
    fontFamily: 'monospace',
  },
  actionsGrid: {
    gap: 12,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 12,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
});
