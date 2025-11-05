import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  Platform,
  ScrollView,
} from 'react-native';
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Info,
  X,
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import Button from '@/components/Button';

export type AlertType =
  | 'success'
  | 'error'
  | 'warning'
  | 'info'
  | 'confirmation';

export interface AlertButton {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

export interface AlertOptions {
  title: string;
  message: string;
  type?: AlertType;
  buttons?: AlertButton[];
  onDismiss?: () => void;
  dismissible?: boolean;
}

interface AlertProps {
  visible: boolean;
  options: AlertOptions | null;
  onClose: () => void;
}

const Alert: React.FC<AlertProps> = ({ visible, options, onClose }) => {
  if (!options) return null;

  const {
    title,
    message,
    type = 'info',
    buttons = [{ text: 'OK', onPress: onClose }],
    dismissible = true,
  } = options;

  const handleBackdropPress = () => {
    if (dismissible) {
      onClose();
    }
  };

  const getIcon = () => {
    const iconSize = 48;
    const iconProps = { size: iconSize };

    switch (type) {
      case 'success':
        return <CheckCircle {...iconProps} color={Colors.success} />;
      case 'error':
        return <XCircle {...iconProps} color={Colors.error} />;
      case 'warning':
        return <AlertTriangle {...iconProps} color={Colors.warning} />;
      case 'confirmation':
        return <AlertTriangle {...iconProps} color={Colors.warning} />;
      case 'info':
      default:
        return <Info {...iconProps} color={Colors.primary} />;
    }
  };

  const getIconBackground = () => {
    switch (type) {
      case 'success':
        return '#d4edda';
      case 'error':
        return '#f8d7da';
      case 'warning':
        return '#fff3cd';
      case 'confirmation':
        return '#fff3cd';
      case 'info':
      default:
        return Colors.highlight;
    }
  };

  const renderButtons = () => {
    if (buttons.length === 0) {
      return (
        <Button title='OK' onPress={onClose} style={styles.singleButton} />
      );
    }

    if (buttons.length === 1) {
      const button = buttons[0];
      const variant = button.style === 'destructive' ? 'primary' : 'primary';
      const buttonStyle =
        button.style === 'destructive'
          ? [styles.singleButton, styles.destructiveButton]
          : styles.singleButton;

      const buttonStyleArray = Array.isArray(buttonStyle)
        ? buttonStyle
        : [buttonStyle];
      const textStyleValue =
        button.style === 'destructive'
          ? styles.destructiveButtonText
          : undefined;

      return (
        <Button
          title={button.text}
          onPress={() => {
            button.onPress?.();
            onClose();
          }}
          variant={variant}
          style={buttonStyleArray[0]}
          textStyle={textStyleValue}
        />
      );
    }

    return (
      <View style={styles.buttonRow}>
        {buttons.map((button, index) => {
          const isCancel = button.style === 'cancel';
          const isDestructive = button.style === 'destructive';
          const variant = isCancel ? 'outline' : 'primary';

          const buttonStyles = [
            styles.multiButton,
            isDestructive && styles.destructiveButton,
          ].filter(Boolean);

          return (
            <Button
              key={index}
              title={button.text}
              onPress={() => {
                button.onPress?.();
                onClose();
              }}
              variant={variant}
              style={buttonStyles[0] || styles.multiButton}
              textStyle={
                isDestructive ? styles.destructiveButtonText : undefined
              }
            />
          );
        })}
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType='fade'
      onRequestClose={dismissible ? onClose : undefined}
    >
      <Pressable style={styles.overlay} onPress={handleBackdropPress}>
        <Pressable style={styles.container} onPress={e => e.stopPropagation()}>
          <View style={styles.content}>
            {/* Close button */}
            {dismissible && (
              <Pressable
                style={styles.closeButton}
                onPress={onClose}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <X size={20} color={Colors.textSecondary} />
              </Pressable>
            )}

            {/* Icon */}
            <View
              style={[
                styles.iconContainer,
                { backgroundColor: getIconBackground() },
              ]}
            >
              {getIcon()}
            </View>

            {/* Content */}
            <View style={styles.body}>
              <Text style={styles.title}>{title}</Text>
              <ScrollView
                style={styles.messageContainer}
                showsVerticalScrollIndicator={false}
              >
                <Text style={styles.message}>{message}</Text>
              </ScrollView>
            </View>

            {/* Buttons */}
            <View style={styles.footer}>{renderButtons()}</View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  container: {
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  content: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  closeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    padding: 8,
    zIndex: 10,
    borderRadius: 20,
    backgroundColor: 'transparent',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginTop: 24,
    marginBottom: 20,
  },
  body: {
    paddingHorizontal: 24,
    paddingBottom: 8,
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  messageContainer: {
    maxHeight: 200,
    width: '100%',
  },
  message: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  footer: {
    padding: 16,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  singleButton: {
    width: '100%',
  },
  destructiveButton: {
    backgroundColor: Colors.error,
  },
  destructiveButtonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  multiButton: {
    flex: 1,
  },
});

export default Alert;
