import * as ImagePicker from "expo-image-picker";
import { Alert, Platform } from "react-native";

export const useImagePicker = () => {
  // 1. Move your showAlert helper here
  const showAlert = (title: string, message: string) => {
    if (Platform.OS === "web") {
      window.alert(`${title}\n\n${message}`);
      return;
    }

    Alert.alert(title, message);
  };
  
  
  // 2. Move your pickImage function here
  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissionResult.granted) {
        showAlert("Error", "Media access permission to be granted before performing this action!");
        return null;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1,1],
        quality: 0.8,

    });

    if (!result.canceled && result.assets[0]) {
        return result.assets[0].uri;
    }

    return null;

  }

  // 3. Move your takePhoto function here
  const takePhoto = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();

    if (!permissionResult.granted) {
        showAlert("Error", "Need camera access permission to be granted before performing this action!");
        return null;
    }

    const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1,1],
        quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
        return result.assets[0].uri;
    }

    return null;
  }



  // 4. Return the functions so other files can use them
  return { pickImage, takePhoto };
};