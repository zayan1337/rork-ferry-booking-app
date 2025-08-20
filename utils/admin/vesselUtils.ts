import { AdminManagement } from '@/types';
import { Anchor, Crown, UserCheck } from 'lucide-react-native';

type Vessel = AdminManagement.Vessel;
type VesselFilters = AdminManagement.VesselFilters;
type Seat = AdminManagement.Seat;
type SeatLayout = AdminManagement.SeatLayout;
type SeatPosition = AdminManagement.SeatPosition;
type SeatLayoutStats = AdminManagement.SeatLayoutStats;

// ============================================================================
// SEARCH FUNCTIONS
// ============================================================================

export const searchVessels = (vessels: Vessel[], query: string): Vessel[] => {
  if (!query.trim() || !vessels || !Array.isArray(vessels))
    return vessels || [];

  const searchTerm = query.toLowerCase();
  return vessels.filter(
    vessel =>
      vessel &&
      ((vessel.name && vessel.name.toLowerCase().includes(searchTerm)) ||
        (vessel.status && vessel.status.toLowerCase().includes(searchTerm)) ||
        (vessel.seating_capacity &&
          vessel.seating_capacity.toString().includes(searchTerm)))
  );
};

// ============================================================================
// FILTER FUNCTIONS
// ============================================================================

export const filterVesselsByStatus = (
  vessels: Vessel[],
  status: string | null
): Vessel[] => {
  if (!status || status === 'all') return vessels;
  return vessels.filter(vessel => vessel.status === status);
};

export const filterVessels = (
  vessels: Vessel[],
  filters: VesselFilters
): Vessel[] => {
  if (!vessels || !Array.isArray(vessels)) return [];

  let filtered = vessels.filter(vessel => vessel); // Remove any null/undefined vessels

  // Status filter
  if (filters.status && filters.status !== 'all') {
    filtered = filtered.filter(
      vessel => vessel && vessel.status === filters.status
    );
  }

  // Active status filter
  if (filters.is_active !== undefined && filters.is_active !== null) {
    filtered = filtered.filter(
      vessel => vessel && vessel.is_active === filters.is_active
    );
  }

  // Capacity range filter
  if (filters.capacity_range) {
    filtered = filtered.filter(
      vessel =>
        vessel &&
        vessel.seating_capacity >= filters.capacity_range!.min &&
        vessel.seating_capacity <= filters.capacity_range!.max
    );
  }

  // Min/Max capacity filters
  if (filters.min_capacity) {
    filtered = filtered.filter(
      vessel => vessel && vessel.seating_capacity >= filters.min_capacity!
    );
  }

  if (filters.max_capacity) {
    filtered = filtered.filter(
      vessel => vessel && vessel.seating_capacity <= filters.max_capacity!
    );
  }

  // Utilization rating filter
  if (filters.utilization_rating) {
    filtered = filtered.filter(vessel => {
      if (!vessel) return false;
      const utilization = vessel.capacity_utilization_30d || 0;
      switch (filters.utilization_rating) {
        case 'excellent':
          return utilization >= 80;
        case 'good':
          return utilization >= 60 && utilization < 80;
        case 'fair':
          return utilization >= 40 && utilization < 60;
        case 'poor':
          return utilization < 40;
        default:
          return true;
      }
    });
  }

  return filtered;
};

// ============================================================================
// SORT FUNCTIONS
// ============================================================================

export const sortVessels = (
  vessels: Vessel[],
  sortBy: string,
  order: 'asc' | 'desc'
): Vessel[] => {
  if (!vessels || !Array.isArray(vessels)) return [];

  return [...vessels]
    .filter(vessel => vessel)
    .sort((a, b) => {
      if (!a || !b) return 0;

      const aValue: any = a[sortBy as keyof Vessel];
      const bValue: any = b[sortBy as keyof Vessel];

      // Handle numeric values
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return order === 'asc' ? aValue - bValue : bValue - aValue;
      }

      // Handle string values
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return order === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      return 0;
    });
};

// ============================================================================
// STATISTICS FUNCTIONS
// ============================================================================

