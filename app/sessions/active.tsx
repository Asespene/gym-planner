import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../../lib/supabase/client";
import { PlannedExercise } from "../../lib/supabase/workout_plans";
import {
  ActiveSessionDetails,
  completeWorkoutSession,
  createActiveWorkoutSession,
  fetchLastExercisePerformance,
  fetchOpenWorkoutSession,
  fetchWorkoutSessionById,
  PreviousExercisePerformance,
  recordWorkoutSet,
} from "../../lib/supabase/workout_sessions";

interface LoggedSetData {
  weight: string;
  reps: string;
}

interface CurrentSetInputs {
  weight: string;
  reps: string;
}

function formatElapsedTime(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
    : `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export default function ActiveSessionScreen() {
  const router = useRouter();
  const {
    characterId: characterIdParam,
    id,
    routineDayId: routineDayIdParam,
    routineId: routineIdParam,
    routineName: routineNameParam,
    sessionId: sessionIdParam,
  } =
    useLocalSearchParams<{
      characterId?: string | string[];
      id?: string | string[];
      routineDayId?: string | string[];
      routineId?: string | string[];
      routineName?: string | string[];
      sessionId?: string | string[];
    }>();

  const characterId = Array.isArray(characterIdParam) ? characterIdParam[0] : characterIdParam;
  const routineDayId = Array.isArray(routineDayIdParam) ? routineDayIdParam[0] : routineDayIdParam;
  const routineId = (Array.isArray(routineIdParam) ? routineIdParam[0] : routineIdParam) ??
    (Array.isArray(id) ? id[0] : id);
  const routineName = Array.isArray(routineNameParam) ? routineNameParam[0] : routineNameParam;
  const requestedSessionId = Array.isArray(sessionIdParam) ? sessionIdParam[0] : sessionIdParam;

  const [sessionId, setSessionId] = useState<string | null>(requestedSessionId ?? null);
  const [activeRoutineName, setActiveRoutineName] = useState(routineName ?? "");
  const [persistedLoggedSetsCount, setPersistedLoggedSetsCount] = useState(0);
  const [exercises, setExercises] = useState<PlannedExercise[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loggedHistory, setLoggedHistory] = useState<Record<string, LoggedSetData[]>>({});
  const [currentInputs, setCurrentInputs] = useState<Record<string, CurrentSetInputs>>({});
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [workoutStartedAt, setWorkoutStartedAt] = useState<string | null>(null);
  const [baselines, setBaselines] = useState<
    Record<string, PreviousExercisePerformance | null>
  >({});
  const [baselineLoading, setBaselineLoading] = useState<Record<string, boolean>>({});
  const [baselineErrors, setBaselineErrors] = useState<Record<string, boolean>>({});
  const [isSubmittingWorkout, setIsSubmittingWorkout] = useState(false);
  const [isFinishConfirmOpen, setIsFinishConfirmOpen] = useState(false);
  const [savingExerciseId, setSavingExerciseId] = useState<string | null>(null);
  const isSubmittingWorkoutRef = useRef(false);
  const savingSetRef = useRef(false);
  const totalLoggedSetsCount = persistedLoggedSetsCount;
  const remainingSetsCount = exercises.reduce(
    (sum, exercise) =>
      sum + Math.max(0, exercise.target_sets - (loggedHistory[exercise.id]?.length ?? 0)),
    0
  );

  useEffect(() => {
    if (!workoutStartedAt) {
      return;
    }

    const updateElapsed = () => {
      setElapsedSeconds(Math.max(0, Math.floor((Date.now() - Date.parse(workoutStartedAt)) / 1000)));
    };
    updateElapsed();
    const timer = setInterval(updateElapsed, 1000);
    return () => clearInterval(timer);
  }, [workoutStartedAt]);

  useEffect(() => {
    let isActive = true;

    async function loadExercises() {
      try {
        setIsLoading(true);
        setLoadError(null);
        setSessionId(requestedSessionId ?? null);

        let activeSession: ActiveSessionDetails | null = null;
        if (requestedSessionId) {
          activeSession = await fetchWorkoutSessionById(requestedSessionId);
          if (!activeSession) {
            throw new Error("This workout session is no longer in progress.");
          }
        } else if (characterId) {
          activeSession = await fetchOpenWorkoutSession(characterId);
          if (!activeSession) {
            if (!routineId || !routineName) {
              throw new Error("A workout routine is required to start a session.");
            }
            const newSessionId = await createActiveWorkoutSession({
              characterId,
              routineId,
              routineDayId: routineDayId ?? null,
              routineNameSnapshot: routineName,
            });
            activeSession = await fetchWorkoutSessionById(newSessionId);
            if (!activeSession) {
              throw new Error("The new workout session could not be loaded.");
            }
          }
        } else {
          throw new Error("A character ID is required to start a workout session.");
        }

        const resolvedRoutineId = activeSession.routine_id ?? routineId;
        const resolvedRoutineDayId = activeSession.routine_day_id ?? routineDayId;
        if (!resolvedRoutineId) {
          throw new Error("A workout routine is required.");
        }

        let exerciseQuery = supabase.from("planned_exercises").select("*");
        exerciseQuery = resolvedRoutineDayId
          ? exerciseQuery.eq("routine_day_id", resolvedRoutineDayId)
          : exerciseQuery.eq("routine_id", resolvedRoutineId);
        const exerciseResult = await exerciseQuery.order("order_index", { ascending: true });

        if (exerciseResult.error) {
          throw exerciseResult.error;
        }

        if (isActive) {
          const loadedExercises = (exerciseResult.data ?? []) as PlannedExercise[];
          const existingHistory: Record<string, LoggedSetData[]> = {};
          for (const exercise of loadedExercises) {
            existingHistory[exercise.id] = activeSession.logged_sets
              .filter((set) => set.exercise_name === exercise.exercise_name && set.is_completed)
              .sort((left, right) => left.set_number - right.set_number)
              .map((set) => ({
                weight: String(set.weight_used),
                reps: String(set.reps_completed),
              }));
          }

          setSessionId(activeSession.id);
          setActiveRoutineName(activeSession.routine_name_snapshot);
          setExercises(loadedExercises);
          setLoggedHistory(existingHistory);
          setPersistedLoggedSetsCount(
            activeSession.logged_sets.filter((set) => set.is_completed).length
          );
          setWorkoutStartedAt(activeSession.started_at);
          setBaselines({});
          setBaselineErrors({});

          const loadingState = Object.fromEntries(
            loadedExercises.map((exercise) => [exercise.id, Boolean(activeSession.character_id)])
          );
          setBaselineLoading(loadingState);

          if (activeSession.character_id && loadedExercises.length > 0) {
            const exerciseIdsByName = new Map<string, string[]>();
            for (const exercise of loadedExercises) {
              const exerciseIds = exerciseIdsByName.get(exercise.exercise_name) ?? [];
              exerciseIds.push(exercise.id);
              exerciseIdsByName.set(exercise.exercise_name, exerciseIds);
            }

            void Promise.all(
              Array.from(exerciseIdsByName.entries()).map(async ([exerciseName, exerciseIds]) => {
                try {
                  const performance = await fetchLastExercisePerformance(
                    activeSession.character_id,
                    exerciseName
                  );
                  return { exerciseIds, performance, error: false };
                } catch (err) {
                  console.error(`Failed to load baseline for ${exerciseName}:`, err);
                  return { exerciseIds, performance: null, error: true };
                }
              })
            ).then((results) => {
              if (!isActive) {
                return;
              }

              const nextBaselines: Record<string, PreviousExercisePerformance | null> = {};
              const nextErrors: Record<string, boolean> = {};
              const nextLoading: Record<string, boolean> = {};
              for (const result of results) {
                for (const exerciseId of result.exerciseIds) {
                  nextBaselines[exerciseId] = result.performance;
                  nextErrors[exerciseId] = result.error;
                  nextLoading[exerciseId] = false;
                }
              }
              setBaselines((previous) => ({ ...previous, ...nextBaselines }));
              setBaselineErrors((previous) => ({ ...previous, ...nextErrors }));
              setBaselineLoading((previous) => ({ ...previous, ...nextLoading }));
            });
          }
        }
      } catch (err) {
        console.error("Error loading planned exercises:", err);
        if (isActive) {
          setLoadError(
            err instanceof Error
              ? err.message
              : "Failed to load the planned exercises. Please try again."
          );
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    void loadExercises();
    return () => {
      isActive = false;
    };
  }, [characterId, requestedSessionId, routineDayId, routineId, routineName]);

  async function handleCompleteSet(exercise: PlannedExercise) {
    if (savingSetRef.current) {
      return;
    }

    const currentHistory = loggedHistory[exercise.id] ?? [];
    if (currentHistory.length >= exercise.target_sets) {
      return;
    }

    const currentWeight = currentInputs[exercise.id]?.weight || "0";
    const currentReps = currentInputs[exercise.id]?.reps ?? String(exercise.min_reps);
    const weight = Number(currentWeight);
    const reps = Number(currentReps);
    if (!Number.isFinite(weight) || weight < 0 || !Number.isInteger(reps) || reps < 1) {
      const message = "Enter a valid non-negative weight and positive whole-number reps.";
      if (Platform.OS === "web") {
        window.alert(message);
      } else {
        Alert.alert("Invalid set data", message);
      }
      return;
    }

    savingSetRef.current = true;
    setSavingExerciseId(exercise.id);

    try {
      if (!sessionId) {
        throw new Error("The active workout session is not ready to save sets.");
      }
      await recordWorkoutSet(sessionId, {
        exercise_name: exercise.exercise_name,
        set_number: currentHistory.length + 1,
        weight_used: weight,
        reps_completed: reps,
      });
      setPersistedLoggedSetsCount((previous) => previous + 1);
      setLoggedHistory((previous) => ({
        ...previous,
        [exercise.id]: [...(previous[exercise.id] ?? []), {
          weight: currentWeight,
          reps: currentReps,
        }],
      }));
      setCurrentInputs((previous) => ({
        ...previous,
        [exercise.id]: {
          weight: currentWeight,
          reps: String(exercise.min_reps),
        },
      }));
    } catch (err) {
      console.error("Failed to save workout set:", err);
      const message = err instanceof Error ? err.message : "Could not save this set.";
      Alert.alert("Set not saved", `${message}\nYour inputs are still here. Try saving again.`, [
        { text: "Keep Editing", style: "cancel" },
        {
          text: "Retry",
          onPress: () => void handleCompleteSet(exercise),
        },
      ]);
    } finally {
      savingSetRef.current = false;
      setSavingExerciseId(null);
    }
  }

  function handlePromptFinishWorkout() {
    if (savingSetRef.current) {
      const message = "Wait for the current set to finish saving before completing this workout.";
      if (Platform.OS === "web") {
        window.alert(message);
      } else {
        Alert.alert("Set still saving", message);
      }
      return;
    }

    if (totalLoggedSetsCount === 0) {
      const message = "Log at least one set before completing this workout session.";
      if (Platform.OS === "web") {
        window.alert(`Empty Workout\n\n${message}`);
      } else {
        Alert.alert("Empty Workout", message);
      }
      return;
    }

    setIsFinishConfirmOpen(true);
  }

  async function handleConfirmFinishWorkout() {
    if (isSubmittingWorkoutRef.current) {
      return;
    }

    if (!sessionId || !characterId) {
      const message = "The active workout session or character is missing.";
      if (Platform.OS === "web") {
        window.alert(message);
      } else {
        Alert.alert("Unable to save workout", message);
      }
      return;
    }

    isSubmittingWorkoutRef.current = true;
    setIsSubmittingWorkout(true);
    try {
      await completeWorkoutSession(sessionId);
      setIsFinishConfirmOpen(false);
      router.replace({
        pathname: "/characters/[id]",
        params: { id: characterId },
      });
    } catch (err) {
      console.error("Failed to finish workout:", err);
      const message = err instanceof Error ? err.message : "Failed to record workout session.";
      if (Platform.OS === "web") {
        window.alert(message);
      } else {
        Alert.alert("Unable to save workout", message);
      }
    } finally {
      isSubmittingWorkoutRef.current = false;
      setIsSubmittingWorkout(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["bottom"]}>
      <Stack.Screen
        options={{
          title: activeRoutineName ? `Workout: ${activeRoutineName}` : "Active Workout",
          headerShown: false,
          headerStyle: { backgroundColor: "#0f172a" },
          headerTintColor: "#ffffff",
          headerTitleStyle: { fontWeight: "800" },
          headerBackVisible: false,
          gestureEnabled: false,
        }}
      />
      <Stack.Screen.BackButton hidden />

      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#0f766e" />
          <Text style={styles.emptyText}>Loading workout...</Text>
        </View>
      ) : loadError ? (
        <View style={styles.centerContainer}>
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>{loadError}</Text>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <Text style={styles.backButtonText}>Go Back</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {workoutStartedAt ? (
            <View style={styles.timerCard}>
              <Text style={styles.timerLabel}>WORKOUT IN PROGRESS</Text>
              <Text style={styles.timerValue}>{formatElapsedTime(elapsedSeconds)}</Text>
            </View>
          ) : null}

          {exercises.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>No planned exercises found for this routine.</Text>
            </View>
          ) : (
            exercises.map((exercise) => {
              const history = loggedHistory[exercise.id] ?? [];
              const currentSetNumber = history.length + 1;
              const isAllSetsCompleted = history.length >= exercise.target_sets;
              const activeWeight = currentInputs[exercise.id]?.weight ?? "";
              const activeReps = currentInputs[exercise.id]?.reps ?? String(exercise.min_reps);
              const baseline = baselines[exercise.id];
              const previousSet = baseline?.sets.find(
                (set) => set.set_number === currentSetNumber
              );
              const baselineDate = baseline?.completedAt
                ? new Date(baseline.completedAt).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                  })
                : null;

              return (
                <View key={exercise.id} style={styles.exerciseCard}>
                  <View style={styles.exerciseHeader}>
                    <View style={styles.exerciseDetails}>
                      <Text style={styles.exerciseName}>{exercise.exercise_name}</Text>
                      <Text style={styles.targetReps}>
                        Target: {exercise.target_sets} sets × {exercise.min_reps}–{exercise.max_reps} reps
                      </Text>
                    </View>
                    <Text style={[styles.progressBadge, isAllSetsCompleted && styles.progressBadgeDone]}>
                      {isAllSetsCompleted
                        ? "Completed ✓"
                        : `Set ${currentSetNumber} of ${exercise.target_sets}`}
                    </Text>
                  </View>

                  {history.length > 0 ? (
                    <View style={styles.historyChipsRow}>
                      {history.map((set, index) => (
                        <View key={`${exercise.id}-${index}`} style={styles.historyChip}>
                          <Text style={styles.historyChipText}>
                            Set {index + 1}: {set.weight} lb × {set.reps} reps
                          </Text>
                        </View>
                      ))}
                    </View>
                  ) : null}

                  {!isAllSetsCompleted ? (
                    <>
                      <View style={styles.baselineRow} accessibilityLiveRegion="polite">
                        <Text style={styles.baselineLabel}>Current Best:</Text>
                        {baselineLoading[exercise.id] ? (
                          <Text style={styles.baselineValueMuted}>Loading baseline...</Text>
                        ) : baselineErrors[exercise.id] ? (
                          <Text style={styles.baselineValueError}>Baseline unavailable</Text>
                        ) : !baseline ? (
                          <Text style={styles.baselineValueMuted}>No previous workout</Text>
                        ) : previousSet ? (
                          <Text style={styles.baselineValueHighlight}>
                            {previousSet.weight_used} lb × {previousSet.reps_completed} reps
                            {baselineDate ? ` (${baselineDate})` : ""}
                          </Text>
                        ) : (
                          <Text style={styles.baselineValueMuted}>
                            No prior Set {currentSetNumber}
                          </Text>
                        )}
                      </View>

                      <View style={styles.stepperContainer}>
                        <View style={styles.stepperInputsRow}>
                          <View style={styles.inputGroup}>
                            <Text style={styles.inputMiniLabel}>Weight (lb)</Text>
                            <TextInput
                              style={styles.stepperInput}
                              placeholder="0"
                              placeholderTextColor="#94a3b8"
                              keyboardType="numeric"
                              value={activeWeight}
                              onChangeText={(weight) =>
                                setCurrentInputs((previous) => ({
                                  ...previous,
                                  [exercise.id]: {
                                    weight,
                                    reps: previous[exercise.id]?.reps ?? String(exercise.min_reps),
                                  },
                                }))
                              }
                              accessibilityLabel={`Weight for set ${currentSetNumber} of ${exercise.exercise_name}`}
                            />
                          </View>

                          <View style={styles.inputGroup}>
                            <Text style={styles.inputMiniLabel}>Reps</Text>
                            <TextInput
                              style={styles.stepperInput}
                              placeholder={String(exercise.min_reps)}
                              placeholderTextColor="#94a3b8"
                              keyboardType="numeric"
                              value={activeReps}
                              onChangeText={(reps) =>
                                setCurrentInputs((previous) => ({
                                  ...previous,
                                  [exercise.id]: {
                                    weight: previous[exercise.id]?.weight ?? "",
                                    reps,
                                  },
                                }))
                              }
                              accessibilityLabel={`Reps for set ${currentSetNumber} of ${exercise.exercise_name}`}
                            />
                          </View>

                          <TouchableOpacity
                            style={[
                              styles.completeSetButton,
                              savingExerciseId === exercise.id && styles.disabledButton,
                            ]}
                            onPress={() => void handleCompleteSet(exercise)}
                            disabled={savingExerciseId !== null}
                            accessibilityRole="button"
                            accessibilityLabel={`Log set ${currentSetNumber} of ${exercise.exercise_name}`}
                          >
                            <Text style={styles.completeSetButtonText}>Log Set {currentSetNumber}</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </>
                  ) : (
                    <View style={styles.doneBanner}>
                      <Text style={styles.doneBannerText}>All sets finished for this exercise</Text>
                    </View>
                  )}
                </View>
              );
            })
          )}

          {workoutStartedAt ? (
            <TouchableOpacity
              style={[styles.finishButton, isSubmittingWorkout && styles.disabledButton]}
              onPress={handlePromptFinishWorkout}
              disabled={isSubmittingWorkout}
              accessibilityRole="button"
            >
              <Text style={styles.finishButtonText}>
                {isSubmittingWorkout ? "Saving Workout..." : "Finish Workout"}
              </Text>
            </TouchableOpacity>
          ) : null}
        </ScrollView>
      )}

      <Modal
        visible={isFinishConfirmOpen}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!isSubmittingWorkout) {
            setIsFinishConfirmOpen(false);
          }
        }}
      >
        <View style={styles.confirmModalOverlay}>
          <View style={styles.confirmModalCard}>
            <Text style={styles.confirmModalTitle}>Finish Workout?</Text>

            <Text style={styles.confirmModalMessage}>
              You have logged{" "}
              <Text style={styles.boldText}>
                {totalLoggedSetsCount} set{totalLoggedSetsCount === 1 ? "" : "s"}
              </Text>
              .
              {remainingSetsCount > 0
                ? ` ${remainingSetsCount} planned set${remainingSetsCount === 1 ? "" : "s"} remain unfinished.`
                : ""}
              {"\n\n"}
              Finishing will stop your workout timer and save this session to your history.
            </Text>

            <View style={styles.confirmModalActions}>
              <TouchableOpacity
                style={[styles.confirmButton, styles.confirmCancelBtn]}
                onPress={() => setIsFinishConfirmOpen(false)}
                disabled={isSubmittingWorkout}
                activeOpacity={0.7}
                accessibilityRole="button"
              >
                <Text style={styles.confirmCancelText}>Keep Going</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.confirmButton,
                  styles.confirmFinishBtn,
                  isSubmittingWorkout && styles.disabledButton,
                ]}
                onPress={() => void handleConfirmFinishWorkout()}
                disabled={isSubmittingWorkout}
                activeOpacity={0.7}
                accessibilityRole="button"
              >
                <Text style={styles.confirmFinishText}>
                  {isSubmittingWorkout ? "Saving..." : "Confirm Finish"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f6f8fb",
  },
  centerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    backgroundColor: "#f6f8fb",
  },
  scrollContent: {
    padding: 16,
    gap: 14,
  },
  timerCard: {
    alignItems: "center",
    backgroundColor: "#ecfdf5",
    borderColor: "#a7f3d0",
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 12,
    gap: 2,
  },
  timerLabel: {
    color: "#047857",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  timerValue: {
    color: "#064e3b",
    fontSize: 22,
    fontWeight: "900",
    fontVariant: ["tabular-nums"],
  },
  exerciseCard: {
    backgroundColor: "#ffffff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#dbe4ee",
    padding: 14,
    gap: 10,
  },
  exerciseHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    paddingBottom: 8,
  },
  exerciseName: {
    flex: 1,
    fontSize: 16,
    fontWeight: "800",
    color: "#172033",
  },
  targetReps: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748b",
  },
  exerciseDetails: {
    flex: 1,
    gap: 4,
  },
  progressBadge: {
    fontSize: 12,
    fontWeight: "800",
    color: "#0f766e",
    backgroundColor: "#f0fdfa",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  progressBadgeDone: {
    color: "#047857",
    backgroundColor: "#d1fae5",
  },
  historyChipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  historyChip: {
    backgroundColor: "#f1f5f9",
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  historyChipText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#475569",
  },
  baselineRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
    paddingVertical: 2,
  },
  baselineLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: "#64748b",
    textTransform: "uppercase",
  },
  baselineValueHighlight: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0f766e",
  },
  baselineValueMuted: {
    fontSize: 12,
    fontWeight: "600",
    color: "#94a3b8",
    fontStyle: "italic",
  },
  baselineValueError: {
    fontSize: 12,
    fontWeight: "600",
    color: "#e11d48",
  },
  stepperContainer: {
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 8,
    padding: 10,
  },
  stepperInputsRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
  },
  inputGroup: {
    flex: 1,
    gap: 4,
  },
  inputMiniLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748b",
  },
  stepperInput: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 15,
    fontWeight: "700",
    color: "#172033",
    textAlign: "center",
  },
  completeSetButton: {
    backgroundColor: "#0f766e",
    borderRadius: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  completeSetButtonText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "800",
  },
  doneBanner: {
    backgroundColor: "#f0fdf4",
    borderWidth: 1,
    borderColor: "#bbf7d0",
    borderRadius: 6,
    paddingVertical: 8,
    alignItems: "center",
  },
  doneBannerText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#16a34a",
  },
  finishButton: {
    backgroundColor: "#0f766e",
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 10,
  },
  finishButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "800",
  },
  disabledButton: {
    opacity: 0.5,
  },
  confirmModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.55)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  confirmModalCard: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 22,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
  },
  confirmModalTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#172033",
    textAlign: "center",
  },
  confirmModalMessage: {
    fontSize: 14,
    color: "#64748b",
    textAlign: "center",
    lineHeight: 20,
  },
  boldText: {
    fontWeight: "700",
    color: "#0f766e",
  },
  confirmModalActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmCancelBtn: {
    backgroundColor: "#f1f5f9",
    borderWidth: 1,
    borderColor: "#cbd5e1",
  },
  confirmCancelText: {
    color: "#475569",
    fontSize: 15,
    fontWeight: "700",
  },
  confirmFinishBtn: {
    backgroundColor: "#0f766e",
  },
  confirmFinishText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "700",
  },
  emptyCard: {
    width: "100%",
    maxWidth: 420,
    padding: 24,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#dbe4ee",
    borderRadius: 8,
    alignItems: "center",
    gap: 12,
  },
  emptyText: {
    color: "#64748b",
    fontSize: 14,
    textAlign: "center",
  },
  backButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: "#0f766e",
    borderRadius: 6,
  },
  backButtonText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 13,
  },
});
