import React, { createContext, useContext, ReactNode } from 'react';
import Alert from './Alert';
import { useAlert } from '@/hooks/useAlert';
import type { AlertOptions, AlertButton } from './Alert';

interface AlertContextType {
  showAlert: (options: AlertOptions) => void;
  hideAlert: () => void;
  showSuccess: (title: string, message: string, onPress?: () => void) => void;
  showError: (title: string, message: string, onPress?: () => void) => void;
  showWarning: (title: string, message: string, onPress?: () => void) => void;
  showInfo: (title: string, message: string, onPress?: () => void) => void;
  showConfirmation: (
    title: string,
    message: string,
    onConfirm: () => void,
    onCancel?: () => void,
    isDestructive?: boolean
  ) => void;
  alert: (
    title: string,
    message?: string,
    buttons?: AlertButton[],
    type?: AlertOptions['type']
  ) => void;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export const useAlertContext = () => {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error('useAlertContext must be used within AlertProvider');
  }
  return context;
};

interface AlertProviderProps {
  children: ReactNode;
}

export const AlertProvider: React.FC<AlertProviderProps> = ({ children }) => {
  const alert = useAlert();

  return (
    <AlertContext.Provider
      value={{
        showAlert: alert.showAlert,
        hideAlert: alert.hideAlert,
        showSuccess: alert.showSuccess,
        showError: alert.showError,
        showWarning: alert.showWarning,
        showInfo: alert.showInfo,
        showConfirmation: (
          title: string,
          message: string,
          onConfirm: () => void,
          onCancel?: () => void,
          isDestructive?: boolean
        ) => {
          alert.showConfirmation(
            title,
            message,
            onConfirm,
            onCancel,
            isDestructive
          );
        },
        alert: alert.alert,
      }}
    >
      {children}
      <Alert
        visible={alert.alertState.visible}
        options={alert.alertState.options}
        onClose={alert.hideAlert}
      />
    </AlertContext.Provider>
  );
};
