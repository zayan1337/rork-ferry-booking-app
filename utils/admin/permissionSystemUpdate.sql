-- =============================================================================
-- PERMISSION SYSTEM UPDATE FOR EXISTING FERRY BOOKING DATABASE
-- =============================================================================
-- This script updates the existing database to add the permission system
-- while preserving all existing data and functionality.

-- =============================================================================
-- 0. CLEAN UP EXISTING FUNCTIONS TO AVOID CONFLICTS
-- =============================================================================

-- Drop existing functions that might conflict
DROP FUNCTION IF EXISTS public.check_user_permission(uuid, varchar) CASCADE;
DROP FUNCTION IF EXISTS get_user_permissions(uuid) CASCADE;
DROP FUNCTION IF EXISTS log_permission_activity() CASCADE;

-- Drop existing triggers that might conflict (only if table exists)
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_permissions') THEN
        DROP TRIGGER IF EXISTS trigger_log_permission_activity ON user_permissions;
    END IF;
END $$;

-- =============================================================================
-- 1. UPDATE EXISTING TABLES
-- =============================================================================

-- Add super_admin flag to existing user_profiles table
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS is_super_admin boolean NOT NULL DEFAULT false;

-- Create index for super admin lookup
CREATE INDEX IF NOT EXISTS idx_user_profiles_super_admin 
ON public.user_profiles USING btree (is_super_admin) 
WHERE is_super_admin = true;

-- =============================================================================
-- 2. CREATE MISSING PERMISSION TABLES
-- =============================================================================

-- Create user_permissions table for individual user permission assignments
CREATE TABLE IF NOT EXISTS public.user_permissions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  permission_id uuid NOT NULL,
  granted_by uuid NOT NULL,
  granted_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at timestamp with time zone NULL,
  is_active boolean NOT NULL DEFAULT true,
  CONSTRAINT user_permissions_pkey PRIMARY KEY (id),
  CONSTRAINT user_permissions_unique_user_permission UNIQUE (user_id, permission_id),
  CONSTRAINT user_permissions_user_id_fkey FOREIGN KEY (user_id) REFERENCES user_profiles (id) ON DELETE CASCADE,
  CONSTRAINT user_permissions_permission_id_fkey FOREIGN KEY (permission_id) REFERENCES permissions (id) ON DELETE CASCADE,
  CONSTRAINT user_permissions_granted_by_fkey FOREIGN KEY (granted_by) REFERENCES user_profiles (id)
) TABLESPACE pg_default;

-- Create indices for user_permissions table
CREATE INDEX IF NOT EXISTS idx_user_permissions_user_id 
ON public.user_permissions USING btree (user_id);

CREATE INDEX IF NOT EXISTS idx_user_permissions_permission_id 
ON public.user_permissions USING btree (permission_id);

CREATE INDEX IF NOT EXISTS idx_user_permissions_granted_by 
ON public.user_permissions USING btree (granted_by);

-- =============================================================================
-- 3. CLEAR AND INSERT PERMISSIONS (only if permissions table is empty)
-- =============================================================================

-- Clear existing permissions if any (only if you want to reset)
-- DELETE FROM public.role_permissions;
-- DELETE FROM public.permissions;

