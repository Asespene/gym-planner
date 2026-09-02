import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// Mock Data for character
const MockCharacterBioData = {
  character: {
    name: "Iron Vanguard",
    goal: "Be as strong as hulk!",
    training_days: 5,
  },

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

  const router = useRouter();
  void id;
  void router;

  return (
    // A Safe area View
    <SafeAreaView style={styles.safeArea} edges={["bottom"]}>
      <Stack.Screen
        options={{
          title: MockCharacterBioData.character.name,
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
                  {MockCharacterBioData.character.name}
                </Text>
              </View>
              <View style={styles.bioGroup}>
                <Text style={styles.bioLabel}>Goal</Text>
                <Text style={styles.bioValue}>
                  {MockCharacterBioData.character.goal}
                </Text>
              </View>
              <View style={[styles.bioGroup, { borderBottomWidth: 0 }]}>
                <Text style={styles.bioLabel}>Training Days</Text>
                <Text style={styles.bioValue}>
                  {MockCharacterBioData.character.training_days} days/week
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

          {/* The middle section which contains the primary action button with the Start "routine_dat" */}
          <TouchableOpacity style={styles.ctaSection} activeOpacity={0.8}>
              <View style={styles.ctaCopy}>
                <Text style={styles.ctaLabel}>Today&apos;s Routine</Text>
                <Text style={styles.ctaTitle}>
                  Start &quot;{MockCharacterBioData.todayRoutine.name}&quot;
                </Text>
              </View>    
          </TouchableOpacity>
         

          {/* The Action grid section for the buttons; edit/start the plan, workout-history, character-stats-exp, and tbd button  */}
          <View style={styles.gridSection}>
            
            <View style={styles.actionGrid}>

              <TouchableOpacity style={styles.actionTile}>
                <Text style={styles.actionTitle}>Plan</Text>
                <Text style={styles.actionMeta}>Edit or review</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.actionTile}>
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
  
});
