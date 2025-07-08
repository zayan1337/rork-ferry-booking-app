# Admin Permission System Setup Guide

This guide explains how to implement and use the role-based permission system for your ferry booking admin dashboard.

## Overview

The permission system provides:
- **Super Admin**: Full access to all features and permission management
- **Regular Admin**: Configurable access to specific features 
- **Agent**: Limited access based on assigned permissions
- **Granular Permissions**: Fine-grained control over features (view, create, edit, delete)

## Database Setup

### 1. Run the SQL Script

Execute the updated SQL script in Supabase SQL Editor:

```sql
-- Copy and paste the entire content from utils/admin/permissionSystemUpdate.sql
-- This script works with your existing database schema
-- It preserves all existing data and functionality
```

**Important**: This updated script is designed to work with your existing ferry booking database and includes all the tables you already have (bookings, user_profiles, etc.).

### 2. Set Your First Super Admin

After running the SQL script, manually set a super admin:

```sql
-- Replace 'your-admin-email@example.com' with your actual email
UPDATE user_profiles 
SET is_super_admin = true 
WHERE email = 'your-admin-email@example.com' AND role = 'admin';
```

### 3. Verify Setup

Check that permissions were created:

```sql
-- Should return ~30 permissions
SELECT COUNT(*) FROM permissions;

-- Check role permissions
SELECT r.role, COUNT(*) as permission_count 
FROM role_permissions rp
JOIN permissions p ON rp.permission_id = p.id
GROUP BY r.role;
```

## Using the Permission System

### 1. Permission Checking in Components

```typescript
import { useRoleAccess } from '@/hooks';
import { PERMISSIONS } from '@/types/permissions';

const MyComponent = () => {
  const { 
    canManageUsers, 
    canManageBookings, 
    checkPermission,
    isSuperAdmin 
  } = useRoleAccess();

  // Check specific permission
  const canDeleteUsers = checkPermission(PERMISSIONS.USERS_DELETE);
  
  // Check multiple permissions
  const canManageSystem = canManageUsers() && canManageBookings();

  return (
    <View>
      {canManageUsers() && (
        <Button title="Manage Users" />
      )}
      
      {canDeleteUsers && (
        <Button title="Delete User" variant="danger" />
      )}
      
      {isSuperAdmin && (
        <Button title="Super Admin Only" />
      )}
    </View>
  );
};
```

### 2. Permission Management (Super Admin Only)

```typescript
import { usePermissionManagement } from '@/hooks';

const PermissionManager = () => {
  const {
    grantPermissions,
    revokePermissions,
    toggleSuperAdmin,
    loading,
    error
  } = usePermissionManagement();

  const handleGrantPermissions = async (userId: string, permissionIds: string[]) => {
    try {
      await grantPermissions(userId, permissionIds);
      alert('Permissions granted successfully');
    } catch (error) {
      alert('Failed to grant permissions');
    }
  };

  // Component implementation...
};
```

### 3. Protecting Routes

```typescript
// In your route component
import { useRoleAccess } from '@/hooks';
import { PERMISSIONS } from '@/types/permissions';

export default function AdminUsersScreen() {
  const { checkPermission } = useRoleAccess();
  
  // Redirect if no permission
  useEffect(() => {
    if (!checkPermission(PERMISSIONS.USERS_VIEW)) {
      router.push('/unauthorized');
    }
  }, []);

  // Rest of component...
}
```

## Permission Categories

### Dashboard Permissions
- `dashboard.view` - View dashboard
- `dashboard.export_reports` - Export reports

### User Management
- `users.view` - View user list
- `users.create` - Create new users
- `users.edit` - Edit user profiles
- `users.delete` - Delete/deactivate users
- `users.manage_roles` - Change user roles
- `users.reset_password` - Reset passwords
- `users.view_sensitive` - View sensitive info

### Booking Management
- `bookings.view` - View bookings
- `bookings.create` - Create bookings
- `bookings.edit` - Edit bookings
- `bookings.cancel` - Cancel bookings
- `bookings.check_in` - Check in passengers
- `bookings.export` - Export booking data

