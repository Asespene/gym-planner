import { Button, Host } from "@expo/ui";
import { useRouter } from "expo-router";
import { PropsWithChildren, useState } from "react";
import {
  KeyboardAvoidingView,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";

interface QuestionContainerProps extends PropsWithChildren {
  badge?: string;
  title: string;
  subtitle?: string;
}

export function QuestionContainerCard({
  badge,
  title,
  subtitle,
  children,
}: QuestionContainerProps) {
  return (
    <View style={styles.questionCard}>
      {badge ? <Text style={styles.questionBadge}>{badge}</Text> : null}

      <Text style={styles.questionTitle}>{title}</Text>
      {subtitle ? <Text style={styles.questionSubtitle}>{subtitle}</Text> : null}
      <View style={styles.questionBody}>{children}</View>
    </View>
  );
}


export default function CreateUserPlan() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);


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

  const renderQuestionNumber = () => {
    switch (currentStep) {
      case 1:
        return (
            <View style={styles.content}>
              <QuestionContainerCard
                title="Experience"
              >

              </QuestionContainerCard>
            </View>
        );

      case 2: 
        return (
          <View>
            <Text>Hello</Text>
          </View>
        );
      
      default: 
        return null;

    };

   
  };

  return (
    <View style={styles.container}>
      
      <KeyboardAvoidingView style={styles.keyboardView}>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          {renderQuestionNumber()}
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
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 72,
    paddingBottom: 32,
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  questionCard: {
    width: "100%",
    maxWidth: 420,
    minHeight: 360,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 32,
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
  questionBadge: {
    alignSelf: "center",
    marginBottom: 14,
    overflow: "hidden",
    borderRadius: 999,
    paddingHorizontal: 12,
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
  questionTitle: {
    color: "#172033",
    fontSize: 34,
    fontWeight: "900",
    lineHeight: 40,
    textAlign: "center",
  },
  questionSubtitle: {
    maxWidth: 320,
    marginTop: 10,
    color: "#64748b",
    fontSize: 16,
    fontWeight: "600",
    lineHeight: 24,
    textAlign: "center",
  },
  questionBody: {
    width: "100%",
    marginTop: 28,
    gap: 12,
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
