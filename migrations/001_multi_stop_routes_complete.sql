-- ============================================================================
-- MULTI-STOP ROUTES SYSTEM - COMPLETE DATABASE MIGRATION
-- ============================================================================
-- This migration transforms the route system to support multi-stop routes
-- with segment-based pricing and seat availability tracking.
--
-- Features:
-- - All routes now support multiple stops (minimum 2)
-- - Each segment (stop A to stop B) has independent pricing
-- - Seats can be reused across non-overlapping segments
-- - Trip-level fare overrides supported
-- - Atomic route creation with all dependencies
--
-- Run this in Supabase SQL Editor
-- ============================================================================

BEGIN;

-- ============================================================================
-- PART 1: ALTER EXISTING TABLES
-- ============================================================================

-- 1.1: Make routes table support multi-stop routes
-- from_island_id and to_island_id become legacy fields (NULL for multi-stop)
ALTER TABLE routes 
  ALTER COLUMN from_island_id DROP NOT NULL,
  ALTER COLUMN to_island_id DROP NOT NULL;

-- Remove constraints that conflict with multi-stop
ALTER TABLE routes 
  DROP CONSTRAINT IF EXISTS different_islands;

ALTER TABLE routes 
  DROP CONSTRAINT IF EXISTS unique_route_islands;

-- Add helpful comments
COMMENT ON COLUMN routes.from_island_id IS 'Legacy field - NULL for multi-stop routes, set for backward compatibility';
COMMENT ON COLUMN routes.to_island_id IS 'Legacy field - NULL for multi-stop routes, set for backward compatibility';
COMMENT ON COLUMN routes.base_fare IS 'Default base fare per segment - used for auto-generating segment fares';

-- ============================================================================
-- PART 2: CREATE ROUTE_STOPS TABLE
-- ============================================================================

-- Defines the sequence of islands a route visits
CREATE TABLE IF NOT EXISTS route_stops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id UUID NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
  island_id UUID NOT NULL REFERENCES islands(id),
  stop_sequence INTEGER NOT NULL,
  stop_type VARCHAR(20) NOT NULL DEFAULT 'both' 
    CHECK (stop_type IN ('pickup', 'dropoff', 'both')),
  estimated_travel_time INTEGER, -- Minutes from previous stop (NULL for first stop)
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT unique_route_stop_sequence UNIQUE(route_id, stop_sequence),
  CONSTRAINT check_stop_sequence_positive CHECK (stop_sequence > 0)
);

-- Indexes for performance
CREATE INDEX idx_route_stops_route_id ON route_stops(route_id);
CREATE INDEX idx_route_stops_sequence ON route_stops(route_id, stop_sequence);
CREATE INDEX idx_route_stops_island ON route_stops(island_id);

-- ============================================================================
-- PART 3: CREATE ROUTE_SEGMENT_FARES TABLE
-- ============================================================================

-- Defines pricing between any two stops on a route
CREATE TABLE IF NOT EXISTS route_segment_fares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id UUID NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
  from_stop_id UUID NOT NULL REFERENCES route_stops(id) ON DELETE CASCADE,
  to_stop_id UUID NOT NULL REFERENCES route_stops(id) ON DELETE CASCADE,
  fare_amount NUMERIC(10,2) NOT NULL CHECK (fare_amount >= 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT unique_route_segment UNIQUE(route_id, from_stop_id, to_stop_id),
  CONSTRAINT check_different_stops CHECK (from_stop_id <> to_stop_id)
);

-- Indexes
CREATE INDEX idx_route_segment_fares_route ON route_segment_fares(route_id);
CREATE INDEX idx_route_segment_fares_from ON route_segment_fares(from_stop_id);
CREATE INDEX idx_route_segment_fares_to ON route_segment_fares(to_stop_id);
CREATE INDEX idx_route_segment_fares_segment ON route_segment_fares(from_stop_id, to_stop_id);

-- ============================================================================
-- PART 4: CREATE TRIP_FARE_OVERRIDES TABLE
-- ============================================================================

