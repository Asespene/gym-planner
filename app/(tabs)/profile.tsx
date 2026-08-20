import { StyleSheet, Text, View } from "react-native";

export default function Profile() {
  return (
    <View style={styles.container}>
      <View style={styles.stack}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>GP</Text>
        </View>
        <Text style={styles.eyebrow}>Member Profile</Text>
        <Text style={styles.title}>Your training hub</Text>
        <Text style={styles.body}>
          Stats, streaks, and preferences can live here when the planner grows.
        </Text>
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
  stack: {
    width: "100%",
    maxWidth: 360,
    alignItems: "center",
    gap: 10,
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
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
    backgroundColor: "#0f766e",
  },
  avatarText: {
    color: "#ffffff",
    fontSize: 24,
    fontWeight: "900",
    lineHeight: 30,
  },
  eyebrow: {
    color: "#0f766e",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0,
    lineHeight: 16,
    textTransform: "uppercase",
  },
  title: {
    color: "#172033",
    fontSize: 26,
    fontWeight: "900",
    lineHeight: 32,
    textAlign: "center",
  },
  body: {
    color: "#64748b",
    fontSize: 15,
    fontWeight: "600",
    lineHeight: 22,
    textAlign: "center",
  },
});
