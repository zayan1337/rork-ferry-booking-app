import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking
} from 'react-native';
import {
  Phone,
  Mail,
  MessageCircle,
  ChevronDown,
  ChevronUp,
  HelpCircle
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import Card from '@/components/Card';
import Input from '@/components/Input';
import Button from '@/components/Button';
import { useContactForm } from '@/hooks/useContactForm';
import { CONTACT_INFO, FAQS } from '@/constants/customer';

export default function SupportScreen() {
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  // Use contact form hook
  const { formState, updateField, submitForm, isValid } = useContactForm();

  const toggleFaq = (index: number) => {
    if (expandedFaq === index) {
      setExpandedFaq(null);
    } else {
      setExpandedFaq(index);
    }
  };

  const handleCall = () => {
    Linking.openURL(`tel:${CONTACT_INFO.PHONE}`);
  };

  const handleEmail = () => {
    Linking.openURL(`mailto:${CONTACT_INFO.EMAIL}`);
  };

  const handleChat = () => {
    // In a real app, this would open a chat interface
    alert('Chat support would open here');
  };

  const handleSubmitMessage = async () => {
    await submitForm();
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
      <Text style={styles.pageTitle}>Help & Support</Text>

      {/* Contact Options */}
      <Text style={styles.sectionTitle}>Contact Us</Text>
      <View style={styles.contactOptions}>
        <TouchableOpacity
          style={styles.contactOption}
          onPress={handleCall}
        >
          <View style={[styles.contactIcon, { backgroundColor: '#e3f2fd' }]}>
            <Phone size={24} color={Colors.primary} />
          </View>
          <Text style={styles.contactLabel}>Call</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.contactOption}
          onPress={handleEmail}
        >
          <View style={[styles.contactIcon, { backgroundColor: '#e8f5e9' }]}>
            <Mail size={24} color="#2ecc71" />
          </View>
          <Text style={styles.contactLabel}>Email</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.contactOption}
          onPress={handleChat}
        >
          <View style={[styles.contactIcon, { backgroundColor: '#fff3e0' }]}>
            <MessageCircle size={24} color="#f39c12" />
          </View>
          <Text style={styles.contactLabel}>Chat</Text>
        </TouchableOpacity>
      </View>

      {/* Contact Details */}
      <Card variant="elevated" style={styles.contactCard}>
        <View style={styles.contactDetail}>
          <Phone size={16} color={Colors.primary} style={styles.contactDetailIcon} />
          <Text style={styles.contactDetailText}>{CONTACT_INFO.PHONE}</Text>
        </View>

        <View style={styles.contactDetail}>
          <Mail size={16} color={Colors.primary} style={styles.contactDetailIcon} />
          <Text style={styles.contactDetailText}>{CONTACT_INFO.EMAIL}</Text>
        </View>

        <Text style={styles.contactHours}>
          Support hours: {CONTACT_INFO.SUPPORT_HOURS}
        </Text>
      </Card>

      {/* FAQs */}
      <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>

      {FAQS.map((faq, index) => (
        <TouchableOpacity
          key={index}
          style={styles.faqItem}
          onPress={() => toggleFaq(index)}
          activeOpacity={0.7}
        >
          <View style={styles.faqHeader}>
            <View style={styles.faqQuestion}>
              <HelpCircle size={16} color={Colors.primary} style={styles.faqIcon} />
              <Text style={styles.faqQuestionText}>{faq.question}</Text>
            </View>
            {expandedFaq === index ? (
              <ChevronUp size={20} color={Colors.textSecondary} />
            ) : (
              <ChevronDown size={20} color={Colors.textSecondary} />
            )}
          </View>

          {expandedFaq === index && (
            <Text style={styles.faqAnswer}>{faq.answer}</Text>
          )}
        </TouchableOpacity>
      ))}

      {/* Contact Form */}
      <Text style={styles.sectionTitle}>Send Us a Message</Text>
      <Card variant="elevated" style={styles.formCard}>
        <Input
          label="Name"
          placeholder="Enter your name"
          value={formState.contactName}
          onChangeText={(text) => updateField('contactName', text)}
          required
        />

        <Input
          label="Email"
          placeholder="Enter your email"
          value={formState.contactEmail}
          onChangeText={(text) => updateField('contactEmail', text)}
          keyboardType="email-address"
          required
        />

        <Input
          label="Message"
          placeholder="How can we help you?"
          value={formState.contactMessage}
          onChangeText={(text) => updateField('contactMessage', text)}
          multiline
          numberOfLines={4}
          required
        />

        <Button
          title="Send Message"
          onPress={handleSubmitMessage}
          loading={formState.isSubmitting}
          disabled={formState.isSubmitting}
          fullWidth
          style={styles.submitButton}
        />
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 16,
    marginTop: 8,
  },
  contactOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  contactOption: {
    alignItems: 'center',
    width: '30%',
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
    color: Colors.text,
  },
  contactCard: {
    marginBottom: 24,
  },
  contactDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  contactDetailIcon: {
    marginRight: 12,
  },
  contactDetailText: {
    fontSize: 16,
    color: Colors.text,
  },
  contactHours: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 8,
  },
  faqItem: {
    backgroundColor: Colors.card,
    borderRadius: 8,
    marginBottom: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  faqHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  faqQuestion: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  faqIcon: {
    marginRight: 8,
  },
  faqQuestionText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    flex: 1,
  },
  faqAnswer: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  formCard: {
    marginBottom: 24,
  },
  submitButton: {
    marginTop: 8,
  },
});