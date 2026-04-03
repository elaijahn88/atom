// lib/saveUserData.ts
import { db, database } from "../../firebase"; // Adjust path as needed
import { 
  collection, 
  doc, 
  setDoc, 
  serverTimestamp 
} from "firebase/firestore";
import { 
  ref, 
  set, 
  push 
} from "firebase/database";
import { UserBio } from "./types"; // Move interface here or to a separate types file

// Extended interface with optional uid and timestamps
export interface UserBio {
  firstName: string;
  lastName: string;
  age: number;
  gender: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  country: string;
  occupation: string;
  uid?: string;           // Important: link to auth user
  createdAt?: any;
  updatedAt?: any;
}

/**
 * Validates user bio data before saving
 */
const validateUserBio = (user: UserBio): void => {
  if (!user.firstName || !user.lastName || !user.email) {
    throw new Error("First name, last name, and email are required.");
  }
  if (user.age < 0 || user.age > 150) {
    throw new Error("Age must be a valid number.");
  }
  // Add more validation as needed (email format, phone, etc.)
};

/**
 * Save user bio to Firestore (recommended for most queries + scalability)
 */
export const saveToFirestore = async (user: UserBio): Promise<string> => {
  try {
    validateUserBio(user);

    const userId = user.uid || user.email; // Fallback if no uid
    if (!userId) throw new Error("User ID or email is required for Firestore.");

    const userRef = doc(db, "users", userId);

    const dataToSave = {
      ...user,
      updatedAt: serverTimestamp(),
      // createdAt only on first save (handled by merge)
    };

    await setDoc(userRef, dataToSave, { merge: true });

    console.log(`✅ Firestore: User data saved for ID: ${userId}`);
    return userId;
  } catch (error: any) {
    console.error("❌ Error saving to Firestore:", error);
    throw new Error(`Firestore save failed: ${error.message}`);
  }
};

/**
 * Save user bio to Realtime Database (good for real-time features)
 */
export const saveToRealtimeDB = async (user: UserBio): Promise<string> => {
  try {
    validateUserBio(user);

    const userId = user.uid;
    if (!userId) throw new Error("User UID is required for Realtime Database.");

    const userRef = ref(database, `users/${userId}`);

    const dataToSave = {
      ...user,
      updatedAt: Date.now(), // Realtime DB doesn't have serverTimestamp like Firestore
    };

    await set(userRef, dataToSave);

    console.log(`✅ Realtime DB: User data saved for UID: ${userId}`);
    return userId;
  } catch (error: any) {
    console.error("❌ Error saving to Realtime Database:", error);
    throw new Error(`Realtime DB save failed: ${error.message}`);
  }
};

/**
 * Main function: Save user data to **both** Firestore and Realtime Database
 * Uses the same UID for consistency (highly recommended).
 */
export const saveUserData = async (user: UserBio): Promise<{
  firestoreId: string;
  realtimeKey: string;
}> => {
  if (!user.uid) {
    console.warn("⚠️ No UID provided. Consider passing auth.currentUser?.uid for better consistency.");
  }

  // Run both saves in parallel for better performance
  const [firestoreId, realtimeKey] = await Promise.all([
    saveToFirestore(user),
    saveToRealtimeDB(user)
  ]);

  console.log("🎉 User data successfully saved to both databases!");
  
  return { firestoreId, realtimeKey };
};
