-- ============================================================================
-- VESSEL ENHANCEMENT SQL
-- Enhanced vessel management with improved seat layout system
-- ============================================================================

-- Drop and recreate the operations_vessels_view to fix column rename error
DROP VIEW IF EXISTS public.operations_vessels_view;

-- Add new columns to vessels table for enhanced vessel management
ALTER TABLE public.vessels 
ADD COLUMN IF NOT EXISTS vessel_type VARCHAR(20) DEFAULT 'passenger',
ADD COLUMN IF NOT EXISTS registration_number VARCHAR(50),
ADD COLUMN IF NOT EXISTS captain_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS contact_number VARCHAR(20),
ADD COLUMN IF NOT EXISTS maintenance_schedule TEXT,
ADD COLUMN IF NOT EXISTS last_maintenance_date DATE,
ADD COLUMN IF NOT EXISTS next_maintenance_date DATE,
ADD COLUMN IF NOT EXISTS insurance_expiry_date DATE,
ADD COLUMN IF NOT EXISTS license_expiry_date DATE,
ADD COLUMN IF NOT EXISTS max_speed INTEGER,
ADD COLUMN IF NOT EXISTS fuel_capacity INTEGER,
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_vessels_type ON public.vessels USING btree (vessel_type);
CREATE INDEX IF NOT EXISTS idx_vessels_registration ON public.vessels USING btree (registration_number);
CREATE INDEX IF NOT EXISTS idx_vessels_captain ON public.vessels USING btree (captain_name);
CREATE INDEX IF NOT EXISTS idx_vessels_maintenance ON public.vessels USING btree (last_maintenance_date, next_maintenance_date);
CREATE INDEX IF NOT EXISTS idx_vessels_insurance ON public.vessels USING btree (insurance_expiry_date);
CREATE INDEX IF NOT EXISTS idx_vessels_license ON public.vessels USING btree (license_expiry_date);

-- Enhanced vessel seat layouts table with simplified structure
CREATE TABLE IF NOT EXISTS public.vessel_seat_layouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vessel_id UUID NOT NULL REFERENCES public.vessels(id) ON DELETE CASCADE,
    layout_name VARCHAR(100) NOT NULL DEFAULT 'Default Layout',
    rows INTEGER NOT NULL DEFAULT 1,
    columns INTEGER NOT NULL DEFAULT 1,
    aisles INTEGER[] DEFAULT '{}',
    premium_rows INTEGER[] DEFAULT '{}',
    disabled_seats VARCHAR(10)[] DEFAULT '{}',
    crew_seats VARCHAR(10)[] DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    UNIQUE(vessel_id, is_active)
);

-- Create indexes for vessel_seat_layouts
CREATE INDEX IF NOT EXISTS idx_vessel_seat_layouts_vessel_id ON public.vessel_seat_layouts USING btree (vessel_id);
CREATE INDEX IF NOT EXISTS idx_vessel_seat_layouts_active ON public.vessel_seat_layouts USING btree (is_active);

