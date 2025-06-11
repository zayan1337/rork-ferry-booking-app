import React, { useEffect } from "react";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useFonts } from "expo-font";
import { Stack, useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import Colors from "@/constants/colors";
import { useAuthStore } from "../store/authStore";

export const unstable_settings = {
  initialRouteName: "(auth)",
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    ...FontAwesome.font,
  });

  useEffect(() => {
    if (error) {
      console.error(error);
      throw error;
    }
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return <RootLayoutNav />;
}

function RootLayoutNav() {
  const router = useRouter();
  const { isAuthenticated, isLoading, checkAuth } = useAuthStore();

  useEffect(() => {
    // Check authentication status only once when component mounts
    checkAuth();
  }, []);

  useEffect(() => {
    // Only redirect if we're not loading and the auth state has been determined
    if (!isLoading) {
      if (!isAuthenticated) {
        // Only redirect if we're not already on the auth screen
        router.replace('/(auth)');
      } else {
        // Only redirect if we're not already on the app screen
        router.replace('/(app)/(tabs)');
      }
    }
  }, [isAuthenticated, isLoading]);

  return (
    <>
      <StatusBar style="dark" />
      <Stack>
        <Stack.Screen 
          name="(auth)" 
          options={{ 
            headerShown: false,
            // Prevent going back to auth screen once logged in
            gestureEnabled: false
          }} 
        />
        <Stack.Screen 
          name="(app)" 
          options={{ 
            headerShown: false,
            // Prevent going back to auth screen once logged in
            gestureEnabled: false
          }} 
        />
      </Stack>
    </>
  );
}