-- =====================================================
-- PERMISSION MANAGEMENT SYSTEM (Database-Backed)
-- Fixed to work with existing user_role enum (customer, agent)
-- Uses is_super_admin boolean for admin identification
-- =====================================================

-- =====================================================
-- 1. PERMISSION TABLES
-- =====================================================

-- Permission Categories (similar to zones management)
CREATE TABLE IF NOT EXISTS public.permission_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    order_index INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Permissions (following existing table patterns)
CREATE TABLE IF NOT EXISTS public.permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL UNIQUE,
    description TEXT NOT NULL,
    resource VARCHAR(50) NOT NULL,
    action VARCHAR(50) NOT NULL,
    level VARCHAR(20) NOT NULL CHECK (level IN ('read', 'write', 'delete', 'admin')),
    category_id UUID NOT NULL REFERENCES permission_categories(id) ON DELETE CASCADE,
    dependencies UUID[] DEFAULT '{}',
    is_critical BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_permission_resource_action UNIQUE (resource, action, level)
);

-- Role Templates (predefined permission sets)
CREATE TABLE IF NOT EXISTS public.role_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    is_system_role BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Role Template Permissions (many-to-many)
CREATE TABLE IF NOT EXISTS public.role_template_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_template_id UUID NOT NULL REFERENCES role_templates(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_role_template_permission UNIQUE (role_template_id, permission_id)
);

-- User Permissions (links users to permissions)
CREATE TABLE IF NOT EXISTS public.user_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    granted_by UUID NOT NULL REFERENCES user_profiles(id),
    granted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    notes TEXT,
    CONSTRAINT unique_user_permission UNIQUE (user_id, permission_id)
);

-- Permission Audit Log (following existing audit patterns)
CREATE TABLE IF NOT EXISTS public.permission_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES user_profiles(id),
    action VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    old_values JSONB,
    new_values JSONB,
    performed_by UUID NOT NULL REFERENCES user_profiles(id),
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- 2. INDEXES
-- =====================================================

-- Permission Categories
CREATE INDEX IF NOT EXISTS idx_permission_categories_active ON permission_categories(is_active, order_index);
CREATE INDEX IF NOT EXISTS idx_permission_categories_order ON permission_categories(order_index);

-- Permissions
CREATE INDEX IF NOT EXISTS idx_permissions_category ON permissions(category_id, is_active);
CREATE INDEX IF NOT EXISTS idx_permissions_resource_action ON permissions(resource, action);
CREATE INDEX IF NOT EXISTS idx_permissions_level ON permissions(level);
CREATE INDEX IF NOT EXISTS idx_permissions_active ON permissions(is_active);

-- Role Templates
CREATE INDEX IF NOT EXISTS idx_role_templates_active ON role_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_role_templates_system ON role_templates(is_system_role, is_active);

-- Role Template Permissions
CREATE INDEX IF NOT EXISTS idx_role_template_permissions_template ON role_template_permissions(role_template_id);
CREATE INDEX IF NOT EXISTS idx_role_template_permissions_permission ON role_template_permissions(permission_id);

