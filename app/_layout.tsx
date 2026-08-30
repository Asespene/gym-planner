import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect } from "react";
import { AuthProvider, useAuth } from "../src/context/AuthContext";

function RouteGaurd() {
  const router = useRouter();

  const { user, isLoadingSession } = useAuth();

  const segments = useSegments();

  //create segments to figure out which part of the app we are in
  const inAuth = segments[0] === "(auth)";
  const inTabs = segments[0] === "(tabs)";
  const inOnboarding = segments[1] === "setUpProfile";

  useEffect(() => {
    if (isLoadingSession) {
      return;
    }

    if (!user) {
      if (!inAuth || inOnboarding) {
        router.replace("/(auth)/login");
      }
      return;
    }

    if (!user.onboardingCompleted) {
      if (!inOnboarding) {
        router.replace("/(auth)/setUpProfile");
      }
      return;
    }

    if (inAuth) {
      router.replace("/(tabs)");
    }


   
  }, [user, inAuth, router, isLoadingSession, inOnboarding]);


  return (
    <Stack
        screenOptions={{
          headerStyle: { backgroundColor: "#0f172a"},
          animation: "slide_from_right",
          headerTintColor: "#ffffff",
          headerTitleStyle: {
            fontWeight: "800",
          },
          headerShown: false,
        }}
      >
        <Stack.Screen 
          name="(auth)"
        />

        <Stack.Screen 
          name="(tabs)"
        />

        <Stack.Screen
          name="create-user-plan"
          options={{
            title: "Create your plan",
            headerShown: true,
          }}
        />

        <Stack.Screen 
          name="characters/[id]"
          options={{
            title: "Character Details",
            headerShown: true,
          }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  

  return (
    <AuthProvider>
      <RouteGaurd />
    </AuthProvider>
  );
}
