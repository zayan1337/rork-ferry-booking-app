import { supabase } from './supabase';
import type { Terms } from '@/types';

/**
 * Fetch all active terms and conditions from the database
 * @returns Promise<Terms[]>
 */
export const fetchActiveTerms = async (): Promise<Terms[]> => {
  try {
    const { data, error } = await supabase
      .from('terms_and_conditions')
      .select('*')
      .eq('is_active', true)
      .order('effective_date', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch terms and conditions: ${error.message}`);
    }

    return data || [];
  } catch (error) {
    throw error;
  }
};

/**
 * Fetch all terms and conditions (active and inactive) from the database
 * @returns Promise<Terms[]>
 */
export const fetchAllTerms = async (): Promise<Terms[]> => {
  try {
    const { data, error } = await supabase
      .from('terms_and_conditions')
      .select('*')
      .order('effective_date', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch terms and conditions: ${error.message}`);
    }

    return data || [];
  } catch (error) {
    throw error;
  }
};

/**
 * Fetch a specific term by ID
 * @param id - The ID of the term to fetch
 * @returns Promise<Terms | null>
 */
export const fetchTermById = async (
  id: string
): Promise<Terms | null> => {
  try {
    const { data, error } = await supabase
      .from('terms_and_conditions')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned
        return null;
      }
      throw new Error(`Failed to fetch term: ${error.message}`);
    }

    return data;
  } catch (error) {
    throw error;
  }
};

/**
 * Fetch the latest version of terms and conditions
 * @returns Promise<Terms | null>
 */
export const fetchLatestTerms =
  async (): Promise<Terms | null> => {
    try {
      const { data, error } = await supabase
        .from('terms_and_conditions')
        .select('*')
        .eq('is_active', true)
        .order('effective_date', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows returned
          return null;
        }
        throw new Error(`Failed to fetch latest terms: ${error.message}`);
      }

      return data;
    } catch (error) {
      throw error;
    }
  };
