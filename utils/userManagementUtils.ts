import {
    UserProfile,
    UserFormData,
    UserValidationErrors,
    UserFilters,
    Permission,
    Role,
    UserActivity,
    UserSession
} from "@/types/userManagement";

/**
 * Validates user form data
 */
export const validateUserForm = (formData: UserFormData): UserValidationErrors => {
    const errors: UserValidationErrors = {};

    // Name validation
    if (!formData.name || formData.name.trim().length < 2) {
        errors.name = "Name must be at least 2 characters long";
    } else if (formData.name.trim().length > 100) {
        errors.name = "Name cannot exceed 100 characters";
    }

    // Email validation
    if (!formData.email || formData.email.trim().length === 0) {
        errors.email = "Email is required";
    } else {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email)) {
            errors.email = "Please enter a valid email address";
        }
    }

    // Mobile number validation
    if (!formData.mobile_number || formData.mobile_number.trim().length === 0) {
        errors.mobile_number = "Mobile number is required";
    } else {
        const mobileRegex = /^[+]?[\d\s-()]{7,15}$/;
        if (!mobileRegex.test(formData.mobile_number)) {
            errors.mobile_number = "Please enter a valid mobile number";
        }
    }

    // Date of birth validation
    if (formData.date_of_birth) {
        const birthDate = new Date(formData.date_of_birth);
        const today = new Date();
        const age = today.getFullYear() - birthDate.getFullYear();

        if (age < 13) {
            errors.date_of_birth = "User must be at least 13 years old";
        } else if (age > 120) {
            errors.date_of_birth = "Please enter a valid date of birth";
        }
    }

    // Password validation (for new users)
    if (formData.password) {
        if (formData.password.length < 8) {
            errors.password = "Password must be at least 8 characters long";
        } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
            errors.password = "Password must contain at least one uppercase letter, one lowercase letter, and one number";
        }
    }

    // Confirm password validation
    if (formData.confirm_password) {
        if (formData.password !== formData.confirm_password) {
            errors.confirm_password = "Passwords do not match";
        }
    }

    // Address validation
    if (formData.address) {
        const addressErrors: any = {};

        if (formData.address.street && formData.address.street.trim().length > 200) {
            addressErrors.street = "Street address cannot exceed 200 characters";
        }

        if (formData.address.city && formData.address.city.trim().length > 100) {
            addressErrors.city = "City cannot exceed 100 characters";
        }

        if (formData.address.postal_code && formData.address.postal_code.trim().length > 20) {
            addressErrors.postal_code = "Postal code cannot exceed 20 characters";
        }

        if (Object.keys(addressErrors).length > 0) {
            errors.address = addressErrors;
        }
    }

    // Emergency contact validation
    if (formData.emergency_contact) {
        const emergencyErrors: any = {};

        if (!formData.emergency_contact.name || formData.emergency_contact.name.trim().length < 2) {
            emergencyErrors.name = "Emergency contact name must be at least 2 characters long";
        }

        if (!formData.emergency_contact.phone || formData.emergency_contact.phone.trim().length === 0) {
            emergencyErrors.phone = "Emergency contact phone is required";
        } else {
            const phoneRegex = /^[+]?[\d\s-()]{7,15}$/;
            if (!phoneRegex.test(formData.emergency_contact.phone)) {
                emergencyErrors.phone = "Please enter a valid phone number";
            }
        }

        if (Object.keys(emergencyErrors).length > 0) {
            errors.emergency_contact = emergencyErrors;
        }
    }

    return errors;
};

/**
 * Formats user display name
 */
export const formatUserDisplayName = (user: UserProfile): string => {
    return user.name || user.email || "Unknown User";
};

/**
 * Gets user age from date of birth
 */
export const getUserAge = (user: UserProfile): number => {
    if (!user.date_of_birth) return 0;

    const birthDate = new Date(user.date_of_birth);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();

    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }

    return age;
};

/**
 * Calculates user age from date of birth (alias for getUserAge)
 */
export const calculateUserAge = (user: UserProfile): number => {
    return getUserAge(user);
};

/**
 * Formats user status for display
 */
export const formatUserStatus = (status: string): { label: string; color: string } => {
    const statusMap = {
        active: { label: "Active", color: "#10B981" },
        inactive: { label: "Inactive", color: "#6B7280" },
        suspended: { label: "Suspended", color: "#F59E0B" },
        banned: { label: "Banned", color: "#EF4444" }
    };

    return statusMap[status as keyof typeof statusMap] || { label: status, color: "#6B7280" };
};

/**
 * Formats user role for display
 */
export const formatUserRole = (role: string): { label: string; color: string; icon: string } => {
    const roleMap = {
        admin: { label: "Admin", color: "#EF4444", icon: "👑" },
        agent: { label: "Agent", color: "#3B82F6", icon: "🎯" },
        customer: { label: "Customer", color: "#10B981", icon: "👤" },
        passenger: { label: "Passenger", color: "#8B5CF6", icon: "🧳" }
    };

    return roleMap[role as keyof typeof roleMap] || { label: role, color: "#6B7280", icon: "👤" };
};

