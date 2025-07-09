import { useState, useCallback, useMemo } from 'react';
import type { ModalStates } from '@/types/customer';

export const useModalState = () => {
    const [modalStates, setModalStates] = useState<ModalStates>({
        showFromModal: false,
        showToModal: false,
        showDateModal: false,
    });

    const openModal = useCallback((modalName: keyof ModalStates) => {
        setModalStates(prev => ({
            ...prev,
            [modalName]: true,
        }));
    }, []);

    const closeModal = useCallback((modalName: keyof ModalStates) => {
        setModalStates(prev => ({
            ...prev,
            [modalName]: false,
        }));
    }, []);

    const closeAllModals = () => {
        setModalStates({
            showFromModal: false,
            showToModal: false,
            showDateModal: false,
        });
    };

    return useMemo(() => ({
        modalStates,
        openModal,
        closeModal,
        closeAllModals,
    }), [modalStates, openModal, closeModal]);
}; 