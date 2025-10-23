import { supabase } from '@/utils/supabase';
import { DatabaseIsland } from '@/types/database';

/**
 * Fetch all active islands from the islands table
 */
export const fetchActiveIslands = async (): Promise<DatabaseIsland[]> => {
  try {
    const { data, error } = await supabase
      .from('islands')
      .select(
        `
        *,
        zones (
          id,
          name,
          code,
          description,
          is_active
        )
      `
      )
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (error) throw error;

    // Transform the data to include zone information
    return (data || []).map(island => ({
      ...island,
      zone_info: island.zones || null,
    }));
  } catch (error) {
    console.error('Error fetching islands:', error);
    return [];
  }
};

/**
 * Get destination islands based on boarding island zone
 * Rule: If boarding island is in Zone A, show Zone B islands
 *       If boarding island is in Zone B, show Zone A islands
 */
export const getDestinationIslandsByZone = (
  allIslands: DatabaseIsland[],
  boardingIslandId: string
): DatabaseIsland[] => {
  // Find the boarding island
  const boardingIsland = allIslands.find(
    island => island.id === boardingIslandId
  );

  if (!boardingIsland || !boardingIsland.zone_id) {
    return [];
  }

  // Get the boarding island's zone
  const boardingZone = boardingIsland.zone || boardingIsland.zone_info?.code;

  // Return islands from different zones (exclude same zone and the boarding island itself)
  return allIslands.filter(
    island =>
      island.id !== boardingIslandId &&
      island.zone_id !== boardingIsland.zone_id
  );
};

/**
 * Simple function to get islands excluding the selected one and same zone
 */
export const getOppositeZoneIslands = (
  allIslands: DatabaseIsland[],
  selectedIslandId: string | null
): DatabaseIsland[] => {
  if (!selectedIslandId) return [];

  const selectedIsland = allIslands.find(
    island => island.id === selectedIslandId
  );

  if (!selectedIsland) return [];

  // Return islands from different zones only
  return allIslands.filter(
    island =>
      island.id !== selectedIslandId &&
      island.zone_id !== selectedIsland.zone_id
  );
};