-- Allows per-trip fare adjustments for specific segments
CREATE TABLE IF NOT EXISTS trip_fare_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  from_stop_id UUID NOT NULL REFERENCES route_stops(id),
  to_stop_id UUID NOT NULL REFERENCES route_stops(id),
  override_fare_amount NUMERIC(10,2) NOT NULL CHECK (override_fare_amount >= 0),
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT unique_trip_fare_override UNIQUE(trip_id, from_stop_id, to_stop_id),
  CONSTRAINT check_different_override_stops CHECK (from_stop_id <> to_stop_id)
);

-- Indexes
CREATE INDEX idx_trip_fare_overrides_trip ON trip_fare_overrides(trip_id);
CREATE INDEX idx_trip_fare_overrides_from ON trip_fare_overrides(from_stop_id);
CREATE INDEX idx_trip_fare_overrides_to ON trip_fare_overrides(to_stop_id);

-- ============================================================================
-- PART 5: CREATE BOOKING_SEGMENTS TABLE
-- ============================================================================

-- Tracks which segment each booking covers (boarding and destination stops)
CREATE TABLE IF NOT EXISTS booking_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  boarding_stop_id UUID NOT NULL REFERENCES route_stops(id),
  destination_stop_id UUID NOT NULL REFERENCES route_stops(id),
  boarding_stop_sequence INTEGER NOT NULL,
  destination_stop_sequence INTEGER NOT NULL,
  fare_amount NUMERIC(10,2) NOT NULL CHECK (fare_amount >= 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT unique_booking_segment UNIQUE(booking_id),
  CONSTRAINT check_different_segment_stops CHECK (boarding_stop_id <> destination_stop_id),
  CONSTRAINT check_valid_segment_sequence CHECK (destination_stop_sequence > boarding_stop_sequence)
);

-- Indexes
CREATE INDEX idx_booking_segments_booking ON booking_segments(booking_id);
CREATE INDEX idx_booking_segments_boarding ON booking_segments(boarding_stop_id);
CREATE INDEX idx_booking_segments_destination ON booking_segments(destination_stop_id);
CREATE INDEX idx_booking_segments_sequences ON booking_segments(boarding_stop_sequence, destination_stop_sequence);

-- ============================================================================
-- PART 6: CREATE SEAT_SEGMENT_RESERVATIONS TABLE (CRITICAL!)
-- ============================================================================

-- Tracks seat occupancy per segment (not per trip)
-- This allows seat reuse across non-overlapping segments
CREATE TABLE IF NOT EXISTS seat_segment_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  seat_id UUID NOT NULL REFERENCES seats(id) ON DELETE CASCADE,
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  passenger_id UUID REFERENCES passengers(id) ON DELETE SET NULL,
  
  -- Segment information
  boarding_stop_id UUID NOT NULL REFERENCES route_stops(id),
  destination_stop_id UUID NOT NULL REFERENCES route_stops(id),
  boarding_stop_sequence INTEGER NOT NULL,
  destination_stop_sequence INTEGER NOT NULL,
  
  -- Reservation tracking
  reserved_at TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id),
  session_id TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT check_valid_reservation_segment CHECK (destination_stop_sequence > boarding_stop_sequence),
  CONSTRAINT check_different_reservation_stops CHECK (boarding_stop_id <> destination_stop_id)
);

-- Indexes for performance
CREATE INDEX idx_seat_segment_res_trip ON seat_segment_reservations(trip_id);
CREATE INDEX idx_seat_segment_res_seat ON seat_segment_reservations(seat_id);
CREATE INDEX idx_seat_segment_res_booking ON seat_segment_reservations(booking_id);
CREATE INDEX idx_seat_segment_res_segment ON seat_segment_reservations(trip_id, seat_id, boarding_stop_sequence, destination_stop_sequence);
CREATE INDEX idx_seat_segment_res_passenger ON seat_segment_reservations(passenger_id) WHERE passenger_id IS NOT NULL;
CREATE INDEX idx_seat_segment_res_user ON seat_segment_reservations(user_id, session_id) WHERE user_id IS NOT NULL;

-- ============================================================================
-- PART 7: CREATE HELPER FUNCTIONS
-- ============================================================================

