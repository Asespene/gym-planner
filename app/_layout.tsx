import { Stack, useRouter } from "expo-router";
import { useEffect } from "react";
import { AuthProvider } from "../src/context/AuthContext";

export default function RootLayout() {
  let isAuth = false;

  const router = useRouter();

  useEffect(() => {
    if (!isAuth) {
      router.replace("/(auth)/login");
    }
    else {
      router.replace("/(tabs)");
    }
  }, [isAuth, router])

  return (
    <AuthProvider>
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
          name="(tabs)"
        />

        <Stack.Screen 
          name="(auth)"
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

    </AuthProvider>
  );
}
