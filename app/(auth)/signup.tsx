import { useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Alert, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "../../src/context/AuthContext";

export default function SignUp() {
  const router = useRouter();
  

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const { signUp } = useAuth();

  

  const showAlert = (title: string, message: string) => {
    if (Platform.OS === "web") {
      window.alert(`${title}\n\n${message}`);
      return;
    }

    Alert.alert(title, message);
  };

  const handleSignUp = async () => {
    if (!email || !password || !confirmPassword) {
      showAlert("Error", "Must fill in each of the fields!");
      return;
    }

    if (password.length < 6) {
      showAlert("Error","Password must be at least 6 characters!");
      return;
    }

    if (password !== confirmPassword) {
      showAlert("Error", "Passwords do not match!");
      return;
    }

    setIsLoading(true);

    try {
      await signUp(email, password);
      router.replace("/(auth)/setUpProfile");
    } catch (error) {
      console.error("Error", error);
      showAlert(
        "Error",
        error instanceof Error ? error.message : "Sign up failed!"
      );
    } finally {
      setIsLoading(false);
    }


  };

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.brandMark}>
          <Text style={styles.brandMarkText}>GP</Text>
        </View>

        <View style={styles.copy}>
          <Text style={styles.kicker}>Gym Planner</Text>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>
            Start your fitness journey and track your progression today!
          </Text>

          <TextInput
            style={styles.input}
            placeholder="enter email..."
            placeholderTextColor="#94a3b8"
            keyboardType="email-address"
            autoComplete="email"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />

          <TextInput
            style={styles.input}
            placeholder="create password..."
            placeholderTextColor="#94a3b8"
            autoComplete="new-password"
            autoCapitalize="none"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          <TextInput
            style={styles.input}
            placeholder="confirm password..."
            placeholderTextColor="#94a3b8"
            autoComplete="new-password"
            autoCapitalize="none"
            secureTextEntry
            value={confirmPassword}
            onChangeText={setConfirmPassword}
          />

          <TouchableOpacity style={styles.primaryButton} onPress={handleSignUp}>
            { isLoading ? <ActivityIndicator/> :
                <Text style={styles.primaryButtonText}>Sign Up</Text>
            }
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => router.push("/(auth)/login")}
          >
            <Text style={styles.secondaryButtonText}>
              Already have an account? <Text style={styles.linkText}>Log In</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f6f8fb",
  },
  container: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  brandMark: {
    width: 78,
    height: 78,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 22,
    backgroundColor: "#0f766e",
    shadowColor: "#0f766e",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.22,
    shadowRadius: 24,
    elevation: 7,
  },
  brandMarkText: {
    color: "#ffffff",
    fontSize: 26,
    fontWeight: "900",
    lineHeight: 32,
  },
  copy: {
    gap: 8,
  },
  kicker: {
    color: "#0f766e",
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 18,
    textTransform: "uppercase",
  },
  title: {
    color: "#172033",
    fontSize: 34,
    fontWeight: "900",
    lineHeight: 40,
  },
  subtitle: {
    maxWidth: 320,
    color: "#64748b",
    fontSize: 16,
    fontWeight: "600",
    lineHeight: 24,
    marginBottom: 8,
  },
  input: {
    height: 52,
    backgroundColor: "#ffffff",
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: "#172033",
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  primaryButton: {
    height: 52,
    backgroundColor: "#0f766e",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    shadowColor: "#0f766e",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 5,
  },
  primaryButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },
  secondaryButton: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    marginTop: 4,
  },
  secondaryButtonText: {
    color: "#64748b",
    fontSize: 14,
    fontWeight: "600",
  },
  linkText: {
    color: "#0f766e",
    fontWeight: "800",
  },
});
