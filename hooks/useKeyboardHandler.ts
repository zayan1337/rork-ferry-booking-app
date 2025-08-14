import { useState, useEffect, useRef, useCallback } from 'react';
import { Keyboard } from 'react-native';

interface UseKeyboardHandlerProps {
  scrollViewRef: React.RefObject<any>;
}

export const useKeyboardHandler = ({
  scrollViewRef,
}: UseKeyboardHandlerProps) => {
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [activeInput, setActiveInput] = useState<string | null>(null);
  const inputRefs = useRef<Record<string, any>>({});

  const scrollToInput = useCallback(
    (inputKey: string) => {
      setTimeout(() => {
        const inputRef = inputRefs.current[inputKey];
        if (inputRef && scrollViewRef.current) {
          inputRef.measureLayout(
            scrollViewRef.current,
            (x: number, y: number) => {
              const scrollOffset = y - 100;
              scrollViewRef.current?.scrollTo({
                x: 0,
                y: Math.max(0, scrollOffset),
                animated: true,
              });
            },
            () => {
              // Fallback if measureLayout fails
            }
          );
        }
      }, 100);
    },
    [scrollViewRef]
  );

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      e => {
        setKeyboardHeight(e.endCoordinates.height);
        if (activeInput) {
          scrollToInput(activeInput);
        }
      }
    );

    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
        setActiveInput(null);
      }
    );

    return () => {
      keyboardDidShowListener?.remove();
      keyboardDidHideListener?.remove();
    };
  }, [activeInput, scrollToInput]);

  const handleInputFocus = useCallback(
    (inputKey: string) => {
      setActiveInput(inputKey);
      scrollToInput(inputKey);
    },
    [scrollToInput]
  );

  const setInputRef = useCallback((inputKey: string, ref: any) => {
    inputRefs.current[inputKey] = ref;
  }, []);

  return {
    keyboardHeight,
    activeInput,
    handleInputFocus,
    setInputRef,
    scrollToInput,
  };
};
