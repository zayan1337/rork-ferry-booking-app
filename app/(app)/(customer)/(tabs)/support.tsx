import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  ActivityIndicator,
  RefreshControl,
  FlatList,
  TextInput,
  Dimensions
} from 'react-native';
import {
  Phone,
  Mail,
  MessageCircle,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  AlertCircle,
  Search,
  X
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import Card from '@/components/Card';
import Input from '@/components/Input';
import Button from '@/components/Button';
import { useContactForm } from '@/hooks/useContactForm';
import { CONTACT_INFO, FAQS } from '@/constants/customer';
import { useFaqStore } from '@/store/faqStore';

const { width } = Dimensions.get('window');

// FAQ Item Component for better performance with FlatList
interface FAQItemProps {
  faq: any;
  isExpanded: boolean;
  onToggle: () => void;
  searchQuery: string;
}

const FAQItem = React.memo<FAQItemProps>(({ faq, isExpanded, onToggle, searchQuery }) => {
  return (
    <TouchableOpacity
      style={styles.faqItem}
      onPress={onToggle}
      activeOpacity={0.7}
    >
      <View style={styles.faqHeader}>
        <View style={styles.faqQuestion}>
          <HelpCircle size={16} color={Colors.primary} style={styles.faqIcon} />
          <Text style={styles.faqQuestionText}>{faq.question}</Text>
        </View>
        {isExpanded ? (
          <ChevronUp size={20} color={Colors.textSecondary} />
        ) : (
          <ChevronDown size={20} color={Colors.textSecondary} />
        )}
      </View>

      {isExpanded && (
        <Text style={styles.faqAnswer}>{faq.answer}</Text>
      )}
    </TouchableOpacity>
  );
});

// Category Chip Component
interface CategoryChipProps {
  category: any;
  isSelected: boolean;
  onPress: () => void;
}

const CategoryChip = React.memo<CategoryChipProps>(({ category, isSelected, onPress }) => (
  <TouchableOpacity
    style={[
      styles.categoryChip,
      isSelected && styles.categoryChipActive
    ]}
    onPress={onPress}
  >
    <Text style={[
      styles.categoryChipText,
      isSelected && styles.categoryChipTextActive
    ]}>
      {category?.name || 'All'}
    </Text>
  </TouchableOpacity>
));

export default function SupportScreen() {
  const [expandedFaq, setExpandedFaq] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Use contact form hook
  const { formState, updateField, submitForm, isValid } = useContactForm();

  // Use FAQ store
  const {
    faqs,
    categories,
    faqsByCategory,
    isLoadingFaqs,
    faqsError,
    fetchFaqsWithCategories,
    clearErrors
  } = useFaqStore();

  // Fallback to static FAQs if database fetch fails
  const displayFaqs = faqs.length > 0 ? faqs : FAQS.map((faq, index) => ({
    id: `static-${index}`,
    category_id: 'general',
    question: faq.question,
    answer: faq.answer,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }));

  // Filter and search FAQs with memoization for performance
  const filteredFaqs = useMemo(() => {
    let filtered = displayFaqs;
    
    // Filter by category
    if (selectedCategory) {
      filtered = filtered.filter(faq => faq.category_id === selectedCategory);
    }
    
    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(faq => 
        faq.question.toLowerCase().includes(query) ||
        faq.answer.toLowerCase().includes(query)
      );
    }
    
    return filtered;
  }, [displayFaqs, selectedCategory, searchQuery]);

  // Load FAQ data on component mount
  useEffect(() => {
    fetchFaqsWithCategories();
  }, [fetchFaqsWithCategories]);

  const toggleFaq = useCallback((faqId: string) => {
    if (expandedFaq === faqId) {
      setExpandedFaq(null);
    } else {
      setExpandedFaq(faqId);
    }
  }, [expandedFaq]);

  const clearSearch = useCallback(() => {
    setSearchQuery('');
  }, []);

  const clearFilters = useCallback(() => {
    setSelectedCategory(null);
    setSearchQuery('');
    setExpandedFaq(null);
  }, []);

  const handleRefresh = async () => {
    clearErrors();
    await fetchFaqsWithCategories();
  };

  const handleCategoryFilter = useCallback((categoryId: string | null) => {
    setSelectedCategory(categoryId);
    setExpandedFaq(null); // Close any expanded FAQ when changing category
  }, []);

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

  const renderFAQItem = useCallback(({ item }: { item: any }) => (
    <FAQItem 
      faq={item} 
      isExpanded={expandedFaq === item.id}
      onToggle={() => toggleFaq(item.id)}
      searchQuery={searchQuery}
    />
  ), [expandedFaq, toggleFaq, searchQuery]);

  const getItemLayout = useCallback((data: any, index: number) => ({
    length: 80, // Approximate item height
    offset: 80 * index,
    index,
  }), []);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl
          refreshing={isLoadingFaqs}
          onRefresh={handleRefresh}
          colors={[Colors.primary]}
        />
      }
      showsVerticalScrollIndicator={false}
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

      {/* FAQs Section */}
      <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Search size={20} color={Colors.textSecondary} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search FAQs..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor={Colors.textSecondary}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={clearSearch} style={styles.clearSearchButton}>
              <X size={16} color={Colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Category Filter with Horizontal Scroll */}
      {categories.length > 0 && (
        <View style={styles.categoryFilterContainer}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryFilter}
          >
            <CategoryChip
              category={{ name: 'All' }}
              isSelected={selectedCategory === null}
              onPress={() => handleCategoryFilter(null)}
            />
            
            {categories.map((category) => (
              <CategoryChip
                key={category.id}
                category={category}
                isSelected={selectedCategory === category.id}
                onPress={() => handleCategoryFilter(category.id)}
              />
            ))}
          </ScrollView>
          
          {/* Clear filters button */}
          {(selectedCategory || searchQuery) && (
            <TouchableOpacity onPress={clearFilters} style={styles.clearFiltersButton}>
              <Text style={styles.clearFiltersText}>Clear All Filters</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Error message */}
      {faqsError && (
        <Card variant="elevated" style={styles.errorCard}>
          <View style={styles.errorContent}>
            <AlertCircle size={20} color="#e74c3c" />
            <Text style={styles.errorText}>
              Unable to load FAQs. Showing default questions.
            </Text>
          </View>
          <TouchableOpacity onPress={handleRefresh} style={styles.retryButton}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </Card>
      )}

      {/* Loading indicator */}
      {isLoadingFaqs && faqs.length === 0 && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading FAQs...</Text>
        </View>
      )}

      {/* FAQ Items with FlatList for better performance */}
      <View style={styles.faqListContainer}>
        {!isLoadingFaqs && filteredFaqs.length === 0 ? (
          <View style={styles.noFaqsContainer}>
            <HelpCircle size={48} color={Colors.textSecondary} />
            <Text style={styles.noFaqsText}>
              {searchQuery ? 'No FAQs match your search' : 
               selectedCategory ? 'No FAQs found in this category' : 'No FAQs available'}
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredFaqs}
            keyExtractor={(item) => item.id}
            renderItem={renderFAQItem}
            scrollEnabled={true}
            showsVerticalScrollIndicator={true}
            initialNumToRender={10}
            maxToRenderPerBatch={5}
            windowSize={10}
            removeClippedSubviews={true}
            getItemLayout={getItemLayout}
            nestedScrollEnabled={true}
          />
        )}
      </View>

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
  searchContainer: {
    marginBottom: 16,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: Colors.text,
    paddingVertical: 0,
  },
  clearSearchButton: {
    marginLeft: 8,
    padding: 4,
  },
  categoryFilterContainer: {
    marginBottom: 16,
  },
  categoryFilter: {
    flexDirection: 'row',
    paddingHorizontal: 0,
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    marginRight: 8,
  },
  categoryChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  categoryChipText: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: '500',
  },
  categoryChipTextActive: {
    color: '#ffffff',
  },
  clearFiltersButton: {
    alignSelf: 'flex-start',
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: Colors.border,
    borderRadius: 6,
  },
  clearFiltersText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  errorCard: {
    marginBottom: 16,
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
    borderWidth: 1,
  },
  errorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  errorText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: '#b91c1c',
  },
  retryButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#dc2626',
    borderRadius: 4,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  loadingText: {
    marginLeft: 8,
    fontSize: 14,
    color: Colors.textSecondary,
  },
  faqListContainer: {
    marginBottom: 24,
    minHeight: 300,
    maxHeight: 400,
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
    lineHeight: 20,
  },
  noFaqsContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  noFaqsText: {
    marginTop: 12,
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  formCard: {
    marginBottom: 24,
  },
  submitButton: {
    marginTop: 8,
  },
}); 