import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { PropsWithChildren, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";



import { createSimpleWorkoutPlan } from "../../lib/supabase/workout_plans";

interface QuestionContainerProps extends PropsWithChildren {
  badge?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
}

export function QuestionContainerCard({
  badge,
  icon = "sparkles-outline",
  title,
  subtitle,
  children,
}: QuestionContainerProps) {
  return (
    <View style={styles.questionCard}>
      <View style={styles.cardAccent} />
      {badge ? <Text style={styles.questionBadge}>{badge}</Text> : null}

      <View style={styles.questionIcon}>
        <Ionicons name={icon} color="#0f766e" size={26} />
      </View>
      <Text style={styles.questionTitle}>{title}</Text>
      {subtitle ? <Text style={styles.questionSubtitle}>{subtitle}</Text> : null}
      <View style={styles.questionBody}>{children}</View>
    </View>
  );
}


export default function CreateWorkoutPlan() {
  const router = useRouter();

  const { characterId, id } = useLocalSearchParams<{ characterId?: string; id?: string }>();
  const targetCharacterId = characterId || id;

 // Variable For The Question Values
  const [planName, setPlanName] = useState("");
  const [description, setDescription] = useState("");

  // var for waiting on the update to supabase after finishing onbaording
  const [isSubmitting, setIsSubmitting] = useState(false);

   const handleCreateWorkoutPlan = async () => {
    if (isSubmitting) {
        return;
    }

    if (!targetCharacterId) {
        showAlert("Error", "Requires a character ID");
        return;
    }

    if (!planName.trim()) {
        showAlert("Error", "Requires a name for the plan");
        return;
    }

    setIsSubmitting(true);
    try {
        const newPlan = await createSimpleWorkoutPlan({
          character_id: targetCharacterId,
          name: planName.trim(),
          description: description.trim() || null
        });

        router.replace({
          pathname: "/characters/[id]/plan",
          params: { id: targetCharacterId, planId: newPlan.id }
        });

        
    } catch (err) {
        console.error("Error in creating workout plan", err);
        showAlert("Error", "Could not create your workout plan")
    } finally {
        setIsSubmitting(false);
    }

  }

  const showAlert = (title: string, message: string) => {
    if (Platform.OS === "web") {
      window.alert(`${title}\n\n${message}`);
      return;
    }
    Alert.alert(title, message);
  }

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
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
            <Text style={styles.kicker}>Plan builder</Text>
            <Text style={styles.headerTitle}>Create your plan</Text>
            <Text style={styles.headerSubtitle}>
              Shape the basics first. Your plan starts with a character, a goal,
              and a rhythm that fits your week.
            </Text>
          </View>

          <View style={styles.content}>
            <QuestionContainerCard
              badge="Workout plan"
              icon="barbell-outline"
              title="Set the foundation"
              subtitle="Start with a clear name and a short note about what this plan is for."
            >
              <View style={styles.fieldGroup}>
                <Text style={styles.inputLabel}>Workout plan name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Workout A - Strength PPL"
                  placeholderTextColor={"#94a3b8"}
                  value={planName}
                  onChangeText={setPlanName}
                  autoFocus
                  returnKeyType="next"
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.inputLabel}>Workout description</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="e.g. Five-day plan focused on strength and consistency."
                  placeholderTextColor={"#94a3b8"}
                  value={description}
                  onChangeText={setDescription}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  returnKeyType="done"
                />
                <Text style={styles.helperText}>
                  Optional, but useful when you have more than one plan.
                </Text>
              </View>
            </QuestionContainerCard>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <View style={styles.footerAction}>
            <TouchableOpacity
              activeOpacity={0.84}
              onPress={() => router.back()}
              style={styles.secondaryButton}
            >
              <Ionicons name="chevron-back" color="#0f766e" size={18} />
              <Text style={styles.secondaryButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.footerAction}>
            <TouchableOpacity
              activeOpacity={0.84}
              onPress={handleCreateWorkoutPlan}
              disabled={isSubmitting}
              style={[styles.primaryButton, isSubmitting && styles.buttonDisabled]}
            >
              <Text style={styles.primaryButtonText}>
                {isSubmitting ? "Creating..." : "Create Plan"}
              </Text>

              <Ionicons
                name="checkmark"
                color="#ffffff"
                size={18}
              />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f6f8fb",
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 30,
  },
  header: {
    width: "100%",
    maxWidth: 420,
    alignSelf: "center",
    marginBottom: 18,
  },
  brandMark: {
    width: 54,
    height: 54,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    backgroundColor: "#0f766e",
    shadowColor: "#0f766e",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 18,
    elevation: 6,
  },
  brandMarkText: {
    color: "#ffffff",
    fontSize: 19,
    fontWeight: "900",
    lineHeight: 24,
  },
  kicker: {
    color: "#0f766e",
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 18,
    textTransform: "uppercase",
  },
  headerTitle: {
    marginTop: 6,
    color: "#172033",
    fontSize: 34,
    fontWeight: "900",
    lineHeight: 40,
  },
  headerSubtitle: {
    maxWidth: 360,
    marginTop: 8,
    color: "#64748b",
    fontSize: 16,
    fontWeight: "600",
    lineHeight: 24,
  },
  content: {
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  questionCard: {
    width: "100%",
    maxWidth: 420,
    minHeight: 330,
    overflow: "hidden",
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 22,
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
  questionBadge: {
    alignSelf: "flex-start",
    marginBottom: 18,
    overflow: "hidden",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "#ecfdf5",
    borderWidth: 1,
    borderColor: "#99f6e4",
    color: "#0f766e",
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 18,
    textTransform: "uppercase",
  },
  questionIcon: {
    width: 58,
    height: 58,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
    backgroundColor: "#f0fdfa",
    borderWidth: 1,
    borderColor: "#99f6e4",
  },
  questionTitle: {
    color: "#172033",
    fontSize: 30,
    fontWeight: "900",
    lineHeight: 36,
  },
  questionSubtitle: {
    maxWidth: 320,
    marginTop: 10,
    color: "#64748b",
    fontSize: 16,
    fontWeight: "600",
    lineHeight: 24,
  },
  questionBody: {
    width: "100%",
    marginTop: 24,
    gap: 18,
  },
  fieldGroup: {
    width: "100%",
    gap: 8,
  },
  inputLabel: {
    color: "#334155",
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 18,
    textTransform: "uppercase",
  },
  footer: {
    width: "100%",
    minHeight: 84,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 22,
    borderTopWidth: 1,
    borderTopColor: "#dbe4ee",
    backgroundColor: "#ffffff",
    shadowColor: "#101828",
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 8,
  },
  footerAction: {
    minWidth: 96,
    alignItems: "center",
  },
  progressPill: {
    minWidth: 108,
    alignItems: "center",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: "#ecfdf5",
    borderWidth: 1,
    borderColor: "#ccfbf1",
  },
  progressText: {
    color: "#0f766e",
    fontSize: 13,
    fontWeight: "800",
  },
  primaryButton: {
    minHeight: 48,
    minWidth: 96,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#0f766e",
    shadowColor: "#0f766e",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 16,
    elevation: 5,
  },
  primaryButtonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "900",
    lineHeight: 20,
  },
  secondaryButton: {
    minHeight: 48,
    minWidth: 96,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "#f0fdfa",
    borderWidth: 1,
    borderColor: "#99f6e4",
  },
  secondaryButtonText: {
    color: "#0f766e",
    fontSize: 15,
    fontWeight: "900",
    lineHeight: 20,
  },
  buttonDisabled: {
    opacity: 0.6,
  },

  input: {
    width: "100%",
    height: 54,
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
    fontWeight: "700",
    color: "#172033",
    backgroundColor: "#ffffff",
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  textArea: {
    minHeight: 118,
    height: 118,
    paddingTop: 14,
    paddingBottom: 14,
    lineHeight: 22,
  },
  helperText: {
    color: "#64748b",
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
  },
});
