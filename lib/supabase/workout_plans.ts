import { supabase } from "./client";


export interface WorkoutPlan {
    id: string;
    character_id: string;
    description?: string | null;
    name: string;
    is_active: boolean;
    created_at: string;
}

export interface PlannedExercise {
    id: string;
    routine_day_id: string;
    routine_id?: string | null;
    exercise_name: string;
    target_sets: number;
    min_reps: number;
    max_reps: number;
    rest_seconds?: number | null;
    notes?: string | null;
    order_index: number;
    created_at?: string;
}

export interface Routine {
    id: string;
    workout_plan_id: string;
    name: string;
    description?: string | null,
    order_index: number;
    created_at: string;
    updated_at: string
}

export type RoutineDay = {
    id: string;
    workout_plan_id: string; 
    name?: string | null;
    routine_id: string | null;
    day_of_week: number;
    is_rest_day: boolean;
}


//shape of an active routine ready for a workout session
export interface DayRoutineDetails {
    day_of_week: number;
    isRestDay: boolean;
    routine: (Routine & { planned_exercises: PlannedExercise[] }) | null;
}

//complete payload for plan dashboard
export interface PlanDashboardData {
    plan: WorkoutPlan;
    routines: (Routine & { planned_exercises: PlannedExercise[] })[];
    scheduleDays: {
        id: string;
        dayOfWeek: number;
        routineId: string | null;
        routineName : string;
        isRest: boolean;
    }[];
}





//grab the current active workoutplan id from the table
export async function fetchCurrentActiveWorkoutPlan(characterId: string): Promise<WorkoutPlan | null> {
    if (!characterId) {
        throw new Error("A characterId is required!");
    }

    try {
        const { data, error } = await supabase
        .from("workout_plans")
        .select("*")
        .eq("character_id", characterId)
        .eq("is_active", true)
        .maybeSingle()

        if (error) {
            throw error;
        }

        return data as WorkoutPlan;
    } catch (err) {
        console.error("Error, failed to fetch an active plan", err);
        throw err;
    }
}

//now grab the current day routine, make sure it matches to the active workout_plan
export async function fetchCurrentDayRoutine(workoutPlanId: string, dayOfWeek: number): Promise<DayRoutineDetails | null> {
    if (!workoutPlanId || dayOfWeek === undefined || dayOfWeek === null || dayOfWeek < 0 || dayOfWeek > 6) {
        throw new Error("Requires a valid workout plan ID as well as day of the week value!");
    }

    try {
        const { data, error } = await supabase
        .from("routine_days")
        .select(`
            day_of_week,
            routine_id,
            is_rest_day,
            routines (
                *,
                planned_exercises (*)    
            )
        `)
        .eq("workout_plan_id", workoutPlanId)
        .eq("day_of_week", dayOfWeek)
        .maybeSingle()

        if (error) {
            throw error;
        }

        if (!data) {
            return null;
        }

        const assignedRoutine = Array.isArray(data.routines) ? data.routines[0] : data.routines;
        return {
            day_of_week: data.day_of_week,
            isRestDay: !data.routine_id || data.is_rest_day,
            routine: assignedRoutine ?? null,
        };
    } catch (err) {
        console.error("Error in fetching the current day routine", err);
        throw err;
    }
} 

//make a workoutplan which is a table that consist of another table routine
export async function createSimpleWorkoutPlan(input: {
    character_id: string;
    name: string;
    description?: string | null; }) : Promise<WorkoutPlan> {
        if (!input.character_id) {
            throw new Error("Character ID is missing");
        }
        if (!input.name || !input.name.trim()) {
            throw new Error("A workout plan name is required");
        }

        try {
            const { data : newPlan, error } = await supabase
            .from("workout_plans")
            .insert({
                character_id: input.character_id,
                name: input.name.trim(),
                description: input.description?.trim() || null,
                is_active: true,
            })
            .select()
            .single();

            if (error) {
                throw error;
            }

            const dayNames = [
                "Sunday",
                "Monday",
                "Tuesday",
                "Wednesday",
                "Thursday",
                "Friday",
                "Saturday",
            ];
            const initialDays = dayNames.map((name, dayIndex) => ({
                workout_plan_id: newPlan.id,
                day_of_week: dayIndex,
                name,
                is_rest_day: true,
                order_index: dayIndex,
                routine_id: null,
            }));

            const { error: daysError } = await supabase
                .from("routine_days")
                .insert(initialDays);

            if (daysError) {
                console.error("Error creating initial routine days:", daysError);
                throw daysError;
            }

            return newPlan as WorkoutPlan;
        } catch (err) {
            console.error("Error in creating a workout container", err);
            throw err;
        }
    } 

