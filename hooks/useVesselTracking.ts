import { useState, useEffect } from 'react';
import { supabase } from '@/utils/supabase';
import { VesselTrackingInfo } from '@/types/customer';

interface UseVesselTrackingReturn {
  vessels: VesselTrackingInfo[];
  isLoading: boolean;
  error: string | null;
  fetchVessels: () => Promise<void>;
  refreshVessels: () => Promise<void>;
}

export const useVesselTracking = (): UseVesselTrackingReturn => {
  const [vessels, setVessels] = useState<VesselTrackingInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchVessels = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('vessels')
        .select(
          `
          id,
          name,
          registration_number,
          vessel_type,
          status,
          captain_name,
          seating_capacity,
          is_active
        `
        )
        .eq('is_active', true)
        .eq('status', 'active')
        .not('registration_number', 'is', null)
        .order('name');

      if (fetchError) {
        throw fetchError;
      }

      setVessels(data || []);
    } catch (err) {
      console.error('Error fetching vessels:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch vessels');
    } finally {
      setIsLoading(false);
    }
  };

  const refreshVessels = async () => {
    await fetchVessels();
  };

  useEffect(() => {
    fetchVessels();
  }, []);

  return {
    vessels,
    isLoading,
    error,
    fetchVessels,
    refreshVessels,
  };
};
