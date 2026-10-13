import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
    ActivityIndicator,
    Alert,
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
    fetchPlanDashboardData,
    PlanDashboardData,
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
    const [selectedRoutineForExercise, setSelectedRoutineForExercise] = useState<{
        routineId: string;
        routineDayId: string;
        routineName: string;
    } | null>(null);
    const [exerciseName, setExerciseName] = useState("");
    const [targetSets, setTargetSets] = useState("3");
    const [minReps, setMinReps] = useState("8");
    const [maxReps, setMaxReps] = useState("12");
    const [isSubmittingExercise, setIsSubmittingExercise] = useState(false);
    const [exerciseError, setExerciseError] = useState<string | null>(null);

    const { id, planId } = useLocalSearchParams<{ id: string, planId?: string }>();
    const router = useRouter(); 

    const characterId = Array.isArray(id) ? id[0] : id;
    const targetPlanId = Array.isArray(planId) ? planId[0] : planId;

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

    function handleOpenAddExercise(routine: Routine) {
        const assignedDay = dashboardData?.scheduleDays.find((day) => day.routineId === routine.id);

        if (!assignedDay) {
            const message = `Please assign "${routine.name}" to at least one day in the Weekly Schedule first.`;
            if (Platform.OS === "web") {
                window.alert(message);
            } else {
                Alert.alert("Assign a schedule day", message);
            }
            return;
        }

        setExerciseError(null);
        setSelectedRoutineForExercise({
            routineId: routine.id,
            routineDayId: assignedDay.id,
            routineName: routine.name,
        });
    }

    async function handleCreateExercise() {
        if (!selectedRoutineForExercise || !exerciseName.trim() || isSubmittingExercise) {
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
            await createPlannedExercise({
                routine_day_id: selectedRoutineForExercise.routineDayId,
                routine_id: selectedRoutineForExercise.routineId,
                exercise_name: exerciseName.trim(),
                target_sets: sets,
                min_reps: min,
                max_reps: max,
                order_index: dashboardData?.routines.find(
                    (routine) => routine.id === selectedRoutineForExercise.routineId
                )?.planned_exercises.length ?? 0,
            });

            setExerciseName("");
            setTargetSets("3");
            setMinReps("8");
            setMaxReps("12");
            setSelectedRoutineForExercise(null);
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


            {/* Schedule */}
            <View style={styles.scheduleSection}>
                <Text style={styles.sectionTitle}>Weekly Schedule</Text>

                {scheduleDays.length === 0 ? (
                    <View style={styles.emptySchedule}>
                        <Text style={styles.stateMessage}>No schedule configured yet!</Text>
                    </View>
                ) : (
                    scheduleDays.map((day) => (
                        <TouchableOpacity
                            key={day.id || day.dayOfWeek}
                            style={styles.dayCard}
                            onPress={() => {
                                setAssignmentError(null);
                                setSelectedDayForAssignment(day);
                            }}
                        >
                            <Text style={styles.dayName}>{DAYS_OF_WEEK[day.dayOfWeek]}</Text>
                            <Text style={styles.dayRoutine}>
                                {day.isRest ? "Rest Day" : day.routineName || "Unassigned"}
                            </Text>
                        </TouchableOpacity>
                    ))
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
                                    style={styles.addExerciseButton}
                                    onPress={() => handleOpenAddExercise(routine)}
                                >
                                    <Text style={styles.addExerciseButtonText}>+ Add Exercise</Text>
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
                visible={selectedRoutineForExercise !== null}
                animationType="fade"
                transparent
                onRequestClose={() => {
                    if (!isSubmittingExercise) {
                        setSelectedRoutineForExercise(null);
                    }
                }}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === "ios" ? "padding" : "height"}
                    style={styles.modalOverlay}
                >
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>
                            Add Exercise to {selectedRoutineForExercise?.routineName}
                        </Text>

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

                        {exerciseError ? (
                            <Text style={styles.routineError}>{exerciseError}</Text>
                        ) : null}

                        <View style={styles.modalButtonRow}>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.cancelButton]}
                                onPress={() => {
                                    setSelectedRoutineForExercise(null);
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
                                onPress={handleCreateExercise}
                                disabled={!exerciseName.trim() || isSubmittingExercise}
                            >
                                <Text style={styles.submitButtonText}>
                                    {isSubmittingExercise ? "Adding..." : "Add Exercise"}
                                </Text>
                            </TouchableOpacity>
                        </View>
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
    sectionTitle: {
        color: "#172033",
        fontSize: 18,
        fontWeight: "800",
    },
    dayCard: {
        padding: 16,
        backgroundColor: "#ffffff",
        borderWidth: 1,
        borderColor: "#dbe4ee",
        borderRadius: 8,
        gap: 4,
    },
    dayName: {
        color: "#64748b",
        fontSize: 13,
        fontWeight: "700",
    },
    dayRoutine: {
        color: "#172033",
        fontSize: 16,
        fontWeight: "700",
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
    addExerciseButton: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        backgroundColor: "#f0fdfa",
        borderWidth: 1,
        borderColor: "#0f766e",
        borderRadius: 6,
    },
    addExerciseButtonText: {
        color: "#0f766e",
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