-- 7.1: Create multi-stop route (atomic operation)
CREATE OR REPLACE FUNCTION create_multi_stop_route(
  p_name VARCHAR,
  p_base_fare NUMERIC,
  p_distance VARCHAR,
  p_duration VARCHAR,
  p_description TEXT,
  p_status VARCHAR,
  p_is_active BOOLEAN,
  p_stops JSONB,  -- Array: [{island_id, stop_type, estimated_travel_time, notes}]
  p_segment_fares JSONB  -- Array: [{from_index, to_index, fare_amount}]
) RETURNS UUID AS $$
DECLARE
  v_route_id UUID;
  v_stop JSONB;
  v_stop_id UUID;
  v_stop_ids UUID[];
  v_fare JSONB;
  v_sequence INTEGER := 1;
  v_from_idx INTEGER;
  v_to_idx INTEGER;
BEGIN
  -- Validation
  IF jsonb_array_length(p_stops) < 2 THEN
    RAISE EXCEPTION 'Route must have at least 2 stops';
  END IF;

  -- Create the route
  INSERT INTO routes (
    name, base_fare, distance, duration, description, status, is_active,
    from_island_id, to_island_id  -- Set to NULL for multi-stop
  )
  VALUES (
    p_name, p_base_fare, p_distance, p_duration, p_description, p_status, p_is_active,
    NULL, NULL
  )
  RETURNING id INTO v_route_id;

  -- Create route stops in sequence
  FOR v_stop IN SELECT * FROM jsonb_array_elements(p_stops)
  LOOP
    INSERT INTO route_stops (
      route_id,
      island_id,
      stop_sequence,
      stop_type,
      estimated_travel_time,
      notes
    )
    VALUES (
      v_route_id,
      (v_stop->>'island_id')::UUID,
      v_sequence,
      COALESCE(v_stop->>'stop_type', 'both'),
      (v_stop->>'estimated_travel_time')::INTEGER,
      v_stop->>'notes'
    )
    RETURNING id INTO v_stop_id;
    
    v_stop_ids := array_append(v_stop_ids, v_stop_id);
    v_sequence := v_sequence + 1;
  END LOOP;

  -- Create segment fares
  FOR v_fare IN SELECT * FROM jsonb_array_elements(p_segment_fares)
  LOOP
    v_from_idx := (v_fare->>'from_index')::INTEGER;
    v_to_idx := (v_fare->>'to_index')::INTEGER;
    
    -- Validate indices
    IF v_from_idx >= array_length(v_stop_ids, 1) OR v_to_idx >= array_length(v_stop_ids, 1) THEN
      RAISE EXCEPTION 'Invalid stop indices in segment fare';
    END IF;
    
    INSERT INTO route_segment_fares (
      route_id,
      from_stop_id,
      to_stop_id,
      fare_amount
    )
    VALUES (
      v_route_id,
      v_stop_ids[v_from_idx + 1],  -- PostgreSQL arrays are 1-based
      v_stop_ids[v_to_idx + 1],
      (v_fare->>'fare_amount')::NUMERIC
    );
  END LOOP;

  RETURN v_route_id;
END;
$$ LANGUAGE plpgsql;

-- 7.2: Auto-generate segment fares for a route
CREATE OR REPLACE FUNCTION auto_generate_segment_fares(
  p_route_id UUID,
  p_base_fare_per_segment NUMERIC DEFAULT NULL
) RETURNS INTEGER AS $$
DECLARE
  v_from_stop RECORD;
  v_to_stop RECORD;
  v_count INTEGER := 0;
  v_base_fare NUMERIC;
  v_fare_amount NUMERIC;