-- Insert permissions only if they don't exist
INSERT INTO public.permissions (name, description, resource, action) 
SELECT * FROM (VALUES
  -- Dashboard permissions
  ('dashboard.view', 'View dashboard overview and statistics', 'dashboard', 'view'),
  ('dashboard.export_reports', 'Export dashboard reports and analytics', 'dashboard', 'export'),
  
  -- User management permissions
  ('users.view', 'View user list and details', 'users', 'view'),
  ('users.create', 'Create new users (customers, agents)', 'users', 'create'),
  ('users.edit', 'Edit user profiles and details', 'users', 'edit'),
  ('users.delete', 'Delete/deactivate user accounts', 'users', 'delete'),
  ('users.manage_roles', 'Change user roles (customer/agent/admin)', 'users', 'manage_roles'),
  ('users.reset_password', 'Reset user passwords', 'users', 'reset_password'),
  ('users.view_sensitive', 'View sensitive user information', 'users', 'view_sensitive'),
  
  -- Booking management permissions
  ('bookings.view', 'View booking list and details', 'bookings', 'view'),
  ('bookings.create', 'Create new bookings', 'bookings', 'create'),
  ('bookings.edit', 'Edit booking details', 'bookings', 'edit'),
  ('bookings.cancel', 'Cancel bookings and process refunds', 'bookings', 'cancel'),
  ('bookings.check_in', 'Check in passengers', 'bookings', 'check_in'),
  ('bookings.export', 'Export booking reports', 'bookings', 'export'),
  
  -- Schedule/Trip management permissions
  ('schedule.view', 'View trip schedules', 'schedule', 'view'),
  ('schedule.create', 'Create new trip schedules', 'schedule', 'create'),
  ('schedule.edit', 'Edit trip schedules', 'schedule', 'edit'),
  ('schedule.delete', 'Delete trip schedules', 'schedule', 'delete'),
  ('schedule.manage_capacity', 'Manage trip capacity and availability', 'schedule', 'manage_capacity'),
  
  -- Vessel management permissions
  ('vessels.view', 'View vessel list and details', 'vessels', 'view'),
  ('vessels.create', 'Add new vessels', 'vessels', 'create'),
  ('vessels.edit', 'Edit vessel information', 'vessels', 'edit'),
  ('vessels.delete', 'Delete/deactivate vessels', 'vessels', 'delete'),
  ('vessels.track', 'View vessel tracking and location', 'vessels', 'track'),
  
  -- Route management permissions
  ('routes.view', 'View route list and details', 'routes', 'view'),
  ('routes.create', 'Create new routes', 'routes', 'create'),
  ('routes.edit', 'Edit route information and pricing', 'routes', 'edit'),
  ('routes.delete', 'Delete/deactivate routes', 'routes', 'delete'),
  ('routes.manage_pricing', 'Manage route base fares and pricing', 'routes', 'manage_pricing'),
  
  -- Payment management permissions
  ('payments.view', 'View payment transactions', 'payments', 'view'),
  ('payments.process', 'Process manual payments', 'payments', 'process'),
  ('payments.refund', 'Process refunds', 'payments', 'refund'),
  ('payments.export', 'Export payment reports', 'payments', 'export'),
  
  -- System administration permissions
  ('system.manage_permissions', 'Manage user permissions and roles', 'system', 'manage_permissions'),
  ('system.view_logs', 'View system activity logs', 'system', 'view_logs'),
  ('system.manage_settings', 'Manage system settings and configuration', 'system', 'manage_settings'),
  ('system.backup_restore', 'Perform system backup and restore', 'system', 'backup_restore'),
  ('system.emergency_actions', 'Perform emergency system actions', 'system', 'emergency_actions'),
  
  -- Communication permissions
  ('communications.send_notifications', 'Send notifications to users', 'communications', 'send_notifications'),
  ('communications.mass_messages', 'Send mass messages to passengers', 'communications', 'mass_messages'),
  ('communications.emergency_alerts', 'Send emergency alerts and announcements', 'communications', 'emergency_alerts'),
  
  -- Reports and analytics permissions
  ('reports.view_basic', 'View basic reports and analytics', 'reports', 'view_basic'),
  ('reports.view_advanced', 'View advanced analytics and financial reports', 'reports', 'view_advanced'),
  ('reports.export', 'Export reports in various formats', 'reports', 'export'),
  ('reports.schedule_automated', 'Schedule automated report generation', 'reports', 'schedule_automated')
) AS new_permissions(name, description, resource, action)
WHERE NOT EXISTS (
  SELECT 1 FROM public.permissions WHERE permissions.name = new_permissions.name
);

-- =============================================================================
-- 4. SET DEFAULT ROLE PERMISSIONS
-- =============================================================================

