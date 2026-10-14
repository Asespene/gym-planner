import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Character, fetchCharacter } from "../../lib/supabase/characters";
import {
  DayRoutineDetails,
  fetchCurrentActiveWorkoutPlan,
  fetchCurrentDayRoutine,
  fetchPlanDashboardData,
  PlannedExercise,
  Routine,
  WorkoutPlan,
} from "../../lib/supabase/workout_plans";
import {
  ActiveSessionDetails,
  createActiveWorkoutSession,
  fetchLatestCompletedSessionToday,
  fetchOpenWorkoutSession,
  LatestCompletedSessionSummary,
} from "../../lib/supabase/workout_sessions";


// Mock Data for character
const MockCharacterBioData = {


  activePlan: {
    name: "Strength PPL - 5 Days",
    hasPlan: true,
  },

  todayRoutine: {
    name: "Push A",
    is_rest_day: false,
  },

  inProgessSession: null as {
    id: string;
    routine_name_snapshot: string;
  } | null,
};

const mockCharacterStatsData = {
  overview: {
    workoutsCompleted: 12,
    currentStreakDays: 3,
    workoutsThisWeek: 4,
    totalCompletedSets: 126,
    totalVolumeLb: 28450,
  },

  recentPersonalRecords: [
    {
      exerciseName: "Barbell Bench Press",
      recordType: "estimated1RM",
      estimated1RM: 135,
      unit: "lb",
      achievedAt: "2026-08-30",
    },
    {
      exerciseName: "Goblet Squat",
      recordType: "weightForReps",
      weight: 55,
      reps: 12,
      unit: "lb",
      achievedAt: "2026-08-28",
    },
    {
      exerciseName: "Lat Pulldown",
      recordType: "weightForReps",
      weight: 100,
      reps: 10,
      unit: "lb",
      achievedAt: "2026-08-27",
    },
  ],

  weeklyActivity: {
    completedSessions: 4,
    targetSessions: 5,
    completedSets: 42,
  },
};
// Make this into a stack screen