-- User Permissions
CREATE INDEX IF NOT EXISTS idx_user_permissions_user ON user_permissions(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_user_permissions_permission ON user_permissions(permission_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_expires ON user_permissions(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_permissions_active ON user_permissions(is_active, expires_at);

-- Permission Audit Logs
CREATE INDEX IF NOT EXISTS idx_permission_audit_user ON permission_audit_logs(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_permission_audit_entity ON permission_audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_permission_audit_performed_by ON permission_audit_logs(performed_by, created_at);

-- =====================================================
-- 3. TRIGGERS
-- =====================================================

-- Update timestamp function (reuse existing if available)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Timestamp triggers
CREATE TRIGGER update_permission_categories_updated_at 
    BEFORE UPDATE ON permission_categories 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_permissions_updated_at 
    BEFORE UPDATE ON permissions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_role_templates_updated_at 
    BEFORE UPDATE ON role_templates 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Audit trigger for permission changes
CREATE OR REPLACE FUNCTION log_permission_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO permission_audit_logs (
            user_id, action, entity_type, entity_id, 
            new_values, performed_by, ip_address
        ) VALUES (
            NEW.user_id, 'GRANT', 'user_permission', NEW.id,
            to_jsonb(NEW), NEW.granted_by, inet_client_addr()::text
        );
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO permission_audit_logs (
            user_id, action, entity_type, entity_id,
            old_values, new_values, performed_by, ip_address
        ) VALUES (
            NEW.user_id, 'UPDATE', 'user_permission', NEW.id,
            to_jsonb(OLD), to_jsonb(NEW), NEW.granted_by, inet_client_addr()::text
        );
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO permission_audit_logs (
            user_id, action, entity_type, entity_id,
            old_values, performed_by, ip_address
        ) VALUES (
            OLD.user_id, 'REVOKE', 'user_permission', OLD.id,
            to_jsonb(OLD), OLD.granted_by, inet_client_addr()::text
        );
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ language 'plpgsql';

CREATE TRIGGER permission_changes_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON user_permissions
    FOR EACH ROW EXECUTE FUNCTION log_permission_changes();

-- =====================================================
-- 4. VIEWS
-- =====================================================

-- Permission Categories with Stats
CREATE VIEW public.permission_categories_with_stats AS
SELECT 
    pc.id,
    pc.name,
    pc.description,
    pc.order_index,
    pc.is_active,
    pc.created_at,
    pc.updated_at,
    COUNT(p.id) as total_permissions,
    COUNT(p.id) FILTER (WHERE p.is_active = true) as active_permissions
FROM permission_categories pc
LEFT JOIN permissions p ON pc.id = p.category_id
GROUP BY pc.id, pc.name, pc.description, pc.order_index, pc.is_active, pc.created_at, pc.updated_at
ORDER BY pc.order_index, pc.name;

-- Permissions with Category Info
CREATE VIEW public.permissions_with_category AS
SELECT 
    p.id,
    p.name,
    p.description,
    p.resource,
    p.action,
    p.level,
    p.dependencies,
    p.is_critical,
    p.is_active,
    p.created_at,
    p.updated_at,
    pc.id as category_id,
    pc.name as category_name
FROM permissions p
JOIN permission_categories pc ON p.category_id = pc.id
WHERE p.is_active = true
ORDER BY pc.order_index, p.name;

-- Role Templates with Permission Count
CREATE VIEW public.role_templates_with_stats AS
SELECT 
    rt.id,
    rt.name,
    rt.description,
    rt.is_system_role,
    rt.is_active,
    rt.created_at,
    rt.updated_at,
    COUNT(rtp.permission_id) as permission_count,
    ARRAY_AGG(rtp.permission_id) FILTER (WHERE rtp.permission_id IS NOT NULL) as permission_ids
FROM role_templates rt
LEFT JOIN role_template_permissions rtp ON rt.id = rtp.role_template_id
WHERE rt.is_active = true
GROUP BY rt.id, rt.name, rt.description, rt.is_system_role, rt.is_active, rt.created_at, rt.updated_at
ORDER BY rt.is_system_role DESC, rt.name;

-- =====================================================
-- PERMISSION SYSTEM FIX: Add Admin Role and Filter Users
-- =====================================================

-- 1. Add 'admin' role to the user_role enum
-- First, we need to add the 'admin' value to the existing enum
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'admin';

-- 2. Drop and recreate the user_permissions_summary view to only show admin users
DROP VIEW IF EXISTS public.user_permissions_summary;

CREATE VIEW public.user_permissions_summary AS
SELECT 
    up.id,
    up.full_name,
    up.email,
    up.role,
    up.is_super_admin,
    up.is_active,
    up.created_at,
    ARRAY_AGG(DISTINCT uper.permission_id) FILTER (WHERE uper.permission_id IS NOT NULL AND uper.is_active = true AND (uper.expires_at IS NULL OR uper.expires_at > CURRENT_TIMESTAMP)) as direct_permissions,
    COUNT(DISTINCT p.id) FILTER (WHERE uper.is_active = true AND (uper.expires_at IS NULL OR uper.expires_at > CURRENT_TIMESTAMP)) as active_permission_count
FROM user_profiles up
LEFT JOIN user_permissions uper ON up.id = uper.user_id
LEFT JOIN permissions p ON uper.permission_id = p.id
WHERE 
    -- Only include users who are either:
    -- 1. Super admins (is_super_admin = true)
    -- 2. Regular admins (role = 'admin')
    -- 3. Users with active permissions (for backward compatibility)
    up.is_super_admin = true 
    OR up.role = 'admin'
    OR up.id IN (
        SELECT DISTINCT user_id 
        FROM user_permissions 
        WHERE is_active = true
    )
GROUP BY up.id, up.full_name, up.email, up.role, up.is_super_admin, up.is_active, up.created_at
ORDER BY up.full_name;

-- 3. Create a more restrictive view for admin-only users (optional)
CREATE OR REPLACE VIEW public.admin_users_only AS
SELECT 
    up.id,
    up.full_name,
    up.email,
    up.role,
    up.is_super_admin,
    up.is_active,
    up.created_at,
    ARRAY_AGG(DISTINCT uper.permission_id) FILTER (WHERE uper.permission_id IS NOT NULL AND uper.is_active = true AND (uper.expires_at IS NULL OR uper.expires_at > CURRENT_TIMESTAMP)) as direct_permissions,
    COUNT(DISTINCT p.id) FILTER (WHERE uper.is_active = true AND (uper.expires_at IS NULL OR uper.expires_at > CURRENT_TIMESTAMP)) as active_permission_count
FROM user_profiles up
LEFT JOIN user_permissions uper ON up.id = uper.user_id
LEFT JOIN permissions p ON uper.permission_id = p.id
WHERE 
    -- Only include admin users (super admins and regular admins)
    up.is_super_admin = true OR up.role = 'admin'
GROUP BY up.id, up.full_name, up.email, up.role, up.is_super_admin, up.is_active, up.created_at
ORDER BY up.full_name;

-- 4. Update existing users to have admin role if they are super admins (optional)
-- This ensures super admins also have the 'admin' role for consistency
UPDATE user_profiles 
SET role = 'admin' 
WHERE is_super_admin = true AND role != 'admin';

-- 5. Create a function to promote a user to admin
CREATE OR REPLACE FUNCTION promote_user_to_admin(user_id_param UUID)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE user_profiles 
    SET role = 'admin', updated_at = CURRENT_TIMESTAMP
    WHERE id = user_id_param;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- 6. Create a function to demote an admin user
CREATE OR REPLACE FUNCTION demote_admin_user(user_id_param UUID, new_role user_role DEFAULT 'customer')
RETURNS BOOLEAN AS $$
BEGIN
    -- Don't allow demoting super admins
    IF EXISTS (SELECT 1 FROM user_profiles WHERE id = user_id_param AND is_super_admin = true) THEN
        RAISE EXCEPTION 'Cannot demote a super admin user';
    END IF;
    
    UPDATE user_profiles 
    SET role = new_role, updated_at = CURRENT_TIMESTAMP
    WHERE id = user_id_param AND role = 'admin';
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- 7. Add comments for clarity
COMMENT ON VIEW public.user_permissions_summary IS 'Shows all users with permissions (super admins, admins, and users with direct permissions)';
COMMENT ON VIEW public.admin_users_only IS 'Shows only admin users (super admins and regular admins)';
COMMENT ON FUNCTION promote_user_to_admin(UUID) IS 'Promotes a user to admin role';
COMMENT ON FUNCTION demote_admin_user(UUID, user_role) IS 'Demotes an admin user to specified role (cannot demote super admins)';

-- =====================================================
-- 5. FUNCTIONS
-- =====================================================

-- Function to check if user has permission
CREATE OR REPLACE FUNCTION user_has_permission(
    user_id_param UUID,
    resource_param VARCHAR,
    action_param VARCHAR
) RETURNS BOOLEAN AS $$
DECLARE
    has_permission BOOLEAN := false;
    user_is_super_admin BOOLEAN := false;
BEGIN
    -- Check if user is super admin (super admins have all permissions)
    SELECT is_super_admin INTO user_is_super_admin
    FROM user_profiles 
    WHERE id = user_id_param AND is_active = true;
    
    IF user_is_super_admin THEN
        RETURN true;
    END IF;
    
    -- Check direct permissions
    SELECT EXISTS(
        SELECT 1 
        FROM user_permissions up
        JOIN permissions p ON up.permission_id = p.id
        WHERE up.user_id = user_id_param
            AND p.resource = resource_param
            AND p.action = action_param
            AND up.is_active = true
            AND p.is_active = true
            AND (up.expires_at IS NULL OR up.expires_at > CURRENT_TIMESTAMP)
    ) INTO has_permission;
    
    RETURN has_permission;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to grant permission to user
CREATE OR REPLACE FUNCTION grant_user_permission(
    user_id_param UUID,
    permission_id_param UUID,
    granted_by_param UUID,
    expires_at_param TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    notes_param TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    user_permission_id UUID;
BEGIN
    -- Insert or update user permission
    INSERT INTO user_permissions (
        user_id, permission_id, granted_by, expires_at, notes, is_active
    ) VALUES (
        user_id_param, permission_id_param, granted_by_param, expires_at_param, notes_param, true
    )
    ON CONFLICT (user_id, permission_id) 
    DO UPDATE SET
        granted_by = granted_by_param,
        granted_at = CURRENT_TIMESTAMP,
        expires_at = expires_at_param,
        notes = notes_param,
        is_active = true
    RETURNING id INTO user_permission_id;
    
    RETURN user_permission_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to revoke permission from user
CREATE OR REPLACE FUNCTION revoke_user_permission(
    user_id_param UUID,
    permission_id_param UUID
) RETURNS BOOLEAN AS $$
BEGIN
    UPDATE user_permissions 
    SET is_active = false
    WHERE user_id = user_id_param 
        AND permission_id = permission_id_param;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to apply role template to user
CREATE OR REPLACE FUNCTION apply_role_template(
    user_id_param UUID,
    role_template_id_param UUID,
    granted_by_param UUID
) RETURNS INTEGER AS $$
DECLARE
    permission_record RECORD;
    granted_count INTEGER := 0;
BEGIN
    -- Grant all permissions from the role template
    FOR permission_record IN 
        SELECT rtp.permission_id
        FROM role_template_permissions rtp
        JOIN permissions p ON rtp.permission_id = p.id
        WHERE rtp.role_template_id = role_template_id_param
            AND p.is_active = true
    LOOP
        PERFORM grant_user_permission(
            user_id_param,
            permission_record.permission_id,
            granted_by_param
        );
        granted_count := granted_count + 1;
    END LOOP;
    
    RETURN granted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 6. ROW LEVEL SECURITY
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE permission_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_template_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE permission_audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies (using is_super_admin for admin checks)
CREATE POLICY "Users can view active permission categories" ON permission_categories
    FOR SELECT USING (is_active = true);

CREATE POLICY "Super admins can manage permission categories" ON permission_categories
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
                AND is_super_admin = true 
                AND is_active = true
        )
    );

CREATE POLICY "Users can view active permissions" ON permissions
    FOR SELECT USING (is_active = true);

CREATE POLICY "Super admins can manage permissions" ON permissions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
                AND is_super_admin = true 
                AND is_active = true
        )
    );

CREATE POLICY "Users can view active role templates" ON role_templates
    FOR SELECT USING (is_active = true);

CREATE POLICY "Super admins can manage role templates" ON role_templates
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
                AND is_super_admin = true 
                AND is_active = true
        )
    );