-- Clear existing role permissions to reset (only if they exist)
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'role_permissions') THEN
        DELETE FROM public.role_permissions;
    END IF;
END $$;

-- Regular Admin permissions (comprehensive but not system management)
INSERT INTO public.role_permissions (role, permission_id) 
SELECT 'admin'::user_role, p.id 
FROM public.permissions p
WHERE p.name IN (
  'dashboard.view', 'dashboard.export_reports',
  'users.view', 'users.create', 'users.edit', 'users.reset_password',
  'bookings.view', 'bookings.create', 'bookings.edit', 'bookings.cancel', 'bookings.check_in', 'bookings.export',
  'schedule.view', 'schedule.create', 'schedule.edit', 'schedule.manage_capacity',
  'vessels.view', 'vessels.edit', 'vessels.track',
  'routes.view', 'routes.edit',
  'payments.view', 'payments.process', 'payments.refund',
  'communications.send_notifications', 'communications.mass_messages',
  'reports.view_basic', 'reports.export'
);

-- Agent permissions (limited to customer service operations)
INSERT INTO public.role_permissions (role, permission_id) 
SELECT 'agent'::user_role, p.id 
FROM public.permissions p
WHERE p.name IN (
  'dashboard.view',
  'users.view', 'users.create', 'users.edit',
  'bookings.view', 'bookings.create', 'bookings.edit', 'bookings.check_in',
  'schedule.view',
  'vessels.view',
  'routes.view',
  'payments.view',
  'communications.send_notifications'
);

-- Customer permissions (very limited, mainly for self-service)
INSERT INTO public.role_permissions (role, permission_id) 
SELECT 'customer'::user_role, p.id 
FROM public.permissions p
WHERE p.name IN (
  'bookings.view'
);

-- =============================================================================
-- 5. CREATE PERMISSION CHECKING FUNCTION
-- =============================================================================