BEGIN
  -- Use provided base fare or get from route
  IF p_base_fare_per_segment IS NOT NULL THEN
    v_base_fare := p_base_fare_per_segment;
  ELSE
    SELECT base_fare INTO v_base_fare FROM routes WHERE id = p_route_id;
  END IF;

  IF v_base_fare IS NULL OR v_base_fare <= 0 THEN
    RAISE EXCEPTION 'Valid base fare required';
  END IF;

  -- Delete existing fares for this route
  DELETE FROM route_segment_fares WHERE route_id = p_route_id;
  
  -- Generate fares for all valid segments
  FOR v_from_stop IN 
    SELECT * FROM route_stops 
    WHERE route_id = p_route_id 
      AND stop_type IN ('pickup', 'both')
    ORDER BY stop_sequence
  LOOP
    FOR v_to_stop IN 
      SELECT * FROM route_stops 
      WHERE route_id = p_route_id 
        AND stop_sequence > v_from_stop.stop_sequence
        AND stop_type IN ('dropoff', 'both')
      ORDER BY stop_sequence
    LOOP
      -- Linear pricing: base_fare × number_of_segments
      v_fare_amount := v_base_fare * (v_to_stop.stop_sequence - v_from_stop.stop_sequence);
      
      INSERT INTO route_segment_fares (
        route_id, from_stop_id, to_stop_id, fare_amount
      )
      VALUES (
        p_route_id, v_from_stop.id, v_to_stop.id, v_fare_amount
      );
      
      v_count := v_count + 1;
    END LOOP;
  END LOOP;
  
  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- 7.3: Check seat availability for a specific segment
CREATE OR REPLACE FUNCTION is_seat_available_for_segment(
  p_trip_id UUID,
  p_seat_id UUID,
  p_boarding_sequence INTEGER,
  p_destination_sequence INTEGER
) RETURNS BOOLEAN AS $$
DECLARE
  v_has_conflict BOOLEAN;
BEGIN
  -- Check if any existing reservation overlaps with requested segment
  -- Segments overlap if: boarding < destination_requested AND destination > boarding_requested
  SELECT EXISTS (
    SELECT 1 
    FROM seat_segment_reservations
    WHERE trip_id = p_trip_id
      AND seat_id = p_seat_id
      AND (
        -- Overlap detection: segments intersect if they share any stops
        boarding_stop_sequence < p_destination_sequence 
        AND destination_stop_sequence > p_boarding_sequence
      )
  ) INTO v_has_conflict;
  
  RETURN NOT v_has_conflict;
END;
$$ LANGUAGE plpgsql;

