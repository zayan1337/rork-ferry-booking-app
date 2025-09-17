import { Booking, Seat } from './index';
import { TextStyle, ViewStyle } from 'react-native';

export type TicketCardProps = {
  booking: Booking;
};

export type SeatSelectorProps = {
  seats: Seat[];
  selectedSeats: Seat[];
  onSeatToggle: (seat: Seat) => Promise<void> | void;
  maxSeats?: number;
  isLoading?: boolean;
  loadingSeats?: Set<string>;
  seatErrors?: Record<string, string>;
};

export type InputProps = {
  label?: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  error?: string;
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  disabled?: boolean;
  multiline?: boolean;
  numberOfLines?: number;
  style?: ViewStyle;
  inputStyle?: TextStyle;
  labelStyle?: TextStyle;
  required?: boolean;
  onFocus?: () => void;
  leftIcon?: React.ReactNode;
};

export type DropdownItem = {
  label: string;
  value: string;
};

export type DropdownProps = {
  label?: string;
  items: DropdownItem[];
  value: string | null;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  searchable?: boolean;
  required?: boolean;
};

export type DateSelectorProps = {
  label: string;
  value: string | null;
  onChange: (date: string) => void;
  minDate?: string;
  maxDate?: string;
  isDateOfBirth?: boolean;
  error?: string;
  required?: boolean;
};

export type DatePickerProps = {
  label?: string;
  value: string | null;
  onChange: (date: string) => void;
  minDate?: string;
  maxDate?: string;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  required?: boolean;
};

export type CardProps = {
  children: React.ReactNode;
  style?: ViewStyle;
  variant?: 'default' | 'elevated' | 'outlined';
  padding?: 'none' | 'small' | 'medium' | 'large';
};

export type ButtonProps = {
  onPress: () => void;
  title: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'text';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  fullWidth?: boolean;
  icon?: React.ReactNode;
};

export type BookingCardProps = {
  booking: Booking;
  onPress: (booking: Booking) => void;
};

export type SafeViewProps = {
  children: React.ReactNode;
  style?: ViewStyle;
  backgroundColor?: string;
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
  mode?: 'padding' | 'margin';
};
