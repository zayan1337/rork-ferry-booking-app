import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  Pressable,
} from 'react-native';
import { colors } from '@/constants/adminColors';
import { useEmailCampaignStore } from '@/store/admin/emailCampaignStore';
import { useAlertContext } from '@/components/AlertProvider';
import Button from '@/components/admin/Button';
import { EmailTemplate } from '@/types/emailCampaign';

interface EmailTemplateFormProps {
  template?: EmailTemplate;
  onSuccess: () => void;
  onError: (error: string) => void;
  onCancel: () => void;
}

type TemplateCategory =
  | 'general'
  | 'marketing'
  | 'operational'
  | 'transactional'
  | 'emergency';

const CATEGORIES: { value: TemplateCategory; label: string }[] = [
  { value: 'general', label: 'General' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'operational', label: 'Operational' },
  { value: 'transactional', label: 'Transactional' },
  { value: 'emergency', label: 'Emergency' },
];

const EmailTemplateForm: React.FC<EmailTemplateFormProps> = ({
  template,
  onSuccess,
  onError,
  onCancel,
}) => {
  const { loading, error, createTemplate, updateTemplate } =
    useEmailCampaignStore();
  const { showSuccess, showError } = useAlertContext();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: template?.name || '',
    subject: template?.subject || '',
    html_content: template?.html_content || '',
    category: (template?.category || 'general') as TemplateCategory,
  });

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      showError('Validation Error', 'Please enter a template name.');
      return;
    }

    if (!formData.subject.trim()) {
      showError('Validation Error', 'Please enter an email subject.');
      return;
    }

    if (!formData.html_content.trim()) {
      showError('Validation Error', 'Please enter template content.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = template
        ? await updateTemplate(template.id, {
            name: formData.name,
            subject: formData.subject,
            html_content: formData.html_content,
            category: formData.category,
          })
        : await createTemplate({
            name: formData.name,
            subject: formData.subject,
            html_content: formData.html_content,
            category: formData.category,
            variables: [],
          });

      if (result) {
        showSuccess(
          'Success',
          template
            ? 'Template updated successfully!'
            : 'Template created successfully!'
        );
        onSuccess();
      } else {
        onError(error || 'Failed to save template.');
      }
    } catch (err: any) {
      onError(err.message || 'An error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Template Details Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Template Details</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Template Name *</Text>
            <TextInput
              style={styles.textInput}
              value={formData.name}
              onChangeText={text =>
                setFormData(prev => ({ ...prev, name: text }))
              }
              placeholder='Enter template name'
              placeholderTextColor={colors.textSecondary}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Email Subject *</Text>
            <TextInput
              style={styles.textInput}
              value={formData.subject}
              onChangeText={text =>
                setFormData(prev => ({ ...prev, subject: text }))
              }
              placeholder='Enter email subject'
              placeholderTextColor={colors.textSecondary}
            />
            <Text style={styles.inputHint}>
              Use {'{{variable}}'} syntax for dynamic content
            </Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Category</Text>
            <View style={styles.categoryOptions}>
              {CATEGORIES.map(cat => (
                <Pressable
                  key={cat.value}
                  style={[
                    styles.categoryOption,
                    formData.category === cat.value &&
                      styles.categoryOptionSelected,
                  ]}
                  onPress={() =>
                    setFormData(prev => ({ ...prev, category: cat.value }))
                  }
                >
                  <Text
                    style={[
                      styles.categoryOptionText,
                      formData.category === cat.value &&
                        styles.categoryOptionTextSelected,
                    ]}
                  >
                    {cat.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>

        {/* Content Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Email Content</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>HTML Content *</Text>
            <TextInput
              style={[styles.textInput, styles.textAreaLarge]}
              value={formData.html_content}
              onChangeText={text =>
                setFormData(prev => ({ ...prev, html_content: text }))
              }
              placeholder='Enter HTML content for the email template'
              placeholderTextColor={colors.textSecondary}
              multiline
              numberOfLines={12}
              textAlignVertical='top'
            />
            <Text style={styles.inputHint}>
              Supported variables: {'{{user_name}}'}, {'{{booking_id}}'},{' '}
              {'{{trip_date}}'}, {'{{route_name}}'}
            </Text>
          </View>
        </View>

        {/* Preview Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Variables Reference</Text>
          <View style={styles.variablesGrid}>
            <View style={styles.variableItem}>
              <Text style={styles.variableCode}>{'{{user_name}}'}</Text>
              <Text style={styles.variableDesc}>User's full name</Text>
            </View>
            <View style={styles.variableItem}>
              <Text style={styles.variableCode}>{'{{user_email}}'}</Text>
              <Text style={styles.variableDesc}>User's email</Text>
            </View>
            <View style={styles.variableItem}>
              <Text style={styles.variableCode}>{'{{booking_id}}'}</Text>
              <Text style={styles.variableDesc}>Booking reference</Text>
            </View>
            <View style={styles.variableItem}>
              <Text style={styles.variableCode}>{'{{trip_date}}'}</Text>
              <Text style={styles.variableDesc}>Trip date</Text>
            </View>
            <View style={styles.variableItem}>
              <Text style={styles.variableCode}>{'{{route_name}}'}</Text>
              <Text style={styles.variableDesc}>Route name</Text>
            </View>
            <View style={styles.variableItem}>
              <Text style={styles.variableCode}>{'{{vessel_name}}'}</Text>
              <Text style={styles.variableDesc}>Vessel name</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Actions */}
      <View style={styles.actions}>
        <Button title='Cancel' onPress={onCancel} variant='outline' />
        <Button
          title={template ? 'Update Template' : 'Create Template'}
          onPress={handleSubmit}
          variant='primary'
          loading={isSubmitting}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 40,
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
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  inputHint: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 6,
    fontStyle: 'italic',
  },
  textInput: {
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: colors.text,
  },
  textAreaLarge: {
    minHeight: 220,
    textAlignVertical: 'top',
    paddingTop: 14,
    fontFamily: 'monospace',
  },
  categoryOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  categoryOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryOptionSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryOptionText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  categoryOptionTextSelected: {
    color: 'white',
  },
  variablesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  variableItem: {
    width: '48%',
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  variableCode: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
    fontFamily: 'monospace',
    marginBottom: 4,
  },
  variableDesc: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  actions: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.card,
  },
});

export default EmailTemplateForm;