-- 7.4: Get available seats for a specific segment
CREATE OR REPLACE FUNCTION get_available_seats_for_segment(
  p_trip_id UUID,
  p_from_stop_sequence INTEGER,
  p_to_stop_sequence INTEGER
) RETURNS TABLE (
  seat_id UUID,
  seat_number VARCHAR,
  row_number INTEGER,
  is_window BOOLEAN,
  is_aisle BOOLEAN,
  seat_type VARCHAR,
  seat_class VARCHAR,
  price_multiplier NUMERIC,
  position_x INTEGER,
  position_y INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    s.seat_number,
    s.row_number,
    s.is_window,
    s.is_aisle,
    s.seat_type,
    s.seat_class,
    s.price_multiplier,
    s.position_x,
    s.position_y
  FROM seats s
  JOIN trips t ON s.vessel_id = t.vessel_id
  WHERE t.id = p_trip_id
    AND s.is_disabled = FALSE
    AND is_seat_available_for_segment(p_trip_id, s.id, p_from_stop_sequence, p_to_stop_sequence)
  ORDER BY s.row_number, s.seat_number;
END;
$$ LANGUAGE plpgsql;

-- 7.5: Get effective fare for a segment (with override support)
CREATE OR REPLACE FUNCTION get_effective_segment_fare(
  p_trip_id UUID,
  p_from_stop_id UUID,
  p_to_stop_id UUID
) RETURNS NUMERIC AS $$
DECLARE
  v_route_id UUID;
  v_override_fare NUMERIC;
  v_base_fare NUMERIC;
  v_fare_multiplier NUMERIC;
BEGIN
  -- Get route and fare multiplier from trip
  SELECT route_id, COALESCE(fare_multiplier, 1.0) 
  INTO v_route_id, v_fare_multiplier
  FROM trips WHERE id = p_trip_id;
  
  IF v_route_id IS NULL THEN
    RAISE EXCEPTION 'Trip not found or has no route';
  END IF;
  
  -- Check for trip-level override first
  SELECT override_fare_amount INTO v_override_fare
  FROM trip_fare_overrides
  WHERE trip_id = p_trip_id
    AND from_stop_id = p_from_stop_id
    AND to_stop_id = p_to_stop_id;
  
  IF v_override_fare IS NOT NULL THEN
    RETURN v_override_fare * v_fare_multiplier;
  END IF;
  
  -- Get route-level base fare
  SELECT fare_amount INTO v_base_fare
  FROM route_segment_fares
  WHERE route_id = v_route_id
    AND from_stop_id = p_from_stop_id
    AND to_stop_id = p_to_stop_id;
  
  IF v_base_fare IS NULL THEN
    RAISE EXCEPTION 'No fare defined for this segment';
  END IF;
  
  RETURN v_base_fare * v_fare_multiplier;
END;
$$ LANGUAGE plpgsql;

-- 7.6: Reserve seat for a segment
CREATE OR REPLACE FUNCTION reserve_seat_for_segment(
  p_trip_id UUID,
  p_seat_id UUID,
  p_booking_id UUID,
  p_passenger_id UUID,
  p_boarding_stop_id UUID,
  p_destination_stop_id UUID,
  p_boarding_sequence INTEGER,
  p_destination_sequence INTEGER,
  p_user_id UUID,
  p_session_id TEXT
) RETURNS BOOLEAN AS $$
BEGIN
  -- Check if seat is available for this segment
  IF NOT is_seat_available_for_segment(p_trip_id, p_seat_id, p_boarding_sequence, p_destination_sequence) THEN
    RAISE EXCEPTION 'Seat is not available for the requested segment';
  END IF;

  -- Create reservation
  INSERT INTO seat_segment_reservations (
    trip_id,
    seat_id,
    booking_id,
    passenger_id,
    boarding_stop_id,
    destination_stop_id,
    boarding_stop_sequence,
    destination_stop_sequence,
    user_id,
    session_id
  )
  VALUES (
    p_trip_id,
    p_seat_id,
    p_booking_id,
    p_passenger_id,
    p_boarding_stop_id,
    p_destination_stop_id,
    p_boarding_sequence,
    p_destination_sequence,
    p_user_id,
    p_session_id
  );

  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to reserve seat: %', SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- PART 8: CREATE VIEWS
-- ============================================================================

-- 8.1: Routes with stops and stats
CREATE OR REPLACE VIEW routes_with_stops_view AS
SELECT 
  r.id,
  r.name,
  r.base_fare,
  r.distance,
  r.duration,
  r.description,
  r.status,
  r.is_active,
  r.created_at,
  r.updated_at,
  
  -- First and last island names
  first_stop.island_name as from_island_name,
  last_stop.island_name as to_island_name,
  
  -- Counts
  COALESCE(stop_counts.total_stops, 0) as total_stops,
  COALESCE(stop_counts.segment_count, 0) as total_segments,
  
  -- Stats (from existing routes_stats_view logic)
  COALESCE(stats.total_trips_30d, 0::BIGINT) as total_trips_30d,
  COALESCE(stats.total_bookings_30d, 0::BIGINT) as total_bookings_30d,
  COALESCE(stats.average_occupancy_30d, 0::NUMERIC) as average_occupancy_30d,
  COALESCE(stats.total_revenue_30d, 0::NUMERIC) as total_revenue_30d,
  COALESCE(stats.cancellation_rate_30d, 0::NUMERIC) as cancellation_rate_30d,
  COALESCE(stats.popularity_score, 0::NUMERIC) as popularity_score
FROM routes r
LEFT JOIN (
  -- Get first stop island
  SELECT rs.route_id, i.name as island_name
  FROM route_stops rs
  JOIN islands i ON rs.island_id = i.id
  WHERE rs.stop_sequence = 1
) first_stop ON r.id = first_stop.route_id
LEFT JOIN (
  -- Get last stop island
  SELECT DISTINCT ON (rs.route_id) 
    rs.route_id, i.name as island_name
  FROM route_stops rs
  JOIN islands i ON rs.island_id = i.id
  ORDER BY rs.route_id, rs.stop_sequence DESC
) last_stop ON r.id = last_stop.route_id
LEFT JOIN (
  -- Count stops and segments
  SELECT 
    route_id,
    COUNT(*) as total_stops,
    (COUNT(*) * (COUNT(*) - 1)) / 2 as segment_count
  FROM route_stops
  GROUP BY route_id
) stop_counts ON r.id = stop_counts.route_id
LEFT JOIN (
  -- Calculate stats (reuse logic from original routes_stats_view)
  SELECT
    t.route_id,
    COUNT(DISTINCT t.id) as total_trips_30d,
    COUNT(b.id) as total_bookings_30d,
    ROUND(
      CASE
        WHEN COUNT(DISTINCT t.id) > 0 AND AVG(v.seating_capacity) > 0
        THEN COUNT(b.id)::NUMERIC * 100.0 / (COUNT(DISTINCT t.id)::NUMERIC * AVG(v.seating_capacity))
        ELSE 0
      END, 2
    ) as average_occupancy_30d,
    SUM(CASE WHEN b.status = 'confirmed' THEN b.total_fare ELSE 0 END) as total_revenue_30d,
    ROUND(
      CASE
        WHEN COUNT(b.id) > 0
        THEN COUNT(CASE WHEN b.status = 'cancelled' THEN 1 END)::NUMERIC / COUNT(b.id)::NUMERIC * 100
        ELSE 0
      END, 2
    ) as cancellation_rate_30d,
    ROUND(
      COUNT(b.id)::NUMERIC * 0.7 + 
      SUM(CASE WHEN b.status = 'confirmed' THEN b.total_fare ELSE 0 END) / 100 * 0.3,
      2
    ) as popularity_score
  FROM trips t
  LEFT JOIN bookings b ON t.id = b.trip_id
  LEFT JOIN vessels v ON t.vessel_id = v.id
  WHERE t.travel_date >= CURRENT_DATE - INTERVAL '30 days'
  GROUP BY t.route_id
) stats ON r.id = stats.route_id;

-- 8.2: Segment fares with full details
CREATE OR REPLACE VIEW route_segment_fares_view AS
SELECT 
  rsf.id,
  rsf.route_id,
  rsf.from_stop_id,
  rsf.to_stop_id,
  rsf.fare_amount,
  rsf.created_at,
  rsf.updated_at,
  
  -- From stop details
  rs_from.stop_sequence as from_stop_sequence,
  rs_from.island_id as from_island_id,
  i_from.name as from_island_name,
  i_from.zone as from_zone,
  
  -- To stop details
  rs_to.stop_sequence as to_stop_sequence,
  rs_to.island_id as to_island_id,
  i_to.name as to_island_name,
  i_to.zone as to_zone,
  
  -- Computed fields
  rs_to.stop_sequence - rs_from.stop_sequence as segments_count,
  r.name as route_name
FROM route_segment_fares rsf
JOIN route_stops rs_from ON rsf.from_stop_id = rs_from.id
JOIN route_stops rs_to ON rsf.to_stop_id = rs_to.id
JOIN islands i_from ON rs_from.island_id = i_from.id
JOIN islands i_to ON rs_to.island_id = i_to.id
JOIN routes r ON rsf.route_id = r.id;

-- 8.3: Bookings with segment information
CREATE OR REPLACE VIEW bookings_with_segments_view AS
SELECT 
  b.*,
  
  -- Segment information
  bs.boarding_stop_id,
  bs.destination_stop_id,
  bs.boarding_stop_sequence,
  bs.destination_stop_sequence,
  bs.fare_amount as segment_fare,
  
  -- Island names
  i_boarding.name as boarding_island_name,
  i_boarding.zone as boarding_zone,
  i_dest.name as destination_island_name,
  i_dest.zone as destination_zone,
  
  -- Computed
  bs.destination_stop_sequence - bs.boarding_stop_sequence as segments_traveled,
  
  -- Trip and route info
  t.travel_date,
  t.departure_time,
  r.name as route_name
FROM bookings b
LEFT JOIN booking_segments bs ON b.id = bs.booking_id
LEFT JOIN route_stops rs_boarding ON bs.boarding_stop_id = rs_boarding.id
LEFT JOIN route_stops rs_dest ON bs.destination_stop_id = rs_dest.id
LEFT JOIN islands i_boarding ON rs_boarding.island_id = i_boarding.id
LEFT JOIN islands i_dest ON rs_dest.island_id = i_dest.id
LEFT JOIN trips t ON b.trip_id = t.id
LEFT JOIN routes r ON t.route_id = r.id;

-- 8.4: Seat availability by segment (for booking interface)
CREATE OR REPLACE VIEW seat_availability_by_segment AS
SELECT
  t.id as trip_id,
  t.travel_date,
  t.departure_time,
  r.id as route_id,
  r.name as route_name,
  s.id as seat_id,
  s.seat_number,
  s.row_number,
  s.is_window,
  s.is_aisle,
  s.seat_type,
  s.seat_class,
  s.price_multiplier,
  s.position_x,
  s.position_y,
  rs_from.id as from_stop_id,
  rs_from.stop_sequence as from_sequence,
  i_from.name as from_island,
  rs_to.id as to_stop_id,
  rs_to.stop_sequence as to_sequence,
  i_to.name as to_island,
  is_seat_available_for_segment(
    t.id, 
    s.id, 
    rs_from.stop_sequence, 
    rs_to.stop_sequence
  ) as is_available
FROM trips t
JOIN vessels v ON t.vessel_id = v.id
JOIN seats s ON v.id = s.vessel_id
JOIN routes r ON t.route_id = r.id
JOIN route_stops rs_from ON r.id = rs_from.route_id
JOIN route_stops rs_to ON r.id = rs_to.route_id
JOIN islands i_from ON rs_from.island_id = i_from.id
JOIN islands i_to ON rs_to.island_id = i_to.id
WHERE rs_to.stop_sequence > rs_from.stop_sequence
  AND rs_from.stop_type IN ('pickup', 'both')
  AND rs_to.stop_type IN ('dropoff', 'both')
  AND s.is_disabled = FALSE
  AND t.is_active = TRUE;

-- ============================================================================
-- PART 9: MIGRATE EXISTING DATA
-- ============================================================================

-- Convert all existing simple routes to multi-stop format
DO $$
DECLARE
  v_route RECORD;
  v_first_stop_id UUID;
  v_second_stop_id UUID;
  v_migrated_count INTEGER := 0;
BEGIN
  FOR v_route IN 
    SELECT * FROM routes 
    WHERE from_island_id IS NOT NULL 
      AND to_island_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM route_stops WHERE route_id = routes.id
      )
  LOOP
    -- Create first stop (origin - pickup only)
    INSERT INTO route_stops (
      route_id, 
      island_id, 
      stop_sequence, 
      stop_type, 
      estimated_travel_time,
      notes
    )
    VALUES (
      v_route.id, 
      v_route.from_island_id, 
      1, 
      'pickup', 
      NULL,
      'Starting point'
    )
    RETURNING id INTO v_first_stop_id;
    
    -- Create second stop (destination - dropoff only)
    INSERT INTO route_stops (
      route_id, 
      island_id, 
      stop_sequence, 
      stop_type, 
      estimated_travel_time,
      notes
    )
    VALUES (
      v_route.id, 
      v_route.to_island_id, 
      2, 
      'dropoff',
      CASE 
        WHEN v_route.duration SIMILAR TO '%[0-9]+%'
        THEN CAST(substring(v_route.duration FROM '[0-9]+') AS INTEGER)
        ELSE 60
      END,
      'Final destination'
    )
    RETURNING id INTO v_second_stop_id;
    
    -- Create segment fare (A to B only)
    INSERT INTO route_segment_fares (
      route_id, from_stop_id, to_stop_id, fare_amount
    )
    VALUES (
      v_route.id, v_first_stop_id, v_second_stop_id, v_route.base_fare
    )
    ON CONFLICT DO NOTHING;
    
    v_migrated_count := v_migrated_count + 1;
  END LOOP;
  
  RAISE NOTICE 'Successfully migrated % routes to multi-stop format', v_migrated_count;
