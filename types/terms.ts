export interface TermsAndConditions {
  id: string;
  title: string;
  content: string;
  version: string;
  effective_date: string;
  created_at: string;
  is_active: boolean;
  updated_at: string;
}

export interface TermsStore {
  terms: TermsAndConditions[];
  isLoading: boolean;
  error: string | null;
  fetchTerms: () => Promise<void>;
  getActiveTerms: () => TermsAndConditions[];
  clearError: () => void;
}