/**
 * Calculates user activity level
 */
export const getUserActivityLevel = (user: UserProfile): "very_active" | "active" | "moderate" | "inactive" => {
    const totalBookings = user.total_bookings || 0;
    const totalTrips = user.total_trips || 0;
    const lastLogin = user.last_login ? new Date(user.last_login) : null;

    if (!lastLogin) return "inactive";

    const daysSinceLogin = (Date.now() - lastLogin.getTime()) / (1000 * 60 * 60 * 24);

    if (daysSinceLogin > 30) return "inactive";
    if (daysSinceLogin > 7) return "moderate";

    if (totalBookings >= 10 && totalTrips >= 10) return "very_active";
    if (totalBookings >= 5 && totalTrips >= 5) return "active";

    return "moderate";
};

/**
 * Formats activity level for display
 */
export const formatActivityLevel = (level: number | "very_active" | "active" | "moderate" | "inactive"): { label: string; color: string } => {
    if (typeof level === "string") {
        const levelMap = {
            very_active: { label: "Very Active", color: "#10B981" },
            active: { label: "Active", color: "#34D399" },
            moderate: { label: "Moderate", color: "#F59E0B" },
            inactive: { label: "Inactive", color: "#EF4444" }
        };
        return levelMap[level] || { label: "Unknown", color: "#6B7280" };
    }

    // Handle numeric levels (0-100)
    if (level >= 80) return { label: "Very Active", color: "#10B981" };
    if (level >= 60) return { label: "Active", color: "#34D399" };
    if (level >= 40) return { label: "Moderate", color: "#F59E0B" };
    if (level >= 20) return { label: "Low", color: "#F97316" };
    return { label: "Inactive", color: "#EF4444" };
};

/**
 * Formats engagement score for display
 */
export const formatEngagementScore = (score: number): { label: string; color: string; percentage: string } => {
    const percentage = `${Math.round(score)}%`;

    if (score >= 80) return { label: "Excellent", color: "#10B981", percentage };
    if (score >= 60) return { label: "Good", color: "#34D399", percentage };
    if (score >= 40) return { label: "Fair", color: "#F59E0B", percentage };
    if (score >= 20) return { label: "Poor", color: "#F97316", percentage };
    return { label: "Very Poor", color: "#EF4444", percentage };
};

/**
 * Filters users based on criteria
 */
export const filterUsers = (users: UserProfile[], filters: UserFilters): UserProfile[] => {
    return users.filter(user => {
        // Role filter
        if (filters.role && filters.role !== "all" && user.role !== filters.role) {
            return false;
        }

        // Status filter
        if (filters.status && filters.status !== "all" && user.status !== filters.status) {
            return false;
        }

        // Email verified filter
        if (filters.email_verified !== undefined && user.email_verified !== filters.email_verified) {
            return false;
        }

        // Mobile verified filter
        if (filters.mobile_verified !== undefined && user.mobile_verified !== filters.mobile_verified) {
            return false;
        }

        // Registration date range filter
        if (filters.registration_date_range) {
            const userDate = new Date(user.created_at);
            const fromDate = new Date(filters.registration_date_range.from);
            const toDate = new Date(filters.registration_date_range.to);

            if (userDate < fromDate || userDate > toDate) {
                return false;
            }
        }

        // Last login range filter
        if (filters.last_login_range && user.last_login) {
            const lastLoginDate = new Date(user.last_login);
            const fromDate = new Date(filters.last_login_range.from);
            const toDate = new Date(filters.last_login_range.to);

            if (lastLoginDate < fromDate || lastLoginDate > toDate) {
                return false;
            }
        }

        // Age range filter
        if (filters.age_range) {
            const age = getUserAge(user);
            if (age < filters.age_range.min || age > filters.age_range.max) {
                return false;
            }
        }

        // Gender filter
        if (filters.gender && filters.gender !== "all" && user.gender !== filters.gender) {
            return false;
        }

        // Location filter
        if (filters.location && user.address) {
            if (filters.location.country && user.address.country !== filters.location.country) {
                return false;
            }
            if (filters.location.city && user.address.city !== filters.location.city) {
                return false;
            }
        }

        return true;
    });
};

/**
 * Searches users based on search term
 */
export const searchUsers = (users: UserProfile[], searchTerm: string): UserProfile[] => {
    if (!searchTerm.trim()) return users;

    const term = searchTerm.toLowerCase();
    return users.filter(user =>
        user.name.toLowerCase().includes(term) ||
        user.email.toLowerCase().includes(term) ||
        (user.mobile_number && user.mobile_number.toLowerCase().includes(term)) ||
        user.id.toLowerCase().includes(term)
    );
};

/**
 * Validates user uniqueness (email and mobile)
 */
export const validateUserUniqueness = (
    formData: UserFormData,
    existingUsers: UserProfile[],
    currentUserId?: string
): { emailExists: boolean; mobileExists: boolean } => {
    // Handle empty or undefined arrays
    if (!existingUsers || !Array.isArray(existingUsers)) {
        return { emailExists: false, mobileExists: false };
    }

    const emailExists = existingUsers.some(user =>
        user.email === formData.email && user.id !== currentUserId
    );

    const mobileExists = existingUsers.some(user =>
        user.mobile_number === formData.mobile_number && user.id !== currentUserId
    );

    return { emailExists, mobileExists };
};

