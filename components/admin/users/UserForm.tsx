import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, Alert, ScrollView } from "react-native";
import { colors } from "@/constants/adminColors";
import { UserFormData } from "@/types/userManagement";
import { useUserForm } from "@/hooks/useUserForm";
import {
  User as UserIcon,
  Mail,
  Phone,
  Calendar,
  Shield,
  Activity,
  Save,
  RotateCcw,
  AlertCircle,
  Info,
  Settings,
  Users,
  MapPin,
  Clock,
} from "lucide-react-native";

// Components
import Button from "@/components/admin/Button";
import TextInput from "@/components/admin/TextInput";
import Switch from "@/components/admin/Switch";
import Dropdown from "@/components/admin/Dropdown";
import LoadingSpinner from "@/components/admin/LoadingSpinner";
import { DateSelector } from "@/components/DateSelector";

interface UserFormProps {
  userId?: string;
  onSave?: (userData: UserFormData) => void;
  onCancel?: () => void;
  isModal?: boolean;
}

interface FormData {
  name: string;
  email: string;
  mobile_number: string;
  role: "admin" | "agent" | "customer" | "passenger" | "captain";
  status: "active" | "inactive" | "suspended";
  date_of_birth?: string;
  gender?: "male" | "female" | "other";
  profile_picture?: string;
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
  };
  password?: string;
  confirm_password?: string;
  send_welcome_email?: boolean;
  send_credentials_sms?: boolean;
}

interface ValidationErrors {
  name?: string;
  email?: string;
  mobile_number?: string;
  role?: string;
  status?: string;
  date_of_birth?: string;
  gender?: string;
  password?: string;
  confirm_password?: string;
  general?: string;
}

