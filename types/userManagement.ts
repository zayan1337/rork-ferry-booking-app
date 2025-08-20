// Base User Management Types
export interface UserProfile {
  id: string;
  name: string;
  email: string;
  mobile_number: string;
  role: 'admin' | 'agent' | 'customer' | 'passenger' | 'captain';
  status: 'active' | 'inactive' | 'suspended' | 'banned';
  email_verified: boolean;
  mobile_verified: boolean;
  profile_picture?: string;
  date_of_birth?: string;
  gender?: 'male' | 'female' | 'other';
  address?: {
    street: string;
    city: string;
    state: string;
    country: string;
    postal_code: string;
    island?: string;
    atoll?: string;
  };
  emergency_contact?: {
    name: string;
    relationship: string;
    phone: string;
  };
  preferences?: {
    language: string;
    currency: string;
    notifications: {
      email: boolean;
      sms: boolean;
      push: boolean;
    };
    accessibility: {
      assistance_required: boolean;
      assistance_type?: string;
    };
    // Legacy notification properties for backward compatibility
    email_notifications?: boolean;
    sms_notifications?: boolean;
  };
  created_at: string;
  updated_at: string;
  last_login?: string;
  last_active_at?: string;

  // Statistics (optional for display)
  total_bookings?: number;
  total_spent?: number;
  total_trips?: number;
  average_rating?: number;
  wallet_balance?: number;
  credit_score?: number;
  loyalty_points?: number;

  // Additional statistics object for compatibility
  statistics?: {
    total_bookings?: number;
    total_spent?: number;
    total_trips?: number;
    activity_level?: number;
    engagement_score?: number;
    last_booking_date?: string;
    average_trip_value?: number;
    cancellation_rate?: number;
    on_time_rate?: number;
    loyalty_tier?: string;
    referral_count?: number;
  };
}

export interface Permission {
  id: string;
  name: string;
  description: string;
  category:
    | 'users'
    | 'operations'
    | 'bookings'
    | 'finance'
    | 'communications'
    | 'settings'
    | 'reports';
  level: 'view' | 'create' | 'update' | 'delete' | 'manage';
  created_at: string;
  updated_at: string;
}

export interface Role {
  id: string;
  name: string;
  description: string;
  permissions: Permission[];
  is_default: boolean;
  is_system: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserPermission {
  id: string;
  user_id: string;
  permission_id: string;
  granted_by: string;
  granted_at: string;
  expires_at?: string;
  is_active: boolean;
  permission?: Permission;
  granted_by_user?: UserProfile;
}

export interface UserRole {
  id: string;
  user_id: string;
  role_id: string;
  assigned_by: string;
  assigned_at: string;
  expires_at?: string;
  is_active: boolean;
  role?: Role;
  assigned_by_user?: UserProfile;
}

export interface UserSession {
  id: string;
  user_id: string;
  session_token: string;
  device_info: {
    type: 'mobile' | 'desktop' | 'tablet';
    os: string;
    browser?: string;
    app_version?: string;
  };
  ip_address: string;
  location?: {
    country: string;
    city: string;
    latitude: number;
    longitude: number;
  };
  created_at: string;
  last_activity: string;
  expires_at: string;
  is_active: boolean;
}

export interface UserActivity {
  id: string;
  user_id: string;
  activity_type:
    | 'login'
    | 'logout'
    | 'booking'
    | 'payment'
    | 'profile_update'
    | 'password_change'
    | 'permission_change';
  description: string;
  metadata?: Record<string, any>;
  ip_address: string;
  user_agent: string;
  created_at: string;
  user?: UserProfile;
}

// Form Data Types
export interface UserFormData {
  name: string;
  email: string;
  mobile_number: string;
  role: 'admin' | 'agent' | 'customer' | 'passenger' | 'captain';
  status: 'active' | 'inactive' | 'suspended';
  profile_picture?: string;
  date_of_birth?: string;
  gender?: 'male' | 'female' | 'other';
  address?: {
    street: string;
    city: string;
    state: string;
    country: string;
    postal_code: string;
    island?: string;
    atoll?: string;
  };
  emergency_contact?: {
    name: string;
    relationship: string;
    phone: string;
  };
  preferences?: {
    language: string;
    currency: string;
    notifications: {
      email: boolean;
      sms: boolean;
      push: boolean;
    };
    accessibility: {
      assistance_required: boolean;
      assistance_type?: string;
    };
    // Legacy notification properties for backward compatibility
    email_notifications?: boolean;
    sms_notifications?: boolean;
  };
  password?: string;
  confirm_password?: string;
  confirmPassword?: string; // Alias for confirm_password
  send_welcome_email?: boolean;
  send_credentials_sms?: boolean;
}

export interface PermissionFormData {
  name: string;
  description: string;
  category:
    | 'users'
    | 'operations'
    | 'bookings'
    | 'finance'
    | 'communications'
    | 'settings'
    | 'reports';
  level: 'view' | 'create' | 'update' | 'delete' | 'manage';
}

export interface RoleFormData {
  name: string;
  description: string;
  permissions: string[];
  is_default: boolean;
}

export interface UserPermissionFormData {
  user_id: string;
  permission_ids: string[];
  expires_at?: string;
}

export interface UserRoleFormData {
  user_id: string;
  role_ids: string[];
  expires_at?: string;
}

// Validation Types
export interface UserValidationErrors {
  name?: string;
  email?: string;
  mobile_number?: string;
  role?: string;
  status?: string;
  date_of_birth?: string;
  gender?: string;
  password?: string;
  confirm_password?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    postal_code?: string;
  };
  emergency_contact?: {
    name?: string;
    relationship?: string;
    phone?: string;
  };
  general?: string;
}

