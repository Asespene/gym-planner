import { Ionicons } from "@expo/vector-icons";
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { useState } from "react";

import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "../../src/context/AuthContext";

import { uploadProfileImage } from "@/lib/supabase/storage";
import { useImagePicker } from "../../src/hooks/useImagePicker";

import BottomSheetComponent from "../../components/BottomSheet";

export default function Profile() {
  const { user, updateUser, signOut } = useAuth();

  const { takePhoto, pickImage } = useImagePicker();

  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const [isAvatarSheetOpen, setIsAvatarSheetOpen] = useState(false);

  const handlePickImagePress = async () => {
    const uri = await pickImage();

    if (!uri || !user) {
      return;
    }

    setIsUploading(true);
    
    try {
      const profileImageUrl = await uploadProfileImage(user.id, uri);

      await updateUser({
        profileImage: profileImageUrl
      });


      setProfileImage(uri);
    } catch (error) {
      console.error("Failed to update the profile.", error);
    } finally {
      setIsAvatarSheetOpen(false);
      setIsUploading(false);
    }
  }

  const handleTakePhotoPress = async () => {
    const uri = await takePhoto();
    
    if (!uri || !user) {
      return;
    }

    setIsUploading(true);

    try {
      const profileImageUrl = await uploadProfileImage(user.id, uri);

      await updateUser({
        profileImage: profileImageUrl
      });

      setProfileImage(uri);
    } catch (error) {
      console.error("Error in capturing a photo", error);
    } finally {
      setIsAvatarSheetOpen(false);
      setIsUploading(false);
    }
  }

  const handleSignOut = async () => {
    if (!user) {
      console.error("Error: Not Signed In");
      return;
    }

    if (isUploading) {
      console.error("Upload in progress");
      return;
    }

    try {
      await signOut();
    } catch (error) {
      console.error("Error, Sign out failed", error);
    }
  }


  return (
    <SafeAreaView
      style={styles.container}
      edges={["top", "bottom"]}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.kicker}>Profile</Text>
          <Text style={styles.title}>Your training hub</Text>
          <Text style={styles.subtitle}>
            Manage the account you use for plans, progress, and characters.
          </Text>
        </View>

        {/* Section for the profile image */}
        <View style={styles.formCard}>
          <View style={styles.cardAccent} />

          <View style={styles.avatarWrap}>
            <TouchableOpacity
              style={styles.profileImageButton}
              activeOpacity={0.85}
              onPress={() => setIsAvatarSheetOpen(true)}
            >
              {profileImage ? 
              (
                <Image source={{ uri: profileImage }} style={styles.profileImage}></Image>
              )
              :
              (
                <View style={styles.avatarPlaceholder}>
                  <Ionicons name="person" color="#0f766e" size={42} />
                </View>
              )
              
              }

              <View style={styles.editBadge}>
                <Ionicons name="camera" color="#ffffff" size={15} />
              </View>
            </TouchableOpacity>

            <View style={styles.identity}>
              <Text style={styles.name}>
                {user?.name || "Gym Planner Athlete"}
              </Text>
              <Text style={styles.username}>
                {user?.username ? `@${user.username}` : "Complete your username"}
              </Text>
            </View>
            

          
          </View>

          <View style={styles.divider} />

          <View style={styles.details}>
            <View style={styles.detailRow}>
              <View style={styles.detailIcon}>
                <Ionicons name="mail-outline" color="#0f766e" size={18} />
              </View>
              <View style={styles.detailCopy}>
                <Text style={styles.detailLabel}>Email</Text>
                <Text style={styles.detailValue}>{user?.email || "Not available"}</Text>
              </View>
            </View>

              <TouchableOpacity
                style={styles.signOutButton}
                activeOpacity={0.86}
                onPress={handleSignOut}
              >
                <View style={styles.signOutIcon}>
                  <Ionicons name="log-out-outline" color="#dc2626" size={20} />
                </View>
                <View style={styles.signOutCopy}>
                  <Text style={styles.signOutTitle}>Sign out</Text>
                  <Text style={styles.signOutSubtitle}>Leave this account on this device</Text>
                </View>
                <Ionicons name="chevron-forward" color="#f87171" size={18} />
              </TouchableOpacity>

            
          </View>
        </View>

        {/* Section for the buttons of the profile page that includes the logout */}
        <View>

        </View>
      </ScrollView>


      <BottomSheetComponent
        isPresented={isAvatarSheetOpen}
        onDismiss={()=> setIsAvatarSheetOpen(false)}
        title="Update profile picture"
      >
        <TouchableOpacity
          style={styles.sheetAction}
          activeOpacity={0.86}
          onPress={handlePickImagePress}
        >
          <View style={styles.sheetActionIcon}>
            <Ionicons name="image-outline" color="#0f766e" size={21} />
          </View>
          <View style={styles.sheetActionCopy}>
            <Text style={styles.sheetActionTitle}>Choose from library</Text>
            <Text style={styles.sheetActionSubtitle}>Upload an existing picture</Text>
          </View>
          <Ionicons name="chevron-forward" color="#94a3b8" size={18} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.sheetAction}
          activeOpacity={0.86}
          onPress={handleTakePhotoPress}
        >
          <View style={styles.sheetActionIcon}>
            <Ionicons name="camera-outline" color="#0f766e" size={21} />
          </View>
          <View style={styles.sheetActionCopy}>
            <Text style={styles.sheetActionTitle}>Take a photo</Text>
            <Text style={styles.sheetActionSubtitle}>Use your camera now</Text>
          </View>
          <Ionicons name="chevron-forward" color="#94a3b8" size={18} />
        </TouchableOpacity>

      </BottomSheetComponent>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f6f8fb",
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 34,
  },
  header: {
    width: "100%",
    maxWidth: 420,
    alignSelf: "center",
    marginBottom: 22,
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
    overflow: "hidden",
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 20,
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
  cardAccent: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 5,
    backgroundColor: "#0f766e",
  },

  avatarWrap: {
    alignItems: "center",
    gap: 14,
  },

  profileImageButton: {
    width: 124,
    height: 124,
    borderRadius: 62,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ecfdf5",
    borderWidth: 2,
    borderColor: "#99f6e4",
    shadowColor: "#0f766e",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.16,
    shadowRadius: 20,
    elevation: 5,
  },
  editBadge: {
    position: "absolute",
    right: 3,
    bottom: 8,
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0f766e",
    borderWidth: 3,
    borderColor: "#ffffff",
  },
  identity: {
    alignItems: "center",
    gap: 4,
  },
  name: {
    color: "#172033",
    fontSize: 24,
    fontWeight: "900",
    lineHeight: 30,
    textAlign: "center",
  },
  username: {
    color: "#64748b",
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 20,
    textAlign: "center",
  },
  changePhotoButton: {
    minHeight: 44,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ccfbf1",
    backgroundColor: "#f0fdfa",
  },
  changePhotoText: {
    color: "#0f766e",
    fontSize: 14,
    fontWeight: "800",
    lineHeight: 18,
  },
  divider: {
    height: 1,
    marginVertical: 20,
    backgroundColor: "#e2e8f0",
  },
  details: {
    gap: 12,
  },
  detailRow: {
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  detailIcon: {
    width: 38,
    height: 38,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ecfdf5",
  },
  detailCopy: {
    flex: 1,
    minWidth: 0,
  },
  detailLabel: {
    color: "#64748b",
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 16,
    textTransform: "uppercase",
  },
  detailValue: {
    marginTop: 2,
    color: "#172033",
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 20,
  },
  signOutButton: {
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#fef2f2",
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  signOutIcon: {
    width: 38,
    height: 38,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fee2e2",
  },
  signOutCopy: {
    flex: 1,
    minWidth: 0,
  },
  signOutTitle: {
    color: "#991b1b",
    fontSize: 15,
    fontWeight: "800",
    lineHeight: 20,
  },
  signOutSubtitle: {
    marginTop: 2,
    color: "#b91c1c",
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
  },
  profileImage: {
    width: "100%",
    height: "100%",
    borderRadius: 62,
  },

  avatarPlaceholder: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  sheetAction: {
    minHeight: 72,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 8,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  sheetActionIcon: {
    width: 44,
    height: 44,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ecfdf5",
  },
  sheetActionCopy: {
    flex: 1,
    minWidth: 0,
  },
  sheetActionTitle: {
    color: "#172033",
    fontSize: 16,
    fontWeight: "800",
    lineHeight: 21,
  },
  sheetActionSubtitle: {
    marginTop: 2,
    color: "#64748b",
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
  },
});