export async function createRoutine(input: {
    workout_plan_id: string;
    name: string;
    description?: string | null;
    order_index?: number;
}): Promise<Routine> {
    if (!input.workout_plan_id) {
        throw new Error("Workout Plan ID is required.");
    }
    if (!input.name || !input.name.trim()) {
        throw new Error("Routine name is required.");
    }

    const { data, error } = await supabase
        .from("routines")
        .insert({
            workout_plan_id: input.workout_plan_id,
            name: input.name.trim(),
            description: input.description?.trim() || null,
            order_index: input.order_index ?? 0,
        })
        .select()
        .single();

    if (error) {
        console.error("Error creating routine:", error);
        throw error;
    }

    return data as Routine;
}

export async function updateRoutineDayAssignment(input: {
    routine_day_id: string;
    routine_id: string | null;
    is_rest_day: boolean;
}): Promise<void> {
    const { error } = await supabase
        .from("routine_days")
        .update({
            routine_id: input.routine_id,
            is_rest_day: input.is_rest_day,
        })
        .eq("id", input.routine_day_id);

    if (error) {
        console.error("Error updating routine day assignment:", error);
        throw error;
    }
}

export async function createPlannedExercise(input: {
    routine_day_id: string;
    routine_id?: string | null;
    exercise_name: string;
    target_sets?: number;
    min_reps?: number;
    max_reps?: number;
    rest_seconds?: number | null;
    notes?: string | null;
    order_index?: number;
}): Promise<PlannedExercise> {
    if (!input.routine_day_id) {
        throw new Error("routine_day_id is required.");
    }
    if (!input.exercise_name || !input.exercise_name.trim()) {
        throw new Error("Exercise name is required.");
    }

    const { data, error } = await supabase
        .from("planned_exercises")
        .insert({
            routine_day_id: input.routine_day_id,
            routine_id: input.routine_id ?? null,
            exercise_name: input.exercise_name.trim(),
            target_sets: input.target_sets ?? 3,
            min_reps: input.min_reps ?? 8,
            max_reps: input.max_reps ?? 12,
            rest_seconds: input.rest_seconds ?? null,
            notes: input.notes?.trim() ?? null,
            order_index: input.order_index ?? 0,
        })
        .select()
        .single();

    if (error) {
        console.error("Error creating planned exercise:", error);
        throw error;
    }

    return data as PlannedExercise;
}

export async function fetchPlanDashboardData(characterId: string, planId?: string): Promise<PlanDashboardData | null> {
    if (!characterId) {
        throw new Error("Valid characterId is required.");
    }

    try {


        let query = supabase.from('workout_plans').select('*');

        if (planId) {
            query = query.eq('id', planId);
        } else {
            query = query.eq('character_id', characterId).eq('is_active', true);
        }

        const { data: plan, error: planError } = await query.maybeSingle();

        if (planError) {
            console.error('Error fetching the worktout plan DB!', planError);
            throw new Error(`Failed to load the workout plan: ${planError.message}`);
        }

        if (!plan) {
            return null;
        }

        const { data: routines, error: routinesError } = await supabase
            .from("routines")
            .select(`*, planned_exercises (*)`)
            .eq("workout_plan_id", plan.id)
            .order("order_index", { ascending: true });

        if (routinesError) { throw routinesError; }

        const { data: days, error: daysError } = await supabase
            .from("routine_days")
            .select(`id, day_of_week, routine_id, is_rest_day, routines (id, name)`)
            .eq("workout_plan_id", plan.id)
            .order("day_of_week", { ascending: true });

        if (daysError) {
            throw daysError;
        }

        let resolvedDays = days ?? [];
        if (resolvedDays.length === 0) {
            const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
            const initialDays = dayNames.map((name, index) => ({
                workout_plan_id: plan.id,
                day_of_week: index,
                name,
                is_rest_day: true,
                order_index: index,
                routine_id: null,
            }));

            const { data: createdDays, error: seedError } = await supabase
                .from("routine_days")
                .insert(initialDays)
                .select(`id, day_of_week, routine_id, is_rest_day, routines (id, name)`);

            if (seedError) {
                console.error("Error creating initial routine days:", seedError);
                throw seedError;
            }

            if (!createdDays) {
                throw new Error("Initial routine days were not returned after creation.");
            }

            resolvedDays = createdDays;
        }

        return {
            plan: plan as WorkoutPlan,
            routines: (routines ?? []) as (Routine & { planned_exercises: PlannedExercise[] })[],
            scheduleDays : resolvedDays.map((d) => {
                const assigned = Array.isArray(d.routines) ? d.routines[0] : d.routines;
                return {
                    id: d.id,
                    dayOfWeek: d.day_of_week,
                    routineId: d.routine_id,
                    routineName: assigned?.name ?? (d.is_rest_day ? "Rest Day" : "Unassigned"),
                    isRest: !d.routine_id || d.is_rest_day,
                };
            }),
        };
    } catch (err) {
        console.error("Failed to fetch the plan dashbord data:", err);
        throw err;
    } 

}