export interface PermissionValidationErrors {
  name?: string;
  description?: string;
  category?: string;
  level?: string;
  general?: string;
}

export interface RoleValidationErrors {
  name?: string;
  description?: string;
  permissions?: string;
  general?: string;
}

// Filter and Search Types
export interface UserFilters {
  role?: 'all' | 'admin' | 'agent' | 'customer' | 'passenger' | 'captain';
  status?: 'all' | 'active' | 'inactive' | 'suspended' | 'banned';
  email_verified?: boolean;
  mobile_verified?: boolean;
  registration_date_range?: {
    from: string;
    to: string;
  };
  last_login_range?: {
    from: string;
    to: string;
  };
  age_range?: {
    min: number;
    max: number;
  };
  gender?: 'all' | 'male' | 'female' | 'other';
  location?: {
    country?: string;
    city?: string;
  };
}

export interface PermissionFilters {
  category?:
    | 'all'
    | 'users'
    | 'operations'
    | 'bookings'
    | 'finance'
    | 'communications'
    | 'settings'
    | 'reports';
  level?: 'all' | 'view' | 'create' | 'update' | 'delete' | 'manage';
}

export interface RoleFilters {
  is_default?: boolean;
  is_system?: boolean;
}

export interface UserActivityFilters {
  user_id?: string;
  activity_type?:
    | 'all'
    | 'login'
    | 'logout'
    | 'booking'
    | 'payment'
    | 'profile_update'
    | 'password_change'
    | 'permission_change';
  date_range?: {
    from: string;
    to: string;
  };
  ip_address?: string;
}

// Sort Types
export type UserSortField =
  | 'name'
  | 'email'
  | 'role'
  | 'status'
  | 'created_at'
  | 'last_login'
  | 'total_bookings'
  | 'total_spent';
export type PermissionSortField = 'name' | 'category' | 'level' | 'created_at';
export type RoleSortField = 'name' | 'created_at';
export type UserActivitySortField =
  | 'created_at'
  | 'activity_type'
  | 'user_name';

export interface UserSortConfig {
  field: UserSortField;
  direction: 'asc' | 'desc';
}

export interface PermissionSortConfig {
  field: PermissionSortField;
  direction: 'asc' | 'desc';
}

export interface RoleSortConfig {
  field: RoleSortField;
  direction: 'asc' | 'desc';
}

export interface UserActivitySortConfig {
  field: UserActivitySortField;
  direction: 'asc' | 'desc';
}

// Statistics Types
export interface UserStats {
  total_users: number;
  active_users: number;
  inactive_users: number;
  suspended_users: number;
  banned_users: number;
  admin_count: number;
  agent_count: number;
  customer_count: number;
  passenger_count: number;
  new_users_today: number;
  new_users_this_week: number;
  new_users_this_month: number;
  verified_users: number;
  unverified_users: number;
  users_with_bookings: number;
  average_user_age: number;
  top_locations: {
    country: string;
    city: string;
    user_count: number;
  }[];
  user_growth_trend: {
    date: string;
    new_users: number;
    total_users: number;
  }[];
}

export interface PermissionStats {
  total_permissions: number;
  permissions_by_category: {
    category: string;
    count: number;
  }[];
  permissions_by_level: {
    level: string;
    count: number;
  }[];
  most_granted_permissions: {
    permission: Permission;
    user_count: number;
  }[];
}

export interface RoleStats {
  total_roles: number;
  default_roles: number;
  custom_roles: number;
  users_by_role: {
    role: Role;
    user_count: number;
  }[];
  role_permission_coverage: {
    role: Role;
    permission_count: number;
  }[];
}

export interface UserManagementOverview {
  user_stats: UserStats;
  permission_stats: PermissionStats;
  role_stats: RoleStats;
  recent_users: UserProfile[];
  recent_activities: UserActivity[];
  active_sessions: UserSession[];
  security_alerts: {
    type:
      | 'suspicious_login'
      | 'multiple_failed_attempts'
      | 'password_reset'
      | 'permission_escalation';
    user_id: string;
    user_name: string;
    description: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    timestamp: string;
    resolved: boolean;
  }[];
}

// Bulk Operations Types
export interface BulkUserOperation {
  type:
    | 'status_change'
    | 'role_change'
    | 'permission_grant'
    | 'permission_revoke'
    | 'delete'
    | 'export';
  user_ids: string[];
  params?: {
    status?: 'active' | 'inactive' | 'suspended' | 'banned';
    role_id?: string;
    permission_ids?: string[];
  };
  initiated_by: string;
  initiated_at: string;
  completed_at?: string;
  success_count?: number;
  failed_count?: number;
  errors?: string[];
}

// Action Types
export interface UserManagementAction {
  id: string;
  type: 'create' | 'update' | 'delete' | 'bulk_update';
  resource: 'user' | 'permission' | 'role' | 'user_permission' | 'user_role';
  description: string;
  timestamp: string;
  user_id: string;
  user_name: string;
  details?: any;
}

// All types are already exported individually above
