import type { DBFaq, DBFaqCategory } from '@/types/database';
import { FAQ, FAQCategory, FAQStats, FAQFilters } from '@/types/content';

/**
 * Organize FAQs by category for easier rendering
 */
export const organizeFaqsByCategory = (
  faqs: DBFaq[],
  categories: DBFaqCategory[]
): Record<string, { category: DBFaqCategory; faqs: DBFaq[] }> => {
  const organized: Record<string, { category: DBFaqCategory; faqs: DBFaq[] }> = {};

  // Initialize categories
  categories.forEach(category => {
    organized[category.id] = {
      category,
      faqs: []
    };
  });

  // Assign FAQs to their categories
  faqs.forEach(faq => {
    if (organized[faq.category_id]) {
      organized[faq.category_id].faqs.push(faq);
    }
  });

  return organized;
};

/**
 * Search FAQs by query string
 */
export const searchFaqs = (faqs: DBFaq[], query: string): DBFaq[] => {
  if (!query.trim()) return faqs;

  const searchTerm = query.toLowerCase();
  return faqs.filter(faq =>
    faq.question.toLowerCase().includes(searchTerm) ||
    faq.answer.toLowerCase().includes(searchTerm)
  );
};

/**
 * Filter FAQs by category
 */
export const filterFaqsByCategory = (faqs: FAQ[], categoryId: string): FAQ[] => {
  return faqs.filter(faq => faq.category_id === categoryId);
};

/**
 * Filter FAQs by active status
 */
export const filterFaqsByStatus = (faqs: FAQ[], isActive: boolean): FAQ[] => {
  return faqs.filter(faq => faq.is_active === isActive);
};

/**
 * Sort FAQs by different criteria
 */
export const sortFaqs = (
  faqs: FAQ[],
  sortBy: 'question' | 'category' | 'order_index' | 'created_at' | 'updated_at',
  order: 'asc' | 'desc' = 'asc'
): FAQ[] => {
  return [...faqs].sort((a, b) => {
    let aValue: any;
    let bValue: any;

    switch (sortBy) {
      case 'question':
        aValue = a.question.toLowerCase();
        bValue = b.question.toLowerCase();
        break;
      case 'category':
        aValue = a.category?.name?.toLowerCase() || '';
        bValue = b.category?.name?.toLowerCase() || '';
        break;
      case 'order_index':
        aValue = a.order_index;
        bValue = b.order_index;
        break;
      case 'created_at':
        aValue = new Date(a.created_at).getTime();
        bValue = new Date(b.created_at).getTime();
        break;
      case 'updated_at':
        aValue = new Date(a.updated_at).getTime();
        bValue = new Date(b.updated_at).getTime();
        break;
      default:
        aValue = a.question.toLowerCase();
        bValue = b.question.toLowerCase();
    }

    if (aValue < bValue) return order === 'asc' ? -1 : 1;
    if (aValue > bValue) return order === 'asc' ? 1 : -1;
    return 0;
  });
};

/**
 * Sort FAQ categories
 */
export const sortFaqCategories = (
  categories: FAQCategory[],
  sortBy: 'name' | 'order_index' | 'created_at' = 'order_index',
  order: 'asc' | 'desc' = 'asc'
): FAQCategory[] => {
  return [...categories].sort((a, b) => {
    let aValue: any;
    let bValue: any;

    switch (sortBy) {
      case 'name':
        aValue = a.name.toLowerCase();
        bValue = b.name.toLowerCase();
        break;
      case 'order_index':
        aValue = a.order_index;
        bValue = b.order_index;
        break;
      case 'created_at':
        aValue = new Date(a.created_at).getTime();
        bValue = new Date(b.created_at).getTime();
        break;
      default:
        aValue = a.order_index;
        bValue = b.order_index;
    }

    if (aValue < bValue) return order === 'asc' ? -1 : 1;
    if (aValue > bValue) return order === 'asc' ? 1 : -1;
    return 0;
  });
};

/**
 * Calculate FAQ statistics
 */
export const calculateFaqStats = (faqs: FAQ[], categories: FAQCategory[]): FAQStats => {
  const stats: FAQStats = {
    total: faqs.length,
    active: faqs.filter(faq => faq.is_active).length,
    inactive: faqs.filter(faq => !faq.is_active).length,
    byCategory: {},
    recentlyUpdated: 0,
    totalCategories: categories.length,
    activeCategories: categories.filter(cat => cat.is_active).length,
  };

  // Count FAQs by category
  faqs.forEach(faq => {
    if (stats.byCategory[faq.category_id]) {
      stats.byCategory[faq.category_id]++;
    } else {
      stats.byCategory[faq.category_id] = 1;
    }
  });

  // Count recently updated (last 7 days)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  stats.recentlyUpdated = faqs.filter(faq =>
    new Date(faq.updated_at) > sevenDaysAgo
  ).length;

  return stats;
};

/**
 * Calculate category statistics
 */
export const calculateCategoryStats = (categories: FAQCategory[], faqs: FAQ[]) => {
  return {
    total: categories.length,
    active: categories.filter(cat => cat.is_active).length,
    inactive: categories.filter(cat => !cat.is_active).length,
    withFaqs: categories.filter(cat =>
      faqs.some(faq => faq.category_id === cat.id)
    ).length,
    averageFaqsPerCategory: categories.length > 0
      ? Math.round(faqs.length / categories.length * 10) / 10
      : 0,
  };
};

/**
 * Get FAQs with enhanced category information
 */
export const getFaqsWithCategoryInfo = (faqs: FAQ[], categories: FAQCategory[]): FAQ[] => {
  return faqs.map(faq => ({
    ...faq,
    category: categories.find(cat => cat.id === faq.category_id)
  }));
};

/**
 * Get category with FAQ count
 */
