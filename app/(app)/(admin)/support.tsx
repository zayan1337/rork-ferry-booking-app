import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Linking,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { colors } from '@/constants/adminColors';
import { Phone, Mail, ArrowLeft } from 'lucide-react-native';
import Button from '@/components/admin/Button';
import TextInput from '@/components/admin/TextInput';
import { useContactForm } from '@/hooks/useContactForm';
import { CONTACT_INFO } from '@/constants/customer';
import { useAlertContext } from '@/components/AlertProvider';

export default function AdminSupportScreen() {
  const { showAlert } = useAlertContext();
  const { formState, updateField, submitForm } = useContactForm();

  const handleCall = () => {
    showAlert({
      title: 'Call Support',
      message: 'Choose a number to call:',
      type: 'info',
      buttons: [
        {
          text: CONTACT_INFO.PHONE,
          onPress: () => Linking.openURL(`tel:${CONTACT_INFO.PHONE}`),
          style: 'default',
        },
        {
          text: CONTACT_INFO.PHONE_ALT,
          onPress: () => Linking.openURL(`tel:${CONTACT_INFO.PHONE_ALT}`),
          style: 'default',
        },
        { text: 'Cancel', style: 'cancel' },
      ],
    });
  };

  const handleEmail = () => {
    Linking.openURL(`mailto:${CONTACT_INFO.EMAIL}`);
  };

  const handleSubmitMessage = async () => {
    await submitForm();
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Contact Support',
          headerLeft: () => (
            <Pressable
              onPress={() => router.back()}
              style={styles.headerButton}
            >
              <ArrowLeft size={24} color={colors.text} />
            </Pressable>
          ),
        }}
      />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.pageTitle}>Need Help?</Text>
        <Text style={styles.subtitle}>
          Contact our support team for assistance with your admin account or
          permissions.
        </Text>

        {/* Contact Options */}
        <Text style={styles.sectionTitle}>Quick Contact</Text>
        <View style={styles.contactOptions}>
          <Pressable style={styles.contactOption} onPress={handleCall}>
            <View style={[styles.contactIcon, { backgroundColor: '#e3f2fd' }]}>
              <Phone size={24} color={colors.primary} />
            </View>
            <Text style={styles.contactLabel}>Call</Text>
          </Pressable>

          <Pressable style={styles.contactOption} onPress={handleEmail}>
            <View style={[styles.contactIcon, { backgroundColor: '#e8f5e9' }]}>
              <Mail size={24} color='#2ecc71' />
            </View>
            <Text style={styles.contactLabel}>Email</Text>
          </Pressable>
        </View>

        {/* Contact Details */}
        <View style={styles.contactCard}>
          <View style={styles.contactDetail}>
            <Phone
              size={16}
              color={colors.primary}
              style={styles.contactDetailIcon}
            />
            <Text style={styles.contactDetailText}>
              {CONTACT_INFO.PHONE} or {CONTACT_INFO.PHONE_ALT}
            </Text>
          </View>

          <View style={styles.contactDetail}>
            <Mail
              size={16}
              color={colors.primary}
              style={styles.contactDetailIcon}
            />
            <Text style={styles.contactDetailText}>{CONTACT_INFO.EMAIL}</Text>
          </View>

          <Text style={styles.contactHours}>
            Support hours: {CONTACT_INFO.SUPPORT_HOURS}
          </Text>
        </View>

        {/* Contact Form */}
        <Text style={styles.sectionTitle}>Send Us a Message</Text>
        <View style={styles.formCard}>
          <TextInput
            label='Name'
            placeholder='Enter your name'
            value={formState.contactName}
            onChangeText={text => updateField('contactName', text)}
            required
          />

          <TextInput
            label='Email'
            placeholder='Enter your email'
            value={formState.contactEmail}
            onChangeText={text => updateField('contactEmail', text)}
            keyboardType='email-address'
            required
          />

          <TextInput
            label='Message'
            placeholder='How can we help you?'
            value={formState.contactMessage}
            onChangeText={text => updateField('contactMessage', text)}
            multiline
            numberOfLines={4}
            required
          />

          <Button
            title='Send Message'
            onPress={handleSubmitMessage}
            loading={formState.isSubmitting}
            disabled={formState.isSubmitting}
            fullWidth
            style={styles.submitButton}
          />
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 32,
  },
  headerButton: {
    padding: 8,
    marginLeft: -8,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 24,
    lineHeight: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
    marginTop: 8,
  },
  contactOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 12,
  },
  contactOption: {
    alignItems: 'center',
    flex: 1,
  },
  contactIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  contactLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  contactCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    gap: 12,
  },
  contactDetail: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  contactDetailIcon: {
    marginRight: 12,
  },
  contactDetailText: {
    fontSize: 16,
    color: colors.text,
  },
  contactHours: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 8,
  },
  formCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  submitButton: {
    marginTop: 8,
  },
});
