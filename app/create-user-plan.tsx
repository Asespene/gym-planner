import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
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

import { useAuth } from "../src/context/AuthContext";

import { createCharacter } from "../lib/supabase/characters";

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


export default function CreateUserPlan() {
  const router = useRouter();
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);


 // Variable For The Question Values
  const [name, setName] = useState("");
  const [goal, setGoal] = useState("");
  const [trainingDays, setTrainingDays] = useState<number | null>(3);

  // var for waiting on the update to supabase after finishing onbaording
  const [isSubmitting, setIsSubmitting] = useState(false);

  const TOTAL_QUESTIONS = 3;
  const progressPercent = `${(currentStep / TOTAL_QUESTIONS) * 100}%` as `${number}%`;

  const showAlert = (title: string, message: string) => {
    if (Platform.OS === "web") {
      window.alert(`${title}\n\n${message}`);
      return;
    }
    Alert.alert(title, message);
  }

  const handleNext =  async () => {
    if (currentStep === 1 && !name.trim()) {
      showAlert("Error", "Missing name field!");
      return;
    }

    if (currentStep === 2 && !goal.trim()) {
      showAlert("Error", "Missing goal field");
      return;
    }

    if (currentStep === 3 && (trainingDays === null || trainingDays < 1 || trainingDays > 7)) {
      showAlert("Error", "Enter a valid training day field");
      return;
    }


    if (currentStep < TOTAL_QUESTIONS) {
      setCurrentStep((prev) => prev + 1);
    }
    else {
      await handleCreateCharacter();
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1)
    }
    else {
      router.back();
    }
  }

  const renderQuestionNumber = () => {
    switch (currentStep) {
      case 1:
        return (
            <View style={styles.content}>
              <QuestionContainerCard
                badge="Plan identity"
                icon="person-outline"
                title="Name your character"
                subtitle="Give this plan a name you will recognize later."
              >
                <Text style={styles.inputLabel}>Character name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Saitama"
                  placeholderTextColor={"#94a3b8"}
                  value={name}
                  onChangeText={setName}
                  autoFocus
                  returnKeyType="next"
                  onSubmitEditing={handleNext}
                />

              </QuestionContainerCard>
            </View>
        );

      case 2: 
        return (
          <View style={styles.content}>
            <QuestionContainerCard
              badge="Main target"
              icon="flag-outline"
              title="Set the goal"
              subtitle="Keep it short, specific, and motivating."
            >
              <Text style={styles.inputLabel}>Training goal</Text>
              <TextInput 
                style={styles.input}
                placeholder="e.g. Achieve a lean look!"
                placeholderTextColor={"#94a3b8"}
                value={goal}
                onChangeText={setGoal}
                autoFocus
                returnKeyType="next"
                onSubmitEditing={handleNext}
              />
      
            </QuestionContainerCard>
          </View>
        );

      case 3:
        return (
          <View style={styles.content}>
            <QuestionContainerCard
              badge="Weekly rhythm"
              icon="calendar-outline"
              title="Choose training days"
              subtitle="Pick a realistic weekly schedule from 1 to 7 days."
            >
              <Text style={styles.inputLabel}>Days per week</Text>
              <TextInput 
                style={styles.input}
                placeholder="e.g. 3"
                keyboardType="number-pad"
                placeholderTextColor={"#94a3b8"}
                value={trainingDays !== null ? String(trainingDays) : ""}
                onChangeText={(text) => {
                  const num = parseInt(text.replace(/[^0-9]/g, ""), 10);
                  setTrainingDays(isNaN(num) ? null : num);
                }}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={handleNext}
              />

            </QuestionContainerCard>
          </View>
        );
      
      default: 
        return null;

    };

   
  };

  const handleCreateCharacter = async () => {
    if (isSubmitting) {
      return;
    }

    if (!user) {
      showAlert("Error", "User does not exist!");
      return;
    }

    if (!name.trim()) {
      showAlert("Error", "Name input field missing");
      return;
    }

    if (trainingDays === null) {
      showAlert("Error", "Training days input field is missing");
      return;
    }

    setIsSubmitting(true);
    try {
      await createCharacter({
        user_id: user.id,
        name: name.trim(),
        goal: goal.trim() || null,
        training_days: trainingDays,
        image_url: null,
      });

      router.replace("/(tabs)");

    } catch (error) {
      console.error("Error, could not create the character", error);
      showAlert("Error", "could not create a character");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <View style={styles.container}>
      
      <KeyboardAvoidingView style={styles.keyboardView}>

        <ScrollView contentContainerStyle={styles.scrollContent}>
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

          <View style={styles.progressShell}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressLabel}>Step {currentStep}</Text>
              <Text style={styles.progressTotal}>{TOTAL_QUESTIONS} total</Text>
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: progressPercent }]} />
            </View>
          </View>

          {renderQuestionNumber()}
        </ScrollView>
        



        <View style={styles.footer}>
          <View style={styles.footerAction}>
              {currentStep > 1  ? 
              <TouchableOpacity
                activeOpacity={0.84}
                onPress={handleBack}
                style={styles.secondaryButton}
              >
                <Ionicons name="chevron-back" color="#0f766e" size={18} />
                <Text style={styles.secondaryButtonText}>Back</Text>
              </TouchableOpacity>
              :
              null
            }
          </View>

          <View style={styles.progressPill}>
            <Text style={styles.progressText}>
              Step {currentStep} of {TOTAL_QUESTIONS}
            </Text>
          </View>

          <View style={styles.footerAction}>
              <TouchableOpacity
                activeOpacity={0.84}
                onPress={handleNext}
                style={styles.primaryButton}
              >
                <Text style={styles.primaryButtonText}>
                  {currentStep === TOTAL_QUESTIONS ? "Finish" : "Next"}
                </Text>
                <Ionicons
                  name={currentStep === TOTAL_QUESTIONS ? "checkmark" : "chevron-forward"}
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
  progressShell: {
    width: "100%",
    maxWidth: 420,
    alignSelf: "center",
    marginBottom: 16,
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#dbe4ee",
    backgroundColor: "#ffffff",
  },
  progressHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  progressLabel: {
    color: "#172033",
    fontSize: 14,
    fontWeight: "900",
    lineHeight: 18,
  },
  progressTotal: {
    color: "#64748b",
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
  },
  progressTrack: {
    height: 9,
    overflow: "hidden",
    borderRadius: 999,
    backgroundColor: "#e2e8f0",
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: "#0f766e",
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
});
