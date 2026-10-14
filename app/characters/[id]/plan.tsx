import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

import {
    createPlannedExercise,
    createRoutine,
    deletePlannedExercise,
    fetchPlanDashboardData,
    PlanDashboardData,
    PlannedExercise,
    Routine,
    updateRoutineDayAssignment,
} from "../../../lib/supabase/workout_plans";


const DAYS_OF_WEEK = [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday'
];

export default function PlanDashBoard() {
    const [dashboardData, setDashboardData] = useState<PlanDashboardData | null>(null);
    const [activeDayIndex, setActiveDayIndex] = useState<number>(() => new Date().getDay());

    const [isLoading, setIsLoading] = useState(true);

    const [error, setError] = useState<string | null>(null)
    const [isRoutineModalOpen, setIsRoutineModalOpen] = useState(false);
    const [routineName, setRoutineName] = useState("");
    const [routineDescription, setRoutineDescription] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [routineError, setRoutineError] = useState<string | null>(null);
    const [selectedDayForAssignment, setSelectedDayForAssignment] = useState<{
        id: string;
        dayOfWeek: number;
        routineId: string | null;
        isRest: boolean;
    } | null>(null);
    const [isAssigningDay, setIsAssigningDay] = useState(false);
    const [assignmentError, setAssignmentError] = useState<string | null>(null);
    const [editingRoutine, setEditingRoutine] = useState<
        (Routine & { planned_exercises: PlannedExercise[] }) | null
    >(null);
    const [isAddingExerciseInline, setIsAddingExerciseInline] = useState(false);
    const [exerciseName, setExerciseName] = useState("");
    const [targetSets, setTargetSets] = useState("3");
    const [minReps, setMinReps] = useState("8");
    const [maxReps, setMaxReps] = useState("12");
    const [isSubmittingExercise, setIsSubmittingExercise] = useState(false);
    const [exerciseError, setExerciseError] = useState<string | null>(null);
    const [deletingExerciseId, setDeletingExerciseId] = useState<string | null>(null);

    const { id, planId } = useLocalSearchParams<{ id: string, planId?: string }>();
    const router = useRouter(); 

    const characterId = Array.isArray(id) ? id[0] : id;
    const targetPlanId = Array.isArray(planId) ? planId[0] : planId;

    const handlePrevDay = () => {
        setActiveDayIndex((previous) => (previous === 0 ? 6 : previous - 1));
    };

    const handleNextDay = () => {
        setActiveDayIndex((previous) => (previous === 6 ? 0 : previous + 1));
    };

    const loadPlan = useCallback(async (showLoading = true) => {
        if (!characterId) {
            setIsLoading(false);
            setError("Invalid or missing character ID.");
            return;
        }

        try {
            if (showLoading) {
                setIsLoading(true);
            }
            setError(null);
            const planData = await fetchPlanDashboardData(characterId, targetPlanId);
            setDashboardData(planData);
        } catch (err) {
            console.error("Error loading plan:", err);
            setError("Failed to load the plan!");
        } finally {
            if (showLoading) {
                setIsLoading(false);
            }
        }
    }, [characterId, targetPlanId]);

    useFocusEffect(
        useCallback(() => {
            void loadPlan();
        }, [loadPlan])
    );

    async function handleCreateRoutine() {
        if (!routineName.trim() || !dashboardData?.plan.id || isSubmitting) {
            return;
        }

        try {
            setIsSubmitting(true);
            setRoutineError(null);
            await createRoutine({
                workout_plan_id: dashboardData.plan.id,
                name: routineName.trim(),
                description: routineDescription.trim() || null,
                order_index: dashboardData.routines.length,
            });

            setRoutineName("");
            setRoutineDescription("");
            setIsRoutineModalOpen(false);
            await loadPlan(false);
        } catch (err) {
            console.error("Error creating routine:", err);
            setRoutineError(err instanceof Error ? err.message : "Failed to create routine.");
        } finally {
            setIsSubmitting(false);
        }
    }

    async function handleAssignRoutine(routineId: string | null, isRest: boolean) {
        if (!selectedDayForAssignment || isAssigningDay) {
            return;
        }

        try {
            setIsAssigningDay(true);
            setAssignmentError(null);
            await updateRoutineDayAssignment({
                routine_day_id: selectedDayForAssignment.id,
                routine_id: routineId,
                is_rest_day: isRest,
            });

            setSelectedDayForAssignment(null);
            await loadPlan(false);
        } catch (err) {
            console.error("Error updating schedule assignment:", err);
            setAssignmentError(err instanceof Error ? err.message : "Failed to update schedule.");
        } finally {
            setIsAssigningDay(false);
        }
    }

    function handleOpenEditRoutine(routine: Routine & { planned_exercises: PlannedExercise[] }) {
        setExerciseError(null);
        setIsAddingExerciseInline(false);
        setExerciseName("");
        setTargetSets("3");
        setMinReps("8");
        setMaxReps("12");
        setEditingRoutine(routine);
    }

    async function handleDeleteExercise(exerciseId: string) {
        if (!editingRoutine || deletingExerciseId) {
            return;
        }

        try {
            setDeletingExerciseId(exerciseId);
            setExerciseError(null);
            await deletePlannedExercise(exerciseId);
            setEditingRoutine((previous) =>
                previous
                    ? {
                        ...previous,
                        planned_exercises: previous.planned_exercises.filter(
                            (exercise) => exercise.id !== exerciseId
                        ),
                    }
                    : previous
            );
            await loadPlan(false);
        } catch (err) {
            console.error("Error deleting planned exercise:", err);
            setExerciseError(err instanceof Error ? err.message : "Failed to delete exercise.");
        } finally {
            setDeletingExerciseId(null);
        }
    }

    async function handleCreateExerciseInline() {
        if (!editingRoutine || !exerciseName.trim() || isSubmittingExercise) {
            return;
        }

        const assignedDay = scheduleDays.find((day) => day.routineId === editingRoutine.id);
        if (!assignedDay) {
            setExerciseError("Assign this routine to a schedule day before adding exercises.");
            return;
        }

        const sets = Number.parseInt(targetSets, 10);
        const min = Number.parseInt(minReps, 10);
        const max = Number.parseInt(maxReps, 10);
        if (!Number.isInteger(sets) || sets < 1 ||
            !Number.isInteger(min) || min < 1 ||
            !Number.isInteger(max) || max < min) {
            setExerciseError("Enter valid sets and reps. Maximum reps must be at least minimum reps.");
            return;
        }

        try {
            setIsSubmittingExercise(true);
            setExerciseError(null);
            const nextOrderIndex = editingRoutine.planned_exercises.reduce(
                (highest, exercise) => Math.max(highest, exercise.order_index),
                -1
            ) + 1;
            const newExercise = await createPlannedExercise({
                routine_day_id: assignedDay.id,
                routine_id: editingRoutine.id,
                exercise_name: exerciseName.trim(),
                target_sets: sets,
                min_reps: min,
                max_reps: max,
                order_index: nextOrderIndex,
            });

            setEditingRoutine((previous) =>
                previous && previous.id === editingRoutine.id
                    ? {
                        ...previous,
                        planned_exercises: [...previous.planned_exercises, newExercise],
                    }
                    : previous
            );
            setExerciseName("");
            setTargetSets("3");
            setMinReps("8");
            setMaxReps("12");
            setIsAddingExerciseInline(false);
            await loadPlan(false);
        } catch (err) {
            console.error("Error creating planned exercise:", err);
            setExerciseError(err instanceof Error ? err.message : "Failed to add exercise.");
        } finally {
            setIsSubmittingExercise(false);
        }
    }

    //loading state
    if (isLoading) {
        return (
            <View style={styles.centeredState}>
                <ActivityIndicator 
                    size="large"
                    color="#0f766e"
                />
                <Text style={styles.stateMessage}>
                    Loading workout plan...
                </Text>
            </View>
        );
    }

    //error state
    if (error) {
        return (
            <View style={styles.centeredState}>
                <View style={styles.stateCard}>
                    <Text style={styles.stateTitle}>Error</Text>
                    <Text style={styles.stateMessage}>{error}</Text>
                    <TouchableOpacity 
                        style={styles.button}
                        onPress={() => router.back()}
                    >
                        <Text style={styles.buttonText}>Go Back</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    //empty state
    if (!dashboardData) {
        return (
            <View style={styles.centeredState}>
                <View style={styles.stateCard}>
                    <Text style={styles.stateTitle}>No Active Plan</Text>
                    <Text style={styles.stateMessage}>
                        This currrent character does not have an active plan yet!
                    </Text>

                    <TouchableOpacity
                        style={styles.button}
                        onPress={() => router.push({
                            pathname: "/characters/create_workout_plan",
                            params: { characterId },
                        })}
                    >
                        <Text style={styles.buttonText}>Create Workout Plan</Text>
                    </TouchableOpacity>
                    
                </View>
            </View>
        );
    }

    //normal state
    const { plan, routines, scheduleDays } = dashboardData;

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
        >
            <View style={styles.planCard}>
                <View style={styles.planTitleRow}>
                    <Text style={styles.planTitle}>{plan.name}</Text>
                    {plan.is_active && (
                        <View style={styles.activeBadge}>  
                            <Text style={styles.activeBadgeText}>Active</Text>
                        </View>
                    )}
                </View>
            {plan.description ? (
                <Text style={styles.description}>{plan.description}</Text>
            ): null}
            </View>


            {/* Weekly Schedule Single-Day Carousel */}
            <View style={styles.scheduleSection}>
                <View style={styles.scheduleHeaderRow}>
                    <Text style={styles.sectionTitle}>Weekly Schedule</Text>
                    <Text style={styles.scheduleCounter}>Day {activeDayIndex + 1} of 7</Text>
                </View>

                {scheduleDays.length === 0 ? (
                    <View style={styles.emptySchedule}>
                        <Text style={styles.stateMessage}>No schedule configured yet!</Text>
                    </View>
                ) : (
                    (() => {
                        const currentDay = scheduleDays.find(
                            (day) => day.dayOfWeek === activeDayIndex
                        );
                        const isToday = new Date().getDay() === activeDayIndex;

                        return (
                            <View style={styles.carouselContainer}>
                                <TouchableOpacity
                                    style={styles.arrowButton}
                                    onPress={handlePrevDay}
                                    accessibilityRole="button"
                                    accessibilityLabel="Previous day"
                                >
                                    <Text style={styles.arrowText}>‹</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[
                                        styles.singleDayCard,
                                        isToday && styles.singleDayCardToday,
                                    ]}
                                    activeOpacity={0.7}
                                    disabled={!currentDay}
                                    onPress={() => {
                                        if (currentDay) {
                                            setAssignmentError(null);
                                            setSelectedDayForAssignment(currentDay);
                                        }
                                    }}
                                    accessibilityRole="button"
                                    accessibilityLabel={`Edit ${DAYS_OF_WEEK[activeDayIndex]} assignment`}
                                >
                                    <View style={styles.dayBadgeRow}>
                                        {isToday ? (
                                            <View style={styles.todayIndicator}>
                                                <Text style={styles.todayIndicatorText}>TODAY</Text>
                                            </View>
                                        ) : null}
                                        <Text style={styles.tapToEditHint}>Tap to change</Text>
                                    </View>

                                    <Text style={styles.singleDayName}>
                                        {DAYS_OF_WEEK[activeDayIndex]}
                                    </Text>

                                    <View style={styles.routineDisplayBox}>
                                        <Text
                                            style={[
                                                styles.singleDayRoutine,
                                                currentDay?.isRest && styles.restRoutineText,
                                            ]}
                                        >
                                            {currentDay
                                                ? currentDay.isRest
                                                    ? "Rest Day"
                                                    : currentDay.routineName || "Unassigned"
                                                : "Unassigned"}
                                        </Text>
                                    </View>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.arrowButton}
                                    onPress={handleNextDay}
                                    accessibilityRole="button"
                                    accessibilityLabel="Next day"
                                >
                                    <Text style={styles.arrowText}>›</Text>
                                </TouchableOpacity>
                            </View>
                        );
                    })()
                )}
            </View>

            {/* Routines & Planned Exercises */}
            <View style={styles.routinesSection}>
                <View style={styles.sectionHeaderRow}>
                    <Text style={styles.sectionTitle}>Workout Routines</Text>
                    <TouchableOpacity
                        style={styles.addRoutineButton}
                        onPress={() => {
                            setRoutineError(null);
                            setIsRoutineModalOpen(true);
                        }}
                    >
                        <Text style={styles.addRoutineButtonText}>+ Add Routine</Text>
                    </TouchableOpacity>
                </View>

                {routines.length === 0 ? (
                    <View style={styles.emptyCard}>
                        <Text style={styles.stateMessage}>No routines added to this plan yet.</Text>
                    </View>
                ) : (
                    routines.map((routine) => (
                        <View key={routine.id} style={styles.routineCard}>
                            <View style={styles.routineHeaderRow}>
                                <View style={styles.routineHeaderCopy}>
                                    <Text style={styles.routineTitle}>{routine.name}</Text>
                                    {routine.description ? (
                                        <Text style={styles.routineDescription}>{routine.description}</Text>
                                    ) : null}
                                </View>
                                <TouchableOpacity
                                    style={styles.editRoutineButton}
                                    onPress={() => handleOpenEditRoutine(routine)}
                                >
                                    <Text style={styles.editRoutineButtonText}>Edit</Text>
                                </TouchableOpacity>
                            </View>

                            <View style={styles.exerciseList}>
                                {routine.planned_exercises.length === 0 ? (
                                    <Text style={styles.emptyExerciseText}>No exercises assigned yet.</Text>
                                ) : (
                                    routine.planned_exercises.map((exercise) => (
                                        <View key={exercise.id} style={styles.exerciseRow}>
                                            <Text style={styles.exerciseName}>{exercise.exercise_name}</Text>
                                            <Text style={styles.exerciseTargets}>
                                                {exercise.target_sets} sets × {exercise.min_reps}–{exercise.max_reps} reps
                                            </Text>
                                        </View>
                                    ))
                                )}
                            </View>
                        </View>
                    ))
                )}
            </View>

            <Modal
                visible={isRoutineModalOpen}
                animationType="fade"
                transparent
                onRequestClose={() => {
                    if (!isSubmitting) {
                        setIsRoutineModalOpen(false);
                    }
                }}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === "ios" ? "padding" : "height"}
                    style={styles.modalOverlay}
                >
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>New Workout Routine</Text>

                        <TextInput
                            style={styles.input}
                            placeholder="Routine name (e.g., Chest + Tri, Upper)"
                            placeholderTextColor="#94a3b8"
                            value={routineName}
                            onChangeText={setRoutineName}
                            autoFocus
                        />

                        <TextInput
                            style={[styles.input, styles.textArea]}
                            placeholder="Description or notes (optional)"
                            placeholderTextColor="#94a3b8"
                            value={routineDescription}
                            onChangeText={setRoutineDescription}
                            multiline
                            numberOfLines={3}
                        />

                        {routineError ? (
                            <Text style={styles.routineError}>{routineError}</Text>
                        ) : null}

                        <View style={styles.modalButtonRow}>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.cancelButton]}
                                onPress={() => {
                                    setRoutineName("");
                                    setRoutineDescription("");
                                    setRoutineError(null);
                                    setIsRoutineModalOpen(false);
                                }}
                                disabled={isSubmitting}
                            >
                                <Text style={styles.cancelButtonText}>Cancel</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[
                                    styles.modalButton,
                                    styles.submitButton,
                                    (!routineName.trim() || isSubmitting) && styles.disabledButton,
                                ]}
                                onPress={handleCreateRoutine}
                                disabled={!routineName.trim() || isSubmitting}
                            >
                                <Text style={styles.submitButtonText}>
                                    {isSubmitting ? "Creating..." : "Save Routine"}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            <Modal
                visible={editingRoutine !== null}
                animationType="slide"
                transparent
                onRequestClose={() => {
                    if (!isSubmittingExercise && !deletingExerciseId) {
                        setEditingRoutine(null);
                        setIsAddingExerciseInline(false);
                    }
                }}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === "ios" ? "padding" : "height"}
                    style={styles.routineEditorOverlay}
                >
                    <View style={styles.modalSheetContent}>
                        <View style={styles.sheetHeader}>
                            <View style={styles.sheetHeadingCopy}>
                                <Text style={styles.sheetTitle}>{editingRoutine?.name}</Text>
                                <Text style={styles.sheetSubtitle}>Manage routine movements</Text>
                            </View>
                            <TouchableOpacity
                                style={styles.closeSheetButton}
                                onPress={() => {
                                    setEditingRoutine(null);
                                    setIsAddingExerciseInline(false);
                                }}
                                disabled={isSubmittingExercise || deletingExerciseId !== null}
                                accessibilityRole="button"
                                accessibilityLabel="Done managing routine"
                            >
                                <Text style={styles.closeSheetButtonText}>Done</Text>
                            </TouchableOpacity>
                        </View>

                        <ScrollView
                            style={styles.routineEditorScroll}
                            contentContainerStyle={styles.routineEditorContent}
                            keyboardShouldPersistTaps="handled"
                        >
                            {!isAddingExerciseInline ? (
                                <TouchableOpacity
                                    style={styles.openAddExerciseBar}
                                    onPress={() => {
                                        setExerciseError(null);
                                        setIsAddingExerciseInline(true);
                                    }}
                                    accessibilityRole="button"
                                >
                                    <Text style={styles.openAddExerciseBarText}>+ Add New Exercise</Text>
                                </TouchableOpacity>
                            ) : (
                                <View style={styles.inlineFormCard}>
                                    <Text style={styles.formHeading}>New Exercise</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Exercise name (e.g. Incline DB Press)"
                                        placeholderTextColor="#94a3b8"
                                        value={exerciseName}
                                        onChangeText={setExerciseName}
                                        autoFocus
                                    />

                                    <View style={styles.numInputsRow}>
                                        <View style={styles.numInputGroup}>
                                            <Text style={styles.inputLabel}>Sets</Text>
                                            <TextInput
                                                style={styles.input}
                                                keyboardType="number-pad"
                                                value={targetSets}
                                                onChangeText={setTargetSets}
                                            />
                                        </View>
                                        <View style={styles.numInputGroup}>
                                            <Text style={styles.inputLabel}>Min Reps</Text>
                                            <TextInput
                                                style={styles.input}
                                                keyboardType="number-pad"
                                                value={minReps}
                                                onChangeText={setMinReps}
                                            />
                                        </View>
                                        <View style={styles.numInputGroup}>
                                            <Text style={styles.inputLabel}>Max Reps</Text>
                                            <TextInput
                                                style={styles.input}
                                                keyboardType="number-pad"
                                                value={maxReps}
                                                onChangeText={setMaxReps}
                                            />
                                        </View>
                                    </View>

                                    <View style={styles.modalButtonRow}>
                                        <TouchableOpacity
                                            style={[styles.modalButton, styles.cancelButton]}
                                            onPress={() => {
                                                setIsAddingExerciseInline(false);
                                                setExerciseError(null);
                                            }}
                                            disabled={isSubmittingExercise}
                                        >
                                            <Text style={styles.cancelButtonText}>Cancel</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={[
                                                styles.modalButton,
                                                styles.submitButton,
                                                (!exerciseName.trim() || isSubmittingExercise) && styles.disabledButton,
                                            ]}
                                            onPress={() => void handleCreateExerciseInline()}
                                            disabled={!exerciseName.trim() || isSubmittingExercise}
                                        >
                                            <Text style={styles.submitButtonText}>
                                                {isSubmittingExercise ? "Adding..." : "Save"}
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            )}

                            {exerciseError ? <Text style={styles.routineError}>{exerciseError}</Text> : null}

                            {editingRoutine?.planned_exercises.length === 0 ? (
                                <Text style={styles.emptyExerciseText}>No exercises in this routine yet.</Text>
                            ) : (
                                editingRoutine?.planned_exercises.map((exercise) => (
                                    <View key={exercise.id} style={styles.manageExerciseRow}>
                                        <View style={styles.manageExerciseCopy}>
                                            <Text style={styles.manageExerciseName}>{exercise.exercise_name}</Text>
                                            <Text style={styles.manageExerciseMeta}>
                                                {exercise.target_sets} sets × {exercise.min_reps}–{exercise.max_reps} reps
                                            </Text>
                                        </View>
                                        <TouchableOpacity
                                            style={[
                                                styles.deleteExerciseButton,
                                                deletingExerciseId === exercise.id && styles.disabledButton,
                                            ]}
                                            onPress={() => void handleDeleteExercise(exercise.id)}
                                            disabled={deletingExerciseId !== null}
                                            accessibilityRole="button"
                                            accessibilityLabel={`Remove ${exercise.exercise_name}`}
                                        >
                                            <Text style={styles.deleteExerciseButtonText}>
                                                {deletingExerciseId === exercise.id ? "…" : "−"}
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                ))
                            )}
                        </ScrollView>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            <Modal
                visible={selectedDayForAssignment !== null}
                animationType="fade"
                transparent
                onRequestClose={() => {
                    if (!isAssigningDay) {
                        setSelectedDayForAssignment(null);
                    }
                }}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>
                            {selectedDayForAssignment
                                ? `Assign Split to ${DAYS_OF_WEEK[selectedDayForAssignment.dayOfWeek]}`
                                : "Assign Schedule"}
                        </Text>

                        <View style={styles.optionList}>
                            <TouchableOpacity
                                style={[
                                    styles.optionCard,
                                    selectedDayForAssignment?.isRest && styles.optionCardSelected,
                                ]}
                                onPress={() => void handleAssignRoutine(null, true)}
                                disabled={isAssigningDay}
                            >
                                <Text style={styles.optionTitle}>Rest Day</Text>
                                <Text style={styles.optionSubtitle}>No workouts scheduled for this day</Text>
                            </TouchableOpacity>

                            {routines.map((routine) => {
                                const isSelected =
                                    !selectedDayForAssignment?.isRest &&
                                    selectedDayForAssignment?.routineId === routine.id;

                                return (
                                    <TouchableOpacity
                                        key={routine.id}
                                        style={[
                                            styles.optionCard,
                                            isSelected && styles.optionCardSelected,
                                        ]}
                                        onPress={() => void handleAssignRoutine(routine.id, false)}
                                        disabled={isAssigningDay}
                                    >
                                        <Text style={styles.optionTitle}>{routine.name}</Text>
                                        {routine.description ? (
                                            <Text style={styles.optionSubtitle}>{routine.description}</Text>
                                        ) : null}
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        {assignmentError ? (
                            <Text style={styles.routineError}>{assignmentError}</Text>
                        ) : null}

                        <TouchableOpacity
                            style={[styles.modalButton, styles.cancelButton, styles.assignmentCancelButton]}
                            onPress={() => setSelectedDayForAssignment(null)}
                            disabled={isAssigningDay}
                        >
                            <Text style={styles.cancelButtonText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </ScrollView>


    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#f6f8fb",
    },
    content: {
        flexGrow: 1,
        padding: 20,
        gap: 16,
    },
    planCard: {
        padding: 18,
        backgroundColor: "#ffffff",
        borderWidth: 1,
        borderColor: "#dbe4ee",
        borderRadius: 8,
        gap: 10,
    },
    planTitleRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
    },
    planTitle: {
        flex: 1,
        color: "#172033",
        fontSize: 24,
        fontWeight: "800",
    },
    activeBadge: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        backgroundColor: "#ecfdf5",
        borderRadius: 999,
    },
    activeBadgeText: {
        color: "#0f766e",
        fontSize: 12,
        fontWeight: "700",
    },
    description: {
        color: "#64748b",
        fontSize: 15,
        lineHeight: 22,
    },
    scheduleSection: {
        gap: 10,
    },
    scheduleHeaderRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    scheduleCounter: {
        color: "#64748b",
        fontSize: 12,
        fontWeight: "700",
    },
    sectionTitle: {
        color: "#172033",
        fontSize: 18,
        fontWeight: "800",
    },
    carouselContainer: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 10,
    },
    arrowButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: "#ffffff",
        borderWidth: 1,
        borderColor: "#dbe4ee",
        alignItems: "center",
        justifyContent: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    arrowText: {
        color: "#0f766e",
        fontSize: 28,
        fontWeight: "700",
        lineHeight: 32,
        textAlign: "center",
    },
    singleDayCard: {
        flex: 1,
        height: 160,
        padding: 16,
        backgroundColor: "#ffffff",
        borderWidth: 1,
        borderColor: "#dbe4ee",
        borderRadius: 12,
        justifyContent: "space-between",
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
        elevation: 2,
    },
    singleDayCardToday: {
        borderColor: "#0f766e",
        borderWidth: 2,
    },
    dayBadgeRow: {
        width: "100%",
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    todayIndicator: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        backgroundColor: "#f0fdfa",
        borderRadius: 4,
        borderWidth: 1,
        borderColor: "#99f6e4",
    },
    todayIndicatorText: {
        color: "#0f766e",
        fontSize: 10,
        fontWeight: "800",
        letterSpacing: 0.5,
    },
    tapToEditHint: {
        color: "#94a3b8",
        fontSize: 11,
        fontWeight: "600",
        marginLeft: "auto",
    },
    singleDayName: {
        color: "#172033",
        fontSize: 22,
        fontWeight: "700",
        textAlign: "center",
    },
    routineDisplayBox: {
        width: "100%",
        paddingVertical: 8,
        paddingHorizontal: 16,
        backgroundColor: "#f8fafc",
        borderRadius: 8,
        alignItems: "center",
    },
    singleDayRoutine: {
        color: "#0f766e",
        fontSize: 16,
        fontWeight: "700",
        textAlign: "center",
    },
    restRoutineText: {
        color: "#64748b",
    },
    emptySchedule: {
        padding: 16,
        backgroundColor: "#ffffff",
        borderWidth: 1,
        borderColor: "#dbe4ee",
        borderRadius: 8,
    },
    routinesSection: {
        gap: 10,
    },
    sectionHeaderRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 12,
    },
    addRoutineButton: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        backgroundColor: "#0f766e",
        borderRadius: 6,
    },
    addRoutineButtonText: {
        color: "#ffffff",
        fontSize: 13,
        fontWeight: "700",
    },
    emptyCard: {
        padding: 16,
        backgroundColor: "#ffffff",
        borderWidth: 1,
        borderColor: "#dbe4ee",
        borderRadius: 8,
    },
    routineCard: {
        padding: 16,
        backgroundColor: "#ffffff",
        borderWidth: 1,
        borderColor: "#dbe4ee",
        borderRadius: 8,
        gap: 12,
    },
    routineHeaderRow: {
        flexDirection: "row",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: 12,
    },
    routineHeaderCopy: {
        flex: 1,
        gap: 4,
    },
    routineTitle: {
        color: "#172033",
        fontSize: 18,
        fontWeight: "700",
    },
    routineDescription: {
        color: "#64748b",
        fontSize: 14,
        lineHeight: 20,
    },
    editRoutineButton: {
        paddingHorizontal: 12,
        paddingVertical: 5,
        backgroundColor: "#f1f5f9",
        borderWidth: 1,
        borderColor: "#cbd5e1",
        borderRadius: 6,
    },
    editRoutineButtonText: {
        color: "#334155",
        fontSize: 12,
        fontWeight: "700",
    },
    exerciseList: {
        borderTopWidth: 1,
        borderTopColor: "#f1f5f9",
        paddingTop: 8,
        gap: 8,
    },
    exerciseRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 12,
    },
    exerciseName: {
        flex: 1,
        color: "#334155",
        fontSize: 14,
        fontWeight: "600",
    },
    exerciseTargets: {
        color: "#64748b",
        fontSize: 13,
        textAlign: "right",
    },
    emptyExerciseText: {
        color: "#94a3b8",
        fontSize: 13,
        fontStyle: "italic",
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
    },
    routineEditorOverlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        justifyContent: "flex-end",
    },
    modalSheetContent: {
        backgroundColor: "#ffffff",
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        padding: 18,
        maxHeight: "85%",
        width: "100%",
        gap: 12,
    },
    sheetHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingBottom: 8,
        borderBottomWidth: 1,
        borderBottomColor: "#edf2f7",
        gap: 12,
    },
    sheetHeadingCopy: {
        flex: 1,
        gap: 4,
    },
    sheetTitle: {
        fontSize: 18,
        fontWeight: "800",
        color: "#0f172a",
    },
    sheetSubtitle: {
        fontSize: 12,
        fontWeight: "600",
        color: "#64748b",
    },
    closeSheetButton: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        backgroundColor: "#0f766e",
        borderRadius: 6,
    },
    closeSheetButtonText: {
        color: "#ffffff",
        fontSize: 13,
        fontWeight: "700",
    },
    routineEditorScroll: {
        flexShrink: 1,
    },
    routineEditorContent: {
        gap: 12,
        paddingBottom: 8,
    },
    openAddExerciseBar: {
        backgroundColor: "#f0fdfa",
        borderWidth: 1,
        borderColor: "#99f6e4",
        borderStyle: "dashed",
        borderRadius: 8,
        paddingVertical: 12,
        alignItems: "center",
    },
    openAddExerciseBarText: {
        color: "#0f766e",
        fontSize: 14,
        fontWeight: "800",
    },
    inlineFormCard: {
        backgroundColor: "#f8fafc",
        borderWidth: 1,
        borderColor: "#e2e8f0",
        borderRadius: 8,
        padding: 12,
        gap: 8,
    },
    formHeading: {
        fontSize: 13,
        fontWeight: "700",
        color: "#1e293b",
    },
    manageExerciseRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: "#f1f5f9",
        gap: 12,
    },
    manageExerciseCopy: {
        flex: 1,
    },
    manageExerciseName: {
        fontSize: 15,
        fontWeight: "700",
        color: "#172033",
    },
    manageExerciseMeta: {
        fontSize: 12,
        fontWeight: "600",
        color: "#64748b",
        marginTop: 2,
    },
    deleteExerciseButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: "#fee2e2",
        alignItems: "center",
        justifyContent: "center",
    },
    deleteExerciseButtonText: {
        fontSize: 20,
        fontWeight: "800",
        color: "#dc2626",
        lineHeight: 22,
    },
    modalContent: {
        width: "100%",
        maxWidth: 400,
        backgroundColor: "#ffffff",
        borderRadius: 12,
        padding: 20,
        gap: 14,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: "800",
        color: "#172033",
    },
    input: {
        borderWidth: 1,
        borderColor: "#dbe4ee",
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 15,
        color: "#172033",
    },
    numInputsRow: {
        flexDirection: "row",
        gap: 10,
    },
    numInputGroup: {
        flex: 1,
        gap: 4,
    },
    inputLabel: {
        color: "#64748b",
        fontSize: 12,
        fontWeight: "600",
    },
    textArea: {
        height: 72,
        textAlignVertical: "top",
    },
    routineError: {
        color: "#b91c1c",
        fontSize: 14,
    },
    modalButtonRow: {
        flexDirection: "row",
        justifyContent: "flex-end",
        gap: 10,
        marginTop: 6,
    },
    modalButton: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 8,
        alignItems: "center",
    },
    cancelButton: {
        backgroundColor: "#f1f5f9",
    },
    cancelButtonText: {
        color: "#64748b",
        fontWeight: "600",
        fontSize: 14,
    },
    submitButton: {
        backgroundColor: "#0f766e",
    },
    submitButtonText: {
        color: "#ffffff",
        fontWeight: "700",
        fontSize: 14,
    },
    disabledButton: {
        opacity: 0.5,
    },
    optionList: {
        gap: 8,
        maxHeight: 320,
    },
    optionCard: {
        padding: 14,
        borderWidth: 1,
        borderColor: "#dbe4ee",
        borderRadius: 8,
        backgroundColor: "#ffffff",
    },
    optionCardSelected: {
        borderColor: "#0f766e",
        backgroundColor: "#f0fdfa",
    },
    optionTitle: {
        color: "#172033",
        fontSize: 16,
        fontWeight: "700",
    },
    optionSubtitle: {
        color: "#64748b",
        fontSize: 13,
        marginTop: 2,
    },
    assignmentCancelButton: {
        alignSelf: "flex-end",
    },
    centeredState: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        gap: 12,
        backgroundColor: "#f6f8fb",
    },
    stateCard: {
        width: "100%",
        maxWidth: 420,
        alignItems: "center",
        padding: 24,
        gap: 12,
        backgroundColor: "#ffffff",
        borderWidth: 1,
        borderColor: "#dbe4ee",
        borderRadius: 8,
    },
    stateTitle: {
        color: "#172033",
        fontSize: 20,
        fontWeight: "800",
        textAlign: "center",
    },
    stateMessage: {
        color: "#64748b",
        fontSize: 15,
        lineHeight: 22,
        textAlign: "center",
    },
    button: {
        alignSelf: "stretch",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: "#0f766e",
        borderRadius: 8,
    },
    buttonText: {
        color: "#ffffff",
        fontSize: 15,
        fontWeight: "700",
    },
});