export const calculateVesselStats = (vessels: Vessel[]) => {
  if (!vessels || !Array.isArray(vessels)) {
    return {
      total: 0,
      active: 0,
      inactive: 0,
      maintenance: 0,
      totalTrips30d: 0,
      totalBookings30d: 0,
      totalRevenue30d: 0,
      avgUtilization: 0,
      avgCapacity: 0,
      totalCapacity: 0,
    };
  }

  const validVessels = vessels.filter(v => v);
  const total = validVessels.length;
  const active = validVessels.filter(v => v && v.is_active).length;
  const inactive = validVessels.filter(v => v && !v.is_active).length;
  const maintenance = validVessels.filter(
    v => v && v.status === 'maintenance'
  ).length;

  const totalTrips30d = validVessels.reduce(
    (sum, v) => sum + (v?.total_trips_30d || 0),
    0
  );
  const totalBookings30d = validVessels.reduce(
    (sum, v) => sum + (v?.total_bookings_30d || 0),
    0
  );
  const totalRevenue30d = validVessels.reduce(
    (sum, v) => sum + (v?.total_revenue_30d || 0),
    0
  );

  const avgUtilization =
    validVessels.length > 0
      ? validVessels.reduce(
          (sum, v) => sum + (v?.capacity_utilization_30d || 0),
          0
        ) / validVessels.length
      : 0;

  const avgCapacity =
    validVessels.length > 0
      ? validVessels.reduce((sum, v) => sum + (v?.seating_capacity || 0), 0) /
        validVessels.length
      : 0;

  const totalCapacity = validVessels.reduce(
    (sum, v) => sum + (v?.seating_capacity || 0),
    0
  );

  return {
    total,
    active,
    inactive,
    maintenance,
    totalTrips30d,
    totalBookings30d,
    totalRevenue30d,
    avgUtilization,
    avgCapacity,
    totalCapacity,
  };
};

// ============================================================================
// FORMATTING FUNCTIONS
// ============================================================================

export const formatCurrency = (amount: number): string => {
  if (!amount || isNaN(amount)) return 'MVR 0';
  return `MVR ${amount.toLocaleString()}`;
};

export const formatPercentage = (value: number): string => {
  if (!value || isNaN(value)) return '0.0%';
  return `${value.toFixed(1)}%`;
};

export const formatCapacity = (capacity: number): string => {
  return `${capacity} passengers`;
};

export const formatUtilization = (utilization: number): string => {
  return `${utilization.toFixed(1)}%`;
};

// ============================================================================
// PERFORMANCE RATING FUNCTIONS
// ============================================================================

export const getUtilizationRating = (
  vessel: Vessel
): 'excellent' | 'good' | 'fair' | 'poor' => {
  if (!vessel) return 'poor';
  const utilization = vessel.capacity_utilization_30d || 0;

  if (utilization >= 80) return 'excellent';
  if (utilization >= 60) return 'good';
  if (utilization >= 40) return 'fair';
  return 'poor';
};

export const getUtilizationColor = (rating: string): string => {
  switch (rating) {
    case 'excellent':
      return '#10B981'; // Green
    case 'good':
      return '#3B82F6'; // Blue
    case 'fair':
      return '#F59E0B'; // Yellow
    case 'poor':
      return '#EF4444'; // Red
    default:
      return '#6B7280'; // Gray
  }
};

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

