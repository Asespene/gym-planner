import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  Alert,
  ActivityIndicator,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  CompletedSessionSummary,
  fetchCharacterWorkoutHistory,
  reopenCompletedWorkoutSession,
} from "../../../lib/supabase/workout_sessions";

function formatStartedAt(startedAtValue: string): string {
  const startedAt = new Date(startedAtValue);
  const dateLabel = startedAt.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  return `${dateLabel}, ${startedAt.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  })}`;
}

function formatSessionDuration(
  startedAtValue: string,
  completedAtValue: string | null
): string {
  if (!completedAtValue) {
    return "Duration unavailable";
  }

  const durationSeconds = Math.max(
    0,
    Math.floor((Date.parse(completedAtValue) - Date.parse(startedAtValue)) / 1000)
  );
  const hours = Math.floor(durationSeconds / 3600);
  const minutes = Math.floor((durationSeconds % 3600) / 60);
  const seconds = durationSeconds % 60;

  if (hours > 0) {
    return seconds > 0
      ? `${hours}h ${minutes}m ${seconds}s`
      : minutes > 0
        ? `${hours}h ${minutes}m`
        : `${hours}h`;
  }
  if (minutes > 0) {
    return seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes}m`;
  }
  return `${seconds}s`;
}

export default function WorkoutHistoryScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string | string[] }>();
  const characterId = Array.isArray(id) ? id[0] : id;
  const [history, setHistory] = useState<CompletedSessionSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reopeningSessionId, setReopeningSessionId] = useState<string | null>(null);
  const latestTodaySessionId = history.find(
    (session) =>
      session.completed_at &&
      new Date(session.completed_at).toDateString() === new Date().toDateString()
  )?.id;

  async function reopenSession(session: CompletedSessionSummary) {
    if (!characterId || reopeningSessionId) {
      return;
    }

    try {
      setReopeningSessionId(session.id);
      await reopenCompletedWorkoutSession(session.id);
      router.push({
        pathname: "/sessions/active",
        params: {
          characterId,
          sessionId: session.id,
          routineId: session.routine_id ?? "",
          routineDayId: session.routine_day_id ?? "",
          routineName: session.routine_name,
        },
      });
    } catch (err) {
      console.error("Failed to reopen workout:", err);
      const message =
        err instanceof Error ? err.message : "Could not reopen workout. Please try again.";
      if (Platform.OS === "web") {
        window.alert(message);
      } else {
        Alert.alert("Cannot Reopen Workout", message);
      }
    } finally {
      setReopeningSessionId(null);
    }
  }

  function handleReopenPress(session: CompletedSessionSummary) {
    const message =
      "Continue logging in the same session. Elapsed duration will include time since it originally began.";
    if (Platform.OS === "web") {
      if (window.confirm("Reopen Workout?\n\n" + message)) {
        void reopenSession(session);
      }
      return;
    }

    Alert.alert("Reopen Workout?", message, [
      { text: "Cancel", style: "cancel" },
      { text: "Reopen", onPress: () => void reopenSession(session) },
    ]);
  }

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      async function loadHistory() {
        if (!characterId) {
          setLoadError("A character ID is required to load workout history.");
          setHistory([]);
          setIsLoading(false);
          return;
        }

        try {
          setIsLoading(true);
          setLoadError(null);
          const sessions = await fetchCharacterWorkoutHistory(characterId);
          if (isActive) {
            setHistory(sessions);
          }
        } catch (err) {
          console.error("Failed to load workout history:", err);
          if (isActive) {
            setLoadError("Failed to load workout history. Please try again.");
          }
        } finally {
          if (isActive) {
            setIsLoading(false);
          }
        }
      }

      void loadHistory();
      return () => {
        isActive = false;
      };
    }, [characterId])
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={["bottom"]}>
      <Stack.Screen
        options={{
          title: "Workout History",
          headerShown: true,
          headerBackTitle: "Back",
        }}
      />
      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#0f766e" />
          <Text style={styles.mutedText}>Loading workout history...</Text>
        </View>
      ) : loadError ? (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyTitle}>History unavailable</Text>
          <Text style={styles.mutedText}>{loadError}</Text>
        </View>
      ) : (
        <FlatList
          data={history}
          keyExtractor={(session) => session.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>No Completed Workouts</Text>
              <Text style={styles.mutedText}>
                Workouts you finish will appear here with their set details.
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.sessionCard}>
              <View style={styles.sessionHeader}>
                <View style={styles.sessionTitleBlock}>
                  <Text style={styles.routineTitle}>{item.routine_name}</Text>
                  <Text style={styles.dateText}>{formatStartedAt(item.started_at)}</Text>
                </View>
                <View style={styles.headerStats}>
                  <Text style={styles.statPill}>
                    {formatSessionDuration(item.started_at, item.completed_at)}
                  </Text>
                  <Text style={styles.statPill}>{item.total_sets} sets</Text>
                  <Text style={styles.statPill}>
                    {item.total_volume_lb.toLocaleString()} lb
                  </Text>
                </View>
              </View>

              {item.exercises.length > 0 ? (
                <View style={styles.exercisesList}>
                  {item.exercises.map((exercise) => (
                    <View key={exercise.name} style={styles.exerciseRow}>
                      <Text style={styles.exerciseName}>{exercise.name}</Text>
                      <Text style={styles.exerciseDetails}>
                        {exercise.sets
                          .map((set) => `${set.weight_used}×${set.reps_completed}`)
                          .join(", ")}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={styles.mutedText}>No sets were logged for this workout.</Text>
              )}

              {item.id === latestTodaySessionId ? (
                <TouchableOpacity
                  style={[
                    styles.reopenButton,
                    reopeningSessionId === item.id && styles.disabledButton,
                  ]}
                  onPress={() => handleReopenPress(item)}
                  disabled={reopeningSessionId !== null}
                  accessibilityRole="button"
                >
                  <Text style={styles.reopenButtonText}>
                    {reopeningSessionId === item.id ? "Reopening..." : "Reopen Workout"}
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>
          )}
        />
      )}
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
    padding: 24,
    gap: 8,
    backgroundColor: "#f6f8fb",
  },
  listContent: {
    flexGrow: 1,
    padding: 18,
    gap: 14,
  },
  sessionCard: {
    backgroundColor: "#ffffff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#dbe4ee",
    padding: 16,
    gap: 12,
  },
  sessionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    paddingBottom: 10,
    gap: 10,
  },
  sessionTitleBlock: {
    flex: 1,
  },
  routineTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#172033",
  },
  dateText: {
    fontSize: 12,
    color: "#64748b",
    fontWeight: "600",
    marginTop: 2,
  },
  headerStats: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-end",
    gap: 6,
  },
  statPill: {
    fontSize: 11,
    fontWeight: "700",
    color: "#0f766e",
    backgroundColor: "#f0fdfa",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  exercisesList: {
    gap: 8,
  },
  exerciseRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
  },
  exerciseName: {
    flex: 1,
    fontSize: 13,
    fontWeight: "700",
    color: "#334155",
  },
  exerciseDetails: {
    flexShrink: 1,
    fontSize: 12,
    fontWeight: "600",
    color: "#64748b",
    textAlign: "right",
  },
  emptyCard: {
    backgroundColor: "#ffffff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#dbe4ee",
    padding: 24,
    alignItems: "center",
    gap: 6,
    marginTop: 40,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#172033",
    textAlign: "center",
  },
  mutedText: {
    fontSize: 13,
    color: "#64748b",
    textAlign: "center",
  },
  reopenButton: {
    alignItems: "center",
    paddingVertical: 10,
    backgroundColor: "#0f766e",
    borderRadius: 8,
  },
  reopenButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
  },
  disabledButton: {
    opacity: 0.5,
  },
});