export const getCategoriesWithFaqCount = (categories: FAQCategory[], faqs: FAQ[]) => {
  return categories.map(category => ({
    ...category,
    faq_count: faqs.filter(faq => faq.category_id === category.id).length,
    active_faq_count: faqs.filter(faq =>
      faq.category_id === category.id && faq.is_active
    ).length,
  }));
};

/**
 * Advanced FAQ filtering with multiple criteria
 */
export const filterFaqs = (faqs: FAQ[], filters: FAQFilters): FAQ[] => {
  let filtered = [...faqs];

  // Filter by category
  if (filters.category_id) {
    filtered = filtered.filter(faq => faq.category_id === filters.category_id);
  }

  // Filter by active status
  if (filters.is_active !== undefined) {
    filtered = filtered.filter(faq => faq.is_active === filters.is_active);
  }

  // Filter by search query
  if (filters.search?.trim()) {
    const searchTerm = filters.search.toLowerCase();
    filtered = filtered.filter(faq =>
      faq.question.toLowerCase().includes(searchTerm) ||
      faq.answer.toLowerCase().includes(searchTerm) ||
      faq.category?.name?.toLowerCase().includes(searchTerm)
    );
  }

  return filtered;
};

/**
 * Validate FAQ data
 */
export const validateFaqData = (data: {
  question: string;
  answer: string;
  category_id: string;
}): { isValid: boolean; errors: Record<string, string> } => {
  const errors: Record<string, string> = {};

  if (!data.question?.trim()) {
    errors.question = 'Question is required';
  } else if (data.question.trim().length < 10) {
    errors.question = 'Question must be at least 10 characters long';
  }

  if (!data.answer?.trim()) {
    errors.answer = 'Answer is required';
  } else if (data.answer.trim().length < 20) {
    errors.answer = 'Answer must be at least 20 characters long';
  }

  if (!data.category_id?.trim()) {
    errors.category_id = 'Category is required';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

/**
 * Validate FAQ category data
 */
export const validateCategoryData = (data: {
  name: string;
  description?: string;
}): { isValid: boolean; errors: Record<string, string> } => {
  const errors: Record<string, string> = {};

  if (!data.name?.trim()) {
    errors.name = 'Category name is required';
  } else if (data.name.trim().length < 3) {
    errors.name = 'Category name must be at least 3 characters long';
  }

  if (data.description && data.description.length > 200) {
    errors.description = 'Description must be less than 200 characters';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

/**
 * Format FAQ for display
 */
export const formatFaqForDisplay = (faq: DBFaq): {
  id: string;
  question: string;
  answer: string;
  category?: string
} => {
  return {
    id: faq.id,
    question: faq.question,
    answer: faq.answer,
    category: faq.category?.name
  };
};

/**
 * Get FAQ by ID with error handling
 */
export const getFaqById = (faqs: FAQ[], id: string): FAQ | null => {
  return faqs.find(faq => faq.id === id) || null;
};

/**
 * Get category by ID with error handling
 */
export const getCategoryById = (categories: FAQCategory[], id: string): FAQCategory | null => {
  return categories.find(category => category.id === id) || null;
};

/**
 * Check if category can be deleted (has no FAQs)
 */
export const canDeleteCategory = (categoryId: string, faqs: FAQ[]): boolean => {
  return !faqs.some(faq => faq.category_id === categoryId);
};

/**
 * Get next order index for FAQ
 */
export const getNextFaqOrderIndex = (faqs: FAQ[], categoryId?: string): number => {
  const relevantFaqs = categoryId
    ? faqs.filter(faq => faq.category_id === categoryId)
    : faqs;

  if (relevantFaqs.length === 0) return 0;

  const maxOrder = Math.max(...relevantFaqs.map(faq => faq.order_index));
  return maxOrder + 1;
};

/**
 * Get next order index for category
 */
export const getNextCategoryOrderIndex = (categories: FAQCategory[]): number => {
  if (categories.length === 0) return 0;

  const maxOrder = Math.max(...categories.map(cat => cat.order_index));
  return maxOrder + 1;
};

/**
 * Export FAQs to various formats
 */
export const exportFaqsToText = (faqs: FAQ[]): string => {
  let content = 'Frequently Asked Questions\n\n';

  faqs.forEach((faq, index) => {
    content += `${index + 1}. ${faq.question}\n`;
    content += `   ${faq.answer}\n\n`;
  });

  return content;
};

/**
 * Export FAQs to JSON
 */
export const exportFaqsToJson = (faqs: FAQ[]): string => {
  const exportData = faqs.map(faq => ({
    question: faq.question,
    answer: faq.answer,
    category: faq.category?.name || 'Uncategorized',
    isActive: faq.is_active,
    createdAt: faq.created_at,
    updatedAt: faq.updated_at
  }));

  return JSON.stringify(exportData, null, 2);
};

/**
 * Group FAQs by category for organized display
 */
export const groupFaqsByCategory = (faqs: FAQ[], categories: FAQCategory[]) => {
  const grouped = categories.map(category => ({
    category,
    faqs: faqs
      .filter(faq => faq.category_id === category.id)
      .sort((a, b) => a.order_index - b.order_index)
  }));

  // Add uncategorized FAQs if any
  const uncategorizedFaqs = faqs.filter(faq =>
    !categories.some(cat => cat.id === faq.category_id)
  );

  if (uncategorizedFaqs.length > 0) {
    grouped.push({
      category: {
        id: 'uncategorized',
        name: 'Uncategorized',
        description: 'FAQs without a category',
        order_index: 999,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      faqs: uncategorizedFaqs.sort((a, b) => a.order_index - b.order_index)
    });
  }

  return grouped.sort((a, b) => a.category.order_index - b.category.order_index);
}; 