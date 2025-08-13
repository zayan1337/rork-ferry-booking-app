import { UserProfile } from '@/types/userManagement';

/**
 * Formats user role for display
 */
export const formatUserRole = (role: string): string => {
  switch (role) {
    case 'admin':
      return 'Administrator';
    case 'agent':
      return 'Agent';
    case 'customer':
      return 'Customer';
    case 'passenger':
      return 'Passenger';
    case 'captain':
      return 'Captain';
    default:
      return role.charAt(0).toUpperCase() + role.slice(1);
  }
};

/**
 * Formats user status for display
 */
export const formatUserStatus = (status: string): string => {
  switch (status) {
    case 'active':
      return 'Active';
    case 'inactive':
      return 'Inactive';
    case 'suspended':
      return 'Suspended';
    case 'banned':
      return 'Banned';
    default:
      return status.charAt(0).toUpperCase() + status.slice(1);
  }
};

/**
 * Gets user status color
 */
export const getUserStatusColor = (status: string): string => {
  switch (status) {
    case 'active':
      return '#10B981'; // green
    case 'inactive':
      return '#6B7280'; // gray
    case 'suspended':
      return '#F59E0B'; // yellow
    case 'banned':
      return '#EF4444'; // red
    default:
      return '#6B7280'; // gray
  }
};

/**
 * Gets user role icon
 */
export const getUserRoleIcon = (role: string): string => {
  switch (role) {
    case 'admin':
      return '👑';
    case 'agent':
      return '👤';
    case 'customer':
      return '👥';
    case 'passenger':
      return '🚶';
    case 'captain':
      return '⚓';
    default:
      return '👤';
  }
};

/**
 * Formats currency for display
 */
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'MVR',
    minimumFractionDigits: 2
  }).format(amount);
};

/**
 * Formats date for display
 */
export const formatDate = (date: string): string => {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

/**
 * Formats date and time for display
 */
export const formatDateTime = (date: string): string => {
  return new Date(date).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

/**
 * Calculates user age from date of birth
 */
export const calculateUserAge = (dateOfBirth: string): number => {
  const birthDate = new Date(dateOfBirth);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
};

/**
 * Validates email format
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validates phone number format
 */
export const isValidPhoneNumber = (phone: string): boolean => {
  const phoneRegex = /^[+]?[\d\s-()]{7,15}$/;
  return phoneRegex.test(phone);
};

/**
 * Gets user activity level based on last login and bookings
 */
export const getUserActivityLevel = (user: UserProfile): 'high' | 'medium' | 'low' => {
  if (!user.last_login) return 'low';
  
  const lastLogin = new Date(user.last_login);
  const now = new Date();
  const daysSinceLastLogin = Math.floor((now.getTime() - lastLogin.getTime()) / (1000 * 60 * 60 * 24));
  
  if (daysSinceLastLogin <= 7) return 'high';
  if (daysSinceLastLogin <= 30) return 'medium';
  return 'low';
};

/**
 * Gets user activity level color
 */
export const getUserActivityColor = (level: 'high' | 'medium' | 'low'): string => {
  switch (level) {
    case 'high':
      return '#10B981'; // green
    case 'medium':
      return '#F59E0B'; // yellow
    case 'low':
      return '#EF4444'; // red
    default:
      return '#6B7280'; // gray
  }
};

/**
 * Formats user name for display
 */
export const formatUserName = (user: UserProfile): string => {
  return user.name || user.email || 'Unknown User';
};

/**
 * Gets user initials for avatar
 */
export const getUserInitials = (user: UserProfile): string => {
  if (!user.name) return user.email?.charAt(0).toUpperCase() || 'U';
  
  const names = user.name.split(' ');
  if (names.length === 1) return names[0].charAt(0).toUpperCase();
  
  return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase();
};

/**
 * Checks if user has recent activity
 */
export const hasRecentActivity = (user: UserProfile, days: number = 30): boolean => {
  if (!user.last_login) return false;
  
  const lastLogin = new Date(user.last_login);
  const now = new Date();
  const daysSinceLastLogin = Math.floor((now.getTime() - lastLogin.getTime()) / (1000 * 60 * 60 * 24));
  
  return daysSinceLastLogin <= days;
};

/**
 * Gets user engagement score
 */
export const getUserEngagementScore = (user: UserProfile): number => {
  let score = 0;
  
  // Base score for having an account
  score += 10;
  
  // Points for recent activity
  if (hasRecentActivity(user, 7)) score += 30;
  else if (hasRecentActivity(user, 30)) score += 20;
  else if (hasRecentActivity(user, 90)) score += 10;
  
  // Points for bookings
  if (user.total_bookings) {
    score += Math.min(user.total_bookings * 5, 50); // Max 50 points for bookings
  }
  
  // Points for spending
  if (user.total_spent) {
    score += Math.min(user.total_spent / 100, 20); // Max 20 points for spending
  }
  
  return Math.min(score, 100); // Cap at 100
};

/**
 * Gets user engagement level
 */
export const getUserEngagementLevel = (score: number): 'high' | 'medium' | 'low' => {
  if (score >= 70) return 'high';
  if (score >= 40) return 'medium';
  return 'low';
};

/**
 * Formats user display name
 */
export const formatUserDisplayName = (user: UserProfile): string => {
  if (user.name) return user.name;
  if (user.email) return user.email.split('@')[0];
  return 'Unknown User';
};

/**
 * Formats activity level for display
 */
export const formatActivityLevel = (level: number) => {
  if (level >= 80) {
    return { label: 'High', color: '#10B981' };
  } else if (level >= 50) {
    return { label: 'Medium', color: '#F59E0B' };
  } else {
    return { label: 'Low', color: '#EF4444' };
  }
};

/**
 * Formats engagement score for display
 */
export const formatEngagementScore = (score: number) => {
  const percentage = `${Math.round(score)}%`;
  let color = '#EF4444'; // red
  
  if (score >= 70) {
    color = '#10B981'; // green
  } else if (score >= 40) {
    color = '#F59E0B'; // yellow
  }
  
  return { percentage, color };
};

/**
 * Calculates user age from UserProfile
 */
export const calculateUserAgeFromProfile = (user: UserProfile): number | null => {
  if (!user.date_of_birth) return null;
  return calculateUserAge(user.date_of_birth);
};
