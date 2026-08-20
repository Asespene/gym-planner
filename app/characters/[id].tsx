import { useLocalSearchParams } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

export default function CharacterDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.kicker}>Character Details</Text>
        <Text style={styles.title}>Character {id}</Text>
        <Text style={styles.subtitle}>This screen is ready for character details.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    backgroundColor: "#f6f8fb",
  },
  card: {
    width: "100%",
    maxWidth: 360,
    alignItems: "center",
    gap: 8,
    padding: 22,
    borderRadius: 8,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#dbe4ee",
    shadowColor: "#101828",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 5,
  },
  kicker: {
    color: "#0f766e",
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 16,
    textTransform: "uppercase",
  },
  title: {
    color: "#172033",
    fontSize: 28,
    fontWeight: "900",
    lineHeight: 34,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    fontWeight: "600",
    lineHeight: 24,
    color: "#64748b",
    textAlign: "center",
  },
});