export default function CharacterDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const characterId = Array.isArray(id) ? id[0] : id;

  const router = useRouter();

  const [character, setCharacter] = useState<Character | null>(null);
  const [workoutPlan, setWorkoutPlan] = useState<WorkoutPlan | null>(null);
  const [todayRoutine, setTodayRoutine] = useState<DayRoutineDetails | null>(null);
  const [inProgressSession, setInProgressSession] = useState<ActiveSessionDetails | null>(null);
  const [latestCompletedToday, setLatestCompletedToday] =
    useState<LatestCompletedSessionSummary | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isStartConfirmOpen, setIsStartConfirmOpen] = useState(false);
  const [isStartingWorkout, setIsStartingWorkout] = useState(false);
  const [isChooserOpen, setIsChooserOpen] = useState(false);
  const [availableRoutines, setAvailableRoutines] = useState<
    (Routine & { planned_exercises: PlannedExercise[] })[]
  >([]);
  const [isLoadingRoutines, setIsLoadingRoutines] = useState(false);
  const [chooserError, setChooserError] = useState<string | null>(null);
  const [pendingRoutine, setPendingRoutine] = useState<
    (Routine & { planned_exercises: PlannedExercise[] }) | null
  >(null);
  const [pendingRoutineDayId, setPendingRoutineDayId] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!id || Array.isArray(id)) { return }

      let isMounted = true;

      async function loadCharacter() {
        try {
          setIsLoading(true);
          setError(null);

          const characterData = await fetchCharacter(id as string);

          if (!isMounted) { return; }

          setCharacter(characterData);

          const [openSession, completedSession] = await Promise.all([
            fetchOpenWorkoutSession(id),
            fetchLatestCompletedSessionToday(id),
          ]);
          if (!isMounted) { return; }
          setInProgressSession(openSession);
          setLatestCompletedToday(completedSession);

          const workoutPlanData = await fetchCurrentActiveWorkoutPlan(id as string);

          if (!isMounted) { return; }

          setWorkoutPlan(workoutPlanData);

          if (workoutPlanData) {
            const dayOfWeek = new Date().getDay();

            const routineData = await fetchCurrentDayRoutine(workoutPlanData.id, dayOfWeek);

            if (!isMounted) { return; }

            setTodayRoutine(routineData);
          } else {
            setTodayRoutine(null);
          }
        } catch (err) {
          if (isMounted) {
            console.error("Error in loading the character", err);
            setError("Failed to load the character");
          }
        } finally {
          if (isMounted) { setIsLoading(false); }
        }
      }
      loadCharacter();

      return () => {
        isMounted = false;
      }
  }, [id]));



  if (isLoading) {
    return (
      <SafeAreaView style={[styles.safeArea, { justifyContent: "center", alignItems: "center"}]} >
        <ActivityIndicator size="large" color="#0f766e" />
      </SafeAreaView> 
    );
  }

  if (error || !character) {
    return (
      <SafeAreaView style={[styles.safeArea, { justifyContent: "center", alignItems: "center", padding: 20 }]}>
       <Text style={{ fontSize: 16, fontWeight: "700", color: "#64748b" }}>
          {error || "Character not found."}
        </Text>
      </SafeAreaView>
    );
  }
  async function openRoutineChooser() {
    if (!characterId || !workoutPlan?.id || isLoadingRoutines) {
      return;
    }
    setChooserError(null);
    setIsChooserOpen(true);
    try {
      setIsLoadingRoutines(true);
      const dashboard = await fetchPlanDashboardData(characterId, workoutPlan.id);
      setAvailableRoutines(dashboard?.routines ?? []);
    } catch (err) {
      console.error("Failed to load routines for workout:", err);
      setChooserError(err instanceof Error ? err.message : "Could not load routines.");
    } finally {
      setIsLoadingRoutines(false);
    }
  }

  const handlePrimaryAction = () => {
    if (!workoutPlan) {
      router.push({
        pathname: "/characters/create_workout_plan",
        params: { characterId: id },
      });
      return;
    }

    if (!todayRoutine?.routine || todayRoutine.isRestDay) {
      void openRoutineChooser();
      return;
    }

    setPendingRoutine(todayRoutine.routine);
    setPendingRoutineDayId(todayRoutine.routine_day_id);
    setIsStartConfirmOpen(true);
  }

  function handleSelectRoutine(routine: Routine & { planned_exercises: PlannedExercise[] }) {
    setIsChooserOpen(false);
    setPendingRoutine(routine);
    setPendingRoutineDayId(null);
    setIsStartConfirmOpen(true);
  }

  const handleConfirmStart = async () => {
    if (!pendingRoutine || !characterId || isStartingWorkout) {
      return;
    }

    setIsStartingWorkout(true);
    try {
      const sessionId = await createActiveWorkoutSession({
        characterId,
        routineId: pendingRoutine.id,
        routineDayId: pendingRoutineDayId,
        routineNameSnapshot: pendingRoutine.name,
      });
      setIsStartConfirmOpen(false);
      router.push({
        pathname: "/sessions/active",
        params: {
          characterId,
          sessionId,
          routineId: pendingRoutine.id,
          routineDayId: pendingRoutineDayId ?? "",
          routineName: pendingRoutine.name,
        },
      });
    } catch (err) {
      console.error("Failed to start workout:", err);
      const message = err instanceof Error ? err.message : "Could not start workout.";
      if (Platform.OS === "web") {
        window.alert(message);
      } else {
        Alert.alert("Start Failed", message);
      }
    } finally {
      setIsStartingWorkout(false);
    }
  };

  const isStartingCompletedRoutineAgain =
    pendingRoutine?.name === latestCompletedToday?.routine_name_snapshot;

  return (
    // A Safe area View
    <SafeAreaView style={styles.safeArea} edges={["bottom"]}>
      <Stack.Screen
        options={{
          title: character.name,
          headerBackTitle: "Back",
        }}
      />
      {/* Screen Shell*/}
      <View style={styles.screenContainer}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Each section of the screen in here */}

          {/* Top Section w/ the character model as well another section for the stats of your character */}
          <View style={styles.stageSection}>
            {/* This is gonna be 3 section containers from left to right. The leftest contains general biography like name and goal, the middle is the avatar of the character so just leave as image right now, and the rightest is the column for the stats of the character not supported yet so leave as mockdata for the backend */}
            <View style={styles.sideColumn}>
              <Text style={styles.columnTitle}>Character Biography</Text>
              <View style={styles.bioGroup}>
                <Text style={styles.bioLabel}>Name</Text>
                <Text style={styles.bioValue}>
                  {character.name}
                </Text>
              </View>
              <View style={styles.bioGroup}>
                <Text style={styles.bioLabel}>Goal</Text>
                <Text style={styles.bioValue}>
                  {character.goal ?? "No goal set!"}
                </Text>
              </View>
              <View style={[styles.bioGroup, { borderBottomWidth: 0 }]}>
                <Text style={styles.bioLabel}>Training Days</Text>
                <Text style={styles.bioValue}>
                  {character.training_days} days/week
                </Text>
              </View>
            </View>

            <View style={styles.avatarColumn}>
              <View style={styles.avatarBox}>
                <View style={styles.avatarGlow} />
                <Text style={styles.avatarInitials}>IV</Text>
                <Text style={styles.avatarPlaceholderText}>
                  Character image
                </Text>
              </View>
            </View>

            <View style={styles.sideColumn}>
              <Text style={styles.columnTitle}>Character Stats</Text>
              <View style={styles.statGroup}>
                <Text style={styles.statValue}>
                  {mockCharacterStatsData.overview.currentStreakDays}
                </Text>
                <Text style={styles.statLabel}>Day Streak</Text>
              </View>
              <View style={styles.statGroup}>
                <Text style={styles.statValue}>
                  {mockCharacterStatsData.overview.totalCompletedSets}
                </Text>
                <Text style={styles.statLabel}>Sets Done</Text>
              </View>
              <View style={styles.statGroup}>
                <Text style={styles.statValue}>
                  {mockCharacterStatsData.overview.totalVolumeLb.toLocaleString()} lb
                </Text>
                <Text style={styles.statLabel}>Volume</Text>
              </View>
              <View style={styles.statGroup}>
                <Text style={styles.statValue}>
                  {mockCharacterStatsData.overview.workoutsCompleted}
                </Text>
                <Text style={styles.statLabel}>Workouts</Text>
              </View>
            </View>
          </View>

          {inProgressSession ? (
            <TouchableOpacity
              style={[styles.ctaSection, styles.resumeCard]}
              activeOpacity={0.8}
              onPress={() =>
                router.push({
                  pathname: "/sessions/active",
                  params: {
                    characterId: Array.isArray(id) ? id[0] : id,
                    sessionId: inProgressSession.id,
                    routineId: inProgressSession.routine_id ?? "",
                    routineDayId: inProgressSession.routine_day_id ?? "",
                    routineName: inProgressSession.routine_name_snapshot,
                  },
                })
              }
            >
              <View style={styles.ctaCopy}>
                <Text style={styles.ctaLabel}>WORKOUT IN PROGRESS</Text>
                <Text style={styles.ctaTitle}>
                  Resume &quot;{inProgressSession.routine_name_snapshot}&quot;
                </Text>
              </View>
            </TouchableOpacity>
          ) : latestCompletedToday ? (
            <View style={styles.completedWrapper}>
              <TouchableOpacity
                style={[styles.ctaSection, styles.completedCard]}
                activeOpacity={0.8}
                onPress={() => router.push(`/characters/${id}/history`)}
              >
                <View style={styles.ctaCopy}>
                  <Text style={styles.completedOverline}>TODAY&apos;S WORKOUT COMPLETE ✓</Text>
                  <Text style={styles.completedTitle}>
                    {latestCompletedToday.routine_name_snapshot}
                  </Text>
                  <Text style={styles.completedMeta}>
                    {latestCompletedToday.total_sets} sets · {latestCompletedToday.duration_minutes} min
                  </Text>
                  <Text style={styles.viewWorkoutText}>View Workout</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.secondaryActionButton}
                onPress={() => void openRoutineChooser()}
                accessibilityRole="button"
              >
                <Text style={styles.secondaryActionText}>Log Another Workout</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.ctaSection}
              activeOpacity={0.8}
              onPress={handlePrimaryAction}
            >
              <View style={styles.ctaCopy}>
                <Text style={styles.ctaLabel}>
                  {todayRoutine?.isRestDay
                    ? "Recovery"
                    : todayRoutine?.routine
                      ? "Today's Routine"
                      : "Workout"}
                </Text>
                <Text style={styles.ctaTitle}>
                  {!workoutPlan
                    ? "Create a Workout Plan"
                    : todayRoutine?.routine && !todayRoutine.isRestDay
                      ? `Start "${todayRoutine.routine.name}"`
                      : "Start a Workout"}
                </Text>
              </View>
            </TouchableOpacity>
          )}
         

          {/* The Action grid section for the buttons; edit/start the plan, workout-history, character-stats-exp, and tbd button  */}
          <View style={styles.gridSection}>
            
            <View style={styles.actionGrid}>

              <TouchableOpacity
                style={styles.actionTile}
                activeOpacity={0.7}
                onPress={() => {
                  if (workoutPlan) {
                    router.push(`/characters/${id}/plan`);
                  } else {
                    router.push({
                      pathname: "/characters/create_workout_plan",
                      params: { characterId: id},
                    });
                  }
                }}
                >
                <Text style={styles.actionTitle}>Plan</Text>
                <Text style={styles.actionMeta}>
                  { workoutPlan ? workoutPlan.name : "No active plan" }
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.actionTile}
                activeOpacity={0.7}
                onPress={() => router.push(`/characters/${id}/history`)}
              >
                <Text style={styles.actionTitle}>History</Text>
                <Text style={styles.actionMeta}>
                  {mockCharacterStatsData.overview.workoutsCompleted} workouts
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionTile}>
                <Text style={styles.actionTitle}>Records</Text>
                <Text style={styles.actionMeta}>
                  {mockCharacterStatsData.recentPersonalRecords.length} recent PRs
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionTile}>
                <Text style={styles.actionTitleMuted}>More</Text>
                <Text style={styles.actionMeta}>Coming soon</Text>
              </TouchableOpacity>
              
            </View>
          </View>
        </ScrollView>
      </View>

      <Modal
        visible={isChooserOpen}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!isLoadingRoutines) {
            setIsChooserOpen(false);
          }
        }}
      >
        <View style={styles.confirmModalOverlay}>
          <View style={styles.chooserModalCard}>
            <Text style={styles.confirmModalTitle}>Choose a Routine</Text>
            <Text style={styles.confirmModalMessage}>Select a routine to begin your workout.</Text>

            {isLoadingRoutines ? (
              <ActivityIndicator size="small" color="#0f766e" />
            ) : chooserError ? (
              <Text style={styles.chooserError}>{chooserError}</Text>
            ) : availableRoutines.length > 0 ? (
              <ScrollView style={styles.routinesList}>
                {availableRoutines.map((routine) => (
                  <TouchableOpacity
                    key={routine.id}
                    style={styles.routineOption}
                    onPress={() => handleSelectRoutine(routine)}
                    accessibilityRole="button"
                  >
                    <Text style={styles.routineOptionName}>{routine.name}</Text>
                    {routine.description ? (
                      <Text style={styles.routineOptionDescription}>{routine.description}</Text>
                    ) : null}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            ) : (
              <Text style={styles.chooserError}>No routines are available in this plan.</Text>
            )}

            <TouchableOpacity
              style={[styles.confirmButton, styles.confirmCancelBtn]}
              onPress={() => setIsChooserOpen(false)}
              disabled={isLoadingRoutines}
              accessibilityRole="button"
            >
              <Text style={styles.confirmCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={isStartConfirmOpen}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!isStartingWorkout) {
            setIsStartConfirmOpen(false);
          }
        }}
      >
        <View style={styles.confirmModalOverlay}>
          <View style={styles.confirmModalCard}>
            <Text style={styles.confirmModalTitle}>
              {isStartingCompletedRoutineAgain
                ? "Begin Another Workout?"
                : `Start ${pendingRoutine?.name || "Workout"}?`}
            </Text>

            <Text style={styles.confirmModalMessage}>
              {pendingRoutine?.planned_exercises?.length || 0} exercises planned.
              {"\n\n"}
              {isStartingCompletedRoutineAgain
                ? `You completed ${pendingRoutine?.name} today. Start another session?`
                : "Your session and workout timer will begin once you confirm."}
            </Text>

            <View style={styles.confirmModalActions}>
              <TouchableOpacity
                style={[styles.confirmButton, styles.confirmCancelBtn]}
                onPress={() => setIsStartConfirmOpen(false)}
                disabled={isStartingWorkout}
                activeOpacity={0.7}
                accessibilityRole="button"
              >
                <Text style={styles.confirmCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.confirmButton, styles.confirmStartBtn]}
                onPress={() => void handleConfirmStart()}
                activeOpacity={0.7}
                disabled={isStartingWorkout}
                accessibilityRole="button"
              >
                <Text style={styles.confirmStartText}>
                  {isStartingWorkout ? "Starting..." : "Begin Workout"}
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
  screenContainer: {
    flex: 1,
  },
  scrollContent: {
    flex: 1,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 32,
    gap: 14,
  },
  stageSection: {
    flex: 1,
    backgroundColor: "#ffffff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#dbe4ee",
    padding: 14,
    flexDirection: "row",
    alignItems: "stretch",
    justifyContent: "space-between",
    gap: 10,
    shadowColor: "#101828",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 18,
    elevation: 3,
  },
  sideColumn: {
    flex: 1,
    justifyContent: "space-between",
  },
  columnTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: "#0f766e",
    letterSpacing: 0,
    marginBottom: 8,
    textTransform: "uppercase",
    minHeight: 28,
  },
  bioGroup: {
    gap: 3,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#edf2f7",
  },
  bioLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: "#64748b",
    textTransform: "uppercase",
  },
  bioValue: {
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 18,
    color: "#172033",
  },
  avatarColumn: {
    flex: 1.3,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarBox: {
    width: "100%",
    flex: 1,
    maxHeight: 220,
    backgroundColor: "#eefcf8",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#99f6e4",
    alignItems: "center",
    justifyContent: "center",
    padding: 8,
    overflow: "hidden",
  },
  avatarGlow: {
    position: "absolute",
    width: "86%",
    height: "86%",
    borderRadius: 999,
    backgroundColor: "#ccfbf1",
  },
  avatarInitials: {
    color: "#134e4a",
    fontSize: 34,
    fontWeight: "900",
    lineHeight: 40,
  },
  avatarPlaceholderText: {
    marginTop: 4,
    fontSize: 10,
    fontWeight: "800",
    color: "#0f766e",
    textAlign: "center",
    textTransform: "uppercase",
  },
  statGroup: {
    gap: 1,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#edf2f7",
  },
  statValue: {
    fontSize: 16,
    fontWeight: "900",
    lineHeight: 20,
    color: "#172033",
  },
  statLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: "#64748b",
    textTransform: "uppercase",
  },
  ctaSection: {
    minHeight: 76,
    backgroundColor: "#0f172a",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 14,
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.14,
    shadowRadius: 20,
    elevation: 4,
  },
  ctaCopy: {
    flex: 1,
    gap: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  ctaLabel: {
    color: "#99f6e4",
    fontSize: 11,
    fontWeight: "800",
    lineHeight: 15,
    textTransform: "uppercase",
  },
  ctaTitle: {
    color: "#ffffff",
    fontSize: 22,
    fontWeight: "900",
    lineHeight: 28,
  },
  resumeCard: {
    backgroundColor: "#065f46",
  },
  completedWrapper: {
    gap: 8,
  },
  completedCard: {
    backgroundColor: "#ffffff",
    borderWidth: 1.5,
    borderColor: "#059669",
  },
  completedOverline: {
    color: "#059669",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  completedTitle: {
    color: "#172033",
    fontSize: 18,
    fontWeight: "800",
  },
  completedMeta: {
    color: "#64748b",
    fontSize: 13,
    fontWeight: "600",
  },
  viewWorkoutText: {
    color: "#047857",
    fontSize: 12,
    fontWeight: "700",
  },
  secondaryActionButton: {
    alignSelf: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  secondaryActionText: {
    color: "#0f766e",
    fontSize: 14,
    fontWeight: "700",
  },
  
  gridSection: {
    backgroundColor: "#ffffff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#dbe4ee",
    padding: 14,
    gap: 14,
    shadowColor: "#101828",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 18,
    elevation: 2,
  },
 
 
  actionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  actionTile: {
    width: "47.5%",
    minHeight: 110,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#dbe4ee",
    backgroundColor: "#f8fafc",
    padding: 16,
    justifyContent: "space-between",
  },
  
  actionTitle: {
    color: "#172033",
    fontSize: 15,
    fontWeight: "900",
    lineHeight: 20,
  },
  actionTitleMuted: {
    color: "#94a3b8",
    fontSize: 15,
    fontWeight: "900",
    lineHeight: 20,
  },
  actionMeta: {
    color: "#64748b",
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 16,
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
  chooserModalCard: {
    width: "100%",
    maxWidth: 380,
    maxHeight: "80%",
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 22,
    gap: 12,
  },
  routinesList: {
    flexGrow: 0,
    maxHeight: 300,
  },
  routineOption: {
    padding: 12,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 8,
    marginBottom: 8,
  },
  routineOptionName: {
    color: "#172033",
    fontSize: 15,
    fontWeight: "700",
  },
  routineOptionDescription: {
    color: "#64748b",
    fontSize: 12,
    marginTop: 2,
  },
  chooserError: {
    color: "#b91c1c",
    fontSize: 13,
    textAlign: "center",
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
  confirmStartBtn: {
    backgroundColor: "#0f766e",
  },
  confirmStartText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "700",
  },
});