END $$;

-- ============================================================================
-- PART 10: UPDATE EXISTING VIEWS
-- ============================================================================

-- Replace routes_stats_view to use new structure
DROP VIEW IF EXISTS routes_stats_view CASCADE;
CREATE VIEW routes_stats_view AS
SELECT * FROM routes_with_stops_view;

-- ============================================================================
-- PART 11: CREATE TRIGGERS
-- ============================================================================

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_route_stops_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER route_stops_updated_at
  BEFORE UPDATE ON route_stops
  FOR EACH ROW
  EXECUTE FUNCTION update_route_stops_timestamp();

CREATE TRIGGER route_segment_fares_updated_at
  BEFORE UPDATE ON route_segment_fares
  FOR EACH ROW
  EXECUTE FUNCTION update_route_stops_timestamp();

CREATE TRIGGER trip_fare_overrides_updated_at
  BEFORE UPDATE ON trip_fare_overrides
  FOR EACH ROW
  EXECUTE FUNCTION update_route_stops_timestamp();

COMMIT;

-- ============================================================================
-- VERIFICATION & STATUS REPORT
-- ============================================================================

-- Check migration results
DO $$
DECLARE
  v_routes_count INTEGER;
  v_stops_count INTEGER;
  v_fares_count INTEGER;
  v_routes_with_stops INTEGER;
  v_avg_stops NUMERIC;