CREATE POLICY "Users can view role template permissions" ON role_template_permissions
    FOR SELECT USING (true);

CREATE POLICY "Super admins can manage role template permissions" ON role_template_permissions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
                AND is_super_admin = true 
                AND is_active = true
        )
    );

CREATE POLICY "Users can view their own permissions" ON user_permissions
    FOR SELECT USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
                AND is_super_admin = true 
                AND is_active = true
        )
    );

CREATE POLICY "Super admins can manage user permissions" ON user_permissions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
                AND is_super_admin = true 
                AND is_active = true
        )
    );

CREATE POLICY "Super admins can view permission audit logs" ON permission_audit_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
                AND is_super_admin = true 
                AND is_active = true
        )
    );

-- =====================================================
-- 7. INITIAL DATA SETUP
-- =====================================================

-- Insert initial permission categories
INSERT INTO permission_categories (name, description, order_index) VALUES
('Dashboard', 'Dashboard and overview permissions', 1),
('Bookings', 'Booking management permissions', 2),
('Operations', 'Operations and logistics permissions', 3),
('Content', 'Content and information management', 4),
('Users', 'User and agent management', 5),
('Finance', 'Financial and payment management', 6),
('Communications', 'Messaging and notifications', 7),
('Settings', 'System configuration and settings', 8)
ON CONFLICT (name) DO NOTHING;

