import type { DBFaq, DBFaqCategory } from '@/types/database';

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
 * Get FAQ categories with their FAQ counts
 */
export const getCategoriesWithCounts = (
  categories: DBFaqCategory[],
  faqs: DBFaq[]
): Array<DBFaqCategory & { faqCount: number }> => {
  return categories.map(category => {
    const faqCount = faqs.filter(faq => faq.category_id === category.id).length;
    return {
      ...category,
      faqCount
    };
  });
};

/**
 * Get the most popular FAQs (this would typically be based on view counts or ratings)
 * For now, it returns the first few FAQs
 */
export const getPopularFaqs = (faqs: DBFaq[], limit: number = 5): DBFaq[] => {
  return faqs.slice(0, limit);
};

/**
 * Get recently updated FAQs
 */
export const getRecentlyUpdatedFaqs = (faqs: DBFaq[], limit: number = 5): DBFaq[] => {
  return [...faqs]
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, limit);
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