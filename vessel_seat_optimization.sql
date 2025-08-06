-- Vessel Seat Layout Database Optimization
-- This script simplifies the seat management by removing the vessel_seat_layouts table
-- and storing all layout information directly in the seats table

-- Step 1: Drop existing views that depend on vessel_seat_layouts
DROP VIEW IF EXISTS public.vessel_seat_layouts_view;
DROP VIEW IF EXISTS public.operations_vessels_view;

-- Step 2: Drop foreign key constraints that reference vessel_seat_layouts
ALTER TABLE public.seats DROP CONSTRAINT IF EXISTS seats_layout_id_fkey;

-- Step 3: Drop the vessel_seat_layouts table (now safe to do)
DROP TABLE IF EXISTS public.vessel_seat_layouts;

-- Step 4: Drop triggers that depend on functions we're recreating
DROP TRIGGER IF EXISTS create_vessel_layout_trigger ON public.vessels;

-- Step 5: Drop existing functions that will be recreated
DROP FUNCTION IF EXISTS public.get_vessel_seat_layout(uuid);
DROP FUNCTION IF EXISTS public.save_vessel_seat_layout(uuid, json, json);
DROP FUNCTION IF EXISTS public.generate_default_vessel_seats(uuid, integer, text);
DROP FUNCTION IF EXISTS public.create_vessel_default_layout();

-- Step 6: Modify the seats table to remove layout_id dependency
-- Drop existing constraints and indexes
ALTER TABLE public.seats DROP CONSTRAINT IF EXISTS unique_seat_position_per_layout;
ALTER TABLE public.seats DROP CONSTRAINT IF EXISTS check_seat_number_format;

-- Drop old indexes (using safer syntax for older PostgreSQL versions)
DROP INDEX IF EXISTS idx_seats_layout_id;
DROP INDEX IF EXISTS idx_seats_vessel_layout;

-- Remove the layout_id column
ALTER TABLE public.seats DROP COLUMN IF EXISTS layout_id;

-- Add new constraints for the simplified structure
ALTER TABLE public.seats ADD CONSTRAINT unique_seat_position_per_vessel 
    UNIQUE (vessel_id, position_x, position_y);

-- Add a more flexible seat number format constraint
ALTER TABLE public.seats ADD CONSTRAINT check_seat_number_format 
    CHECK (seat_number ~ '^[A-Za-z0-9]+$');

-- Create optimized indexes for the seats table
CREATE INDEX IF NOT EXISTS idx_seats_vessel_position ON public.seats (vessel_id, position_x, position_y);
CREATE INDEX IF NOT EXISTS idx_seats_vessel_type ON public.seats (vessel_id, seat_type);
CREATE INDEX IF NOT EXISTS idx_seats_vessel_class ON public.seats (vessel_id, seat_class);
CREATE INDEX IF NOT EXISTS idx_seats_vessel_premium ON public.seats (vessel_id, is_premium);
CREATE INDEX IF NOT EXISTS idx_seats_vessel_disabled ON public.seats (vessel_id, is_disabled);

-- Step 7: Recreate the operations_vessels_view without vessel_seat_layouts dependency
CREATE OR REPLACE VIEW public.operations_vessels_view AS
SELECT 
    v.id,
    v.name,
    v.seating_capacity,
    v.status,
    v.vessel_type,
    v.is_active,
    v.created_at,
    v.updated_at,
    -- Trip statistics (last 30 days)
    COALESCE(trip_stats.total_trips_30d, 0) as total_trips_30d,
    COALESCE(trip_stats.total_bookings_30d, 0) as total_bookings_30d,
    COALESCE(trip_stats.total_passengers_30d, 0) as total_passengers_30d,
    COALESCE(trip_stats.total_revenue_30d, 0) as total_revenue_30d,
    -- Capacity utilization
    CASE 
        WHEN v.seating_capacity > 0 THEN 
            ROUND((COALESCE(trip_stats.total_passengers_30d, 0)::numeric / (v.seating_capacity * COALESCE(trip_stats.total_trips_30d, 1))) * 100, 2)
        ELSE 0 
    END as capacity_utilization_30d,
    -- Average passengers per trip
    CASE 
        WHEN COALESCE(trip_stats.total_trips_30d, 0) > 0 THEN 
            ROUND(COALESCE(trip_stats.total_passengers_30d, 0)::numeric / trip_stats.total_trips_30d, 2)
        ELSE 0 
    END as avg_passengers_per_trip,
    -- Days in service
    COALESCE(trip_stats.days_in_service_30d, 0) as days_in_service_30d,
    -- Today's statistics
    COALESCE(today_stats.trips_today, 0) as trips_today,
    COALESCE(today_stats.bookings_today, 0) as bookings_today,
    COALESCE(today_stats.revenue_today, 0) as revenue_today,
    -- This week's statistics
    COALESCE(week_stats.trips_7d, 0) as trips_7d,
    COALESCE(week_stats.bookings_7d, 0) as bookings_7d,
    COALESCE(week_stats.revenue_7d, 0) as revenue_7d
