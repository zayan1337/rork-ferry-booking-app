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

// FAQ data
const faqs = [
  {
    question: "How do I book a ferry ticket?",
    answer: "You can book a ferry ticket by going to the 'Book' tab and following the booking process. Select your trip type, dates, route, seats, and complete the payment."
  },
  {
    question: "Can I cancel my booking?",
    answer: "Yes, you can cancel your booking up to 72 hours before departure. Go to 'My Bookings', select the booking you want to cancel, and tap on 'Cancel Booking'. A 50% cancellation fee will apply."
  },
  {
    question: "How do I modify my booking?",
    answer: "To modify your booking, go to 'My Bookings', select the booking you want to modify, and tap on 'Modify Booking'. You can change the date or seats if available. Modifications must be made at least 72 hours before departure."
  },
  {
    question: "What payment methods are accepted?",
    answer: "We accept various payment methods including Bank Transfer, BML, MIB, Ooredoo, and FahiPay."
  },
  {
    question: "How do I get my ticket?",
    answer: "After successful booking, your e-ticket will be available in the 'My Bookings' section. You can download it or share it directly from the app."
  },
  {
    question: "What if I miss my ferry?",
    answer: "If you miss your ferry, your ticket will be considered used and no refund will be provided. We recommend arriving at least 30 minutes before departure."
  },
  {
    question: "Are there any baggage restrictions?",
    answer: "Each passenger is allowed one piece of luggage up to 20kg and one carry-on bag. Additional luggage may incur extra charges."
  },
  {
    question: "How early should I arrive before departure?",
    answer: "We recommend arriving at least 30 minutes before the scheduled departure time to allow for ticket validation and boarding."
  }
];

export default function SupportScreen() {
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const toggleFaq = (index: number) => {
    if (expandedFaq === index) {
      setExpandedFaq(null);
    } else {
      setExpandedFaq(index);
    }
  };
  
  const handleCall = () => {
    Linking.openURL('tel:+9607123456');
  };
  
  const handleEmail = () => {
    Linking.openURL('mailto:support@ferryapp.mv');
  };
  
  const handleChat = () => {
    // In a real app, this would open a chat interface
    alert('Chat support would open here');
  };
  
  const handleSubmitMessage = () => {
    if (!contactName.trim() || !contactEmail.trim() || !contactMessage.trim()) {
      alert('Please fill in all fields');
      return;
    }
    
    setIsSubmitting(true);
    
    // Simulate API call
    setTimeout(() => {
      setIsSubmitting(false);
      alert('Your message has been sent. We will get back to you soon.');
      setContactName('');
      setContactEmail('');
      setContactMessage('');
    }, 1500);
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
          <Text style={styles.contactDetailText}>+960 7123456</Text>
        </View>
        
        <View style={styles.contactDetail}>
          <Mail size={16} color={Colors.primary} style={styles.contactDetailIcon} />
          <Text style={styles.contactDetailText}>support@ferryapp.mv</Text>
        </View>
        
        <Text style={styles.contactHours}>
          Support hours: 8:00 AM - 8:00 PM, 7 days a week
        </Text>
      </Card>
      
      {/* FAQs */}
      <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
      
      {faqs.map((faq, index) => (
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
          value={contactName}
          onChangeText={setContactName}
          required
        />
        
        <Input
          label="Email"
          placeholder="Enter your email"
          value={contactEmail}
          onChangeText={setContactEmail}
          keyboardType="email-address"
          required
        />
        
        <Input
          label="Message"
          placeholder="How can we help you?"
          value={contactMessage}
          onChangeText={setContactMessage}
          multiline
          numberOfLines={4}
          required
        />
        
        <Button
          title="Send Message"
          onPress={handleSubmitMessage}
          loading={isSubmitting}
          disabled={isSubmitting}
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