
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { Camera } from "expo-camera";

/** Request permission to access media library */
const requestMediaPermission = async () => {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  return status === "granted";
};

/** Request permission for camera */
const requestCameraPermission = async () => {
  const { status } = await Camera.requestCameraPermissionsAsync();
  return status === "granted";
};

/** Pick image from gallery */
export const pickImage = async () => {
  try {
    const permission = await requestMediaPermission();
    if (!permission) throw new Error("Gallery permission denied");

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled) return { type: "image", ...result.assets[0] };
    return null;
  } catch (error) {
    console.log("Image Picker Error:", error);
    return null;
  }
};

/** Take photo using camera */
export const takePhoto = async () => {
  try {
    const permission = await requestCameraPermission();
    if (!permission) throw new Error("Camera permission denied");

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled) return { type: "image", ...result.assets[0] };
    return null;
  } catch (error) {
    console.log("Camera Error:", error);
    return null;
  }
};

/** Pick any file (PDF, DOC, etc.) */
export const pickFile = async () => {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: "*/*",
      copyToCacheDirectory: true,
    });

    if (!result.canceled) return { type: "file", ...result.assets[0] };
    return null;
  } catch (error) {
    console.log("File Picker Error:", error);
    return null;
  }
};
