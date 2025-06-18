import { useEffect } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';

export default function BookingRedirect() {
    const router = useRouter();
    const { id } = useLocalSearchParams();

    useEffect(() => {
        // Redirect to the correct agent booking route
        router.replace(`/(app)/(agent)/client/${id}` as any);
    }, [id, router]);

    return null; // This component won't render anything
} 