-- Insert basic permissions
INSERT INTO permissions (name, description, resource, action, level, category_id) 
SELECT 
    resource || ':' || action,
    'Can ' || action || ' ' || resource,
    resource,
    action,
    CASE 
        WHEN action IN ('view', 'read') THEN 'read'
        WHEN action IN ('create', 'update', 'edit') THEN 'write'
        WHEN action = 'delete' THEN 'delete'
        WHEN action = 'manage' THEN 'admin'
        ELSE 'read'
    END,
    pc.id
FROM (
    VALUES 
    ('dashboard', 'view'), 
    ('bookings', 'view'), ('bookings', 'create'), ('bookings', 'update'), ('bookings', 'cancel'),
    ('routes', 'view'), ('routes', 'create'), ('routes', 'update'), ('routes', 'delete'),
    ('trips', 'view'), ('trips', 'create'), ('trips', 'update'), ('trips', 'delete'),
    ('vessels', 'view'), ('vessels', 'create'), ('vessels', 'update'), ('vessels', 'delete'),
    ('islands', 'view'), ('islands', 'create'), ('islands', 'update'), ('islands', 'delete'),
    ('zones', 'view'), ('zones', 'create'), ('zones', 'update'), ('zones', 'delete'),
    ('faq', 'view'), ('faq', 'create'), ('faq', 'update'), ('faq', 'delete'),
    ('content', 'view'), ('content', 'create'), ('content', 'update'), ('content', 'delete'),
    ('users', 'view'), ('users', 'create'), ('users', 'update'), ('users', 'delete'),
    ('permissions', 'view'), ('permissions', 'manage'),
    ('settings', 'view'), ('settings', 'manage')
) AS p(resource, action)
JOIN permission_categories pc ON (
    (p.resource = 'dashboard' AND pc.name = 'Dashboard') OR
    (p.resource IN ('bookings') AND pc.name = 'Bookings') OR
    (p.resource IN ('routes', 'trips', 'vessels') AND pc.name = 'Operations') OR
    (p.resource IN ('islands', 'zones', 'faq', 'content') AND pc.name = 'Content') OR
    (p.resource IN ('users') AND pc.name = 'Users') OR
    (p.resource IN ('permissions', 'settings') AND pc.name = 'Settings')
)
ON CONFLICT (resource, action, level) DO NOTHING;

