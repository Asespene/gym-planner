import { useRouter } from "expo-router";
import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { Button } from "@expo/ui";

import CharacterSelectCard, {
  CharacterItem,
} from "../../components/CharacterSelectCard";

import CreateCharacterCard from "../../components/CreateCharacterCard";

import BottomSheetComponent from "../../components/BottomSheet";



const characterList: CharacterItem[] = [
  {
    id: "1",
    title: "Xixak",
    image: require("@/assets/images/react-logo.png"),
  },
  {
    id: "2",
    title: "Flame",
    image: require("@/assets/images/react-logo.png"),
  },

  {
    id: "3",
    title: "Jol",
    image: require("@/assets/images/react-logo.png"),
  },

  {
    id: "4",
    title: "Jin",
    image: require("@/assets/images/react-logo.png"),
  },
];

export default function Index() {
  const router = useRouter();

  const [initialCharacterList, setInitialCharacterList] = useState<CharacterItem[]>(characterList);
  const [selectedCharacter, setSelectedCharacter] = useState<CharacterItem | null>(null)

  const handleDeleteChar = (id: string) => {
    setInitialCharacterList((prev) => prev.filter((char) => char.id !== id));
    setSelectedCharacter(null);
  }


  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
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
            <CreateCharacterCard />

            {initialCharacterList.map((character) => (
              <CharacterSelectCard
                key={character.id}
                title={character.title}
                image={character.image}
                onPress={() =>
                  router.push({
                    pathname: "/characters/[id]",
                    params: { id: character.id },
                  })
                }

                onLongPress={() => setSelectedCharacter(character)}
              />
            ))}
          </View>
          
          <BottomSheetComponent
            isPresented={selectedCharacter !== null}
            onDismiss={() => setSelectedCharacter(null)}
            title={`Delete "${selectedCharacter?.title}"`}
          >
            <Button
              label="Delete Character"
              onPress={() => selectedCharacter ? handleDeleteChar(selectedCharacter.id) : null}
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
