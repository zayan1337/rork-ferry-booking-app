-- Drop existing views if they exist to avoid column conflicts
DROP VIEW IF EXISTS admin_bookings_view CASCADE;
DROP VIEW IF EXISTS trips_with_available_seats CASCADE;
DROP VIEW IF EXISTS admin_users_view CASCADE;
DROP VIEW IF EXISTS route_performance_view CASCADE;
DROP VIEW IF EXISTS vessel_utilization_view CASCADE;
DROP VIEW IF EXISTS recent_activity_view CASCADE;

-- Admin Bookings View with all joined data
-- Provides a comprehensive view of bookings with related information
CREATE VIEW admin_bookings_view AS
SELECT 
    b.id,
    b.booking_number,
    b.user_id,
    b.trip_id,
    b.is_round_trip,
    b.return_booking_id,
    b.status,
    b.total_fare,
    b.qr_code_url,
    b.check_in_status,
    b.agent_id,
    b.agent_client_id,
    b.payment_method_type,
    b.round_trip_group_id,
    b.created_at,
    
    -- User information
    up.full_name as user_name,
    up.email as user_email,
    up.mobile_number as user_mobile,
    
    -- Trip information
    t.travel_date as trip_travel_date,
    t.departure_time as trip_departure_time,
    r.base_fare as trip_base_fare,
    
    -- Vessel information
    v.name as vessel_name,
    v.seating_capacity as vessel_capacity,
    
    -- Route information
    CONCAT(i1.name, ' to ', i2.name) as route_name,
    
    -- Island information
    i1.name as from_island_name,
    i2.name as to_island_name,
    
    -- Agent information (if applicable)
    agent.full_name as agent_name,
    agent.email as agent_email,
    
    -- Passenger count
    (SELECT COUNT(*) FROM passengers WHERE booking_id = b.id) as passenger_count,
    
    -- Payment information
    p.status as payment_status,
    p.amount as payment_amount,
    p.payment_method as payment_method
    
FROM bookings b
LEFT JOIN user_profiles up ON b.user_id = up.id
LEFT JOIN trips t ON b.trip_id = t.id
LEFT JOIN vessels v ON t.vessel_id = v.id
LEFT JOIN routes r ON t.route_id = r.id
LEFT JOIN islands i1 ON r.from_island_id = i1.id
LEFT JOIN islands i2 ON r.to_island_id = i2.id
LEFT JOIN user_profiles agent ON b.agent_id = agent.id
LEFT JOIN payments p ON b.id = p.booking_id;

-- Trips with Available Seats View
-- Shows trips with calculated available seats
CREATE VIEW trips_with_available_seats AS
SELECT 
    t.id,
    t.route_id,
    t.vessel_id,
    t.travel_date,
    t.departure_time,
    t.available_seats as original_available_seats,
    t.is_active,
    t.created_at,
    r.base_fare,
    
    -- Vessel information
    v.name as vessel_name,
    v.seating_capacity as vessel_capacity,
    
    -- Route information
    CONCAT(i1.name, ' to ', i2.name) as route_name,
    i1.name as from_island_name,
    i2.name as to_island_name,
    
    -- Booking calculations
    COALESCE(booking_counts.confirmed_bookings, 0) as confirmed_bookings,
    COALESCE(booking_counts.pending_bookings, 0) as pending_bookings,
    COALESCE(booking_counts.total_passengers, 0) as total_passengers,
    (v.seating_capacity - COALESCE(booking_counts.total_passengers, 0)) as available_seats,
    
    -- Utilization percentage
    ROUND(
        CASE 
            WHEN v.seating_capacity = 0 THEN 0
            ELSE (COALESCE(booking_counts.total_passengers, 0)::NUMERIC / v.seating_capacity::NUMERIC) * 100
        END, 2
    ) as utilization_percentage
    
FROM trips t
JOIN vessels v ON t.vessel_id = v.id
JOIN routes r ON t.route_id = r.id
JOIN islands i1 ON r.from_island_id = i1.id
JOIN islands i2 ON r.to_island_id = i2.id
LEFT JOIN (
    SELECT 
        trip_id,
        COUNT(CASE WHEN status = 'confirmed' THEN 1 END) as confirmed_bookings,
        COUNT(CASE WHEN status = 'pending_payment' THEN 1 END) as pending_bookings,
        COALESCE(SUM(passenger_counts.passenger_count), 0) as total_passengers
    FROM bookings b
    LEFT JOIN (
        SELECT booking_id, COUNT(*) as passenger_count
        FROM passengers
        GROUP BY booking_id
    ) passenger_counts ON b.id = passenger_counts.booking_id
    WHERE b.status IN ('confirmed', 'pending_payment')
    GROUP BY trip_id
) booking_counts ON t.id = booking_counts.trip_id;

