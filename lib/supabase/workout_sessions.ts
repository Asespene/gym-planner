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

export interface ActiveSessionSet extends CompletedWorkoutSet {
  id?: string;
  is_completed: boolean;
}

export interface ActiveSessionDetails {
  id: string;
  character_id: string;
  routine_id: string | null;
  routine_day_id: string | null;
  routine_name_snapshot: string;
  started_at: string;
  logged_sets: ActiveSessionSet[];
}

export interface LatestCompletedSessionSummary {
  id: string;
  routine_name_snapshot: string;
  started_at: string;
  completed_at: string;
  total_sets: number;
  duration_minutes: number;
}

export async function createActiveWorkoutSession(input: {
  characterId: string;
  routineId: string | null;
  routineDayId: string | null;
  routineNameSnapshot: string;
}): Promise<string> {
  if (!input.characterId || !input.routineNameSnapshot.trim()) {
    throw new Error("Character and routine details are required to start a workout.");
  }

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) {
    console.error("Error getting authenticated user to start workout:", userError);
    throw userError;
  }
  if (!userData.user) {
    throw new Error("Sign in before starting a workout.");
  }

  const openSession = await fetchOpenWorkoutSession(input.characterId);
  if (openSession) {
    throw new Error(`Finish or resume "${openSession.routine_name_snapshot}" before starting another workout.`);
  }

  const { data, error } = await supabase
    .from("workout_sessions")
    .insert({
      user_id: userData.user.id,
      character_id: input.characterId,
      routine_id: input.routineId,
      routine_day_id: input.routineDayId,
      routine_name_snapshot: input.routineNameSnapshot.trim(),
      status: "in_progress",
      started_at: new Date().toISOString(),
      completed_at: null,
    })
    .select("id")
    .single();

  if (error) {
    console.error("Error creating active workout session:", error);
    throw error;
  }

  return data.id;
}

export async function fetchWorkoutSessionById(sessionId: string): Promise<ActiveSessionDetails | null> {
  if (!sessionId) {
    throw new Error("Session ID is required.");
  }

  const { data, error } = await supabase
    .from("workout_sessions")
    .select(`
      id,
      character_id,
      routine_id,
      routine_day_id,
      routine_name_snapshot,
      started_at,
      logged_sets (
        id,
        exercise_name,
        set_number,
        weight_used,
        reps_completed,
        is_completed
      )
    `)
    .eq("id", sessionId)
    .eq("status", "in_progress")
    .maybeSingle();

  if (error) {
    console.error("Error fetching active workout session:", error);
    throw error;
  }

  if (!data) {
    return null;
  }

  return {
    ...data,
    logged_sets: (data.logged_sets ?? []) as ActiveSessionSet[],
  } as ActiveSessionDetails;
}

export async function fetchOpenWorkoutSession(
  characterId: string
): Promise<ActiveSessionDetails | null> {
  if (!characterId) {
    throw new Error("Character ID is required to find an active workout.");
  }

  const { data, error } = await supabase
    .from("workout_sessions")
    .select(`
      id,
      character_id,
      routine_id,
      routine_day_id,
      routine_name_snapshot,
      started_at,
      logged_sets (
        id,
        exercise_name,
        set_number,
        weight_used,
        reps_completed,
        is_completed
      )
    `)
    .eq("character_id", characterId)
    .eq("status", "in_progress")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Error fetching active workout session:", error);
    throw error;
  }

  if (!data) {
    return null;
  }

  return {
    ...data,
    logged_sets: (data.logged_sets ?? []) as ActiveSessionSet[],
  } as ActiveSessionDetails;
}

export async function recordWorkoutSet(
  sessionId: string,
  set: CompletedWorkoutSet
): Promise<void> {
  if (!sessionId) {
    throw new Error("Session ID is required to save a workout set.");
  }

  const { error } = await supabase.from("logged_sets").insert({
    ...set,
    workout_session_id: sessionId,
    is_completed: true,
  });

  if (error) {
    console.error("Error saving workout set:", error);
    throw error;
  }
}

export async function completeWorkoutSession(sessionId: string): Promise<void> {
  if (!sessionId) {
    throw new Error("Session ID is required to complete a workout.");
  }

  const { data, error } = await supabase
    .from("workout_sessions")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
    })
    .eq("id", sessionId)
    .eq("status", "in_progress")
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("Error completing workout session:", error);
    throw error;
  }
  if (!data) {
    throw new Error("This workout session is no longer in progress.");
  }
}

export async function fetchLatestCompletedSessionToday(
  characterId: string
): Promise<LatestCompletedSessionSummary | null> {
  if (!characterId) {
    throw new Error("Character ID is required.");
  }

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const startOfNextDay = new Date(startOfDay);
  startOfNextDay.setDate(startOfNextDay.getDate() + 1);

  const { data: session, error: sessionError } = await supabase
    .from("workout_sessions")
    .select("id, routine_name_snapshot, started_at, completed_at")
    .eq("character_id", characterId)
    .eq("status", "completed")
    .gte("completed_at", startOfDay.toISOString())
    .lt("completed_at", startOfNextDay.toISOString())
    .order("completed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (sessionError) {
    console.error("Error checking today's completed workout:", sessionError);
    throw sessionError;
  }
  if (!session) {
    return null;
  }
  if (!session.completed_at) {
    throw new Error("The latest completed workout is missing its completion time.");
  }

  const { count, error: countError } = await supabase
    .from("logged_sets")
    .select("id", { count: "exact", head: true })
    .eq("workout_session_id", session.id)
    .eq("is_completed", true);

  if (countError) {
    console.error("Error fetching set count for completed workout:", countError);
    throw countError;
  }

  const durationMinutes = Math.max(
    1,
    Math.round(
      (Date.parse(session.completed_at) - Date.parse(session.started_at)) / 60000
    )
  );

  return {
    id: session.id,
    routine_name_snapshot: session.routine_name_snapshot,
    started_at: session.started_at,
    completed_at: session.completed_at,
    total_sets: count ?? 0,
    duration_minutes: durationMinutes,
  };
}

export async function reopenCompletedWorkoutSession(sessionId: string): Promise<void> {
  if (!sessionId) {
    throw new Error("Session ID is required.");
  }

  const { data: session, error: fetchError } = await supabase
    .from("workout_sessions")
    .select("id, character_id")
    .eq("id", sessionId)
    .eq("status", "completed")
    .maybeSingle();

  if (fetchError) {
    console.error("Error fetching workout to reopen:", fetchError);
    throw fetchError;
  }
  if (!session) {
    throw new Error("This workout is no longer completed.");
  }

  const openSession = await fetchOpenWorkoutSession(session.character_id);
  if (openSession) {
    throw new Error(`Finish or resume "${openSession.routine_name_snapshot}" before reopening another workout.`);
  }

  const { data, error } = await supabase
    .from("workout_sessions")
    .update({
      status: "in_progress",
      completed_at: null,
    })
    .eq("id", sessionId)
    .eq("status", "completed")
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("Error reopening workout session:", error);
    throw error;
  }
  if (!data) {
    throw new Error("Could not reopen this workout. It may have changed status.");
  }
}

export interface CompletedSessionSummary {
  id: string;
  routine_id: string | null;
  routine_day_id: string | null;
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
  routine_id: string | null;
  routine_day_id: string | null;
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
      routine_id,
      routine_day_id,
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
      routine_id: session.routine_id,
      routine_day_id: session.routine_day_id,
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
