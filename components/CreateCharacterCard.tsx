import {
  Pressable,
  StyleSheet,
  Text,
  View
} from "react-native";

import {
  useRouter
} from "expo-router";
import { Ionicons } from "@expo/vector-icons";


export default function CreateCharacterCard() {
  const router = useRouter();

  return (
    <Pressable
      style={({ pressed }) => [
        styles.characterCard,
        pressed && styles.characterCardPressed,
      ]}
      onPress={() => router.push("/create-user-plan")}
    >
      <View style={styles.iconShell}>
        <Ionicons name="add" color="#0f766e" size={30} />
      </View>

      <View style={styles.copy}>
        <Text style={styles.title}>New plan</Text>
        <Text style={styles.subtitle}>Build a character</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  characterCard: {
    width: 132,
    minHeight: 148,
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#ecfdf5",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    borderWidth: 1,
    borderColor: "#99f6e4",
    borderStyle: "dashed",
    shadowColor: "#0f766e",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 4,
  },
  characterCardPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.98 }],
  },
  iconShell: {
    width: 64,
    height: 64,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#ccfbf1",
  },
  copy: {
    width: "100%",
    gap: 2,
  },
  title: {
    color: "#134e4a",
    fontSize: 15,
    fontWeight: "800",
    lineHeight: 20,
    textAlign: "center",
  },
  subtitle: {
    color: "#0f766e",
    fontSize: 11,
    fontWeight: "700",
    lineHeight: 15,
    textAlign: "center",
  },
});
