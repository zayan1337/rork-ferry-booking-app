-- Admin Dashboard Statistics Function
-- Returns comprehensive dashboard statistics in a single query
CREATE OR REPLACE FUNCTION get_admin_dashboard_stats()
RETURNS JSON AS $$
DECLARE
    result JSON;
    today_start TIMESTAMP := date_trunc('day', NOW());
    week_start TIMESTAMP := NOW() - INTERVAL '7 days';
    month_start TIMESTAMP := NOW() - INTERVAL '30 days';
BEGIN
    SELECT json_build_object(
        'overview', json_build_object(
            'total_bookings', (SELECT COUNT(*) FROM bookings),
            'daily_bookings', (SELECT COUNT(*) FROM bookings WHERE created_at >= today_start),
            'daily_revenue', COALESCE((SELECT SUM(total_fare) FROM bookings WHERE created_at >= today_start AND status = 'confirmed'), 0),
            'weekly_revenue', COALESCE((SELECT SUM(total_fare) FROM bookings WHERE created_at >= week_start AND status = 'confirmed'), 0),
            'monthly_revenue', COALESCE((SELECT SUM(total_fare) FROM bookings WHERE created_at >= month_start AND status = 'confirmed'), 0),
            'active_trips', (SELECT COUNT(*) FROM trips WHERE travel_date >= CURRENT_DATE),
            'total_users', (SELECT COUNT(*) FROM user_profiles),
            'active_agents', (SELECT COUNT(*) FROM user_profiles WHERE role = 'agent' AND is_active = true),
            'active_vessels', (SELECT COUNT(*) FROM vessels WHERE is_active = true)
        ),
        'booking_stats', json_build_object(
            'confirmed', (SELECT COUNT(*) FROM bookings WHERE status = 'confirmed'),
            'pending', (SELECT COUNT(*) FROM bookings WHERE status = 'pending_payment'),
            'cancelled', (SELECT COUNT(*) FROM bookings WHERE status = 'cancelled'),
            'completed', (SELECT COUNT(*) FROM bookings WHERE status = 'completed'),
            'check_in_rate', ROUND(
                CASE 
                    WHEN (SELECT COUNT(*) FROM bookings WHERE status IN ('confirmed', 'completed')) = 0 THEN 0
                    ELSE (SELECT COUNT(*) FROM bookings WHERE check_in_status = 'checked_in')::NUMERIC / 
                         (SELECT COUNT(*) FROM bookings WHERE status IN ('confirmed', 'completed'))::NUMERIC * 100
                END, 2
            )
        ),
        'payment_stats', json_build_object(
            'completed', (SELECT COUNT(*) FROM payments WHERE status = 'completed'),
            'pending', (SELECT COUNT(*) FROM payments WHERE status = 'pending'),
            'failed', (SELECT COUNT(*) FROM payments WHERE status = 'failed'),
            'total_pending_amount', COALESCE((SELECT SUM(amount) FROM payments WHERE status = 'pending'), 0)
        ),
        'user_stats', json_build_object(
            'new_users_today', (SELECT COUNT(*) FROM user_profiles WHERE created_at >= today_start),
            'new_users_week', (SELECT COUNT(*) FROM user_profiles WHERE created_at >= week_start),
            'active_customers', (SELECT COUNT(*) FROM user_profiles WHERE role = 'customer' AND is_active = true),
            'active_agents', (SELECT COUNT(*) FROM user_profiles WHERE role = 'agent' AND is_active = true)
        ),
        'vessel_stats', json_build_object(
            'active', (SELECT COUNT(*) FROM vessels WHERE is_active = true),
            'maintenance', (SELECT COUNT(*) FROM vessels WHERE status = 'maintenance'),
            'inactive', (SELECT COUNT(*) FROM vessels WHERE is_active = false),
            'utilization_rate', ROUND(
                CASE 
                    WHEN (SELECT COUNT(*) FROM vessels WHERE is_active = true) = 0 THEN 0
                    ELSE (SELECT COUNT(DISTINCT vessel_id) FROM trips WHERE travel_date >= CURRENT_DATE)::NUMERIC / 
                         (SELECT COUNT(*) FROM vessels WHERE is_active = true)::NUMERIC * 100
                END, 2
            )
        )
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Admin Alerts Function
-- Generates system alerts based on current data conditions
CREATE OR REPLACE FUNCTION get_admin_alerts()
RETURNS TABLE (
    alert_id TEXT,
    alert_type TEXT,
    title TEXT,
    message TEXT,
    severity TEXT,
    trip_id UUID,
    booking_id UUID,
    vessel_id UUID,
    created_at TIMESTAMP WITH TIME ZONE,
    action_required BOOLEAN
) AS $$
BEGIN
    -- Low capacity trip alerts
    RETURN QUERY
    SELECT 
        CONCAT('capacity-', t.id::TEXT) as alert_id,
        'capacity'::TEXT as alert_type,
        'Low Capacity Alert'::TEXT as title,
        CONCAT('Trip ', v.name, ' to ', i1.name, ' - ', i2.name, ' has only ', 
               (v.capacity - COALESCE(booking_count.count, 0)), ' seats left') as message,
        CASE 
            WHEN (v.capacity - COALESCE(booking_count.count, 0)) < 2 THEN 'high'::TEXT
            ELSE 'medium'::TEXT
        END as severity,
        t.id as trip_id,
        NULL::UUID as booking_id,
        t.vessel_id as vessel_id,
        NOW() as created_at,
        true as action_required
    FROM trips t
    JOIN vessels v ON t.vessel_id = v.id
    JOIN routes r ON t.route_id = r.id
    JOIN islands i1 ON r.from_island_id = i1.id
    JOIN islands i2 ON r.to_island_id = i2.id
    LEFT JOIN (
        SELECT trip_id, COUNT(*) as count
        FROM bookings 
        WHERE status IN ('confirmed', 'pending_payment')
        GROUP BY trip_id
    ) booking_count ON t.id = booking_count.trip_id
    WHERE t.travel_date >= CURRENT_DATE
    AND (v.capacity - COALESCE(booking_count.count, 0)) < 5;

    -- Pending payment alerts (over 24 hours)
    RETURN QUERY
    SELECT 
        CONCAT('payment-', p.id::TEXT) as alert_id,
        'payment'::TEXT as alert_type,
        'Pending Payment Alert'::TEXT as title,
        CONCAT('Payment of $', p.amount, ' has been pending for over 24 hours') as message,
        'medium'::TEXT as severity,
        NULL::UUID as trip_id,
        p.booking_id as booking_id,
        NULL::UUID as vessel_id,
        p.created_at as created_at,
        true as action_required
    FROM payments p
    WHERE p.status = 'pending'
    AND p.created_at < NOW() - INTERVAL '24 hours';

    -- Vessel maintenance alerts
    RETURN QUERY
    SELECT 
        CONCAT('maintenance-', v.id::TEXT) as alert_id,
        'maintenance'::TEXT as alert_type,
        'Vessel Maintenance Due'::TEXT as title,
        CONCAT('Vessel ', v.name, ' requires maintenance attention') as message,
        'high'::TEXT as severity,
        NULL::UUID as trip_id,
        NULL::UUID as booking_id,
        v.id as vessel_id,
        NOW() as created_at,
        true as action_required
    FROM vessels v
    WHERE v.status = 'maintenance';
END;
$$ LANGUAGE plpgsql;

-- Advanced Booking Search Function
-- Performs complex search across multiple tables with ranking
CREATE OR REPLACE FUNCTION search_admin_bookings(
    search_term TEXT DEFAULT NULL,
    status_filter TEXT[] DEFAULT NULL,
    date_from DATE DEFAULT NULL,
    date_to DATE DEFAULT NULL,
    agent_id_filter UUID DEFAULT NULL,
    route_id_filter UUID DEFAULT NULL,
    page_number INTEGER DEFAULT 1,
    page_size INTEGER DEFAULT 10
)
RETURNS TABLE (
    booking_data JSON,
    total_count BIGINT,
    search_rank REAL
) AS $$
DECLARE
    offset_count INTEGER := (page_number - 1) * page_size;
    search_query TEXT;
BEGIN
    -- Build the base query
    search_query := '
        SELECT 
            json_build_object(
                ''id'', b.id,
                ''booking_number'', b.booking_number,
                ''user_id'', b.user_id,
                ''trip_id'', b.trip_id,
                ''status'', b.status,
                ''total_fare'', b.total_fare,
                ''created_at'', b.created_at,
                ''user_name'', up.full_name,
                ''user_email'', up.email,
                ''user_mobile'', up.mobile_number,
                ''trip_travel_date'', t.travel_date,
                ''trip_departure_time'', t.departure_time,
                ''vessel_name'', v.name,
                ''from_island_name'', i1.name,
                ''to_island_name'', i2.name,
                ''agent_name'', agent.full_name,
                ''passenger_count'', COALESCE(passenger_count.count, 0)
            ) as booking_data,
            COUNT(*) OVER() as total_count,
            CASE 
                WHEN $1 IS NOT NULL THEN
                    ts_rank(
                        to_tsvector(''english'', 
                            COALESCE(b.booking_number, '''') || '' '' ||
                            COALESCE(up.full_name, '''') || '' '' ||
                            COALESCE(up.email, '''') || '' '' ||
                            COALESCE(v.name, '''')
                        ),
                        plainto_tsquery(''english'', $1)
                    )
                ELSE 1.0
            END as search_rank
        FROM bookings b
        LEFT JOIN user_profiles up ON b.user_id = up.id
        LEFT JOIN trips t ON b.trip_id = t.id
        LEFT JOIN vessels v ON t.vessel_id = v.id
        LEFT JOIN routes r ON t.route_id = r.id
        LEFT JOIN islands i1 ON r.from_island_id = i1.id
        LEFT JOIN islands i2 ON r.to_island_id = i2.id
        LEFT JOIN user_profiles agent ON b.agent_id = agent.id
        LEFT JOIN (
            SELECT booking_id, COUNT(*) as count
            FROM passengers
            GROUP BY booking_id
        ) passenger_count ON b.id = passenger_count.booking_id
        WHERE 1=1';

    -- Add search filter
    IF search_term IS NOT NULL AND search_term != '' THEN
        search_query := search_query || ' AND (
            b.booking_number ILIKE ''%' || search_term || '%'' OR
            up.full_name ILIKE ''%' || search_term || '%'' OR
            up.email ILIKE ''%' || search_term || '%'' OR
            v.name ILIKE ''%' || search_term || '%''
        )';
    END IF;

    -- Add status filter
    IF status_filter IS NOT NULL AND array_length(status_filter, 1) > 0 THEN
        search_query := search_query || ' AND b.status = ANY($2)';
    END IF;

    -- Add date filters
    IF date_from IS NOT NULL THEN
        search_query := search_query || ' AND b.created_at >= $3';
    END IF;

    IF date_to IS NOT NULL THEN
        search_query := search_query || ' AND b.created_at <= $4';
    END IF;

    -- Add agent filter
    IF agent_id_filter IS NOT NULL THEN
        search_query := search_query || ' AND b.agent_id = $5';
    END IF;

    -- Add route filter
    IF route_id_filter IS NOT NULL THEN
        search_query := search_query || ' AND t.route_id = $6';
    END IF;

    -- Add ordering and pagination
    search_query := search_query || ' ORDER BY ';
    
    IF search_term IS NOT NULL AND search_term != '' THEN
        search_query := search_query || 'search_rank DESC, ';
    END IF;
    
    search_query := search_query || 'b.created_at DESC 
        LIMIT ' || page_size || ' OFFSET ' || offset_count;

    -- Execute the dynamic query
    RETURN QUERY EXECUTE search_query 
        USING search_term, status_filter, date_from, date_to, agent_id_filter, route_id_filter;
END;
$$ LANGUAGE plpgsql;

-- Route Performance Analytics Function
-- Analyzes route performance metrics
CREATE OR REPLACE FUNCTION get_route_performance_analytics(
    date_from DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
    date_to DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
    route_data JSON
) AS $$
BEGIN
    RETURN QUERY
    SELECT json_build_object(
        'route_id', r.id,
        'route_name', CONCAT(i1.name, ' - ', i2.name),
        'from_island', i1.name,
        'to_island', i2.name,
        'total_trips', COUNT(DISTINCT t.id),
        'total_bookings', COUNT(b.id),
        'total_revenue', COALESCE(SUM(b.total_fare), 0),
        'average_occupancy', ROUND(
            CASE 
                WHEN COUNT(t.id) = 0 THEN 0
                ELSE COUNT(b.id)::NUMERIC / COUNT(t.id)::NUMERIC
            END, 2
        ),
        'cancellation_rate', ROUND(
            CASE 
                WHEN COUNT(b.id) = 0 THEN 0
                ELSE COUNT(CASE WHEN b.status = 'cancelled' THEN 1 END)::NUMERIC / COUNT(b.id)::NUMERIC * 100
            END, 2
        ),
        'average_fare', ROUND(
            CASE 
                WHEN COUNT(b.id) = 0 THEN 0
                ELSE AVG(b.total_fare)
            END, 2
        )
    ) as route_data
    FROM routes r
    JOIN islands i1 ON r.from_island_id = i1.id
    JOIN islands i2 ON r.to_island_id = i2.id
    LEFT JOIN trips t ON r.id = t.route_id 
        AND t.travel_date BETWEEN date_from AND date_to
    LEFT JOIN bookings b ON t.id = b.trip_id
    WHERE r.is_active = true
    GROUP BY r.id, r.name, i1.name, i2.name
    ORDER BY total_revenue DESC;
END;
$$ LANGUAGE plpgsql;

-- Bulk Trip Generation Function
-- Creates multiple trips based on schedule parameters
CREATE OR REPLACE FUNCTION bulk_create_trips(
    p_route_id UUID,
    p_vessel_id UUID,
    p_start_date DATE,
    p_end_date DATE,
    p_departure_times TIME[],
    p_days_of_week INTEGER[] -- 0=Sunday, 1=Monday, etc.
)
RETURNS TABLE (
    trip_id UUID,
    travel_date DATE,
    departure_time TIME,
    created_count INTEGER
) AS $$
DECLARE
    loop_date DATE := p_start_date;
    departure_time TIME;
    new_trip_id UUID;
    created_count INTEGER := 0;
    vessel_capacity INTEGER;
BEGIN
    -- Validate inputs
    IF p_start_date > p_end_date THEN
        RAISE EXCEPTION 'Start date cannot be after end date';
    END IF;

    IF array_length(p_departure_times, 1) IS NULL THEN
        RAISE EXCEPTION 'At least one departure time must be specified';
    END IF;

    IF array_length(p_days_of_week, 1) IS NULL THEN
        RAISE EXCEPTION 'At least one day of week must be specified';
    END IF;
    
    -- Get vessel capacity once
    SELECT seating_capacity INTO vessel_capacity
    FROM vessels
    WHERE id = p_vessel_id;
    
    IF vessel_capacity IS NULL THEN
        RAISE EXCEPTION 'Vessel not found or has no seating capacity';
    END IF;

    -- Loop through each date in the range
    WHILE loop_date <= p_end_date LOOP
        -- Check if current day is in the specified days of week
        IF EXTRACT(DOW FROM loop_date)::INTEGER = ANY(p_days_of_week) THEN
            -- Create a trip for each departure time
            FOREACH departure_time IN ARRAY p_departure_times LOOP
                -- Check if trip already exists for this date/time/route/vessel
                IF NOT EXISTS (
                    SELECT 1 FROM trips 
                    WHERE route_id = p_route_id 
                    AND vessel_id = p_vessel_id
                    AND travel_date = loop_date 
                    AND departure_time = departure_time
                ) THEN
                    -- Create the trip
                    INSERT INTO trips (
                        route_id,
                        vessel_id,
                        travel_date,
                        departure_time,
                        available_seats,
                        is_active
                    ) VALUES (
                        p_route_id,
                        p_vessel_id,
                        loop_date,
                        departure_time,
                        vessel_capacity,
                        true
                    ) RETURNING id INTO new_trip_id;

                    created_count := created_count + 1;

                    -- Return the created trip info
                    trip_id := new_trip_id;
                    travel_date := loop_date;
                    RETURN NEXT;
                END IF;
            END LOOP;
        END IF;

        loop_date := loop_date + INTERVAL '1 day';
    END LOOP;

    -- Return summary
    RETURN;
END;
$$ LANGUAGE plpgsql; 