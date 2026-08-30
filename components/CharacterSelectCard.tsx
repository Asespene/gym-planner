import {
  Image,
  ImageSourcePropType,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

interface CharacterProps {
  title: string;
  image: ImageSourcePropType;
  onPress: () => void;
  onLongPress: () => void;
}

export interface CharacterItem {
  id: string;
  title: string;
  image: ImageSourcePropType;
}

export default function CharacterSelectCard({
  title,
  image,
  onPress,
  onLongPress,
}: CharacterProps) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.characterCard,
        pressed && styles.characterCardPressed,
      ]}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={500}
    >
      <View style={styles.imageShell}>
        <Image source={image} resizeMode="contain" style={styles.characterImage} />
      </View>

      <View style={styles.titleShell}>
        <Text style={styles.characterTitle}>{title}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  imageShell: {
    width: 64,
    height: 64,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f1f5f9",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  characterImage: {
    height: 46,
    width: 46,
  },

  characterCard: {
    width: 132,
    minHeight: 148,
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#fefefe",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    borderWidth: 1,
    borderColor: "#dbe4ee",
    shadowColor: "#101828",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 4,
  },
  characterCardPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.98 }],
  },
  titleShell: {
    width: "100%",
  },
  characterTitle: {
    color: "#172033",
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 20,
    textAlign: "center",
  },
});
