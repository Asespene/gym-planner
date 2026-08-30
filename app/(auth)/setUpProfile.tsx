import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { uploadProfileImage } from "@/lib/supabase/storage";
import { supabase } from "../../lib/supabase/client";

import { useAuth } from "../../src/context/AuthContext";

import { useImagePicker } from "../../src/hooks/useImagePicker";

export default function SetUpProfile() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [username, setUserName] = useState("");
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const { user, updateUser } = useAuth();
  const { pickImage, takePhoto } = useImagePicker();

  const handlePickImagePress = async () => {
    const uri = await pickImage();
    if (uri) {
      setProfileImage(uri);
    }
  };


  const handleTakePhotoPress = async () => {
    const uri = await takePhoto();
    if (uri) {
      setProfileImage(uri);
    } 
  };



  const showAlert = (title: string, message: string) => {
    if (Platform.OS === "web") {
      window.alert(`${title}\n\n${message}`);
      return;
    }

    Alert.alert(title, message);
  };
  
 

 

  const handleComplete = async () => {
    const trimmedName = name.trim();
    const trimmedUsername = username.trim();

    if (!user) {
      showAlert("Error", "You must be signed in to complete your profile.");
      router.replace("/(auth)/signup");
      return;
    }

    if (!trimmedName || !trimmedUsername) {
      showAlert("Error", "Please fill out all of the fields");
      return;
    }

    if (trimmedUsername.length < 3) {
      showAlert("Error", "Username must be at least 3 characters");
      return;
    }

    setIsLoading(true);
    try {
        const { data: existingUser, error: usernameError } = await supabase
            .from("user_profile") 
            .select("id") 
            .eq("username", trimmedUsername)
            .neq("id", user.id)
            .maybeSingle();

        if (usernameError) {
          throw usernameError;
        }

        if (existingUser) {
            showAlert("Error", "Username already exist, choose another one");
            return;
        }

        //upload profile image
        let profileImageUrl: string | undefined;
        if (profileImage) {
          try {
            profileImageUrl = await uploadProfileImage(user.id, profileImage);
          } catch (error) {
            console.error("Error in uploading a profile image", error);

            showAlert("Warning", "Failed to upload profile image");
          }
        }

        //update the profile
        await updateUser({
          name: trimmedName,
          username: trimmedUsername,
          profileImage: profileImageUrl,
          onboardingCompleted: true,
        })

        router.replace("/(tabs)");

    } catch (error) {
        console.error("Error completing profile setup:", error);
        showAlert("Error", "Failed to complete setting up profile");
    } finally {
    setIsLoading(false);
    }

    
  };

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <View style={styles.brandMark}>
              <Text style={styles.brandMarkText}>GP</Text>
            </View>
            <Text style={styles.kicker}>Profile setup</Text>
            <Text style={styles.title}>Make it yours</Text>
            <Text style={styles.subtitle}>
              Add a name, username, and optional photo before building your
              training plan.
            </Text>
          </View>

          <View style={styles.formCard}>
            <View style={styles.avatarWrap}>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={handlePickImagePress}
                style={styles.profileImageButton}
              >
                {profileImage ? (
                  <Image source={{ uri: profileImage }} style={styles.profileImage} />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Ionicons name="person" color="#0f766e" size={34} />
                  </View>
                )}

                <View style={styles.editBadge}>
                  <Ionicons name="camera" color="#ffffff" size={15} />
                </View>
              </TouchableOpacity>
            </View>

            <View style={styles.photoActions}>
              <TouchableOpacity style={styles.photoButton} onPress={handlePickImagePress}>
                <Ionicons name="image-outline" color="#0f766e" size={18} />
                <Text style={styles.photoButtonText}>Library</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.photoButton} onPress={handleTakePhotoPress}>
                <Ionicons name="camera-outline" color="#0f766e" size={18} />
                <Text style={styles.photoButtonText}>Camera</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.fields}>
              <TextInput
                style={styles.input}
                placeholder="Name"
                placeholderTextColor="#94a3b8"
                autoComplete="name"
                autoCapitalize="words"
                returnKeyType="next"
                value={name}
                onChangeText={setName}
              />

              <TextInput
                style={styles.input}
                placeholder="Username"
                placeholderTextColor="#94a3b8"
                autoComplete="username"
                autoCapitalize="none"
                returnKeyType="done"
                value={username}
                onChangeText={setUserName}
              />
            </View>

            <TouchableOpacity
              disabled={isLoading}
              style={[styles.primaryButton, isLoading && styles.primaryButtonDisabled]}
              onPress={handleComplete}
            >
              {isLoading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <>
                  <Text style={styles.primaryButtonText}>Complete Profile</Text>
                  <Ionicons name="arrow-forward" color="#ffffff" size={18} />
                </>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f6f8fb",
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 28,
  },
  header: {
    width: "100%",
    maxWidth: 420,
    alignSelf: "center",
    marginBottom: 22,
  },
  brandMark: {
    width: 58,
    height: 58,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
    backgroundColor: "#0f766e",
    shadowColor: "#0f766e",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 18,
    elevation: 6,
  },
  brandMarkText: {
    color: "#ffffff",
    fontSize: 20,
    fontWeight: "900",
    lineHeight: 26,
  },
  kicker: {
    color: "#0f766e",
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 18,
    textTransform: "uppercase",
  },
  title: {
    marginTop: 6,
    color: "#172033",
    fontSize: 34,
    fontWeight: "900",
    lineHeight: 40,
  },
  subtitle: {
    maxWidth: 340,
    marginTop: 8,
    color: "#64748b",
    fontSize: 16,
    fontWeight: "600",
    lineHeight: 24,
  },
  formCard: {
    width: "100%",
    maxWidth: 420,
    alignSelf: "center",
    padding: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#dbe4ee",
    backgroundColor: "#ffffff",
    shadowColor: "#101828",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 6,
  },
  avatarWrap: {
    alignItems: "center",
    marginBottom: 14,
  },
  profileImageButton: {
    width: 112,
    height: 112,
    borderRadius: 56,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ecfdf5",
    borderWidth: 1.5,
    borderColor: "#99f6e4",
  },
  profileImage: {
    width: "100%",
    height: "100%",
    borderRadius: 56,
  },
  avatarPlaceholder: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  editBadge: {
    position: "absolute",
    right: 2,
    bottom: 6,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0f766e",
    borderWidth: 3,
    borderColor: "#ffffff",
  },
  photoActions: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 18,
  },
  photoButton: {
    flex: 1,
    height: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ccfbf1",
    backgroundColor: "#f0fdfa",
  },
  photoButtonText: {
    color: "#0f766e",
    fontSize: 14,
    fontWeight: "800",
    lineHeight: 18,
  },
  fields: {
    gap: 10,
  },
  input: {
    height: 52,
    backgroundColor: "#ffffff",
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    borderRadius: 8,
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 16,
    borderRadius: 8,
    backgroundColor: "#0f766e",
    shadowColor: "#0f766e",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 5,
  },
  primaryButtonDisabled: {
    opacity: 0.7,
  },
  primaryButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "800",
    lineHeight: 20,
  },
});