-- Admin Users View with additional statistics
-- Provides user information with booking and activity statistics
CREATE VIEW admin_users_view AS
SELECT 
    up.id,
    up.email,
    up.full_name,
    up.mobile_number,
    up.date_of_birth,
    up.role,
    up.is_active,
    up.created_at,
    
    -- Booking statistics
    COALESCE(user_stats.total_bookings, 0) as total_bookings,
    COALESCE(user_stats.confirmed_bookings, 0) as confirmed_bookings,
    COALESCE(user_stats.cancelled_bookings, 0) as cancelled_bookings,
    COALESCE(user_stats.total_spent, 0) as total_spent,
    user_stats.last_booking_date,
    
    -- Agent-specific statistics (if applicable)
    CASE 
        WHEN up.role = 'agent' THEN COALESCE(agent_stats.agent_bookings, 0)
        ELSE 0
    END as agent_bookings,
    
    CASE 
        WHEN up.role = 'agent' THEN COALESCE(agent_stats.agent_revenue, 0)
        ELSE 0
    END as agent_revenue,
    
    -- Activity indicators
    CASE 
        WHEN user_stats.last_booking_date >= CURRENT_DATE - INTERVAL '30 days' THEN true
        ELSE false
    END as is_recently_active
    
FROM user_profiles up
LEFT JOIN (
    SELECT 
        user_id,
        COUNT(*) as total_bookings,
        COUNT(CASE WHEN status = 'confirmed' THEN 1 END) as confirmed_bookings,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_bookings,
        SUM(CASE WHEN status = 'confirmed' THEN total_fare ELSE 0 END) as total_spent,
        MAX(created_at) as last_booking_date
    FROM bookings
    GROUP BY user_id
) user_stats ON up.id = user_stats.user_id
LEFT JOIN (
    SELECT 
        agent_id,
        COUNT(*) as agent_bookings,
        SUM(CASE WHEN status = 'confirmed' THEN total_fare ELSE 0 END) as agent_revenue
    FROM bookings
    WHERE agent_id IS NOT NULL
    GROUP BY agent_id
) agent_stats ON up.id = agent_stats.agent_id;

-- Route Performance View
-- Provides comprehensive route analytics
CREATE VIEW route_performance_view AS
SELECT 
    r.id,
    CONCAT(i1.name, ' to ', i2.name) as route_name,
    r.from_island_id,
    r.to_island_id,
    r.base_fare,
    r.is_active,
    r.created_at,
    
    -- Island information
    i1.name as from_island_name,
    i2.name as to_island_name,
    
    -- Performance metrics (last 30 days)
    COALESCE(route_stats.total_trips, 0) as total_trips_30d,
    COALESCE(route_stats.total_bookings, 0) as total_bookings_30d,
    COALESCE(route_stats.confirmed_bookings, 0) as confirmed_bookings_30d,
    COALESCE(route_stats.total_revenue, 0) as total_revenue_30d,
    COALESCE(route_stats.average_occupancy, 0) as average_occupancy_30d,
    
    -- Cancellation rate
    ROUND(
        CASE 
            WHEN COALESCE(route_stats.total_bookings, 0) = 0 THEN 0
            ELSE (COALESCE(route_stats.cancelled_bookings, 0)::NUMERIC / route_stats.total_bookings::NUMERIC) * 100
        END, 2
    ) as cancellation_rate_30d,
    
    -- Average fare
    ROUND(
        CASE 
            WHEN COALESCE(route_stats.confirmed_bookings, 0) = 0 THEN 0
            ELSE route_stats.total_revenue::NUMERIC / route_stats.confirmed_bookings::NUMERIC
        END, 2
    ) as average_fare_30d
    
