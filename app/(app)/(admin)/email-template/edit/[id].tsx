import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  Text,
  ActivityIndicator,
} from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { colors } from '@/constants/adminColors';
import { ArrowLeft, AlertCircle } from 'lucide-react-native';
import { useAdminPermissions } from '@/hooks/useAdminPermissions';
import { useEmailCampaignStore } from '@/store/admin/emailCampaignStore';
import EmailTemplateForm from '@/components/admin/operations/EmailTemplateForm';
import Button from '@/components/admin/Button';
import { EmailTemplate } from '@/types/emailCampaign';

export default function EditEmailTemplateScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { canManageSettings } = useAdminPermissions();
  const { templates, fetchTemplates } = useEmailCampaignStore();

  const [template, setTemplate] = useState<EmailTemplate | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTemplate();
  }, [id]);

  const loadTemplate = async () => {
    if (!id) return;
    setLoading(true);
    await fetchTemplates();
    const found = templates.find(t => t.id === id);
    setTemplate(found || null);
    setLoading(false);
  };

  // Re-check when templates are loaded
  useEffect(() => {
    if (id && templates.length > 0) {
      const found = templates.find(t => t.id === id);
      if (found) {
        setTemplate(found);
        setLoading(false);
      }
    }
  }, [templates, id]);

  const handleSuccess = () => {
    router.back();
  };

  const handleError = (error: string) => {
    console.error('Error updating template:', error);
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
            You don't have permission to edit email templates.
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
          title: 'Edit Template',
          headerLeft: () => (
            <Pressable onPress={() => router.back()} style={styles.backButton}>
              <ArrowLeft size={24} color={colors.primary} />
            </Pressable>
          ),
        }}
      />

      <View style={styles.content}>
        <EmailTemplateForm
          template={template}
          onSuccess={handleSuccess}
          onError={handleError}
          onCancel={() => router.back()}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
  },
  content: {
    flex: 1,
    padding: 16,
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
});
