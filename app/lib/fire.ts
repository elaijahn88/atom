// lib/fire.ts
import { getAuth } from "firebase/auth";
import { getFirestore, doc, setDoc } from "firebase/firestore";

// Initialize Firestore
const db = getFirestore();
const auth = getAuth();

// Type for user bio
export type UserBio = {
  uid: string;
  email: string;
  name?: string;
  age?: number;
  phone?: string;
  address?: string;
  // Add other fields as needed, up to 10+
};

// Main function to save user data
export const handleSaveBio = async (formData: Omit<UserBio, "uid" | "email"> & { email?: string }) => {
  const currentUser = auth.currentUser;

  if (!currentUser) {
    throw new Error("User not logged in");
  }

  const userData: UserBio = {
    ...formData,
    uid: currentUser.uid,               // very important
    email: currentUser.email || formData.email || "", // fallback
  };

  try {
    // Save to Firestore
    await setDoc(doc(db, "users", userData.uid), userData);
    console.log("Saved successfully:", userData);
    return { success: true };
  } catch (error) {
    console.error("Failed to save user data:", error);
    throw error;
  }
};