export const validateVesselData = (
  data: Partial<AdminManagement.VesselFormData>
): AdminManagement.ValidationResult => {
  const errors: Record<string, string> = {};

  if (!data.name || data.name.trim().length === 0) {
    errors.name = 'Vessel name is required';
  } else if (data.name.length > 100) {
    errors.name = 'Vessel name must be less than 100 characters';
  }

  if (!data.seating_capacity || data.seating_capacity <= 0) {
    errors.seating_capacity = 'Seating capacity must be greater than 0';
  } else if (data.seating_capacity > 1000) {
    errors.seating_capacity = 'Seating capacity cannot exceed 1000';
  }

  if (
    data.status &&
    !['active', 'maintenance', 'inactive'].includes(data.status)
  ) {
    errors.status = 'Invalid status value';
  }

  if (
    data.vessel_type &&
    !['passenger', 'cargo', 'mixed', 'luxury', 'speedboat'].includes(
      data.vessel_type
    )
  ) {
    errors.vessel_type = 'Invalid vessel type';
  }

  if (data.max_speed && data.max_speed <= 0) {
    errors.max_speed = 'Maximum speed must be greater than 0';
  }

  if (data.fuel_capacity && data.fuel_capacity <= 0) {
    errors.fuel_capacity = 'Fuel capacity must be greater than 0';
  }

  if (data.contact_number && data.contact_number.length > 20) {
    errors.contact_number = 'Contact number must be less than 20 characters';
  }

  if (data.registration_number && data.registration_number.length > 50) {
    errors.registration_number =
      'Registration number must be less than 50 characters';
  }

  if (data.captain_name && data.captain_name.length > 100) {
    errors.captain_name = 'Captain name must be less than 100 characters';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export const getVesselById = (
  vessels: Vessel[],
  id: string
): Vessel | undefined => {
  return vessels.find(vessel => vessel.id === id);
};

export const getVesselsByStatus = (
  vessels: Vessel[],
  status: string
): Vessel[] => {
  return vessels.filter(vessel => vessel.status === status);
};

export const getTopVesselsByRevenue = (
  vessels: Vessel[],
  limit: number = 5
): Vessel[] => {
  return vessels
    .sort((a, b) => (b.total_revenue_30d || 0) - (a.total_revenue_30d || 0))
    .slice(0, limit);
};

export const getTopVesselsByUtilization = (
  vessels: Vessel[],
  limit: number = 5
): Vessel[] => {
  return vessels
    .sort(
      (a, b) =>
        (b.capacity_utilization_30d || 0) - (a.capacity_utilization_30d || 0)
    )
    .slice(0, limit);
};

export const getVesselsNeedingMaintenance = (vessels: Vessel[]): Vessel[] => {
  return vessels.filter(vessel => vessel.status === 'maintenance');
};

// ============================================================================
// SEAT LAYOUT UTILITY FUNCTIONS
// ============================================================================

export const calculateSeatLayoutStats = (seats: Seat[]): SeatLayoutStats => {
  const totalSeats = seats.length;
  const activeSeats = seats.filter(seat => !seat.is_disabled).length;
  const disabledSeats = seats.filter(seat => seat.is_disabled).length;
  const premiumSeats = seats.filter(seat => seat.is_premium).length;
  const crewSeats = seats.filter(seat => seat.seat_type === 'crew').length;
  const windowSeats = seats.filter(seat => seat.is_window).length;
  const aisleSeats = seats.filter(seat => seat.is_aisle).length;

  return {
    totalSeats,
    activeSeats,
    disabledSeats,
    premiumSeats,
    crewSeats,
    windowSeats,
    aisleSeats,
    removedSeats: 0, // No removed seats in new implementation
    utilizationRate: totalSeats > 0 ? (activeSeats / totalSeats) * 100 : 0,
    revenuePotential: seats.reduce(
      (sum, seat) => sum + seat.price_multiplier,
      0
    ),
  };
};

export const convertSeatToPosition = (seat: Seat): SeatPosition => {
  return {
    id: seat.id,
    x: seat.position_x,
    y: seat.position_y,
    seatNumber: seat.seat_number,
    rowNumber: seat.row_number,
    columnNumber: seat.position_x,
    isWindow: seat.is_window,
    isAisle: seat.is_aisle,
    seatType: seat.seat_type,
    seatClass: seat.seat_class,
    isDisabled: seat.is_disabled,
    isPremium: seat.is_premium,
    priceMultiplier: seat.price_multiplier,
    floorNumber: 1, // Default to floor 1 for single-floor layout
  };
};

export const convertPositionToSeat = (
  position: SeatPosition,
  vesselId: string,
  layoutId?: string
): Omit<Seat, 'id' | 'created_at' | 'updated_at'> => {
  return {
    vessel_id: vesselId,
    layout_id: layoutId,
    seat_number: position.seatNumber,
    row_number: position.rowNumber,
    position_x: position.x,
    position_y: position.y,
    is_window: position.isWindow,
    is_aisle: position.isAisle,
    seat_type: position.seatType,
    seat_class: position.seatClass,
    is_disabled: position.isDisabled,
    is_premium: position.isPremium,
    price_multiplier: position.priceMultiplier,
  };
};

export const generateDefaultSeatLayout = (rows: number, columns: number) => {
  return {
    rows,
    columns,
    aisles: [Math.ceil(columns / 2)],
    premium_rows: [1, 2],
    disabled_seats: [],
    crew_seats: [],
  };
};

export const validateSeatLayout = (
  layout: AdminManagement.SeatLayoutData
): AdminManagement.ValidationResult => {
  const errors: Record<string, string> = {};

  if (layout.rows <= 0 || layout.rows > 50) {
    errors.rows = 'Rows must be between 1 and 50';
  }

  if (layout.columns <= 0 || layout.columns > 20) {
    errors.columns = 'Columns must be between 1 and 20';
  }

  if (layout.aisles.some(aisle => aisle <= 0 || aisle > layout.columns)) {
    errors.aisles = 'Aisle positions must be valid column numbers';
  }

  if (layout.premium_rows.some(row => row <= 0 || row > layout.rows)) {
    errors.premium_rows = 'Premium row numbers must be valid row numbers';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

export const getSeatColor = (seat: SeatPosition | Seat): string => {
  const seatType = 'seatType' in seat ? seat.seatType : seat.seat_type;
  const isDisabled = 'isDisabled' in seat ? seat.isDisabled : seat.is_disabled;

  if (isDisabled) return '#ef4444'; // Red
  if (seatType === 'crew') return '#f59e0b'; // Amber
  if (seatType === 'premium') return '#3b82f6'; // Blue
  return '#10b981'; // Green
};

export const getSeatIcon = (seat: SeatPosition | Seat) => {
  const seatType = 'seatType' in seat ? seat.seatType : seat.seat_type;
  const isPremium = 'isPremium' in seat ? seat.isPremium : seat.is_premium;
  const isDisabled = 'isDisabled' in seat ? seat.isDisabled : seat.is_disabled;

  if (seatType === 'crew') return Anchor;
  if (isPremium) return Crown;
  if (isDisabled) return UserCheck;
  return UserCheck;
};

// ============================================================================
// FERRY-SPECIFIC SEAT LAYOUT FUNCTIONS
// ============================================================================

export const generateFerrySeatLayout = (
  capacity: number,
  vesselType: string,
  layoutConfig?: {
    floors: number;
    layout_type: 'standard' | 'luxury' | 'economy' | 'mixed';
    has_premium_section: boolean;
    has_crew_section: boolean;
    has_disabled_access: boolean;
  }
) => {
  const config = layoutConfig || {
    floors: 1,
    layout_type: 'standard',
    has_premium_section: true,
    has_crew_section: true,
    has_disabled_access: true,
  };

  const floors: AdminManagement.FloorLayout[] = [];
  const seatsPerFloor = Math.ceil(capacity / config.floors);

  for (let floorNum = 1; floorNum <= config.floors; floorNum++) {
    const floorLayout = generateFloorLayout(
      seatsPerFloor,
      floorNum,
      config.layout_type,
      config.has_premium_section,
      config.has_crew_section,
      config.has_disabled_access
    );
    floors.push(floorLayout);
  }

  return {
    floors,
    total_seats: floors.reduce((sum, floor) => sum + floor.seat_count, 0),
    layout_type: config.layout_type,
  };
};

export const generateFloorLayout = (
  capacity: number,
  floorNumber: number,
  layoutType: 'standard' | 'luxury' | 'economy' | 'mixed',
  hasPremiumSection: boolean,
  hasCrewSection: boolean,
  hasDisabledAccess: boolean
): AdminManagement.FloorLayout => {
  let rows: number;
  let columns: number;
  let aisles: number[];
  let premiumRows: number[];
  const crewSeats: string[] = [];
  const disabledSeats: string[] = [];

  // Calculate optimal layout based on capacity and type
  switch (layoutType) {
    case 'luxury':
      // Luxury: More space, fewer seats per row
      if (capacity <= 30) {
        rows = 6;
        columns = Math.ceil(capacity / 6);
      } else if (capacity <= 60) {
        rows = 8;
        columns = Math.ceil(capacity / 8);
      } else {
        rows = 10;
        columns = Math.ceil(capacity / 10);
      }
      aisles = [Math.ceil(columns / 2)];
      premiumRows = hasPremiumSection ? [1, 2, 3] : [];
      break;

    case 'economy':
      // Economy: More seats per row, efficient layout
      if (capacity <= 40) {
        rows = 5;
        columns = Math.ceil(capacity / 5);
      } else if (capacity <= 80) {
        rows = 8;
        columns = Math.ceil(capacity / 8);
      } else {
        rows = 12;
        columns = Math.ceil(capacity / 12);
      }
      aisles = [Math.ceil(columns / 2)];
      premiumRows = hasPremiumSection ? [1] : [];
      break;

    case 'mixed':
      // Mixed: Combination of economy and premium
      if (capacity <= 50) {
        rows = 6;
        columns = Math.ceil(capacity / 6);
      } else if (capacity <= 100) {
        rows = 10;
        columns = Math.ceil(capacity / 10);
      } else {
        rows = 15;
        columns = Math.ceil(capacity / 15);
      }
      aisles = [Math.ceil(columns / 2)];
      premiumRows = hasPremiumSection ? [1, 2] : [];
      break;

    default: // standard
      // Standard: Balanced layout
      if (capacity <= 35) {
        rows = 5;
        columns = Math.ceil(capacity / 5);
      } else if (capacity <= 70) {
        rows = 7;
        columns = Math.ceil(capacity / 7);
      } else {
        rows = 10;
        columns = Math.ceil(capacity / 10);
      }
      aisles = [Math.ceil(columns / 2)];
      premiumRows = hasPremiumSection ? [1, 2] : [];
      break;
  }

  // Add crew seats if needed
  if (hasCrewSection) {
    const crewSeatCount = Math.min(4, Math.ceil(capacity * 0.05)); // 5% of capacity, max 4
    for (let i = 0; i < crewSeatCount; i++) {
      crewSeats.push(`${String.fromCharCode(64 + rows)}${columns - i}`);
    }
  }

  // Add disabled access seats if needed
  if (hasDisabledAccess) {
    // Place disabled seats near aisles for easy access
    const disabledSeatCount = Math.min(2, Math.ceil(capacity * 0.03)); // 3% of capacity, max 2
    for (let i = 0; i < disabledSeatCount; i++) {
      const row = Math.ceil(rows / 2) + i;
      const col = aisles[0];
      disabledSeats.push(`${String.fromCharCode(64 + row)}${col}`);
    }
  }

  return {
    floor_number: floorNumber,
    floor_name: getFloorName(floorNumber),
    rows,
    columns,
    aisles,
    rowAisles: [],
    premium_rows: premiumRows,
    disabled_seats: disabledSeats,
    crew_seats: crewSeats,
    is_active: true,
    seat_count: rows * columns,
  };
};

export const getFloorName = (floorNumber: number): string => {
  switch (floorNumber) {
    case 1:
      return 'Main Deck';
    case 2:
      return 'Upper Deck';
    case 3:
      return 'Sun Deck';
    case 4:
      return 'Bridge Deck';
    default:
      return `Deck ${floorNumber}`;
  }
};

export const generateSeatsForFloor = (
  floorLayout: AdminManagement.FloorLayout,
  vesselId: string,
  layoutId?: string
): AdminManagement.Seat[] => {
  const seats: AdminManagement.Seat[] = [];
  let seatCount = 0;

  for (let row = 1; row <= floorLayout.rows; row++) {
    for (let col = 1; col <= floorLayout.columns; col++) {
      seatCount++;
      const seatNumber = `${String.fromCharCode(64 + col)}${row}`;
      const floorPrefix =
        floorLayout.floor_number > 1 ? `${floorLayout.floor_number}` : '';
      const fullSeatNumber = floorPrefix
        ? `${floorPrefix}${seatNumber}`
        : seatNumber;

      const isWindow = col === 1 || col === floorLayout.columns;
      const isAisle = floorLayout.aisles.includes(col);
      const isPremium = floorLayout.premium_rows.includes(row);
      const isDisabled = floorLayout.disabled_seats.includes(seatNumber);
      const isCrew = floorLayout.crew_seats.includes(seatNumber);

      let seatType: 'standard' | 'premium' | 'disabled' | 'crew' = 'standard';
      let seatClass: 'economy' | 'business' | 'first' = 'economy';
      let priceMultiplier = 1.0;

      if (isDisabled) {
        seatType = 'disabled';
      } else if (isCrew) {
        seatType = 'crew';
      } else if (isPremium) {
        seatType = 'premium';
        seatClass = 'business';
        priceMultiplier = 1.5;
      }

      seats.push({
        id: `seat_${floorLayout.floor_number}_${seatCount}`,
        vessel_id: vesselId,
        layout_id: layoutId,
        seat_number: fullSeatNumber,
        row_number: row,
        position_x: col,
        position_y: row,
        is_window: isWindow,
        is_aisle: isAisle,
        seat_type: seatType,
        seat_class: seatClass,
        is_disabled: isDisabled,
        is_premium: isPremium,
        price_multiplier: priceMultiplier,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }
  }

  return seats;
};

export const calculateOptimalLayout = (
  capacity: number,
  vesselType: string
) => {
  let floors = 1;
  let layoutType: 'standard' | 'luxury' | 'economy' | 'mixed' = 'standard';

  // Determine number of floors based on capacity
  if (capacity > 200) {
    floors = 3;
  } else if (capacity > 120) {
    floors = 2;
  } else {
    floors = 1;
  }

  // Determine layout type based on vessel type
  switch (vesselType) {
    case 'luxury':
      layoutType = 'luxury';
      break;
    case 'speedboat':
      layoutType = 'economy';
      break;
    case 'mixed':
      layoutType = 'mixed';
      break;
    default:
      layoutType = 'standard';
  }

  return {
    floors,
    layout_type: layoutType,
    has_premium_section: true,
    has_crew_section: true,
    has_disabled_access: true,
  };
};

// NEW: Calculate optimal row-to-column ratio for single floor layout
export const calculateOptimalRowColumnRatio = (
  capacity: number
): { rows: number; columns: number } => {
  if (capacity <= 0) {
    return { rows: 1, columns: 1 };
  }

  // Find factors of capacity to get optimal ratios
  const factors: number[] = [];
  for (let i = 1; i <= Math.sqrt(capacity); i++) {
    if (capacity % i === 0) {
      factors.push(i);
      if (i !== capacity / i) {
        factors.push(capacity / i);
      }
    }
  }
  factors.sort((a, b) => a - b);

  // Find the most balanced ratio (closest to square)
  let bestRatio = { rows: 1, columns: capacity };
  let bestBalance = Math.abs(1 - capacity);

  for (let i = 0; i < factors.length; i++) {
    const factor = factors[i];
    const otherFactor = capacity / factor;

    // Prefer ratios where rows >= columns (more rows than columns)
    const rows = Math.max(factor, otherFactor);
    const columns = Math.min(factor, otherFactor);

    // Calculate balance (closer to 1 is better)
    const balance = Math.abs(rows / columns - 1);

    if (balance < bestBalance) {
      bestBalance = balance;
      bestRatio = { rows, columns };
    }
  }

  // For capacities that don't have good factors, create a layout with extra row
  if (bestBalance > 0.5) {
    const sqrt = Math.sqrt(capacity);
    const rows = Math.ceil(sqrt);
    const columns = Math.ceil(capacity / rows);
    return { rows, columns };
  }

  return bestRatio;
};

// NEW: Generate default seat layout configuration
export const generateDefaultSeatLayoutConfig = (
  capacity: number,
  vesselType: string
) => {
  const { rows, columns } = calculateOptimalRowColumnRatio(capacity);

  // Calculate aisle positions (typically in the middle)
  const aislePosition = Math.ceil(columns / 2);
  const aisles: number[] = columns > 4 ? [aislePosition] : [];

  // Determine premium rows based on vessel type
  let premiumRows: number[] = [];
  if (vesselType === 'luxury') {
    premiumRows = [1, 2, 3]; // First 3 rows for luxury
  } else if (vesselType === 'mixed') {
    premiumRows = [1, 2]; // First 2 rows for mixed
  } else {
    premiumRows = [1]; // First row for standard/economy
  }

  return {
    rows,
    columns,
    aisles,
    rowAisles: [] as number[], // Add missing rowAisles property
    premium_rows: premiumRows,
    disabled_seats: [] as string[],
    crew_seats: [] as string[],
  };
};

export const validateFerryLayout = (
  layout: AdminManagement.SeatLayoutData
): AdminManagement.ValidationResult => {
  const errors: Record<string, string> = {};

  if (!layout.floors || layout.floors.length === 0) {
    errors.floors = 'At least one floor must be configured';
  }

  layout.floors.forEach((floor, index) => {
    if (floor.rows <= 0 || floor.rows > 50) {
      errors[`floor_${index}_rows`] = 'Rows must be between 1 and 50';
    }

    if (floor.columns <= 0 || floor.columns > 20) {
      errors[`floor_${index}_columns`] = 'Columns must be between 1 and 20';
    }

    if (floor.aisles.some(aisle => aisle <= 0 || aisle > floor.columns)) {
      errors[`floor_${index}_aisles`] =
        'Aisle positions must be valid column numbers';
    }

    if (floor.premium_rows.some(row => row <= 0 || row > floor.rows)) {
      errors[`floor_${index}_premium_rows`] =
        'Premium row numbers must be valid row numbers';
    }
  });

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};
