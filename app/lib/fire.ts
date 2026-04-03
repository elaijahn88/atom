// lib/fire.ts
import { getAuth } from "firebase/auth";
import { getFirestore, doc, setDoc } from "firebase/firestore";
import { getDatabase, ref, push } from "firebase/database";

// Initialize Firestore and Realtime Database
const db = getFirestore();
const rdb = getDatabase();
const auth = getAuth();

// Type for user bio
export type UserBio = {
  uid: string;
  email: string;
  firstName?: string;
  lastName?: string;
  age?: number;
  gender?: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  occupation?: string;
};

// Save user data to Firestore and Realtime DB
export const saveUserData = async (
  formData: Omit<UserBio, "uid" | "email"> & { email?: string }
) => {
  const currentUser = auth.currentUser;

  if (!currentUser) throw new Error("User not logged in");

  const userData: UserBio = {
    ...formData,
    uid: currentUser.uid,
    email: currentUser.email || formData.email || "",
  };

  try {
    // Save to Firestore
    await setDoc(doc(db, "users", userData.uid), userData);

    // Save to Realtime Database
    const rRef = ref(rdb, "users");
    const newRKey = push(rRef, userData).key;

    return { success: true, firestoreId: userData.uid, realtimeKey: newRKey };
  } catch (error) {
    console.error("Failed to save user data:", error);
    throw error;
  }
};
