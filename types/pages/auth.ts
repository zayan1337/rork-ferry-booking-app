export interface RegisterFormData {
  email: string;
  password: string;
  confirmPassword: string;
  fullName: string;
  mobileNumber: string;
  dateOfBirth: string | null;
  username: string;
}

export interface LoginFormData {
  email: string;
  password: string;
}

export interface ForgotPasswordFormData {
  email: string;
}

export interface AuthFormErrors {
  email?: string;
  password?: string;
  confirmPassword?: string;
  fullName?: string;
  mobileNumber?: string;
  dateOfBirth?: string;
  username?: string;
} 