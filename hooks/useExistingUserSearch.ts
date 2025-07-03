import { useState, useEffect } from 'react';
import { useAgentStore } from '@/store/agent/agentStore';

export const useExistingUserSearch = (email: string) => {
    const { searchExistingUser, isLoading } = useAgentStore();
    const [existingUser, setExistingUser] = useState<any>(null);
    const [isSearching, setIsSearching] = useState(false);

    useEffect(() => {
        const searchUser = async () => {
            if (!email || email.length < 3) {
                setExistingUser(null);
                return;
            }

            // Simple email validation
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                setExistingUser(null);
                return;
            }

            setIsSearching(true);

            try {
                const user = await searchExistingUser(email);
                setExistingUser(user);
            } catch (error) {
                console.error('Error searching for existing user:', error);
                setExistingUser(null);
            } finally {
                setIsSearching(false);
            }
        };

        const timeoutId = setTimeout(searchUser, 500); // Debounce search
        return () => clearTimeout(timeoutId);
    }, [email, searchExistingUser]);

    const clearSearch = () => {
        setExistingUser(null);
    };

    return {
        existingUser,
        isSearching: isSearching || isLoading,
        clearSearch,
    };
}; 