-- Create default role templates
INSERT INTO role_templates (name, description, is_system_role) VALUES
('Super Administrator', 'Full system access with all permissions', true),
('Operations Manager', 'Manage operations, routes, trips, and vessels', true),
('Customer Service', 'Handle bookings and customer interactions', true),
('Content Manager', 'Manage content, FAQs, and information', true)
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================
DO $$
BEGIN
    RAISE NOTICE '=================================================';
    RAISE NOTICE 'PERMISSION SYSTEM SETUP COMPLETED SUCCESSFULLY!';
    RAISE NOTICE '=================================================';
    RAISE NOTICE 'Tables created: permission_categories, permissions, role_templates, role_template_permissions, user_permissions, permission_audit_logs';
    RAISE NOTICE 'Views created: permission_categories_with_stats, permissions_with_category, role_templates_with_stats, user_permissions_summary';
    RAISE NOTICE 'Functions created: user_has_permission, grant_user_permission, revoke_user_permission, apply_role_template';
    RAISE NOTICE 'RLS policies enabled for all tables using is_super_admin field';
    RAISE NOTICE 'Initial data inserted for categories, permissions, and role templates';
    RAISE NOTICE '';
    RAISE NOTICE 'IMPORTANT: This system uses the existing user_role enum (customer, agent)';
    RAISE NOTICE 'Admin users are identified by is_super_admin = true in user_profiles';
    RAISE NOTICE 'Regular users can have specific permissions granted via user_permissions table';
    RAISE NOTICE '';
    RAISE NOTICE 'System is ready for use!';
END $$; 