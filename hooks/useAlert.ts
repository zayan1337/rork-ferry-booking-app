import { useState, useCallback } from 'react';
import type { AlertOptions, AlertButton } from '@/components/Alert';

interface ShowAlertOptions extends Omit<AlertOptions, 'buttons'> {
  buttons?: AlertButton[];
}

export const useAlert = () => {
  const [alertState, setAlertState] = useState<{
    visible: boolean;
    options: AlertOptions | null;
  }>({
    visible: false,
    options: null,
  });

  const showAlert = useCallback((options: ShowAlertOptions) => {
    setAlertState({
      visible: true,
      options: options as AlertOptions,
    });
  }, []);

  const hideAlert = useCallback(() => {
    setAlertState(prev => ({
      ...prev,
      visible: false,
    }));
    // Clear options after animation
    setTimeout(() => {
      setAlertState({
        visible: false,
        options: null,
      });
    }, 300);
  }, []);

  // Convenience methods for common alert types
  const showSuccess = useCallback(
    (title: string, message: string, onPress?: () => void) => {
      showAlert({
        title,
        message,
        type: 'success',
        buttons: [{ text: 'OK', onPress }],
      });
    },
    [showAlert]
  );

  const showError = useCallback(
    (title: string, message: string, onPress?: () => void) => {
      showAlert({
        title,
        message,
        type: 'error',
        buttons: [{ text: 'OK', onPress }],
      });
    },
    [showAlert]
  );

  const showWarning = useCallback(
    (title: string, message: string, onPress?: () => void) => {
      showAlert({
        title,
        message,
        type: 'warning',
        buttons: [{ text: 'OK', onPress }],
      });
    },
    [showAlert]
  );

  const showInfo = useCallback(
    (title: string, message: string, onPress?: () => void) => {
      showAlert({
        title,
        message,
        type: 'info',
        buttons: [{ text: 'OK', onPress }],
      });
    },
    [showAlert]
  );

  const showConfirmation = useCallback(
    (
      title: string,
      message: string,
      onConfirm: () => void,
      onCancel?: () => void,
      isDestructive: boolean = false
    ) => {
      showAlert({
        title,
        message,
        type: 'confirmation',
        buttons: [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: onCancel,
          },
          {
            text: 'Confirm',
            style: isDestructive ? 'destructive' : 'default',
            onPress: onConfirm,
          },
        ],
      });
    },
    [showAlert]
  );

  // Method to replicate Alert.alert() behavior
  const alert = useCallback(
    (
      title: string,
      message?: string,
      buttons?: AlertButton[],
      type?: AlertOptions['type']
    ) => {
      showAlert({
        title,
        message: message || '',
        type: type || 'info',
        buttons: buttons || [{ text: 'OK' }],
      });
    },
    [showAlert]
  );

  return {
    alertState,
    showAlert,
    hideAlert,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showConfirmation,
    alert, // For compatibility with Alert.alert()
  };
};
