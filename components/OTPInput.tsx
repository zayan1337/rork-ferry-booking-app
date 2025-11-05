import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  Keyboard,
  Clipboard,
} from 'react-native';
import Colors from '@/constants/colors';
import { useAlertContext } from '@/components/AlertProvider';

interface OTPInputProps {
  length?: number;
  value: string;
  onChange: (otp: string) => void;
  error?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  onComplete?: (otp: string) => void;
}

export default function OTPInput({
  length = 6,
  value,
  onChange,
  error,
  disabled = false,
  autoFocus = true,
  onComplete,
}: OTPInputProps) {
  const { showError: showAlertError, showInfo } = useAlertContext();
  const [focusedIndex, setFocusedIndex] = useState(autoFocus ? 0 : -1);
  const [isFocused, setIsFocused] = useState(false);
  const hiddenInputRef = useRef<TextInput>(null);

  // Handle OTP completion
  useEffect(() => {
    if (value.length === length && onComplete) {
      onComplete(value);
    }
  }, [value, length, onComplete]);

  // Auto-focus on mount
  useEffect(() => {
    if (autoFocus && !disabled) {
      setTimeout(() => {
        hiddenInputRef.current?.focus();
        setIsFocused(true);
        setFocusedIndex(0);
      }, 100);
    }
  }, [autoFocus, disabled]);

  const handleHiddenInputChange = (text: string) => {
    // Only allow numeric input
    const numericText = text.replace(/[^0-9]/g, '');

    // Limit to max length
    const limitedText = numericText.slice(0, length);

    // Update the OTP value
    onChange(limitedText);

    // Update focused index based on current length
    setFocusedIndex(
      limitedText.length < length ? limitedText.length : length - 1
    );
  };

  const handleHiddenInputKeyPress = ({ nativeEvent }: any) => {
    if (nativeEvent.key === 'Backspace' && value.length > 0) {
      // Handle backspace - remove last character
      const newValue = value.slice(0, -1);
      onChange(newValue);
      setFocusedIndex(Math.max(0, newValue.length));
    }
  };

  const handleHiddenInputFocus = () => {
    setIsFocused(true);
    if (value.length === 0) {
      setFocusedIndex(0);
    } else {
      setFocusedIndex(Math.min(value.length, length - 1));
    }
  };

  const handleHiddenInputBlur = () => {
    setIsFocused(false);
    setFocusedIndex(-1);
  };

  const handleFieldPress = (index: number) => {
    if (!disabled) {
      // Ensure hidden input is focused
      setTimeout(() => {
        const input = hiddenInputRef.current;
        if (input) {
          input.focus();
          setIsFocused(true);
          setFocusedIndex(index);

          // If clicking on a position before the current length, truncate the value
          if (index < value.length) {
            const newValue = value.slice(0, index);
            onChange(newValue);
            setFocusedIndex(index);
          }
        }
      }, 50);
    }
  };

  const clearOTP = () => {
    onChange('');
    setFocusedIndex(0);
    hiddenInputRef.current?.focus();
    setIsFocused(true);
  };

  const handlePaste = async () => {
    try {
      const clipboardContent = await Clipboard.getString();
      const numericContent = clipboardContent.replace(/[^0-9]/g, '');

      if (numericContent.length > 0) {
        const pastedOTP = numericContent.slice(0, length);
        onChange(pastedOTP);

        // Update focus to the end of pasted content
        const newFocusedIndex = Math.min(pastedOTP.length, length - 1);
        setFocusedIndex(newFocusedIndex);

        // Ensure hidden input stays focused
        hiddenInputRef.current?.focus();
        setIsFocused(true);
      } else {
        showInfo(
          'Invalid Code',
          'Clipboard does not contain a valid numeric code.'
        );
      }
    } catch (error) {
      showAlertError('Paste Error', 'Unable to paste from clipboard.');
    }
  };

  return (
    <View style={styles.container}>
      {/* Hidden TextInput for actual input handling */}
      <TextInput
        ref={hiddenInputRef}
        style={styles.hiddenInput}
        value={value}
        onChangeText={handleHiddenInputChange}
        onKeyPress={handleHiddenInputKeyPress}
        onFocus={handleHiddenInputFocus}
        onBlur={handleHiddenInputBlur}
        keyboardType='number-pad'
        maxLength={length}
        autoCorrect={false}
        autoCapitalize='none'
        blurOnSubmit={false}
        editable={!disabled}
      />

      {/* Visual OTP fields */}
      <View style={styles.inputContainer}>
        {Array.from({ length }, (_, index) => (
          <Pressable
            key={index}
            style={[
              styles.inputWrapper,
              focusedIndex === index && isFocused && styles.inputWrapperFocused,
              error && styles.inputWrapperError,
              disabled && styles.inputWrapperDisabled,
            ]}
            onPress={() => handleFieldPress(index)}
            disabled={disabled}
          >
            <Text
              style={[
                styles.input,
                focusedIndex === index && isFocused && styles.inputFocused,
                error && styles.inputError,
                disabled && styles.inputDisabled,
              ]}
            >
              {value[index] || ''}
            </Text>
          </Pressable>
        ))}
      </View>

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <Pressable
        onPress={() => Keyboard.dismiss()}
        style={styles.dismissButton}
      >
        <Text style={styles.dismissButtonText}>Hide Keyboard</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  hiddenInput: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: 60,
    opacity: 0,
    zIndex: 1,
  },
  inputContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  inputWrapper: {
    width: 50,
    height: 60,
    marginHorizontal: 6,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    display: 'flex',
  },
  inputWrapperFocused: {
    borderColor: Colors.primary,
    backgroundColor: Colors.background,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
    transform: [{ scale: 1.02 }],
  },
  inputWrapperError: {
    borderColor: Colors.error,
  },
  inputWrapperDisabled: {
    backgroundColor: Colors.inactive,
    borderColor: Colors.border,
    opacity: 0.6,
  },
  input: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'center',
    lineHeight: 28,
    letterSpacing: 1,
    includeFontPadding: false,
  },
  inputFocused: {
    color: Colors.primary,
  },
  inputError: {
    color: Colors.error,
  },
  inputDisabled: {
    color: Colors.textSecondary,
  },
  errorContainer: {
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  errorText: {
    color: Colors.error,
    fontSize: 14,
    textAlign: 'center',
  },
  dismissButton: {
    alignSelf: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  dismissButtonText: {
    color: Colors.textSecondary,
    fontSize: 14,
  },
});
