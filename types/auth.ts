import { User } from '@supabase/supabase-js';

export type UserRole = 'customer' | 'agent' | 'admin' | 'captain';

export interface UserProfile {
  id: string;
  full_name: string;
  mobile_number: string;
  date_of_birth: string;
  role: UserRole;
  accepted_terms: boolean;
  agent_discount?: number;
  credit_ceiling?: number;
  free_tickets_remaining?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AuthUser extends User {
  profile?: UserProfile;
}

export interface RegisterData {
  full_name: string;
  mobile_number: string;
  date_of_birth: string;
  email_address: string;
  password: string;
  accepted_terms: boolean;
} 