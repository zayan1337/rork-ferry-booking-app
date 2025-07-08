import { AdminBooking, AdminUser, AdminTrip, AdminAlert } from '@/types/admin';

/**
 * Format currency values for admin display
 */
export function formatCurrency(amount: number | null | undefined, currency = 'MVR'): string {
    if (amount === null || amount === undefined) return '-';

    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(amount);
}

/**
 * Format date for admin display
 */
export function formatDate(dateString: string | null | undefined): string {
    if (!dateString) return '-';

    return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    }).format(new Date(dateString));
}

/**
 * Format datetime for admin display
 */
export function formatDateTime(dateString: string | null | undefined): string {
    if (!dateString) return '-';

    return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    }).format(new Date(dateString));
}

/**
 * Format time for admin display
 */
export function formatTime(timeString: string | null | undefined): string {
    if (!timeString) return '-';

    // Handle both time strings and full datetime strings
    if (timeString.includes('T') || timeString.length > 8) {
        return new Intl.DateTimeFormat('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        }).format(new Date(timeString));
    }

    // Handle time-only strings like "14:30:00"
    const [hours, minutes] = timeString.split(':');
    const date = new Date();
    date.setHours(parseInt(hours), parseInt(minutes), 0, 0);

    return new Intl.DateTimeFormat('en-US', {
        hour: '2-digit',
        minute: '2-digit'
    }).format(date);
}

/**
 * Format booking status for display
 */
export function formatBookingStatus(status: AdminBooking['status']): { label: string; color: string } {
    const statusMap = {
        reserved: { label: 'Reserved', color: '#007AFF' },
        pending_payment: { label: 'Pending Payment', color: '#FF9500' },
        confirmed: { label: 'Confirmed', color: '#34C759' },
        checked_in: { label: 'Checked In', color: '#5856D6' },
        completed: { label: 'Completed', color: '#00C7BE' },
        cancelled: { label: 'Cancelled', color: '#FF3B30' }
    };

    return statusMap[status] || { label: status, color: '#8E8E93' };
}

/**
 * Format user role for display
 */
export function formatUserRole(role: AdminUser['role']): { label: string; color: string } {
    const roleMap = {
        customer: { label: 'Customer', color: '#34C759' },
        agent: { label: 'Agent', color: '#007AFF' },
        admin: { label: 'Admin', color: '#FF3B30' }
    };

    return roleMap[role] || { label: role, color: '#8E8E93' };
}

/**
 * Format alert severity for display
 */
export function formatAlertSeverity(severity: AdminAlert['severity']): { label: string; color: string; icon: string } {
    const severityMap = {
        low: { label: 'Low', color: '#34C759', icon: 'info' },
        medium: { label: 'Medium', color: '#FF9500', icon: 'alert-triangle' },
        high: { label: 'High', color: '#FF3B30', icon: 'alert-circle' },
        critical: { label: 'Critical', color: '#8B0000', icon: 'x-circle' }
    };

    return severityMap[severity] || { label: severity, color: '#8E8E93', icon: 'info' };
}

/**
 * Format trip status for display
 */
export function formatTripStatus(status: AdminTrip['status']): { label: string; color: string } {
    const statusMap = {
        scheduled: { label: 'Scheduled', color: '#007AFF' },
        'in_progress': { label: 'In Progress', color: '#FF9500' },
        completed: { label: 'Completed', color: '#34C759' },
        cancelled: { label: 'Cancelled', color: '#FF3B30' }
    };

    return statusMap[status as keyof typeof statusMap] || { label: status || 'Unknown', color: '#8E8E93' };
}

/**
 * Format user status for display
 */
export function formatUserStatus(isActive: boolean): { label: string; color: string } {
    return isActive
        ? { label: 'Active', color: '#34C759' }
        : { label: 'Inactive', color: '#FF3B30' };
}

/**
 * Format vessel status for display
 */
export function formatVesselStatus(isActive: boolean): { label: string; color: string } {
    return isActive
        ? { label: 'Active', color: '#34C759' }
        : { label: 'Inactive', color: '#FF3B30' };
}

/**
 * Format route status for display
 */
export function formatRouteStatus(isActive: boolean): { label: string; color: string } {
    return isActive
        ? { label: 'Active', color: '#34C759' }
        : { label: 'Inactive', color: '#FF3B30' };
}

/**
 * Format percentage values
 */
export function formatPercentage(value: number | null | undefined, decimals = 1): string {
    if (value === null || value === undefined) return '-';

    return `${value.toFixed(decimals)}%`;
}

/**
 * Format large numbers with appropriate suffixes (K, M, B)
 */
export function formatLargeNumber(value: number | null | undefined): string {
    if (value === null || value === undefined) return '-';

    if (value >= 1000000000) {
        return `${(value / 1000000000).toFixed(1)}B`;
    }
    if (value >= 1000000) {
        return `${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
        return `${(value / 1000).toFixed(1)}K`;
    }

    return value.toString();
}

/**
 * Format time ago relative to now
 */
export function formatTimeAgo(dateString: string | null | undefined): string {
    if (!dateString) return '-';

    const now = new Date();
    const date = new Date(dateString);
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) {
        return 'just now';
    }

    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) {
        return `${diffInMinutes}m ago`;
    }

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) {
        return `${diffInHours}h ago`;
    }

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 30) {
        return `${diffInDays}d ago`;
    }

    const diffInMonths = Math.floor(diffInDays / 30);
    if (diffInMonths < 12) {
        return `${diffInMonths}mo ago`;
    }

    const diffInYears = Math.floor(diffInMonths / 12);
    return `${diffInYears}y ago`;
}

/**
 * Format booking number for display
 */
export function formatBookingNumber(bookingNumber: string | null | undefined): string {
    if (!bookingNumber) return '-';
    return bookingNumber.toUpperCase();
}

/**
 * Format phone number for display
 */
export function formatPhoneNumber(phoneNumber: string | null | undefined): string {
    if (!phoneNumber) return '-';

    // Remove all non-digit characters
    const digits = phoneNumber.replace(/\D/g, '');

    // Format Maldivian numbers (assuming they start with 960 country code)
    if (digits.startsWith('960') && digits.length === 10) {
        return `+${digits.slice(0, 3)} ${digits.slice(3, 6)}-${digits.slice(6)}`;
    }

    // Format local Maldivian numbers (7 digits)
    if (digits.length === 7) {
        return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    }

    // Return original if format is unknown
    return phoneNumber;
}

/**
 * Format email for display (truncate if too long)
 */
export function formatEmail(email: string | null | undefined, maxLength = 30): string {
    if (!email) return '-';

    if (email.length <= maxLength) {
        return email;
    }

    const [local, domain] = email.split('@');
    if (local.length > maxLength - domain.length - 4) {
        return `${local.slice(0, maxLength - domain.length - 7)}...@${domain}`;
    }

    return email;
}

/**
 * Format capacity utilization
 */
export function formatCapacity(used: number, total: number): { percentage: number; label: string; color: string } {
    const percentage = total > 0 ? (used / total) * 100 : 0;

    let color = '#34C759'; // Green
    if (percentage > 80) {
        color = '#FF3B30'; // Red
    } else if (percentage > 60) {
        color = '#FF9500'; // Orange
    }

    return {
        percentage,
        label: `${used}/${total}`,
        color
    };
}

/**
 * Format zone display
 */
export function formatZone(zone: 'A' | 'B'): { label: string; color: string } {
    const zoneMap = {
        A: { label: 'Zone A', color: '#007AFF' },
        B: { label: 'Zone B', color: '#5856D6' }
    };

    return zoneMap[zone] || { label: `Zone ${zone}`, color: '#8E8E93' };
}

/**
 * Format route name with zones
 */
export function formatRouteWithZones(
    fromIsland: string,
    toIsland: string,
    fromZone?: 'A' | 'B',
    toZone?: 'A' | 'B'
): string {
    const from = fromZone ? `${fromIsland} (${fromZone})` : fromIsland;
    const to = toZone ? `${toIsland} (${toZone})` : toIsland;

    return `${from} → ${to}`;
} 