/**
 * Generates user statistics
 */
export const generateUserStatistics = (users: UserProfile[]) => {
    const total = users.length;
    const activeUsers = users.filter(u => u.status === "active").length;
    const verifiedUsers = users.filter(u => u.email_verified || u.mobile_verified).length;
    const usersWithBookings = users.filter(u => (u.total_bookings || 0) > 0).length;

    // Calculate average age
    const usersWithAge = users.filter(u => u.date_of_birth);
    const averageAge = usersWithAge.length > 0
        ? usersWithAge.reduce((sum, user) => sum + getUserAge(user), 0) / usersWithAge.length
        : 0;

    return {
        total,
        active: activeUsers,
        activePercentage: total > 0 ? (activeUsers / total * 100).toFixed(1) : "0",
        verified: verifiedUsers,
        verifiedPercentage: total > 0 ? (verifiedUsers / total * 100).toFixed(1) : "0",
        withBookings: usersWithBookings,
        averageAge: Math.round(averageAge),
    };
};

/**
 * Checks if user has a specific permission
 */
export const userHasPermission = (user: UserProfile, permission: string): boolean => {
    // Admin users have all permissions
    if (user.role === "admin") return true;

    // Check if user has the specific permission
    // This would typically check against user permissions from the database
    return false;
};

/**
 * Formats user activity for display
 */
export const formatUserActivity = (activity: UserActivity): {
    title: string;
    subtitle: string;
    icon: string;
    color: string;
} => {
    const activityMap = {
        login: { title: "Logged In", icon: "🔓", color: "#10B981" },
        logout: { title: "Logged Out", icon: "🔒", color: "#6B7280" },
        booking: { title: "Made Booking", icon: "🎫", color: "#3B82F6" },
        payment: { title: "Payment", icon: "💳", color: "#F59E0B" },
        profile_update: { title: "Updated Profile", icon: "👤", color: "#8B5CF6" },
        password_change: { title: "Changed Password", icon: "🔑", color: "#EF4444" },
        permission_change: { title: "Permission Changed", icon: "⚙️", color: "#F97316" }
    };

    const mapped = activityMap[activity.activity_type as keyof typeof activityMap] || {
        title: activity.activity_type,
        icon: "📝",
        color: "#6B7280"
    };

    return {
        title: mapped.title,
        subtitle: activity.description,
        icon: mapped.icon,
        color: mapped.color
    };
};

/**
 * Calculates user engagement score
 */
export const calculateUserEngagementScore = (user: UserProfile): number => {
    let score = 0;

    // Profile completeness (0-25 points)
    if (user.name) score += 5;
    if (user.email && user.email_verified) score += 5;
    if (user.mobile_number && user.mobile_verified) score += 5;
    if (user.date_of_birth) score += 5;
    if (user.address) score += 5;

    // Activity level (0-25 points)
    const totalBookings = user.total_bookings || 0;
    if (totalBookings > 0) score += 5;
    if (totalBookings > 5) score += 5;
    if (totalBookings > 10) score += 5;
    if (totalBookings > 20) score += 5;
    if (totalBookings > 50) score += 5;

    // Recency (0-25 points)
    if (user.last_login) {
        const daysSinceLogin = (Date.now() - new Date(user.last_login).getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceLogin <= 1) score += 25;
        else if (daysSinceLogin <= 7) score += 20;
        else if (daysSinceLogin <= 30) score += 15;
        else if (daysSinceLogin <= 90) score += 10;
        else if (daysSinceLogin <= 180) score += 5;
    }

    // Loyalty (0-25 points)
    const accountAge = (Date.now() - new Date(user.created_at).getTime()) / (1000 * 60 * 60 * 24);
    if (accountAge > 365) score += 10; // 1+ years
    if (accountAge > 730) score += 5; // 2+ years
    if (user.total_spent && user.total_spent > 1000) score += 5; // High spender
    if (user.loyalty_points && user.loyalty_points > 100) score += 5; // Active in loyalty

    return Math.min(score, 100); // Cap at 100
};

/**
 * Formats user session information
 */
export const formatUserSession = (session: UserSession): {
    displayName: string;
    duration: string;
    activityLevel: string;
    location: string;
} => {
    const startTime = new Date(session.created_at);
    const endTime = session.expires_at ? new Date(session.expires_at) : new Date();
    const durationMs = endTime.getTime() - startTime.getTime();
    const durationHours = Math.floor(durationMs / (1000 * 60 * 60));
    const durationMinutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));

    return {
        displayName: `${session.device_info.type} - ${session.device_info.os}`,
        duration: `${durationHours}h ${durationMinutes}m`,
        activityLevel: session.is_active ? "Active" : "Inactive",
        location: session.location ? `${session.location.city}, ${session.location.country}` : "Unknown"
    };
}; 