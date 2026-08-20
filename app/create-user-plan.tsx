import { Button, Host } from "@expo/ui";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";


interface OnboardingData {
  name: string;
  goal: string;
  workoutSplit: number;
  experience: string;
}

const INITIAL_DATA: OnboardingData = {
  name: "",
  goal: "Build Muscle",
  workoutSplit: 4,
  experience: "New",
};



export default function CreateUserPlan({name, goal, workoutSplit, experience}: OnboardingData) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<OnboardingData>(INITIAL_DATA);


  const TOTAL_QUESTIONS = 2;

  const handleNext = () => {
    if (currentStep < TOTAL_QUESTIONS) {
      setCurrentStep((prev) => prev + 1);
    }
    else {
      router.replace('/');
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

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView style={styles.keyboardView}>
        <View style={styles.content}>
          <Text style={styles.kicker}>Onboarding</Text>
          <Text style={styles.title}>Create your plan</Text>
          <Text style={styles.subtitle}>
            A focused setup flow for goals, schedule, and experience level.
          </Text>
        </View>

        <ScrollView>

        </ScrollView>



        <View style={styles.footer}>
          <View style={styles.footerAction}>
            <Host matchContents>
              {currentStep > 1  ? 
              <Button 
                label="Back"
                variant="filled"
                onPress={handleBack}
              />
              :
              null
            }
              
            </Host>
          </View>

          <View style={styles.progressPill}>
            <Text style={styles.progressText}>
              Step {currentStep} of {TOTAL_QUESTIONS}
            </Text>
          </View>

          <View style={styles.footerAction}>
            <Host matchContents>
              <Button 
                label={currentStep === TOTAL_QUESTIONS ? "Finish" : "Next"}
                variant="filled"
                onPress={handleNext}
              />
            </Host>
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
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
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
    textAlign: "center",
  },
  subtitle: {
    maxWidth: 320,
    color: "#64748b",
    fontSize: 16,
    fontWeight: "600",
    lineHeight: 24,
    textAlign: "center",
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
    minWidth: 84,
    alignItems: "center",
  },
  progressPill: {
    minWidth: 112,
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
});
