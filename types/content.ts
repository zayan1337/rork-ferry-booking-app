// ============================================================================
// TERMS AND CONDITIONS TYPES
// ============================================================================

export interface TermsAndConditions {
  id: string;
  title: string;
  content: string;
  version: string;
  effective_date: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TermsFormData {
  title: string;
  content: string;
  version: string;
  effective_date: string;
  is_active: boolean;
}

export interface TermsWithDetails extends TermsAndConditions {
  created_by?: string;
  updated_by?: string;
  word_count?: number;
  is_current?: boolean;
}

// ============================================================================
// PROMOTION TYPES
// ============================================================================

export interface Promotion {
  id: string;
  name: string;
  description?: string;
  discount_percentage: number;
  start_date: string;
  end_date: string;
  is_first_time_booking_only: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PromotionFormData {
  name: string;
  description?: string;
  discount_percentage: number;
  start_date: string;
  end_date: string;
  is_first_time_booking_only: boolean;
  is_active: boolean;
}

export interface PromotionStats {
  total: number;
  active: number;
  expired: number;
  upcoming: number;
  averageDiscount: number;
}

// ============================================================================
// CONTENT FILTER TYPES
// ============================================================================

export interface ContentFilters {
  terms: {
    version?: string;
    is_active?: boolean;
    effective_date_from?: string;
    effective_date_to?: string;
  };
  promotions: {
    is_active?: boolean;
    is_first_time_booking_only?: boolean;
    discount_range?: {
      min: number;
      max: number;
    };
    date_range?: {
      start: string;
      end: string;
    };
  };
}

// ============================================================================
// CONTENT STATISTICS TYPES
// ============================================================================

export interface ContentStats {
  totalTerms: number;
  activeTerms: number;
  totalPromotions: number;
  activePromotions: number;
  currentTermsVersion: string;
}

// ============================================================================
// VALIDATION TYPES
// ============================================================================

export interface ValidationError {
  field: string;
  message: string;
}

export interface FormValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

// ============================================================================
// EXPORT AND IMPORT TYPES
// ============================================================================

export interface ExportOptions {
  format: 'json' | 'csv' | 'xlsx';
  includeInactive?: boolean;
  dateRange?: {
    from: string;
    to: string;
  };
  fields?: string[];
}

export interface ImportResult {
  success: number;
  failed: number;
  errors: Array<{
    row: number;
    error: string;
  }>;
}

// ============================================================================
// CONTENT MANAGEMENT TYPES
// ============================================================================

export interface ContentItem {
  id: string;
  title?: string;
  name?: string;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

export interface ContentItemWithActions extends ContentItem {
  canEdit: boolean;
  canDelete: boolean;
  canDuplicate: boolean;
  canActivate: boolean;
}

// ============================================================================
// CONTENT ACTIONS
// ============================================================================

export type ContentAction =
  | 'create'
  | 'update'
  | 'delete'
  | 'activate'
  | 'deactivate'
  | 'duplicate'
  | 'export'
  | 'import';

export type ContentType = 'terms' | 'promotions';

// ============================================================================
// BULK OPERATIONS
// ============================================================================

export interface BulkOperation {
  action: ContentAction;
  itemIds: string[];
  options?: Record<string, any>;
}

export interface BulkOperationResult {
  success: number;
  failed: number;
  errors: Array<{
    id: string;
    error: string;
  }>;
}