BEGIN
  SELECT COUNT(*) INTO v_routes_count FROM routes;
  SELECT COUNT(*) INTO v_stops_count FROM route_stops;
  SELECT COUNT(*) INTO v_fares_count FROM route_segment_fares;
  SELECT COUNT(DISTINCT route_id) INTO v_routes_with_stops FROM route_stops;
  SELECT ROUND(AVG(stop_count), 2) INTO v_avg_stops 
  FROM (SELECT COUNT(*) as stop_count FROM route_stops GROUP BY route_id) subq;
  
  RAISE NOTICE '';
  RAISE NOTICE '============================================================';
  RAISE NOTICE 'MULTI-STOP ROUTES MIGRATION COMPLETE';
  RAISE NOTICE '============================================================';
  RAISE NOTICE 'Total Routes: %', v_routes_count;
  RAISE NOTICE 'Routes with Stops: %', v_routes_with_stops;
  RAISE NOTICE 'Total Route Stops: %', v_stops_count;
  RAISE NOTICE 'Average Stops per Route: %', v_avg_stops;
  RAISE NOTICE 'Total Segment Fares: %', v_fares_count;
  RAISE NOTICE '============================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'New Tables Created:';
  RAISE NOTICE '  ✓ route_stops';
  RAISE NOTICE '  ✓ route_segment_fares';
  RAISE NOTICE '  ✓ trip_fare_overrides';
  RAISE NOTICE '  ✓ booking_segments';
  RAISE NOTICE '  ✓ seat_segment_reservations';
  RAISE NOTICE '';
  RAISE NOTICE 'New Functions Created:';
  RAISE NOTICE '  ✓ create_multi_stop_route()';
  RAISE NOTICE '  ✓ auto_generate_segment_fares()';
  RAISE NOTICE '  ✓ is_seat_available_for_segment()';
  RAISE NOTICE '  ✓ get_available_seats_for_segment()';
  RAISE NOTICE '  ✓ get_effective_segment_fare()';
  RAISE NOTICE '  ✓ reserve_seat_for_segment()';
  RAISE NOTICE '';
  RAISE NOTICE 'New Views Created:';
  RAISE NOTICE '  ✓ routes_with_stops_view';
  RAISE NOTICE '  ✓ route_segment_fares_view';
  RAISE NOTICE '  ✓ bookings_with_segments_view';
  RAISE NOTICE '  ✓ seat_availability_by_segment';
  RAISE NOTICE '';
  RAISE NOTICE '============================================================';
  RAISE NOTICE 'READY FOR APPLICATION UPDATES!';
  RAISE NOTICE '============================================================';
END $$;

-- Sample queries to test the new system
-- Uncomment to test after migration:

-- Show all routes with their stops
-- SELECT 
--   id, name, total_stops, total_segments, 
--   from_island_name, to_island_name 
-- FROM routes_with_stops_view;

-- Show all segment fares for a specific route
-- SELECT 
--   from_island_name, to_island_name, 
--   segments_count, fare_amount
-- FROM route_segment_fares_view
-- WHERE route_id = 'YOUR_ROUTE_ID'
-- ORDER BY from_stop_sequence, to_stop_sequence;

-- Check seat availability for a segment
-- SELECT * FROM get_available_seats_for_segment(
--   'YOUR_TRIP_ID'::UUID,
--   1,  -- from_sequence (boarding at stop 1)
--   3   -- to_sequence (destination at stop 3)
-- );