FROM public.vessels v
LEFT JOIN (
    SELECT 
        t.vessel_id,
        COUNT(*) as total_trips_30d,
        SUM(t.booked_seats) as total_bookings_30d,
        SUM(t.booked_seats) as total_passengers_30d,
        SUM(t.booked_seats * r.base_fare * t.fare_multiplier) as total_revenue_30d,
        COUNT(DISTINCT DATE(t.travel_date)) as days_in_service_30d
    FROM public.trips t
    JOIN public.routes r ON t.route_id = r.id
    WHERE t.travel_date >= CURRENT_DATE - INTERVAL '30 days'
    AND t.status IN ('departed', 'arrived')
    GROUP BY t.vessel_id
) trip_stats ON v.id = trip_stats.vessel_id
LEFT JOIN (
    SELECT 
        t.vessel_id,
        COUNT(*) as trips_today,
        SUM(t.booked_seats) as bookings_today,
        SUM(t.booked_seats * r.base_fare * t.fare_multiplier) as revenue_today
    FROM public.trips t
    JOIN public.routes r ON t.route_id = r.id
    WHERE t.travel_date = CURRENT_DATE
    AND t.status IN ('departed', 'arrived')
    GROUP BY t.vessel_id
) today_stats ON v.id = today_stats.vessel_id
LEFT JOIN (
    SELECT 
        t.vessel_id,
        COUNT(*) as trips_7d,
        SUM(t.booked_seats) as bookings_7d,
        SUM(t.booked_seats * r.base_fare * t.fare_multiplier) as revenue_7d
    FROM public.trips t
    JOIN public.routes r ON t.route_id = r.id
    WHERE t.travel_date >= CURRENT_DATE - INTERVAL '7 days'
    AND t.status IN ('departed', 'arrived')
    GROUP BY t.vessel_id
) week_stats ON v.id = week_stats.vessel_id;

-- Create a view for vessel seat statistics
CREATE OR REPLACE VIEW public.vessel_seats_view AS
SELECT 
    vessel_id,
    COUNT(*) as total_seats,
    COUNT(*) FILTER (WHERE is_disabled = false) as active_seats,
    COUNT(*) FILTER (WHERE is_disabled = true) as disabled_seats,
    COUNT(*) FILTER (WHERE is_premium = true) as premium_seats,
    COUNT(*) FILTER (WHERE seat_type = 'crew') as crew_seats,
    COUNT(*) FILTER (WHERE is_window = true) as window_seats,
    COUNT(*) FILTER (WHERE is_aisle = true) as aisle_seats,
    ROUND(
        (COUNT(*) FILTER (WHERE is_disabled = false)::numeric / COUNT(*)::numeric) * 100, 2
    ) as utilization_rate,
    ROUND(
        AVG(price_multiplier) * COUNT(*) FILTER (WHERE is_disabled = false), 2
    ) as revenue_potential
FROM public.seats
GROUP BY vessel_id;

-- Function to get vessel seat layout configuration dynamically
CREATE OR REPLACE FUNCTION public.get_vessel_seat_layout(vessel_id_param uuid)
RETURNS json AS $$
DECLARE
    layout_data json;
    max_row integer;
    max_col integer;
    aisles_array integer[];
    premium_rows_array integer[];
    disabled_seats_array text[];
    crew_seats_array text[];