FROM routes r
JOIN islands i1 ON r.from_island_id = i1.id
JOIN islands i2 ON r.to_island_id = i2.id
LEFT JOIN (
    SELECT 
        t.route_id,
        COUNT(DISTINCT t.id) as total_trips,
        COUNT(b.id) as total_bookings,
        COUNT(CASE WHEN b.status = 'confirmed' THEN 1 END) as confirmed_bookings,
        COUNT(CASE WHEN b.status = 'cancelled' THEN 1 END) as cancelled_bookings,
        SUM(CASE WHEN b.status = 'confirmed' THEN b.total_fare ELSE 0 END) as total_revenue,
        ROUND(
            CASE 
                WHEN COUNT(DISTINCT t.id) = 0 THEN 0
                ELSE COUNT(b.id)::NUMERIC / COUNT(DISTINCT t.id)::NUMERIC
            END, 2
        ) as average_occupancy
    FROM trips t
    LEFT JOIN bookings b ON t.id = b.trip_id
    WHERE t.travel_date >= CURRENT_DATE - INTERVAL '30 days'
    GROUP BY t.route_id
) route_stats ON r.id = route_stats.route_id;

-- Vessel Utilization View
-- Shows vessel usage and performance metrics
CREATE VIEW vessel_utilization_view AS
SELECT 
    v.id,
    v.name,
    v.seating_capacity,
    v.is_active,
    v.created_at,
    
    -- Utilization metrics (last 30 days)
    COALESCE(vessel_stats.total_trips, 0) as total_trips_30d,
    COALESCE(vessel_stats.total_bookings, 0) as total_bookings_30d,
    COALESCE(vessel_stats.total_passengers, 0) as total_passengers_30d,
    COALESCE(vessel_stats.total_revenue, 0) as total_revenue_30d,
    
    -- Utilization rates
    ROUND(
        CASE 
            WHEN COALESCE(vessel_stats.total_trips, 0) = 0 THEN 0
            ELSE vessel_stats.total_passengers::NUMERIC / (vessel_stats.total_trips * v.seating_capacity)::NUMERIC * 100
        END, 2
    ) as capacity_utilization_30d,
    
    -- Average passengers per trip
    ROUND(
        CASE 
            WHEN COALESCE(vessel_stats.total_trips, 0) = 0 THEN 0
            ELSE vessel_stats.total_passengers::NUMERIC / vessel_stats.total_trips::NUMERIC
        END, 2
    ) as avg_passengers_per_trip,
    
    -- Days in service (last 30 days)
    COALESCE(vessel_stats.days_in_service, 0) as days_in_service_30d
    
FROM vessels v
LEFT JOIN (
    SELECT 
        t.vessel_id,
        COUNT(*) as total_trips,
        COUNT(b.id) as total_bookings,
        COALESCE(SUM(passenger_counts.passenger_count), 0) as total_passengers,
        SUM(CASE WHEN b.status = 'confirmed' THEN b.total_fare ELSE 0 END) as total_revenue,
        COUNT(DISTINCT t.travel_date) as days_in_service
    FROM trips t
    LEFT JOIN bookings b ON t.id = b.trip_id
    LEFT JOIN (
        SELECT booking_id, COUNT(*) as passenger_count
        FROM passengers
        GROUP BY booking_id
    ) passenger_counts ON b.id = passenger_counts.booking_id
    WHERE t.travel_date >= CURRENT_DATE - INTERVAL '30 days'
    GROUP BY t.vessel_id
) vessel_stats ON v.id = vessel_stats.vessel_id;

-- Recent Activity View
-- Shows recent activities across the system for admin dashboard
CREATE VIEW recent_activity_view AS
(
    SELECT 
        'booking_created' as activity_type,
        CONCAT('New booking ', booking_number, ' created by ', up.full_name) as description,
        b.created_at,
        b.id as related_id,
        'booking' as related_type,
        up.full_name as user_name,
        NULL as amount
    FROM bookings b
    JOIN user_profiles up ON b.user_id = up.id
    WHERE b.created_at >= NOW() - INTERVAL '24 hours'
)
UNION ALL
(
    SELECT 
        'payment_completed' as activity_type,
        CONCAT('Payment of $', amount, ' completed for booking ', b.booking_number) as description,
        p.created_at,
        p.booking_id as related_id,
        'payment' as related_type,
        up.full_name as user_name,
        p.amount
    FROM payments p
    JOIN bookings b ON p.booking_id = b.id
    JOIN user_profiles up ON b.user_id = up.id
    WHERE p.status = 'completed' 
    AND p.created_at >= NOW() - INTERVAL '24 hours'
)
UNION ALL
(
    SELECT 
        'user_registered' as activity_type,
        CONCAT('New ', role, ' registered: ', full_name) as description,
        created_at,
        id as related_id,
        'user' as related_type,
        full_name as user_name,
        NULL as amount
    FROM user_profiles
    WHERE created_at >= NOW() - INTERVAL '24 hours'
)
ORDER BY created_at DESC
LIMIT 50; 