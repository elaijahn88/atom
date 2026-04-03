import { saveUserData } from "./fire";
import { getAuth } from "firebase/auth";

const auth = getAuth();

const handleSaveBio = async (formData: Omit<UserBio, "uid">) => {
  const currentUser = auth.currentUser;
  
  const userData: UserBio = {
    ...formData,
    uid: currentUser?.uid,        // ← Very important
    email: currentUser?.email || formData.email,
  };

  try {
    const result = await saveUserData(userData);
    console.log("Saved successfully:", result);
    // Show success toast
  } catch (error) {
    console.error("Failed to save user data:", error);
    // Show error to user
  }
};