BEGIN
    -- Get layout dimensions from existing seats
    SELECT 
        COALESCE(MAX(row_number), 0),
        COALESCE(MAX(position_x), 0)
    INTO max_row, max_col
    FROM public.seats 
    WHERE vessel_id = vessel_id_param;

    -- If no seats exist, return null
    IF max_row = 0 OR max_col = 0 THEN
        RETURN NULL;
    END IF;

    -- Get aisles (columns with aisle seats)
    SELECT ARRAY_AGG(DISTINCT position_x ORDER BY position_x)
    INTO aisles_array
    FROM public.seats 
    WHERE vessel_id = vessel_id_param AND is_aisle = true;

    -- Get premium rows
    SELECT ARRAY_AGG(DISTINCT row_number ORDER BY row_number)
    INTO premium_rows_array
    FROM public.seats 
    WHERE vessel_id = vessel_id_param AND is_premium = true;

    -- Get disabled seats
    SELECT ARRAY_AGG(seat_number ORDER BY seat_number)
    INTO disabled_seats_array
    FROM public.seats 
    WHERE vessel_id = vessel_id_param AND is_disabled = true;

    -- Get crew seats
    SELECT ARRAY_AGG(seat_number ORDER BY seat_number)
    INTO crew_seats_array
    FROM public.seats 
    WHERE vessel_id = vessel_id_param AND seat_type = 'crew';

    -- Build layout data
    layout_data := json_build_object(
        'rows', max_row,
        'columns', max_col,
        'aisles', COALESCE(aisles_array, ARRAY[]::integer[]),
        'rowAisles', ARRAY[]::integer[],
        'premium_rows', COALESCE(premium_rows_array, ARRAY[]::integer[]),
        'disabled_seats', COALESCE(disabled_seats_array, ARRAY[]::text[]),
        'crew_seats', COALESCE(crew_seats_array, ARRAY[]::text[]),
        'floors', ARRAY[json_build_object(
            'floor_number', 1,
            'floor_name', 'Main Deck',
            'rows', max_row,
            'columns', max_col,
            'aisles', COALESCE(aisles_array, ARRAY[]::integer[]),
            'rowAisles', ARRAY[]::integer[],
            'premium_rows', COALESCE(premium_rows_array, ARRAY[]::integer[]),
            'disabled_seats', COALESCE(disabled_seats_array, ARRAY[]::text[]),
            'crew_seats', COALESCE(crew_seats_array, ARRAY[]::text[]),
            'is_active', true,
            'seat_count', (SELECT COUNT(*) FROM public.seats WHERE vessel_id = vessel_id_param)
        )]
    );

    RETURN layout_data;
END;
$$ LANGUAGE plpgsql;

-- Function to save custom vessel seat layout
CREATE OR REPLACE FUNCTION public.save_vessel_seat_layout(
    vessel_id_param uuid,
    layout_data json,
    seats_data json
)
RETURNS void AS $$
DECLARE
    seat_record json;
BEGIN
    -- Delete existing seats for this vessel
    DELETE FROM public.seats WHERE vessel_id = vessel_id_param;
    
    -- Insert new seats
    FOR seat_record IN SELECT * FROM json_array_elements(seats_data)
    LOOP
        INSERT INTO public.seats (
            id,
            vessel_id,
            seat_number,
            row_number,
            position_x,
            position_y,
            is_window,
            is_aisle,
            is_row_aisle,
            seat_type,
            seat_class,
            is_disabled,
            is_premium,
            price_multiplier,
            created_at,
            updated_at
        ) VALUES (
            gen_random_uuid(),
            vessel_id_param,
            (seat_record->>'seat_number')::text,
            (seat_record->>'row_number')::integer,
            (seat_record->>'position_x')::integer,
            (seat_record->>'position_y')::integer,
            (seat_record->>'is_window')::boolean,
            (seat_record->>'is_aisle')::boolean,
            COALESCE((seat_record->>'is_row_aisle')::boolean, false),
            (seat_record->>'seat_type')::text,
            (seat_record->>'seat_class')::text,
            (seat_record->>'is_disabled')::boolean,
            (seat_record->>'is_premium')::boolean,
            COALESCE((seat_record->>'price_multiplier')::numeric, 1.0),
            NOW(),
            NOW()
        );
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to generate default vessel seats
CREATE OR REPLACE FUNCTION public.generate_default_vessel_seats(
    vessel_id_param uuid,
    capacity integer,
    vessel_type text
)
RETURNS void AS $$
DECLARE
    rows_count integer;
    cols_count integer;
    aisle_pos integer;
    seat_counter integer := 0;
    row_num integer;
    col_num integer;
    seat_number text;
    is_premium boolean;
    is_window boolean;
    is_aisle boolean;
    seat_type text;
    seat_class text;
    price_multiplier numeric;
