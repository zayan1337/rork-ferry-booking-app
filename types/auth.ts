import { User } from '@supabase/supabase-js';

export type UserRole = 'customer' | 'agent' | 'admin' | 'captain';

export interface UserProfile {
  id: string;
  full_name: string;
  mobile_number: string;
  email_address: string;
  date_of_birth: string;
  username: string;
  role: UserRole;
  created_at: string;
  accepted_terms: boolean;
  agent_discount?: number;
  credit_ceiling?: number;
  free_tickets_remaining?: number;
  is_email_verified: boolean;
  is_active: boolean;
}

export interface RegisterData {
  full_name: string;
  mobile_number: string;
  email_address: string;
  date_of_birth: string;
  username: string;
  password: string;
  accepted_terms: boolean;
}

export interface AuthUser extends User {
  profile?: UserProfile;
} 