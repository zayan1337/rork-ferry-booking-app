# Ferry Booking Admin Permission System

## Overview

The ferry booking admin system now features a comprehensive role-based permission system that allows super administrators to control access to different features, pages, and actions within the admin interface.

## Permission Levels

### 1. Super Admin
- **Full System Access**: Has access to all features and permissions
- **Permission Management**: Can grant/revoke permissions for other users
- **User Role Management**: Can promote/demote users between roles
- **System Administration**: Full access to system settings and maintenance

### 2. Senior Admin
- **Advanced Management**: Can manage users, vessels, routes with create/delete permissions
- **Financial Operations**: Can process payments and refunds
- **System Monitoring**: Can view logs and manage system settings
- **Advanced Reporting**: Access to detailed analytics and reporting

### 3. Regular Admin
- **Standard Operations**: Can view and edit most system entities
- **Booking Management**: Full booking lifecycle management
- **Schedule Management**: Can create and manage ferry schedules
- **Basic Reporting**: Access to standard reports and analytics

### 4. Agent
- **Limited Access**: Focused on customer-facing operations
- **Booking Operations**: Can create and manage bookings
- **Customer Service**: Can assist customers with check-ins and basic inquiries
- **View-Only Access**: Can view schedules, routes, and vessels

## Permission Categories

### Dashboard
- `dashboard.view` - Access to main dashboard
- `dashboard.export_reports` - Export dashboard reports

### User Management
- `users.view` - View user profiles
- `users.create` - Create new users
- `users.edit` - Edit user information
- `users.delete` - Delete users
- `users.manage_roles` - Change user roles
- `users.reset_password` - Reset user passwords
- `users.view_sensitive` - View sensitive information

### Booking Management
- `bookings.view` - View bookings
- `bookings.create` - Create new bookings
- `bookings.edit` - Modify bookings
- `bookings.cancel` - Cancel bookings
- `bookings.check_in` - Process check-ins
- `bookings.export` - Export booking data

### Schedule Management
- `schedule.view` - View schedules
- `schedule.create` - Create schedules
- `schedule.edit` - Modify schedules
- `schedule.delete` - Delete schedules
- `schedule.manage_capacity` - Manage capacity

### Vessel Management
- `vessels.view` - View vessel information
- `vessels.create` - Add new vessels
- `vessels.edit` - Modify vessel details
- `vessels.delete` - Remove vessels
- `vessels.track` - Track vessel locations

### Route Management
- `routes.view` - View routes
- `routes.create` - Create new routes
- `routes.edit` - Modify routes
- `routes.delete` - Delete routes
- `routes.manage_pricing` - Set pricing

### Payment Management
- `payments.view` - View payment information
- `payments.process` - Process payments
- `payments.refund` - Issue refunds
- `payments.export` - Export financial data

### System Administration
- `system.manage_permissions` - Manage user permissions
- `system.view_logs` - View system logs
- `system.manage_settings` - System configuration
- `system.backup_restore` - Backup operations
- `system.emergency_actions` - Emergency procedures

### Communications
- `communications.send_notifications` - Send notifications
- `communications.mass_messages` - Mass messaging
- `communications.emergency_alerts` - Emergency alerts

### Reports & Analytics
- `reports.view_basic` - Basic reports
- `reports.view_advanced` - Advanced analytics
- `reports.export` - Export reports
- `reports.schedule_automated` - Automated reports

## How It Works

### Tab-Level Access Control
Each admin tab (Dashboard, Bookings, Schedule, Vessels, Routes, Users, Permissions) is now controlled by permissions:

```typescript
// Only users with the appropriate permission can see each tab
{canAccessDashboard() && (
  <Tabs.Screen name="index" ... />
)}
{canAccessBookingsTab() && (
  <Tabs.Screen name="bookings" ... />
)}
```

### Page-Level Access Control
Individual pages are protected with permission guards:

