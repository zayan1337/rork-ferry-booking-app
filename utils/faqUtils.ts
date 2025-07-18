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
  const categoriesWithFaqs = categories.filter(cat =>
    faqs.some(faq => faq.category_id === cat.id)
  ).length;

  return {
    total: categories.length,
    active: categories.filter(cat => cat.is_active).length,
    inactive: categories.filter(cat => !cat.is_active).length,
    withFaqs: categoriesWithFaqs,
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
  } else if (data.question.trim().length > 500) {
    errors.question = 'Question must be less than 500 characters';
  }

  if (!data.answer?.trim()) {
    errors.answer = 'Answer is required';
  } else if (data.answer.trim().length < 20) {
    errors.answer = 'Answer must be at least 20 characters long';
  } else if (data.answer.trim().length > 5000) {
    errors.answer = 'Answer must be less than 5000 characters';
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
  } else if (data.name.trim().length > 100) {
    errors.name = 'Category name must be less than 100 characters';
  }

  if (data.description && data.description.length > 500) {
    errors.description = 'Description must be less than 500 characters';
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
 * Get available order positions for FAQ categories
 */
export const getAvailableCategoryOrderPositions = (categories: FAQCategory[]): { label: string; value: number }[] => {
  const positions = [];

  // Sort categories by their current order
  const sortedCategories = [...categories].sort((a, b) => a.order_index - b.order_index);

  // Add "First position" option
  positions.push({
    label: "1. First position",
    value: 0
  });

  // Add positions after each existing category
  sortedCategories.forEach((category, index) => {
    positions.push({
      label: `${index + 2}. After "${category.name}"`,
      value: index + 1
    });
  });

  return positions;
};

/**
 * Get available order positions for FAQs within a category
 */
export const getAvailableFaqOrderPositions = (faqs: FAQ[], categoryId: string): { label: string; value: number }[] => {
  const categoryFaqs = faqs.filter(faq => faq.category_id === categoryId);
  const positions = [];

  // Add position at the beginning
  positions.push({
    label: "1. First position",
    value: 0
  });

  // Sort FAQs by their current order and add positions after each
  const sortedFaqs = categoryFaqs.sort((a, b) => a.order_index - b.order_index);

  sortedFaqs.forEach((faq, index) => {
    const truncatedQuestion = faq.question.length > 50
      ? `${faq.question.substring(0, 50)}...`
      : faq.question;

    positions.push({
      label: `${index + 2}. After "${truncatedQuestion}"`,
      value: index + 1
    });
  });

  return positions;
};

/**
 * Validate order index for category
 */
export const validateCategoryOrderIndex = (
  orderIndex: number,
  categories: FAQCategory[],
  excludeId?: string
): { isValid: boolean; error?: string } => {
  if (orderIndex < 0) {
    return { isValid: false, error: 'Order index must be 0 or greater' };
  }

  const filteredCategories = excludeId
    ? categories.filter(cat => cat.id !== excludeId)
    : categories;

  const maxOrder = filteredCategories.length > 0
    ? Math.max(...filteredCategories.map(cat => cat.order_index))
    : -1;

  if (orderIndex > maxOrder + 1) {
    return { isValid: false, error: `Order index cannot be greater than ${maxOrder + 2}` };
  }

  return { isValid: true };
};

/**
 * Validate order index for FAQ
 */
export const validateFaqOrderIndex = (
  orderIndex: number,
  faqs: FAQ[],
  categoryId: string,
  excludeId?: string
): { isValid: boolean; error?: string } => {
  if (orderIndex < 0) {
    return { isValid: false, error: 'Order index must be 0 or greater' };
  }

  const categoryFaqs = faqs
    .filter(faq => faq.category_id === categoryId)
    .filter(faq => excludeId ? faq.id !== excludeId : true);

  const maxOrder = categoryFaqs.length > 0
    ? Math.max(...categoryFaqs.map(faq => faq.order_index))
    : -1;

  if (orderIndex > maxOrder + 1) {
    return { isValid: false, error: `Order index cannot be greater than ${maxOrder + 2}` };
  }

  return { isValid: true };
};

/**
 * Get suggested order index for new category
 */
export const getSuggestedCategoryOrderIndex = (categories: FAQCategory[]): number => {
  return getNextCategoryOrderIndex(categories);
};

/**
 * Get suggested order index for new FAQ
 */
export const getSuggestedFaqOrderIndex = (faqs: FAQ[], categoryId: string): number => {
  return getNextFaqOrderIndex(faqs, categoryId);
};

/**
 * Reorder categories locally (for optimistic updates)
 */
export const reorderCategoriesLocally = (
  categories: FAQCategory[],
  movedCategoryId: string,
  newOrderIndex: number
): FAQCategory[] => {
  const movedCategory = categories.find(cat => cat.id === movedCategoryId);
  if (!movedCategory) return categories;

  const otherCategories = categories.filter(cat => cat.id !== movedCategoryId);

  // Adjust order indices for other categories
  const adjustedCategories = otherCategories.map(cat => {
    if (cat.order_index >= newOrderIndex) {
      return { ...cat, order_index: cat.order_index + 1 };
    }
    return cat;
  });

  // Add the moved category with new order index
  const updatedCategories = [
    ...adjustedCategories,
    { ...movedCategory, order_index: newOrderIndex }
  ];

  return updatedCategories.sort((a, b) => a.order_index - b.order_index);
};

/**
 * Reorder FAQs locally (for optimistic updates)
 */
export const reorderFaqsLocally = (
  faqs: FAQ[],
  movedFaqId: string,
  newOrderIndex: number
): FAQ[] => {
  const movedFaq = faqs.find(faq => faq.id === movedFaqId);
  if (!movedFaq) return faqs;

  const categoryFaqs = faqs.filter(faq =>
    faq.category_id === movedFaq.category_id && faq.id !== movedFaqId
  );
  const otherFaqs = faqs.filter(faq =>
    faq.category_id !== movedFaq.category_id
  );

  // Adjust order indices for FAQs in the same category
  const adjustedCategoryFaqs = categoryFaqs.map(faq => {
    if (faq.order_index >= newOrderIndex) {
      return { ...faq, order_index: faq.order_index + 1 };
    }
    return faq;
  });

  // Add the moved FAQ with new order index
  const updatedFaqs = [
    ...otherFaqs,
    ...adjustedCategoryFaqs,
    { ...movedFaq, order_index: newOrderIndex }
  ];

  return updatedFaqs;
};

/**
 * Normalize FAQ data for consistency
 */
export const normalizeFaqData = (faq: any): FAQ => {
  return {
    id: faq.id,
    category_id: faq.category_id,
    question: faq.question?.trim() || '',
    answer: faq.answer?.trim() || '',
    is_active: faq.is_active ?? true,
    order_index: faq.order_index ?? 0,
    created_at: faq.created_at,
    updated_at: faq.updated_at,
    category: faq.category || undefined,
  };
};

/**
 * Normalize category data for consistency
 */
export const normalizeCategoryData = (category: any): FAQCategory => {
  return {
    id: category.id,
    name: category.name?.trim() || '',
    description: category.description?.trim() || '',
    order_index: category.order_index ?? 0,
    is_active: category.is_active ?? true,
    created_at: category.created_at,
    updated_at: category.updated_at,
    faq_count: category.faq_count || 0,
  };
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
    orderIndex: faq.order_index,
    createdAt: faq.created_at,
    updatedAt: faq.updated_at
  }));

  return JSON.stringify(exportData, null, 2);
};

/**
 * Group FAQs by category for organized display
 */
export const groupFaqsByCategory = (faqs: FAQ[], categories: FAQCategory[]) => {
  const grouped = categories
    .filter(category => category.is_active)
    .map(category => ({
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