BEGIN
    -- Calculate optimal layout
    IF capacity <= 0 THEN
        RETURN;
    END IF;

    -- Simple layout calculation
    IF capacity <= 20 THEN
        rows_count := capacity;
        cols_count := 1;
    ELSIF capacity <= 40 THEN
        rows_count := CEIL(capacity::numeric / 2);
        cols_count := 2;
    ELSIF capacity <= 60 THEN
        rows_count := CEIL(capacity::numeric / 3);
        cols_count := 3;
    ELSIF capacity <= 80 THEN
        rows_count := CEIL(capacity::numeric / 4);
        cols_count := 4;
    ELSE
        rows_count := CEIL(capacity::numeric / 5);
        cols_count := 5;
    END IF;

    -- Add aisle if more than 3 columns
    IF cols_count > 3 THEN
        aisle_pos := CEIL(cols_count::numeric / 2);
    ELSE
        aisle_pos := 0;
    END IF;

    -- Determine premium configuration based on vessel type
    CASE vessel_type
        WHEN 'luxury' THEN
            seat_class := 'business';
            price_multiplier := 2.0;
        WHEN 'mixed' THEN
            seat_class := 'economy';
            price_multiplier := 1.5;
        ELSE
            seat_class := 'economy';
            price_multiplier := 1.0;
    END CASE;

    -- Generate seats
    FOR row_num IN 1..rows_count LOOP
        FOR col_num IN 1..cols_count LOOP
            -- Stop if we've reached capacity
            IF seat_counter >= capacity THEN
                EXIT;
            END IF;

            -- Determine seat properties
            is_premium := (vessel_type = 'luxury' AND row_num <= 3) OR 
                         (vessel_type = 'mixed' AND row_num <= 2) OR
                         (vessel_type = 'passenger' AND row_num = 1);
            
            is_window := (col_num = 1 OR col_num = cols_count);
            is_aisle := (aisle_pos > 0 AND col_num = aisle_pos);
            
            -- Set seat type and class
            IF is_premium THEN
                seat_type := 'premium';
                seat_class := 'business';
                price_multiplier := 1.5;
            ELSE
                seat_type := 'standard';
                seat_class := 'economy';
                price_multiplier := 1.0;
            END IF;

            -- Generate seat number (A1, A2, B1, B2, etc.)
            seat_number := CHR(64 + col_num) || row_num::text;

            -- Insert seat
            INSERT INTO public.seats (
                id,
                vessel_id,
                seat_number,
                row_number,
                position_x,
                position_y,
                is_window,
                is_aisle,
                is_row_aisle,
                seat_type,
                seat_class,
                is_disabled,
                is_premium,
                price_multiplier,
                created_at,
                updated_at
            ) VALUES (
                gen_random_uuid(),
                vessel_id_param,
                seat_number,
                row_num,
                col_num,
                row_num,
                is_window,
                is_aisle,
                false,
                seat_type,
                seat_class,
                false,
                is_premium,
                price_multiplier,
                NOW(),
                NOW()
            );

            seat_counter := seat_counter + 1;
        END LOOP;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Update the existing trigger function to use the new function
CREATE OR REPLACE FUNCTION public.create_vessel_default_layout()
RETURNS trigger AS $$
BEGIN
    -- Generate default seats for the new vessel
    PERFORM public.generate_default_vessel_seats(
        NEW.id,
        NEW.seating_capacity,
        COALESCE(NEW.vessel_type, 'passenger')
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger on the vessels table
CREATE TRIGGER create_vessel_layout_trigger
    AFTER INSERT ON public.vessels
    FOR EACH ROW
    EXECUTE FUNCTION public.create_vessel_default_layout();

-- Create a comprehensive vessel details view
CREATE OR REPLACE VIEW public.vessel_details_view AS
SELECT 
    v.*,
    vs.total_seats,
    vs.active_seats,
    vs.disabled_seats,
    vs.premium_seats,
    vs.crew_seats,
    vs.window_seats,
    vs.aisle_seats,
    vs.utilization_rate,
    vs.revenue_potential,
    public.get_vessel_seat_layout(v.id) as seat_layout_data
FROM public.vessels v
LEFT JOIN public.vessel_seats_view vs ON v.id = vs.vessel_id;

-- Grant necessary permissions
GRANT SELECT ON public.vessel_seats_view TO authenticated;
GRANT SELECT ON public.vessel_details_view TO authenticated;
GRANT SELECT ON public.operations_vessels_view TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_vessel_seat_layout(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_vessel_seat_layout(uuid, json, json) TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_default_vessel_seats(uuid, integer, text) TO authenticated;

-- Add comments for documentation
COMMENT ON VIEW public.vessel_seats_view IS 'Provides seat statistics for each vessel';
COMMENT ON VIEW public.vessel_details_view IS 'Comprehensive vessel information including seat layout data';
COMMENT ON VIEW public.operations_vessels_view IS 'Vessel operations statistics and performance metrics';
COMMENT ON FUNCTION public.get_vessel_seat_layout(uuid) IS 'Dynamically generates seat layout configuration from existing seats';
COMMENT ON FUNCTION public.save_vessel_seat_layout(uuid, json, json) IS 'Saves custom seat layout by replacing existing seats';
COMMENT ON FUNCTION public.generate_default_vessel_seats(uuid, integer, text) IS 'Generates default seat arrangement based on capacity and vessel type'; 