```typescript
<PermissionGuard 
  permissions={[PERMISSIONS.USERS_VIEW]} 
  showFallback={true}
  fallback={<AccessDeniedMessage />}
>
  <UserManagementContent />
</PermissionGuard>
```

### Action-Level Access Control
Individual buttons and actions are controlled by permissions:

```typescript
<PermissionButton
  title="Add New User"
  permissions={[PERMISSIONS.USERS_CREATE]}
  onPress={handleAddUser}
  variant="primary"
/>
```

## Using the Permission System

### For Super Administrators

1. **Access Permission Management**
   - Navigate to the Permissions tab (only visible to super admins)
   - View all admin users and their current permissions

2. **Grant Permissions**
   - Select a user to manage
   - Toggle individual permissions on/off
   - Use permission templates for quick setup
   - Save changes to apply immediately

3. **Role Templates**
   - Use predefined role templates for quick permission assignment
   - Regular Admin: Standard operational permissions
   - Senior Admin: Advanced management permissions
   - Agent: Limited customer-service permissions

### For Developers

1. **Adding New Permissions**
   ```typescript
   // Add to types/permissions.ts
   export const PERMISSIONS = {
     // ... existing permissions
     NEW_FEATURE_VIEW: 'new_feature.view',
     NEW_FEATURE_MANAGE: 'new_feature.manage',
   } as const;
   ```

2. **Protecting UI Elements**
   ```typescript
   import PermissionGuard from '@/components/admin/PermissionGuard';
   import { PERMISSIONS } from '@/types/permissions';
   
   <PermissionGuard permissions={[PERMISSIONS.NEW_FEATURE_VIEW]}>
     <NewFeatureComponent />
   </PermissionGuard>
   ```

3. **Permission-Controlled Buttons**
   ```typescript
   import PermissionButton from '@/components/admin/PermissionButton';
   
   <PermissionButton
     title="Manage Feature"
     permissions={[PERMISSIONS.NEW_FEATURE_MANAGE]}
     onPress={handleManageFeature}
   />
   ```

## Database Setup

The permission system requires the following database tables:

1. **permissions** - Stores all available permissions
2. **user_permissions** - Individual user permission assignments
3. **role_permissions** - Default permissions for each role
4. **user_permissions_view** - View combining user and role permissions

Make sure to run the SQL setup script to create these tables and populate initial permissions.

## Security Notes

- Super admin status is required for permission management
- Permissions are checked both on the frontend and should be validated on the backend
- Super admins bypass all permission checks
- Permission changes take effect immediately
- All permission changes are logged for audit purposes

## Best Practices

1. **Principle of Least Privilege**: Grant only the minimum permissions necessary
2. **Regular Review**: Periodically review user permissions
3. **Role Templates**: Use predefined role templates for consistency
4. **Documentation**: Document custom permission requirements
5. **Testing**: Test permission boundaries thoroughly

## Troubleshooting

### User Can't See Tabs
- Check if user has appropriate view permissions for that resource
- Verify super admin status for permission management tab

### User Can't Perform Actions
- Check if user has specific action permissions (create, edit, delete)
- Verify permission button implementation includes correct permissions

### Permission Changes Not Taking Effect
- Refresh the application
- Check for console errors in permission loading
- Verify database permission records

## Example Permission Setup

```typescript
// Set up a new regular admin
const regularAdminPermissions = [
  PERMISSIONS.DASHBOARD_VIEW,
  PERMISSIONS.BOOKINGS_VIEW,
  PERMISSIONS.BOOKINGS_CREATE,
  PERMISSIONS.BOOKINGS_EDIT,
  PERMISSIONS.SCHEDULE_VIEW,
  PERMISSIONS.VESSELS_VIEW,
  PERMISSIONS.ROUTES_VIEW,
  PERMISSIONS.REPORTS_VIEW_BASIC,
];

// Grant permissions
await grantPermissions(userId, regularAdminPermissions);
``` 