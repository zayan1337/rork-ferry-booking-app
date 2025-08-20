export interface EditModalProps {
  isVisible: boolean;
  onClose: () => void;
  onSave: (data: EditModalState) => void;
  initialData: EditModalState;
}

export interface EditModalState {
  fullName: string;
  mobileNumber: string;
  dateOfBirth: string | null;
  username: string;
}

export interface ProfileFormErrors {
  fullName?: string;
  mobileNumber?: string;
  dateOfBirth?: string;
  username?: string;
}
