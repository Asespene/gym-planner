import { supabase } from "./client";

export interface PreviousSetBaseline {
  set_number: number;
  weight_used: number;
  reps_completed: number;
}

export interface PreviousExercisePerformance {
  sessionId: string;
  completedAt: string;
  sets: PreviousSetBaseline[];
}

export interface CompletedWorkoutSet {
  exercise_name: string;
  set_number: number;
  weight_used: number;
  reps_completed: number;
}

export async function recordCompletedWorkout(input: {
  characterId: string;
  routineId: string;
  routineDayId: string | null;
  routineNameSnapshot: string;
  startedAt: string;
  sets: CompletedWorkoutSet[];
}): Promise<void> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) {
    console.error("Error getting authenticated user to save workout:", userError);
    throw userError;
  }
  if (!userData.user) {
    throw new Error("Sign in before saving a workout.");
  }

  const completedAt = new Date().toISOString();
  const { data: session, error: sessionError } = await supabase
    .from("workout_sessions")
    .insert({
      user_id: userData.user.id,
      character_id: input.characterId,
      routine_id: input.routineId,
      routine_day_id: input.routineDayId,
      routine_name_snapshot: input.routineNameSnapshot.trim(),
      status: "completed",
      started_at: input.startedAt,
      completed_at: completedAt,
    })
    .select("id")
    .single();

  if (sessionError) {
    console.error("Error recording completed workout:", sessionError);
    throw sessionError;
  }

  if (input.sets.length > 0) {
    const { error: setsError } = await supabase.from("logged_sets").insert(
      input.sets.map((set) => ({
        ...set,
        workout_session_id: session.id,
        is_completed: true,
      }))
    );
    if (setsError) {
      console.error("Error recording completed workout sets:", setsError);
      throw setsError;
    }
  }
}

export interface CompletedSessionSummary {
  id: string;
  started_at: string;
  completed_at: string | null;
  routine_name: string;
  total_sets: number;
  total_volume_lb: number;
  exercises: {
    name: string;
    sets: {
      set_number: number;
      weight_used: number;
      reps_completed: number;
    }[];
  }[];
}

interface CompletedSessionRow {
  id: string;
  started_at: string;
  completed_at: string | null;
  routine_name_snapshot: string;
  logged_sets: {
    exercise_name: string;
    set_number: number;
    weight_used: number;
    reps_completed: number;
  }[] | null;
}

export async function fetchCharacterWorkoutHistory(
  characterId: string
): Promise<CompletedSessionSummary[]> {
  if (!characterId) {
    throw new Error("Character ID is required to load workout history.");
  }

  const { data, error } = await supabase
    .from("workout_sessions")
    .select(`
      id,
      started_at,
      completed_at,
      routine_name_snapshot,
      logged_sets (
        exercise_name,
        set_number,
        weight_used,
        reps_completed
      )
    `)
    .eq("character_id", characterId)
    .eq("status", "completed")
    .order("completed_at", { ascending: false });

  if (error) {
    console.error("Error fetching workout history:", error);
    throw error;
  }

  return ((data ?? []) as CompletedSessionRow[]).map((session) => {
    const sets = session.logged_sets ?? [];
    const exercisesByName = new Map<
      string,
      { set_number: number; weight_used: number; reps_completed: number }[]
    >();

    for (const set of sets) {
      const exerciseSets = exercisesByName.get(set.exercise_name) ?? [];
      exerciseSets.push({
        set_number: set.set_number,
        weight_used: Number(set.weight_used) || 0,
        reps_completed: Number(set.reps_completed) || 0,
      });
      exercisesByName.set(set.exercise_name, exerciseSets);
    }

    const exercises = Array.from(exercisesByName, ([name, exerciseSets]) => ({
      name,
      sets: exerciseSets.sort((left, right) => left.set_number - right.set_number),
    }));

    return {
      id: session.id,
      started_at: session.started_at,
      completed_at: session.completed_at,
      routine_name: session.routine_name_snapshot || "Custom Workout",
      total_sets: sets.length,
      total_volume_lb: sets.reduce(
        (total, set) =>
          total + (Number(set.weight_used) || 0) * (Number(set.reps_completed) || 0),
        0
      ),
      exercises,
    };
  });
}

export async function fetchLastExercisePerformance(
  characterId: string,
  exerciseName: string,
  currentSessionId?: string | null
): Promise<PreviousExercisePerformance | null> {
  if (!characterId || !exerciseName.trim()) {
    return null;
  }

  let query = supabase
    .from("workout_sessions")
    .select(`
      id,
      completed_at,
      logged_sets!inner (
        exercise_name
      )
    `)
    .eq("character_id", characterId)
    .eq("status", "completed")
    .not("completed_at", "is", null)
    .eq("logged_sets.exercise_name", exerciseName.trim())
    .order("completed_at", { ascending: false })
    .limit(1);

  if (currentSessionId) {
    query = query.neq("id", currentSessionId);
  }

  const { data: session, error: sessionError } = await query.maybeSingle();
  if (sessionError) {
    console.error("Error fetching previous workout session:", sessionError);
    throw sessionError;
  }

  if (!session) {
    return null;
  }

  if (!session.completed_at) {
    throw new Error("The previous completed workout is missing its completion time.");
  }

  const { data: sets, error: setsError } = await supabase
    .from("logged_sets")
    .select("set_number, weight_used, reps_completed")
    .eq("workout_session_id", session.id)
    .eq("exercise_name", exerciseName.trim())
    .order("set_number", { ascending: true });

  if (setsError) {
    console.error("Error fetching sets from previous workout:", setsError);
    throw setsError;
  }

  return {
    sessionId: session.id,
    completedAt: session.completed_at,
    sets: (sets ?? []) as PreviousSetBaseline[],
  };
}
