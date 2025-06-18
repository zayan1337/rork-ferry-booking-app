import { useEffect } from 'react';
import { useRouter } from 'expo-router';

export default function NewBookingRedirect() {
  const router = useRouter();
  
  useEffect(() => {
    // Redirect to the correct agent new booking route
    router.replace('/(app)/(agent)/booking/new' as any);
  }, [router]);

  return null; // This component won't render anything
} 