### System Administration
- `system.manage_permissions` - Manage permissions (Super Admin only)
- `system.view_logs` - View activity logs
- `system.manage_settings` - System settings
- `system.emergency_actions` - Emergency functions

## Default Role Permissions

### Super Admin
- Has ALL permissions automatically
- Can manage other admin permissions
- Cannot be revoked (except by another super admin)

### Regular Admin
- Dashboard access
- User management (limited)
- Booking management
- Schedule management
- Vessel and route viewing
- Basic reports

### Agent
- Dashboard viewing
- Limited user creation/editing
- Booking management
- Schedule viewing
- Basic customer communications

### Customer
- View own bookings only

## Common Use Cases

### 1. Create a Booking Manager Admin

Grant permissions for comprehensive booking management:

```sql
-- Get user and permission IDs first
SELECT id FROM user_profiles WHERE email = 'booking-manager@example.com';
SELECT id FROM permissions WHERE name IN (
  'bookings.view', 'bookings.create', 'bookings.edit', 'bookings.cancel',
  'schedule.view', 'vessels.view', 'routes.view', 'payments.view'
);

-- Grant permissions (replace IDs)
INSERT INTO user_permissions (user_id, permission_id, granted_by)
VALUES 
  ('user-id', 'permission-id-1', 'super-admin-id'),
  ('user-id', 'permission-id-2', 'super-admin-id');
```

### 2. Create a Reports-Only Admin

Grant read-only access to reports and analytics:

```sql
SELECT id FROM permissions WHERE name IN (
  'dashboard.view', 'reports.view_basic', 'reports.view_advanced', 'reports.export'
);
```

### 3. Temporary Permission Grant

Grant permissions with expiration:

```sql
INSERT INTO user_permissions (user_id, permission_id, granted_by, expires_at)
VALUES ('user-id', 'permission-id', 'super-admin-id', '2024-12-31 23:59:59');
```

## Permission Management UI

The system includes a built-in permission management interface:

1. **Access**: Navigate to `/admin/permissions` (Super Admin only)
2. **Features**:
   - View all admin users
   - Toggle super admin status
   - Grant/revoke individual permissions
   - Grouped permission management
   - Real-time permission preview

## Security Considerations

### 1. Super Admin Protection
- Only super admins can manage permissions
- Prevent accidental super admin removal
- Log all permission changes

### 2. Permission Validation
- Server-side permission checking
- Database-level permission functions
- Activity logging for auditing

### 3. Role Hierarchy
- Super Admin > Admin > Agent > Customer
- Higher roles can manage lower roles
- Prevent privilege escalation

## Troubleshooting

### Common Issues

1. **Permission not working**
   - Check database permissions table
   - Verify user_permissions_view data
   - Clear app cache and restart

2. **Super admin access lost**
   ```sql
   -- Emergency super admin restoration
   UPDATE user_profiles 
   SET is_super_admin = true 
   WHERE email = 'your-backup-admin@example.com';
   ```

3. **Permissions not loading**
   - Check Supabase connection
   - Verify table RLS policies
   - Check browser network tab for errors

### Debug Queries

```sql
-- Check user's effective permissions
SELECT * FROM user_permissions_view WHERE email = 'user@example.com';

-- Check permission grants
SELECT up.*, p.name, granter.full_name as granted_by_name
FROM user_permissions up
JOIN permissions p ON up.permission_id = p.id
JOIN user_profiles granter ON up.granted_by = granter.id
WHERE up.user_id = 'user-id';

-- Check activity logs
SELECT * FROM activity_logs 
WHERE action LIKE '%Permission%' 
ORDER BY created_at DESC;
```

## Migration from Basic Roles

If you're upgrading from a basic role system:

1. Run the permission system SQL
2. Map existing admin users to appropriate permissions
3. Update your components to use permission checks
4. Test thoroughly before deploying

## API Integration

The permission system integrates with your existing Supabase setup:

- Uses existing `user_profiles` table
- Extends with permission tables
- Maintains existing auth flow
- Adds permission checking functions

This permission system provides enterprise-level access control while maintaining simplicity for your ferry booking admin dashboard. 