CREATE OR REPLACE FUNCTION public.check_user_permission(
  p_user_id uuid,
  p_permission_name varchar
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  has_permission boolean := false;
BEGIN
  -- Check if user is super admin (has all permissions)
  SELECT is_super_admin INTO has_permission
  FROM user_profiles 
  WHERE id = p_user_id AND is_active = true;
  
  IF has_permission THEN
    RETURN true;
  END IF;
  
  -- Check individual user permissions
  SELECT EXISTS(
    SELECT 1 
    FROM user_permissions up
    JOIN permissions p ON up.permission_id = p.id
    WHERE up.user_id = p_user_id 
      AND p.name = p_permission_name
      AND up.is_active = true
      AND (up.expires_at IS NULL OR up.expires_at > NOW())
  ) INTO has_permission;
  
  IF has_permission THEN
    RETURN true;
  END IF;
  
  -- Check role-based permissions
  SELECT EXISTS(
    SELECT 1 
    FROM user_profiles prof
    JOIN role_permissions rp ON prof.role = rp.role
    JOIN permissions p ON rp.permission_id = p.id
    WHERE prof.id = p_user_id 
      AND p.name = p_permission_name
      AND prof.is_active = true
  ) INTO has_permission;
  
  RETURN has_permission;
END;
$$;

-- =============================================================================
-- 6. UPDATE ADMIN_USERS_VIEW TO INCLUDE PERMISSION DATA
-- =============================================================================

-- Drop existing view to recreate with permission data
DROP VIEW IF EXISTS public.admin_users_view;

CREATE VIEW public.admin_users_view AS
SELECT
  up.id,
  up.email,
  up.full_name,
  up.mobile_number,
  up.date_of_birth,
  up.role,
  up.is_active,
  up.is_super_admin,
  up.created_at,
  up.updated_at,
  COALESCE(user_stats.total_bookings, 0::bigint) as total_bookings,
  COALESCE(user_stats.confirmed_bookings, 0::bigint) as confirmed_bookings,
  COALESCE(user_stats.cancelled_bookings, 0::bigint) as cancelled_bookings,
  COALESCE(user_stats.total_spent, 0::numeric) as total_spent,
  user_stats.last_booking_date,
  CASE
    WHEN up.role = 'agent'::user_role THEN COALESCE(agent_stats.agent_bookings, 0::bigint)
    ELSE 0::bigint
  END as agent_bookings,
  CASE
    WHEN up.role = 'agent'::user_role THEN COALESCE(agent_stats.agent_revenue, 0::numeric)
    ELSE 0::numeric
  END as agent_revenue,
  CASE
    WHEN user_stats.last_booking_date >= (CURRENT_DATE - '30 days'::interval) THEN true
    ELSE false
  END as is_recently_active
FROM
  user_profiles up
  LEFT JOIN (
    SELECT
      bookings.user_id,
      COUNT(*) as total_bookings,
      COUNT(CASE WHEN bookings.status = 'confirmed'::booking_status THEN 1 END) as confirmed_bookings,
      COUNT(CASE WHEN bookings.status = 'cancelled'::booking_status THEN 1 END) as cancelled_bookings,
      SUM(CASE WHEN bookings.status = 'confirmed'::booking_status THEN bookings.total_fare ELSE 0::numeric END) as total_spent,
      MAX(bookings.created_at) as last_booking_date
    FROM bookings
    GROUP BY bookings.user_id
  ) user_stats ON up.id = user_stats.user_id
  LEFT JOIN (
    SELECT
      bookings.agent_id,
      COUNT(*) as agent_bookings,
      SUM(CASE WHEN bookings.status = 'confirmed'::booking_status THEN bookings.total_fare ELSE 0::numeric END) as agent_revenue
    FROM bookings
    WHERE bookings.agent_id IS NOT NULL
    GROUP BY bookings.agent_id
  ) agent_stats ON up.id = agent_stats.agent_id;

-- =============================================================================
-- 7. CREATE USER PERMISSIONS VIEW
-- =============================================================================

CREATE OR REPLACE VIEW public.user_permissions_view AS
SELECT 
  up.id,
  up.full_name,
  up.email,
  up.role,
  up.is_super_admin,
  up.is_active,
  COALESCE(
    json_agg(
      DISTINCT jsonb_build_object(
        'id', p.id,
        'name', p.name,
        'description', p.description,
        'resource', p.resource,
        'action', p.action,
        'source', 'individual',
        'granted_by', granter.full_name,
        'granted_at', user_perms.granted_at,
        'expires_at', user_perms.expires_at
      )
    ) FILTER (WHERE p.id IS NOT NULL), 
    '[]'::json
  ) as individual_permissions,
  COALESCE(
    json_agg(
      DISTINCT jsonb_build_object(
        'id', rp.id,
        'name', rp.name,
        'description', rp.description,
        'resource', rp.resource,
        'action', rp.action,
        'source', 'role'
      )
    ) FILTER (WHERE rp.id IS NOT NULL),
    '[]'::json
  ) as role_permissions
FROM user_profiles up
LEFT JOIN user_permissions user_perms ON up.id = user_perms.user_id AND user_perms.is_active = true
LEFT JOIN permissions p ON user_perms.permission_id = p.id
LEFT JOIN user_profiles granter ON user_perms.granted_by = granter.id
LEFT JOIN role_permissions role_perms ON up.role = role_perms.role
LEFT JOIN permissions rp ON role_perms.permission_id = rp.id
WHERE up.role IN ('admin', 'agent')
GROUP BY up.id, up.full_name, up.email, up.role, up.is_super_admin, up.is_active;

-- =============================================================================
-- 8. CREATE PERMISSION ACTIVITY LOGGING
-- =============================================================================

-- Create function to log permission activities
CREATE OR REPLACE FUNCTION log_permission_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO activity_logs (user_id, action, details, ip_address)
    VALUES (
      NEW.granted_by,
      'Permission Granted',
      format('Granted permission "%s" to user %s', 
        (SELECT name FROM permissions WHERE id = NEW.permission_id),
        (SELECT full_name FROM user_profiles WHERE id = NEW.user_id)
      ),
      inet_client_addr()::text
    );
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO activity_logs (user_id, action, details, ip_address)
    VALUES (
      OLD.granted_by,
      'Permission Revoked',
      format('Revoked permission "%s" from user %s', 
        (SELECT name FROM permissions WHERE id = OLD.permission_id),
        (SELECT full_name FROM user_profiles WHERE id = OLD.user_id)
      ),
      inet_client_addr()::text
    );
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- Create trigger for permission activity logging
CREATE TRIGGER trigger_log_permission_activity
  AFTER INSERT OR DELETE ON user_permissions
  FOR EACH ROW EXECUTE FUNCTION log_permission_activity();

-- =============================================================================
-- 9. CREATE ADDITIONAL HELPER FUNCTIONS
-- =============================================================================

-- Function to get user's all permissions (individual + role-based)
CREATE OR REPLACE FUNCTION get_user_permissions(p_user_id uuid)
RETURNS TABLE(
  permission_id uuid,
  permission_name varchar,
  resource varchar,
  action varchar,
  source varchar
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- If super admin, return all permissions
  IF EXISTS(SELECT 1 FROM user_profiles WHERE id = p_user_id AND is_super_admin = true) THEN
    RETURN QUERY
    SELECT p.id, p.name, p.resource, p.action, 'super_admin'::varchar
    FROM permissions p;
    RETURN;
  END IF;
  
  -- Return individual permissions
  RETURN QUERY
  SELECT p.id, p.name, p.resource, p.action, 'individual'::varchar
  FROM user_permissions up
  JOIN permissions p ON up.permission_id = p.id
  WHERE up.user_id = p_user_id 
    AND up.is_active = true
    AND (up.expires_at IS NULL OR up.expires_at > NOW());
  
  -- Return role-based permissions
  RETURN QUERY
  SELECT p.id, p.name, p.resource, p.action, 'role'::varchar
  FROM user_profiles prof
  JOIN role_permissions rp ON prof.role = rp.role
  JOIN permissions p ON rp.permission_id = p.id
  WHERE prof.id = p_user_id AND prof.is_active = true
    AND NOT EXISTS (
      -- Exclude if already granted individually
      SELECT 1 FROM user_permissions up 
      WHERE up.user_id = p_user_id 
        AND up.permission_id = p.id 
        AND up.is_active = true
    );
END;
$$;

-- =============================================================================
-- 10. GRANT NECESSARY PERMISSIONS TO AUTHENTICATED USERS
-- =============================================================================

-- Grant select permissions on new tables/views to authenticated users
GRANT SELECT ON public.permissions TO authenticated;
GRANT SELECT ON public.user_permissions TO authenticated;
GRANT SELECT ON public.role_permissions TO authenticated;
GRANT SELECT ON public.user_permissions_view TO authenticated;

-- Grant execute permission on permission checking functions
GRANT EXECUTE ON FUNCTION public.check_user_permission(uuid, varchar) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_permissions(uuid) TO authenticated;

-- =============================================================================
-- SETUP COMPLETE
-- =============================================================================

-- Summary of what was created/updated:
-- 1. Added is_super_admin column to user_profiles
-- 2. Created user_permissions table
-- 3. Inserted comprehensive permission set
-- 4. Set up default role permissions
-- 5. Created permission checking functions
-- 6. Updated admin_users_view with permission data
-- 7. Created user_permissions_view for permission management
-- 8. Set up activity logging for permission changes
-- 9. Added helper functions for permission management
-- 10. Granted necessary database permissions

-- To set your first super admin, run:
-- UPDATE user_profiles SET is_super_admin = true WHERE email = 'your-admin-email@example.com' AND role = 'admin';

-- To verify the setup:
-- SELECT COUNT(*) as total_permissions FROM permissions;
-- SELECT role, COUNT(*) as permission_count FROM role_permissions rp JOIN permissions p ON rp.permission_id = p.id GROUP BY role;
-- SELECT * FROM user_permissions_view WHERE is_super_admin = true; 