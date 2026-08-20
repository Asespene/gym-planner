import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";

export default function TabsLayout() {
  return (
    <Tabs
        screenOptions={{
            headerShown: false,
            tabBarActiveTintColor: "#0f766e",
            tabBarInactiveTintColor: "#64748b",
            tabBarLabelStyle: {
                fontSize: 12,
                fontWeight: "700",
            },
            tabBarStyle: {
                height: 70,
                paddingTop: 8,
                paddingBottom: 10,
                borderTopWidth: 1,
                borderTopColor: "#dbe4ee",
                backgroundColor: "#ffffff",
                shadowColor: "#101828",
                shadowOffset: { width: 0, height: -6 },
                shadowOpacity: 0.08,
                shadowRadius: 16,
                elevation: 12,
            },
        }}
    >
        <Tabs.Screen 
            name="index"
            options={{
                title: "Home",
                tabBarIcon: ({size, color, focused}) => (
                    <Ionicons 
                        name={focused ? "home" : "home-outline"}
                        color={color}
                        size={size}
                    />
                ),
            }}
        />

        <Tabs.Screen 
            name="profile"
            options={{
                title: "Profile",
                tabBarIcon: ({color, size, focused}) => (
                    <Ionicons 
                        name={focused ? "person" : "person-outline"}
                        color={color}
                        size={size}
                    />
                ),
            }}
        />
    </Tabs>
  );
}