export default function UserForm({
  userId,
  onSave,
  onCancel,
  isModal = false,
}: UserFormProps) {
  const {
    formData,
    setFieldValue,
    isLoading,
    isSubmitting,
    errors,
    clearFieldError,
    handleSubmit,
    resetForm,
    canSubmit,
    isDirty,
  } = useUserForm(userId);

  const [validationErrors, setValidationErrors] = useState<ValidationErrors>(
    {}
  );
  const [loading, setLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [showPasswordFields, setShowPasswordFields] = useState(!userId);

  // Track form changes
  useEffect(() => {
    const hasFormChanges = isDirty;
    setHasChanges(hasFormChanges);
  }, [isDirty]);

  const validateForm = (): boolean => {
    const errors: ValidationErrors = {};

    // Name validation
    if (!formData.name?.trim()) {
      errors.name = "Full name is required";
    } else if (formData.name.trim().length < 2) {
      errors.name = "Full name must be at least 2 characters long";
    } else if (formData.name.trim().length > 100) {
      errors.name = "Full name must be less than 100 characters";
    }

    // Email validation
    if (!formData.email?.trim()) {
      errors.email = "Email address is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      errors.email = "Please enter a valid email address";
    }

    // Mobile number validation
    if (!formData.mobile_number?.trim()) {
      errors.mobile_number = "Phone number is required";
    } else if (
      !/^[\+]?[1-9][\d]{0,15}$/.test(
        formData.mobile_number.trim().replace(/\s/g, "")
      )
    ) {
      errors.mobile_number = "Please enter a valid phone number";
    }

    // Role validation
    if (!formData.role) {
      errors.role = "User role is required";
    }

    // Status validation
    if (!formData.status) {
      errors.status = "User status is required";
    }

    // Password validation for new users
    if (!userId) {
      if (!formData.password?.trim()) {
        errors.password = "Password is required for new users";
      } else if (formData.password.length < 8) {
        errors.password = "Password must be at least 8 characters long";
      } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
        errors.password =
          "Password must contain uppercase, lowercase, and number";
      }

      if (!formData.confirm_password?.trim()) {
        errors.confirm_password = "Please confirm your password";
      } else if (formData.password !== formData.confirm_password) {
        errors.confirm_password = "Passwords do not match";
      }
    }

    // Date of birth validation (optional but if provided should be valid)
    if (formData.date_of_birth) {
      const dob = new Date(formData.date_of_birth);
      const today = new Date();
      const age = today.getFullYear() - dob.getFullYear();
      if (age < 0 || age > 120) {
        errors.date_of_birth = "Please enter a valid date of birth";
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleFormSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setValidationErrors({});

    try {
      await handleSubmit();
    } catch (error) {
      console.error("Error saving user:", error);
      let errorMessage =
        "Failed to save user. Please check your connection and try again.";

      if (error instanceof Error) {
        if (
          error.message.includes("duplicate key value") ||
          error.message.includes("unique constraint")
        ) {
          errorMessage = "A user with this email address already exists.";
        } else {
          errorMessage = error.message;
        }
      }

      setValidationErrors({ general: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    resetForm();
    setValidationErrors({});
    setHasChanges(false);
  };

  const getStatusDescription = (status: string) => {
    switch (status) {
      case "active":
        return "User account is active and can access the system";
      case "inactive":
        return "User account is temporarily disabled";
      case "suspended":
        return "User account is suspended due to policy violations";
      default:
        return "";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return colors.success;
      case "inactive":
        return colors.textSecondary;
      case "suspended":
        return colors.warning;
      default:
        return colors.textSecondary;
    }
  };

  const roleOptions = [
    { label: "Admin", value: "admin" },
    { label: "Agent", value: "agent" },
    { label: "Customer", value: "customer" },
    { label: "Passenger", value: "passenger" },
    { label: "Captain", value: "captain" },
  ];

  const statusOptions = [
    { label: "Active", value: "active" },
    { label: "Inactive", value: "inactive" },
    { label: "Suspended", value: "suspended" },
  ];

  const genderOptions = [
    { label: "Male", value: "male" },
    { label: "Female", value: "female" },
    { label: "Other", value: "other" },
  ];

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <LoadingSpinner />
        <Text style={styles.loadingText}>
          {userId ? "Loading user data..." : "Preparing form..."}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <UserIcon size={24} color={colors.primary} />
        </View>
        <View style={styles.headerContent}>
          <Text style={styles.title}>
            {userId ? "Edit User" : "Create New User"}
          </Text>
          <Text style={styles.subtitle}>
            {userId
              ? "Update user information and settings"
              : "Add a new user to the system"}
          </Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Basic Information */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderIcon}>
              <Info size={20} color={colors.primary} />
            </View>
            <Text style={styles.sectionTitle}>Personal Information</Text>
          </View>

          <View style={styles.formGroup}>
            <TextInput
              label="Full Name"
              value={formData.name || ""}
              onChangeText={(text) => {
                setFieldValue("name", text);
                clearFieldError("name");
              }}
              placeholder="Enter full name"
              error={validationErrors.name || getFieldError("name")}
              required
            />
          </View>

          <View style={styles.formRow}>
            <View style={styles.formHalf}>
              <TextInput
                label="Email Address"
                value={formData.email || ""}
                onChangeText={(text) => {
                  setFieldValue("email", text);
                  clearFieldError("email");
                }}
                placeholder="Enter email address"
                keyboardType="email-address"
                autoCapitalize="none"
                error={validationErrors.email || getFieldError("email")}
                required
              />
            </View>

            <View style={styles.formHalf}>
              <TextInput
                label="Phone Number"
                value={formData.mobile_number || ""}
                onChangeText={(text) => {
                  setFieldValue("mobile_number", text);
                  clearFieldError("mobile_number");
                }}
                placeholder="Enter phone number"
                keyboardType="phone-pad"
                error={
                  validationErrors.mobile_number ||
                  getFieldError("mobile_number")
                }
                required
              />
            </View>
          </View>

          <View style={styles.formRow}>
            <View style={styles.formHalf}>
              <DateSelector
                label="Date of Birth"
                value={formData.date_of_birth || null}
                onChange={(date) => {
                  setFieldValue("date_of_birth", date);
                  clearFieldError("date_of_birth");
                }}
                isDateOfBirth={true}
                maxDate={new Date().toISOString().split("T")[0]}
                error={
                  validationErrors.date_of_birth ||
                  getFieldError("date_of_birth")
                }
              />
            </View>

            <View style={styles.formHalf}>
              <Dropdown
                label="Gender"
                value={formData.gender || ""}
                onValueChange={(value) => {
                  setFieldValue("gender", value);
                  clearFieldError("gender");
                }}
                options={genderOptions}
                placeholder="Select gender"
                error={validationErrors.gender || getFieldError("gender")}
              />
            </View>
          </View>
        </View>

        {/* Account Settings */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderIcon}>
              <Settings size={20} color={colors.primary} />
            </View>
            <Text style={styles.sectionTitle}>Account Settings</Text>
          </View>

          <View style={styles.formGroup}>
            <Dropdown
              label="User Role"
              value={formData.role || ""}
              onValueChange={(value) => {
                setFieldValue("role", value);
                clearFieldError("role");
              }}
              options={roleOptions}
              placeholder="Select user role"
              error={validationErrors.role || getFieldError("role")}
              required
            />
          </View>

          <View style={styles.formGroup}>
            <Dropdown
              label="Account Status"
              value={formData.status || ""}
              onValueChange={(value) => {
                setFieldValue("status", value);
                clearFieldError("status");
              }}
              options={statusOptions}
              placeholder="Select account status"
              error={validationErrors.status || getFieldError("status")}
              required
            />
          </View>

          {/* Status Description */}
          {formData.status && (
            <View style={styles.statusDescription}>
              <View style={styles.statusDescriptionIcon}>
                <Activity size={16} color={getStatusColor(formData.status)} />
              </View>
              <Text
                style={[
                  styles.statusDescriptionText,
                  { color: getStatusColor(formData.status) },
                ]}
              >
                {getStatusDescription(formData.status)}
              </Text>
            </View>
          )}
        </View>

        {/* Password Section (for new users) */}
        {showPasswordFields && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionHeaderIcon}>
                <Shield size={20} color={colors.primary} />
              </View>
              <Text style={styles.sectionTitle}>Security</Text>
            </View>

            <View style={styles.formRow}>
              <View style={styles.formHalf}>
                <TextInput
                  label="Password"
                  value={formData.password || ""}
                  onChangeText={(text) => {
                    setFieldValue("password", text);
                    clearFieldError("password");
                  }}
                  placeholder="Enter password"
                  secureTextEntry
                  error={validationErrors.password || getFieldError("password")}
                  required
                />
              </View>

              <View style={styles.formHalf}>
                <TextInput
                  label="Confirm Password"
                  value={formData.confirm_password || ""}
                  onChangeText={(text) => {
                    setFieldValue("confirm_password", text);
                    clearFieldError("confirm_password");
                  }}
                  placeholder="Confirm password"
                  secureTextEntry
                  error={
                    validationErrors.confirm_password ||
                    getFieldError("confirm_password")
                  }
                  required
                />
              </View>
            </View>
          </View>
        )}

        {/* Error Display */}
        {(validationErrors.general || errors.general) && (
          <View style={styles.errorContainer}>
            <View style={styles.errorIcon}>
              <AlertCircle size={16} color={colors.error} />
            </View>
            <Text style={styles.errorText}>
              {validationErrors.general || errors.general}
            </Text>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <Button
            title={userId ? "Update User" : "Create User"}
            onPress={handleFormSubmit}
            loading={loading || isSubmitting}
            disabled={loading || isSubmitting || !canSubmit}
            variant="primary"
            icon={
              <Save
                size={20}
                color={canSubmit ? colors.white : colors.textSecondary}
              />
            }
          />

          {hasChanges && (
            <Button
              title="Reset Changes"
              onPress={handleReset}
              variant="outline"
              disabled={loading || isSubmitting}
              icon={<RotateCcw size={20} color={colors.primary} />}
            />
          )}

          {onCancel && (
            <Button
              title="Cancel"
              onPress={onCancel}
              variant="outline"
              disabled={loading || isSubmitting}
            />
          )}
        </View>

        {/* Form Status */}
        {hasChanges && (
          <View style={styles.statusContainer}>
            <View style={styles.statusIcon}>
              <AlertCircle size={14} color={colors.warning} />
            </View>
            <Text style={styles.statusText}>You have unsaved changes</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );

  function getFieldError(fieldName: string) {
    return (errors as any)[fieldName] || "";
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    padding: 20,
    borderRadius: 16,
    marginBottom: 24,
    shadowColor: colors.shadowMedium,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  headerIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 4,
    lineHeight: 28,
  },
  subtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    lineHeight: 20,
    fontWeight: "500",
  },
  section: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: colors.shadowMedium,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    gap: 12,
  },
  sectionHeaderIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
    lineHeight: 24,
  },
  formGroup: {
    marginBottom: 20,
  },
  formRow: {
    flexDirection: "row",
    gap: 16,
  },
  formHalf: {
    flex: 1,
  },
  statusDescription: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderLeftWidth: 3,
  },
  statusDescriptionIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  statusDescriptionText: {
    fontSize: 13,
    flex: 1,
    fontWeight: "600",
    lineHeight: 18,
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.errorLight,
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: colors.error,
  },
  errorIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.error + "20",
    alignItems: "center",
    justifyContent: "center",
  },
  errorText: {
    fontSize: 14,
    color: colors.error,
    flex: 1,
    fontWeight: "600",
    lineHeight: 18,
  },
  buttonContainer: {
    gap: 16,
    marginBottom: 20,
  },
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.warningLight,
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: colors.warning,
  },
  statusIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.warning + "20",
    alignItems: "center",
    justifyContent: "center",
  },
  statusText: {
    fontSize: 13,
    color: colors.warning,
    fontWeight: "600",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.backgroundSecondary,
    padding: 32,
  },
  loadingText: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: 16,
  },
});
