import { Button } from "@expo/ui";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import BottomSheetComponent from "../../components/BottomSheet";

import CharacterSelectCard from "../../components/CharacterSelectCard";
import CreateCharacterCard from "../../components/CreateCharacterCard";
import {
  Character,
  deleteCharacter,
  fetchAllCharacters,
} from "../../lib/supabase/characters";
import { useAuth } from "../../src/context/AuthContext";

export default function Index() {
  const router = useRouter();
  const { user } = useAuth();
  const userId = user?.id;

  const [characters, setCharacters] = useState<Character[]>([]);
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadCharacters = useCallback(
    async (isRefresh = false) => {
      if (!userId) {
        return;
      }

      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      try {
        const data = await fetchAllCharacters(userId);

        setCharacters(data);
      } catch {
        Alert.alert("Error", "failed to load the characters");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [userId]
  );

  useFocusEffect(
    useCallback(() => {
      loadCharacters();
    }, [loadCharacters])
  );

  const handleDeleteCharacter = async (id: string) => {
    const previous = [...characters];

    setCharacters((prev) => prev.filter((char) => char.id !== id));
    setSelectedCharacter(null);

    try {
      await deleteCharacter(id);
    } catch {
      setCharacters(previous);
      Alert.alert("Failed to delete the character, try again!");
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadCharacters(true)}
            tintColor="#0f766e"
          />
        }
      >
        <View style={styles.stack}>
          <View style={styles.header}>
            <Text style={styles.kicker}>Gym Planner</Text>
            <Text style={styles.title}>Choose your training character</Text>
            <Text style={styles.subtitle}>
              Long press a character to remove it from your roster.
            </Text>
          </View>

          <View style={styles.characterGrid}>
            {loading && !refreshing ? (
              <ActivityIndicator
                size="large"
                color="#0f766e"
                style={{ marginTop: 24 }}
              />
            ) : (
              <>
                <CreateCharacterCard />
                {characters.map((character) => (
                  <CharacterSelectCard
                    key={character.id}
                    title={character.name}
                    imageUrl={character.image_url}
                    onPress={() => {
                      router.push({
                        pathname: "/characters/[id]",
                        params: { id: character.id },
                      });
                    }}
                    onLongPress={() => setSelectedCharacter(character)}
                  />
                ))}
              </>
            )}
          </View>

          <BottomSheetComponent
            isPresented={selectedCharacter !== null}
            onDismiss={() => setSelectedCharacter(null)}
            title={`Delete "${selectedCharacter?.name}"`}
          >
            <Button
              label="Delete Character"
              onPress={() =>
                selectedCharacter
                  ? handleDeleteCharacter(selectedCharacter.id)
                  : null
              }
            />
          </BottomSheetComponent>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "stretch",
    justifyContent: "flex-start",
    backgroundColor: "#f6f8fb",
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 32,
  },
  stack: {
    width: "100%",
    alignItems: "center",
    gap: 22,
  },
  header: {
    width: "100%",
    gap: 8,
    paddingVertical: 8,
  },
  kicker: {
    color: "#0f766e",
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 18,
    textTransform: "uppercase",
  },
  title: {
    color: "#172033",
    fontSize: 30,
    fontWeight: "900",
    lineHeight: 36,
  },
  subtitle: {
    maxWidth: 340,
    color: "#64748b",
    fontSize: 15,
    fontWeight: "600",
    lineHeight: 22,
  },
  characterGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 14,
    width: "100%",
  },
  colorExample: {
    fontSize: 18,
    fontWeight: "600",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 10,
    width: "80%",
    borderRadius: 8,
  },
});