-- Enhanced seats table with better structure
ALTER TABLE public.seats 
ADD COLUMN IF NOT EXISTS layout_id UUID REFERENCES public.vessel_seat_layouts(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS position_x INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS position_y INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS seat_type VARCHAR(20) DEFAULT 'standard',
ADD COLUMN IF NOT EXISTS seat_class VARCHAR(20) DEFAULT 'economy',
ADD COLUMN IF NOT EXISTS is_disabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_premium BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS price_multiplier DECIMAL(3,2) DEFAULT 1.00;

-- Create indexes for enhanced seats table
CREATE INDEX IF NOT EXISTS idx_seats_layout_id ON public.seats USING btree (layout_id);
CREATE INDEX IF NOT EXISTS idx_seats_position ON public.seats USING btree (position_x, position_y);
CREATE INDEX IF NOT EXISTS idx_seats_type ON public.seats USING btree (seat_type);
CREATE INDEX IF NOT EXISTS idx_seats_class ON public.seats USING btree (seat_class);
CREATE INDEX IF NOT EXISTS idx_seats_disabled ON public.seats USING btree (is_disabled);
CREATE INDEX IF NOT EXISTS idx_seats_premium ON public.seats USING btree (is_premium);

-- Function to generate default seat layout based on vessel capacity
CREATE OR REPLACE FUNCTION generate_default_seat_layout(
    vessel_uuid UUID,
    capacity INTEGER DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    layout_id UUID;
    vessel_capacity INTEGER;
    rows_count INTEGER;
    cols_count INTEGER;
    aisle_position INTEGER;
BEGIN
    -- Get vessel capacity if not provided
    IF capacity IS NULL THEN
        SELECT seating_capacity INTO vessel_capacity 
        FROM vessels WHERE id = vessel_uuid;
    ELSE
        vessel_capacity := capacity;
    END IF;

    -- Calculate optimal rows and columns based on capacity
    IF vessel_capacity <= 20 THEN
        rows_count := 4;
        cols_count := CEIL(vessel_capacity::DECIMAL / 4);
    ELSIF vessel_capacity <= 50 THEN
        rows_count := 6;
        cols_count := CEIL(vessel_capacity::DECIMAL / 6);
    ELSIF vessel_capacity <= 100 THEN
        rows_count := 8;
        cols_count := CEIL(vessel_capacity::DECIMAL / 8);
    ELSIF vessel_capacity <= 200 THEN
        rows_count := 10;
        cols_count := CEIL(vessel_capacity::DECIMAL / 10);
    ELSE
        -- For larger vessels, allow more flexibility
        rows_count := 15;
        cols_count := CEIL(vessel_capacity::DECIMAL / 15);
    END IF;

    -- Calculate aisle position (middle column)
    aisle_position := CEIL(cols_count::DECIMAL / 2);

    -- Deactivate existing layouts
    UPDATE vessel_seat_layouts 
    SET is_active = false 
    WHERE vessel_id = vessel_uuid;

    -- Create new layout
    INSERT INTO vessel_seat_layouts (
        vessel_id, 
        layout_name, 
        rows, 
        columns, 
        aisles, 
        premium_rows,
        is_active
    ) VALUES (
        vessel_uuid,
        'Auto-Generated Layout',
        rows_count,
        cols_count,
        ARRAY[aisle_position],
        ARRAY[1, 2], -- First two rows as premium
        true
    ) RETURNING id INTO layout_id;

    -- Generate seats for the layout
    PERFORM generate_seats_for_layout(layout_id, vessel_capacity);

    RETURN layout_id;
END;
$$ LANGUAGE plpgsql;

-- Function to generate seats for a layout
CREATE OR REPLACE FUNCTION generate_seats_for_layout(
    layout_uuid UUID,
    max_seats INTEGER DEFAULT NULL
) RETURNS VOID AS $$
DECLARE
    layout_record RECORD;
    seat_count INTEGER := 0;
    row_num INTEGER;
    col_num INTEGER;
    seat_number VARCHAR(10);
    is_window BOOLEAN;
    is_aisle BOOLEAN;
    is_premium BOOLEAN;
    seat_type VARCHAR(20);
    seat_class VARCHAR(20);
    price_multiplier DECIMAL(3,2);
BEGIN
    -- Get layout details
    SELECT * INTO layout_record 
    FROM vessel_seat_layouts 
    WHERE id = layout_uuid;

    -- Generate seats
    FOR row_num IN 1..layout_record.rows LOOP
        FOR col_num IN 1..layout_record.columns LOOP
            seat_count := seat_count + 1;
            
            -- Stop if we've reached max seats
            IF max_seats IS NOT NULL AND seat_count > max_seats THEN
                EXIT;
            END IF;

            -- Generate seat number (e.g., A1, A2, B1, B2)
            seat_number := CHR(64 + row_num) || col_num::VARCHAR;

            -- Determine seat properties
            is_window := (col_num = 1 OR col_num = layout_record.columns);
            is_aisle := col_num = ANY(layout_record.aisles);
            is_premium := row_num = ANY(layout_record.premium_rows);
            
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

            -- Insert seat
            INSERT INTO seats (
                vessel_id,
                layout_id,
                seat_number,
                row_number,
                position_x,
                position_y,
                is_window,
                is_aisle,
                seat_type,
                seat_class,
                is_premium,
                price_multiplier
            ) VALUES (
                layout_record.vessel_id,
                layout_uuid,
                seat_number,
                row_num,
                col_num,
                row_num,
                is_window,
                is_aisle,
                seat_type,
                seat_class,
                is_premium,
                price_multiplier
            );
        END LOOP;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to update seat layout
CREATE OR REPLACE FUNCTION update_seat_layout(
    layout_uuid UUID,
    new_rows INTEGER,
    new_columns INTEGER,
    new_aisles INTEGER[] DEFAULT NULL,
    new_premium_rows INTEGER[] DEFAULT NULL
) RETURNS UUID AS $$
BEGIN
    -- Update layout
    UPDATE vessel_seat_layouts 
    SET 
        rows = new_rows,
        columns = new_columns,
        aisles = COALESCE(new_aisles, aisles),
        premium_rows = COALESCE(new_premium_rows, premium_rows),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = layout_uuid;

    -- Regenerate seats
    DELETE FROM seats WHERE layout_id = layout_uuid;
    PERFORM generate_seats_for_layout(layout_uuid);

    RETURN layout_uuid;
END;
$$ LANGUAGE plpgsql;

-- Function to get vessel seat layout with details
CREATE OR REPLACE FUNCTION get_vessel_seat_layout(vessel_uuid UUID)
RETURNS TABLE (
    vessel_id UUID,
    vessel_name VARCHAR(100),
    seating_capacity INTEGER,
    layout_id UUID,
    layout_name VARCHAR(100),
    rows INTEGER,
    columns INTEGER,
    aisles INTEGER[],
    premium_rows INTEGER[],
    total_seats INTEGER,
    active_seats INTEGER,
    premium_seats INTEGER,
    window_seats INTEGER,
    aisle_seats INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        v.id as vessel_id,
        v.name as vessel_name,
        v.seating_capacity,
        vsl.id as layout_id,
        vsl.layout_name,
        vsl.rows,
        vsl.columns,
        vsl.aisles,
        vsl.premium_rows,
        COUNT(s.id) as total_seats,
        COUNT(s.id) FILTER (WHERE NOT s.is_disabled) as active_seats,
        COUNT(s.id) FILTER (WHERE s.is_premium) as premium_seats,
        COUNT(s.id) FILTER (WHERE s.is_window) as window_seats,
        COUNT(s.id) FILTER (WHERE s.is_aisle) as aisle_seats
    FROM vessels v
    LEFT JOIN vessel_seat_layouts vsl ON v.id = vsl.vessel_id AND vsl.is_active = true
    LEFT JOIN seats s ON vsl.id = s.layout_id
    WHERE v.id = vessel_uuid
    GROUP BY v.id, v.name, v.seating_capacity, vsl.id, vsl.layout_name, vsl.rows, vsl.columns, vsl.aisles, vsl.premium_rows;
END;
$$ LANGUAGE plpgsql;

-- Trigger to create default layout when vessel is created
CREATE OR REPLACE FUNCTION create_vessel_default_layout()
RETURNS TRIGGER AS $$
BEGIN
    -- Generate default layout for new vessel
    PERFORM generate_default_seat_layout(NEW.id, NEW.seating_capacity);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER create_vessel_layout_trigger
    AFTER INSERT ON vessels
    FOR EACH ROW
    EXECUTE FUNCTION create_vessel_default_layout();

-- Trigger to update vessel updated_at timestamp
CREATE OR REPLACE FUNCTION update_vessel_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER vessels_updated_at_trigger
    BEFORE UPDATE ON vessels
    FOR EACH ROW
    EXECUTE FUNCTION update_vessel_updated_at();

-- Trigger to update vessel_seat_layouts updated_at timestamp
CREATE OR REPLACE FUNCTION update_vessel_seat_layout_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER vessel_seat_layouts_updated_at_trigger
    BEFORE UPDATE ON vessel_seat_layouts
    FOR EACH ROW
    EXECUTE FUNCTION update_vessel_seat_layout_updated_at();

-- Recreate operations_vessels_view with enhanced information
CREATE OR REPLACE VIEW public.operations_vessels_view AS
SELECT 
    v.id,
    v.name,
    v.seating_capacity,
    v.status,
    v.is_active,
    v.vessel_type,
    v.registration_number,
    v.captain_name,
    v.contact_number,
    v.maintenance_schedule,
    v.last_maintenance_date,
    v.next_maintenance_date,
    v.insurance_expiry_date,
    v.license_expiry_date,
    v.max_speed,
    v.fuel_capacity,
    v.description,
    v.notes,
    v.created_at,
    v.updated_at,
    
    -- Seat layout information
    vsl.id as layout_id,
    vsl.layout_name,
    vsl.rows as layout_rows,
    vsl.columns as layout_columns,
    vsl.aisles as layout_aisles,
    vsl.premium_rows as layout_premium_rows,
    
    -- Statistics (30-day rolling)
    COALESCE(trip_stats.total_trips_30d, 0) as total_trips_30d,
    COALESCE(booking_stats.total_bookings_30d, 0) as total_bookings_30d,
    COALESCE(passenger_stats.total_passengers_30d, 0) as total_passengers_30d,
    COALESCE(revenue_stats.total_revenue_30d, 0) as total_revenue_30d,
    COALESCE(utilization_stats.capacity_utilization_30d, 0) as capacity_utilization_30d,
    COALESCE(utilization_stats.avg_passengers_per_trip, 0) as avg_passengers_per_trip,
    COALESCE(utilization_stats.days_in_service_30d, 0) as days_in_service_30d
    
FROM vessels v
LEFT JOIN vessel_seat_layouts vsl ON v.id = vsl.vessel_id AND vsl.is_active = true
LEFT JOIN LATERAL (
    SELECT 
        vessel_id,
        COUNT(*) as total_trips_30d
    FROM trips 
    WHERE vessel_id = v.id 
    AND departure_time >= CURRENT_DATE - INTERVAL '30 days'
    GROUP BY vessel_id
) trip_stats ON v.id = trip_stats.vessel_id
LEFT JOIN LATERAL (
    SELECT 
        t.vessel_id,
        COUNT(DISTINCT b.id) as total_bookings_30d
    FROM trips t
    JOIN bookings b ON t.id = b.trip_id
    WHERE t.vessel_id = v.id 
    AND t.departure_time >= CURRENT_DATE - INTERVAL '30 days'
    GROUP BY t.vessel_id
) booking_stats ON v.id = booking_stats.vessel_id
LEFT JOIN LATERAL (
    SELECT 
        t.vessel_id,
        COUNT(p.id) as total_passengers_30d
    FROM trips t
    JOIN bookings b ON t.id = b.trip_id
    JOIN passengers p ON b.id = p.booking_id
    WHERE t.vessel_id = v.id 
    AND t.departure_time >= CURRENT_DATE - INTERVAL '30 days'
    GROUP BY t.vessel_id
) passenger_stats ON v.id = passenger_stats.vessel_id
LEFT JOIN LATERAL (
    SELECT 
        t.vessel_id,
        COALESCE(SUM(py.amount), 0) as total_revenue_30d
    FROM trips t
    JOIN bookings b ON t.id = b.trip_id
    JOIN payments py ON b.id = py.booking_id
    WHERE t.vessel_id = v.id 
    AND t.departure_time >= CURRENT_DATE - INTERVAL '30 days'
    AND py.status = 'completed'
    GROUP BY t.vessel_id
) revenue_stats ON v.id = revenue_stats.vessel_id
LEFT JOIN LATERAL (
    SELECT 
        vessel_id,
        CASE 
            WHEN COUNT(*) > 0 THEN 
                ROUND((SUM(passenger_count)::DECIMAL / (COUNT(*) * v.seating_capacity)) * 100, 2)
            ELSE 0 
        END as capacity_utilization_30d,
        CASE 
            WHEN COUNT(*) > 0 THEN 
                ROUND(SUM(passenger_count)::DECIMAL / COUNT(*), 2)
            ELSE 0 
        END as avg_passengers_per_trip,
        COUNT(DISTINCT DATE(departure_time)) as days_in_service_30d
    FROM trips 
    WHERE vessel_id = v.id 
    AND departure_time >= CURRENT_DATE - INTERVAL '30 days'
    GROUP BY vessel_id
) utilization_stats ON v.id = utilization_stats.vessel_id;

-- Create vessel seat layouts view for detailed layout statistics
CREATE OR REPLACE VIEW public.vessel_seat_layouts_view AS
SELECT 
    vsl.id,
    vsl.vessel_id,
    v.name as vessel_name,
    vsl.layout_name,
    vsl.rows,
    vsl.columns,
    vsl.aisles,
    vsl.premium_rows,
    vsl.disabled_seats,
    vsl.crew_seats,
    vsl.is_active,
    vsl.created_at,
    vsl.updated_at,
    
    -- Seat statistics
    COUNT(s.id) as total_seats,
    COUNT(s.id) FILTER (WHERE NOT s.is_disabled) as active_seats,
    COUNT(s.id) FILTER (WHERE s.is_disabled) as disabled_seats,
    COUNT(s.id) FILTER (WHERE s.is_premium) as premium_seats,
    COUNT(s.id) FILTER (WHERE s.seat_type = 'crew') as crew_seats,
    COUNT(s.id) FILTER (WHERE s.is_window) as window_seats,
    COUNT(s.id) FILTER (WHERE s.is_aisle) as aisle_seats,
    
    -- Revenue potential
    ROUND(SUM(s.price_multiplier), 2) as revenue_multiplier,
    
    -- Utilization rate
    CASE 
        WHEN COUNT(s.id) > 0 THEN 
            ROUND((COUNT(s.id) FILTER (WHERE NOT s.is_disabled)::DECIMAL / COUNT(s.id)) * 100, 2)
        ELSE 0 
    END as utilization_rate

FROM vessel_seat_layouts vsl
JOIN vessels v ON vsl.vessel_id = v.id
LEFT JOIN seats s ON vsl.id = s.layout_id
GROUP BY vsl.id, vsl.vessel_id, v.name, vsl.layout_name, vsl.rows, vsl.columns, vsl.aisles, vsl.premium_rows, vsl.disabled_seats, vsl.crew_seats, vsl.is_active, vsl.created_at, vsl.updated_at;

-- Create additional indexes for performance
CREATE INDEX IF NOT EXISTS idx_vessel_seat_layouts_vessel_active ON public.vessel_seat_layouts USING btree (vessel_id, is_active);
CREATE INDEX IF NOT EXISTS idx_seats_vessel_layout ON public.seats USING btree (vessel_id, layout_id);
CREATE INDEX IF NOT EXISTS idx_seats_type_class ON public.seats USING btree (seat_type, seat_class);

-- Add comments for documentation
COMMENT ON TABLE public.vessel_seat_layouts IS 'Stores vessel seat layout configurations with simplified structure';
COMMENT ON COLUMN public.vessel_seat_layouts.aisles IS 'Array of column numbers where aisles are located';
COMMENT ON COLUMN public.vessel_seat_layouts.premium_rows IS 'Array of row numbers designated as premium seats';
COMMENT ON COLUMN public.vessel_seat_layouts.disabled_seats IS 'Array of seat numbers that are disabled';
COMMENT ON COLUMN public.vessel_seat_layouts.crew_seats IS 'Array of seat numbers reserved for crew';

COMMENT ON FUNCTION generate_default_seat_layout IS 'Automatically generates optimal seat layout based on vessel capacity';
COMMENT ON FUNCTION generate_seats_for_layout IS 'Generates individual seats for a given layout configuration';
COMMENT ON FUNCTION update_seat_layout IS 'Updates layout configuration and regenerates seats';
COMMENT ON FUNCTION get_vessel_seat_layout IS 'Returns comprehensive vessel seat layout information with statistics'; 